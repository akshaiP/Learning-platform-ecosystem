# SCORM API Integration and Learner Identification

## Overview
The SCORM Builder includes comprehensive SCORM 2004 API integration that enables communication with Learning Management Systems (LMS). This integration handles learner identification, progress tracking, completion status, and session management while providing fallback mechanisms for standalone operation.

## SCORM API Architecture

### 1. SCORM API Manager
**File**: `templates/scorm-api.js`

Core SCORM API integration layer that manages LMS communication and learner data extraction.

#### SCORM API Detection and Initialization
```javascript
var scormAPI = null;
var scormLearnerData = {
    id: null,
    name: null,
    progress: null
};

function findAPI(win) {
    // Search through window hierarchy to find SCORM API
    while (win) {
        try {
            if (win.API_1484_11) return win.API_1484_11;
        } catch (err) {}
        if (win.parent && win.parent !== win) {
            win = win.parent;
        } else {
            win = win.opener;
        }
    }
    return null;
}

function initSCORM() {
    scormAPI = findAPI(window);
    if (scormAPI == null) {
        console.warn("SCORM 2004 API not found. Running in standalone mode.");
        return false;
    }

    try {
        // Initialize SCORM session
        var result = scormAPI.Initialize("");
        console.log("🔗 SCORM API Initialize result:", result);

        // Extract learner information with multiple fallback attempts
        scormLearnerData.id = scormAPI.GetValue("cmi.learner_id") ||
                              scormAPI.GetValue("cmi.core.student_id") ||
                              scormAPI.GetValue("cmi.student_id") ||
                              "anonymous";

        scormLearnerData.name = scormAPI.GetValue("cmi.learner_name") ||
                                scormAPI.GetValue("cmi.core.student_name") ||
                                scormAPI.GetValue("cmi.student_name") ||
                                scormAPI.GetValue("cmi.core.learner_name") ||
                                "Anonymous Learner";

        scormLearnerData.progress = scormAPI.GetValue("cmi.completion_status") ||
                                    scormAPI.GetValue("cmi.core.lesson_status") ||
                                    scormAPI.GetValue("cmi.lesson_status") ||
                                    "not attempted";

        console.log("👤 SCORM Learner Data Retrieved:", {
            id: scormLearnerData.id,
            name: scormLearnerData.name,
            progress: scormLearnerData.progress
        });

        // Update global learner data for other systems
        updateGlobalLearnerData();

        // Update UI with learner information
        updateLearnerInfo();

        // Re-initialize chat system with SCORM learner data
        reinitializeChatSystem();

        return true;
    } catch (error) {
        console.error("SCORM initialization error:", error);
        return false;
    }
}
```

#### Learner Data Management
```javascript
function updateGlobalLearnerData() {
    // Update global learnerData for other scripts
    if (typeof window.learnerData !== 'undefined') {
        window.learnerData.id = scormLearnerData.id;
        window.learnerData.name = scormLearnerData.name;
        window.learnerData.progress = scormLearnerData.progress;
    }

    // Initialize learnerData if not exists
    if (!window.learnerData) {
        window.learnerData = {
            id: scormLearnerData.id,
            name: scormLearnerData.name,
            progress: scormLearnerData.progress
        };
    }

    // Store SCORM-specific data
    window.learnerData.scorm = {
        initialized: true,
        apiVersion: "2004",
        lmsConnected: true,
        sessionId: generateSessionId()
    };
}

function reinitializeChatSystem() {
    // Re-initialize chat system with updated learner data
    if (window.chatSystem && window.templateData && window.topicConfig && window.learnerData) {
        window.chatSystem.initialize(window.templateData, window.topicConfig, window.learnerData);
        console.log('✅ Chat system re-initialized with SCORM learner data:', window.learnerData);
    }
}
```

#### UI Updates for Learner Information
```javascript
function updateLearnerInfo() {
    const learnerInfoElement = document.getElementById("learnerInfo");
    if (learnerInfoElement) {
        learnerInfoElement.innerHTML = `
            <div class="w-10 h-10 bg-gradient-to-br from-nebula-500 to-nebula-purple-500 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-white text-sm"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-gray-700 font-medium">Welcome, <strong>${scormLearnerData.name}</strong></span>
                <span class="text-gray-500 text-sm">Progress: ${scormLearnerData.progress}</span>
            </div>
        `;
        console.log('✅ Learner info updated in header:', scormLearnerData.name);
    } else {
        console.warn('⚠️ learnerInfo element not found in DOM');
    }
}

// Fallback function to update header with global learner data
function updateHeaderWithLearnerData() {
    if (window.learnerData && window.learnerData.name && window.learnerData.name !== 'Learner') {
        const learnerInfoElement = document.getElementById("learnerInfo");
        if (learnerInfoElement) {
            learnerInfoElement.innerHTML = `
                <div class="w-10 h-10 bg-gradient-to-br from-nebula-500 to-nebula-purple-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-white text-sm"></i>
                </div>
                <div class="flex flex-col">
                    <span class="text-gray-700 font-medium">Welcome, <strong>${window.learnerData.name}</strong></span>
                    <span class="text-gray-500 text-sm">Progress: ${window.learnerData.progress}</span>
                </div>
            `;
            console.log('✅ Header updated with global learner data:', window.learnerData.name);
        }
    }
}
```

### 2. SCORM Data Model Elements

#### Supported SCORM Data Model Elements
```javascript
// Learner Information
const LEARNER_ELEMENTS = {
    ID: [
        "cmi.learner_id",           // SCORM 2004 4th Edition
        "cmi.core.student_id",      // SCORM 1.2
        "cmi.student_id"            // Legacy
    ],
    NAME: [
        "cmi.learner_name",         // SCORM 2004 4th Edition
        "cmi.core.student_name",    // SCORM 1.2
        "cmi.student_name",         // Legacy
        "cmi.core.learner_name"     // Alternative
    ],
    PROGRESS: [
        "cmi.completion_status",    // SCORM 2004
        "cmi.core.lesson_status",   // SCORM 1.2
        "cmi.lesson_status"         // Legacy
    ]
};

// Session Information
const SESSION_ELEMENTS = {
    LOCATION: "cmi.location",
    CREDIT: "cmi.credit",
    LESSON_MODE: "cmi.mode",
    ENTRY: "cmi.entry",
    SUSPEND_DATA: "cmi.suspend_data",
    TOTAL_TIME: "cmi.total_time",
    SESSION_TIME: "cmi.session_time",
    SCORE_RAW: "cmi.score.raw",
    SCORE_MAX: "cmi.score.max",
    SCORE_MIN: "cmi.score.min",
    SCORE_SCALED: "cmi.score.scaled"
};

// Objectives (for future stateful implementation)
const OBJECTIVES_ELEMENTS = {
    ID: "cmi.objectives.N.id",
    SCORE_RAW: "cmi.objectives.N.score.raw",
    SCORE_MAX: "cmi.objectives.N.score.max",
    SCORE_MIN: "cmi.objectives.N.score.min",
    SCORE_SCALED: "cmi.objectives.N.score.scaled",
    SUCCESS_STATUS: "cmi.objectives.N.success_status",
    COMPLETION_STATUS: "cmi.objectives.N.completion_status",
    PROGRESS_MEASURE: "cmi.objectives.N.progress_measure",
    DESCRIPTION: "cmi.objectives.N.description"
};
```

#### SCORM Data Access Functions
```javascript
function getSCORMValue(element, defaultValue = "") {
    if (!scormAPI) return defaultValue;

    try {
        const value = scormAPI.GetValue(element);
        return value !== "" ? value : defaultValue;
    } catch (error) {
        console.warn(`Failed to get SCORM value for ${element}:`, error);
        return defaultValue;
    }
}

function setSCORMValue(element, value) {
    if (!scormAPI) return false;

    try {
        const result = scormAPI.SetValue(element, value);
        console.log(`✅ SCORM Set ${element} = ${value}: ${result}`);
        return result === "true";
    } catch (error) {
        console.error(`Failed to set SCORM value for ${element}:`, error);
        return false;
    }
}

function commitSCORMData() {
    if (!scormAPI) return false;

    try {
        const result = scormAPI.Commit("");
        console.log(`✅ SCORM Commit result: ${result}`);
        return result === "true";
    } catch (error) {
        console.error("SCORM commit failed:", error);
        return false;
    }
}
```

### 3. Session Management and Time Tracking

#### Session Time Tracking
```javascript
var sessionStartTime = Date.now();
var sessionTime = 0;

// Update session time every second
setInterval(() => {
    sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
}, 1000);

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateSessionTime() {
    if (scormAPI) {
        const formattedTime = formatTime(sessionTime);
        setSCORMValue("cmi.session_time", formattedTime);
    }
}
```

#### Suspend Data Management
```javascript
// Save current state to suspend data
function saveToSuspendData(data) {
    const suspendData = {
        quizState: window.quizSystem ? {
            currentQuestionIndex: window.quizSystem.currentQuestionIndex,
            answers: window.quizSystem.answers,
            score: window.quizSystem.score,
            completed: window.quizSystem.completed
        } : null,
        taskState: window.taskSystem ? {
            completedSteps: Array.from(window.taskSystem.completedSteps),
            revealedHints: window.taskSystem.revealedHints,
            hintsStartTime: window.taskSystem.hintsStartTime
        } : null,
        timestamp: new Date().toISOString(),
        sessionTime: sessionTime
    };

    const jsonData = JSON.stringify(suspendData);
    return setSCORMValue("cmi.suspend_data", jsonData);
}

// Load state from suspend data
function loadFromSuspendData() {
    const suspendDataJson = getSCORMValue("cmi.suspend_data", "{}");

    try {
        const suspendData = JSON.parse(suspendDataJson);

        // Restore quiz state
        if (suspendData.quizState && window.quizSystem) {
            window.quizSystem.currentQuestionIndex = suspendData.quizState.currentQuestionIndex;
            window.quizSystem.answers = suspendData.quizState.answers;
            window.quizSystem.score = suspendData.quizState.score;
            window.quizSystem.completed = suspendData.quizState.completed;
        }

        // Restore task state
        if (suspendData.taskState && window.taskSystem) {
            window.taskSystem.completedSteps = new Set(suspendData.taskState.completedSteps);
            window.taskSystem.revealedHints = suspendData.taskState.revealedHints;
            window.taskSystem.hintsStartTime = suspendData.taskState.hintsStartTime;
        }

        console.log("✅ State restored from suspend data");
        return suspendData;
    } catch (error) {
        console.warn("Failed to load suspend data:", error);
        return null;
    }
}
```

### 4. Progress Tracking and Completion

#### Progress Status Management
```javascript
function updateCompletionStatus(status) {
    const validStatuses = ["completed", "incomplete", "not attempted", "unknown"];

    if (validStatuses.includes(status)) {
        setSCORMValue("cmi.completion_status", status);

        // Update local state
        if (window.learnerData) {
            window.learnerData.progress = status;
        }
        if (scormLearnerData) {
            scormLearnerData.progress = status;
        }

        // Update UI
        updateLearnerInfo();
        console.log(`✅ Completion status updated: ${status}`);
    } else {
        console.warn(`Invalid completion status: ${status}`);
    }
}

function setSuccessStatus(status) {
    const validStatuses = ["passed", "failed", "unknown"];

    if (validStatuses.includes(status)) {
        setSCORMValue("cmi.success_status", status);
        console.log(`✅ Success status updated: ${status}`);
    } else {
        console.warn(`Invalid success status: ${status}`);
    }
}

function calculateProgress() {
    let progress = 0;
    const totalElements = 0;

    // Calculate quiz progress
    if (window.quizSystem && window.quizSystem.questions) {
        const totalQuestions = window.quizSystem.questions.length;
        const answeredQuestions = Object.keys(window.quizSystem.answers).length;
        progress += (answeredQuestions / totalQuestions) * 50; // Quiz is 50% of total progress
        totalElements += 50;
    }

    // Calculate task progress
    if (window.taskSystem && window.templateData && window.templateData.taskSteps) {
        const totalSteps = window.templateData.taskSteps.length;
        const completedSteps = window.taskSystem.completedSteps.size;
        progress += (completedSteps / totalSteps) * 50; // Tasks are 50% of total progress
        totalElements += 50;
    }

    return Math.round(progress);
}

function updateProgress() {
    const progress = calculateProgress();

    // Update SCORM progress measure
    setSCORMValue("cmi.progress_measure", progress / 100);

    // Update completion status based on progress
    if (progress >= 100) {
        updateCompletionStatus("completed");
    } else if (progress > 0) {
        updateCompletionStatus("incomplete");
    }

    console.log(`📊 Progress updated: ${progress}%`);
}
```

#### Score Management
```javascript
function updateScore(score, maxScore, minScore = 0) {
    // Set raw score
    setSCORMValue("cmi.score.raw", score.toString());

    // Set max score
    setSCORMValue("cmi.score.max", maxScore.toString());

    // Set min score
    setSCORMValue("cmi.score.min", minScore.toString());

    // Calculate and set scaled score (0 to 1)
    const scaledScore = (score - minScore) / (maxScore - minScore);
    setSCORMValue("cmi.score.scaled", scaledScore.toFixed(4));

    console.log(`📊 Score updated: ${score}/${maxScore} (scaled: ${scaledScore.toFixed(4)})`);
}

function getScore() {
    return {
        raw: parseInt(getSCORMValue("cmi.score.raw", "0")),
        max: parseInt(getSCORMValue("cmi.score.max", "100")),
        min: parseInt(getSCORMValue("cmi.score.min", "0")),
        scaled: parseFloat(getSCORMValue("cmi.score.scaled", "0"))
    };
}
```

### 5. LMS Communication and Error Handling

#### LMS API Error Handling
```javascript
function handleSCORMError(errorCode) {
    const errorMessages = {
        "0": "No error",
        "101": "General exception",
        "102": "Invalid argument error",
        "103": "Initialization cannot occur",
        "104": "Already initialized",
        "111": "Termination cannot occur",
        "112": "Not initialized",
        "113": "Already terminated",
        "122": "Data model element value not initialized",
        "123": "Data model element value is read only",
        "132": "Data model element type mismatch",
        "133": "Data model element value not supported",
        "201": "General termination failure",
        "301": "General get failure",
        "351": "General set failure",
        "391": "General commit failure",
        "401": "Undefined data model element",
        "402": "Unimplemented data model element",
        "403": "Data model element value not supported",
        "404": "Data model element is read only",
        "405": "Data model element is write only",
        "406": "Data model element type mismatch",
        "407": "Data model element value not initialized"
    };

    const message = errorMessages[errorCode] || `Unknown error (${errorCode})`;
    console.error(`❌ SCORM Error ${errorCode}: ${message}`);

    // Return user-friendly error message
    return {
        code: errorCode,
        message: message,
        userMessage: "There was an issue communicating with the learning management system. Your progress may not be saved."
    };
}

function checkSCORMError() {
    if (scormAPI) {
        const errorCode = scormAPI.GetLastError();
        if (errorCode !== "0") {
            return handleSCORMError(errorCode);
        }
    }
    return null;
}
```

#### Safe SCORM Operations
```javascript
function safeSCORMOperation(operation, fallbackValue = null) {
    if (!scormAPI) {
        console.warn("SCORM API not available, using fallback");
        return fallbackValue;
    }

    try {
        const result = operation();
        const error = checkSCORMError();

        if (error) {
            console.warn("SCORM operation failed, using fallback:", error.message);
            return fallbackValue;
        }

        return result;
    } catch (exception) {
        console.error("SCORM operation exception:", exception);
        return fallbackValue;
    }
}

// Safe wrapper functions
function safeGetValue(element, defaultValue = "") {
    return safeSCORMOperation(() => scormAPI.GetValue(element), defaultValue);
}

function safeSetValue(element, value, defaultValue = false) {
    return safeSCORMOperation(() => {
        const result = scormAPI.SetValue(element, value);
        return result === "true";
    }, defaultValue);
}

function safeCommit() {
    return safeSCORMOperation(() => {
        const result = scormAPI.Commit("");
        return result === "true";
    }, false);
}
```

### 6. SCORM Package Integration

#### SCORM Integration in Template
```html
<!-- Template includes SCORM API -->
<script src="scorm-api.js"></script>

<!-- Template initialization with SCORM data -->
<script>
window.onload = function() {
    console.log('🚀 Final initialization...');

    // Initialize SCORM first
    if (typeof initSCORM === 'function') {
        const scormInitialized = initSCORM();
        console.log('🔗 SCORM initialized:', scormInitialized);

        // Load state from suspend data if available
        if (scormInitialized) {
            loadFromSuspendData();
        }
    }

    // Fallback: Update header with learner data even if SCORM didn't work
    setTimeout(() => {
        if (typeof updateHeaderWithLearnerData === 'function') {
            updateHeaderWithLearnerData();
        }
    }, 1000);

    // Initialize other systems
    if (typeof initializeTemplate === 'function') {
        initializeTemplate();
    }

    if (typeof initializeTaskSystem === 'function') {
        initializeTaskSystem();
    }

    if (typeof initializeQuiz === 'function') {
        initializeQuiz();
    }

    // Set up auto-save interval for SCORM data
    setInterval(() => {
        if (scormAPI) {
            saveToSuspendData();
            updateSessionTime();
            safeCommit();
        }
    }, 30000); // Save every 30 seconds

    console.log('✅ Template fully initialized');
};
</script>
```

#### SCORM Manifest Integration
```xml
<!-- IMS Manifest File (imsmanifest.xml) -->
<manifest identifier="com.nebula.topic-{{topicId}}" version="1"
    xmlns="http://www.imsglobal.org/xsd/imscp_v1p1">

    <metadata>
        <lom:lom>
            <lom:general>
                <lom:title>
                    <lom:string language="en-US">{{title}}</lom:string>
                </lom:title>
                <lom:description>
                    <lom:string language="en-US">{{description}}</lom:string>
                </lom:description>
            </lom:general>
            <lom:educational>
                <lom:learningResourceType>
                    <lom:value>Assessment</lom:value>
                </lom:learningResourceType>
                <lom:intendedEndUserRole>
                    <lom:value>Learner</lom:value>
                </lom:intendedEndUserRole>
                <lom:context>
                    <lom:value>Education</lom:value>
                </lom:context>
            </lom:educational>
        </lom:lom>
    </metadata>

    <organizations default="org-1">
        <organization identifier="org-1">
            <title>{{title}}</title>
            <item identifier="item-1" identifierref="res-1">
                <title>{{title}}</title>
            </item>
        </organization>
    </organizations>

    <resources>
        <resource identifier="res-1" type="webcontent" href="index.html">
            <!-- List all files needed for SCORM package -->
            <file href="index.html"/>
            <file href="styles.css"/>
            <file href="scorm-api.js"/>
            <file href="chat-integration.js"/>
            <file href="core-functions.js"/>
            <file href="quiz-system.js"/>
            <file href="chat-system.js"/>
            <file href="task-system.js"/>
            <!-- Add other necessary files -->
        </resource>
    </resources>
</manifest>
```

### 7. Standalone Mode Fallback

#### Fallback Behavior for Standalone Operation
```javascript
// Fallback learner data for standalone mode
const STANDALONE_LEARNER_DATA = {
    id: "standalone-user",
    name: "Standalone Learner",
    progress: "incomplete",
    scorm: {
        initialized: false,
        apiVersion: null,
        lmsConnected: false,
        sessionId: generateSessionId()
    }
};

function initializeStandaloneMode() {
    console.log("🔄 Initializing standalone mode");

    // Use fallback learner data
    window.learnerData = { ...STANDALONE_LEARNER_DATA };
    scormLearnerData = { ...STANDALONE_LEARNER_DATA };

    // Store data in localStorage for persistence
    const storedData = localStorage.getItem('standaloneLearnerData');
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            window.learnerData = { ...window.learnerData, ...parsedData };
            scormLearnerData = { ...scormLearnerData, ...parsedData };
        } catch (error) {
            console.warn("Failed to load stored learner data:", error);
        }
    }

    // Update UI
    updateLearnerInfo();

    // Set up localStorage auto-save
    setInterval(() => {
        localStorage.setItem('standaloneLearnerData', JSON.stringify(window.learnerData));
    }, 5000); // Save every 5 seconds

    console.log("✅ Standalone mode initialized");
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
```

### 8. Exit and Cleanup

#### SCORM Termination
```javascript
function terminateSCORM() {
    if (scormAPI) {
        try {
            // Save final state
            saveToSuspendData();
            updateSessionTime();

            // Commit any pending changes
            safeCommit();

            // Set completion status if not already set
            const currentStatus = getSCORMValue("cmi.completion_status", "not attempted");
            if (currentStatus === "not attempted") {
                const progress = calculateProgress();
                if (progress >= 100) {
                    updateCompletionStatus("completed");
                } else if (progress > 0) {
                    updateCompletionStatus("incomplete");
                }
            }

            // Terminate SCORM session
            const result = scormAPI.Terminate("");
            console.log("🔚 SCORM Terminate result:", result);

            // Clean up
            scormAPI = null;

            return result === "true";
        } catch (error) {
            console.error("SCORM termination error:", error);
            return false;
        }
    }
    return true; // Not in SCORM environment
}

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (scormAPI) {
        // Save final state
        saveToSuspendData();
        updateSessionTime();
        safeCommit();
    }
});

window.addEventListener('unload', function() {
    terminateSCORM();
});
```

## Integration with Other Systems

### 1. Chat System Integration
```javascript
// Chat system uses SCORM learner data
if (window.chatSystem && window.learnerData) {
    window.chatSystem.initialize(window.templateData, window.topicConfig, window.learnerData);
    console.log('✅ Chat system initialized with SCORM learner data:', window.learnerData);
}
```

### 2. Quiz System Integration
```javascript
// Update SCORM when quiz is completed
function completeQuiz() {
    this.completed = true;
    window.quizCompleted = true;

    // Update SCORM progress
    if (typeof updateProgress === 'function') {
        updateProgress();
    }

    // Save to SCORM suspend data
    if (typeof saveToSuspendData === 'function') {
        saveToSuspendData();
    }
}
```

### 3. Task System Integration
```javascript
// Update SCORM when steps are completed
function markStepCompleted(stepIndex) {
    // ... existing completion logic ...

    // Update SCORM progress
    if (typeof updateProgress === 'function') {
        updateProgress();
    }

    // Save to SCORM suspend data
    if (typeof saveToSuspendData === 'function') {
        saveToSuspendData();
    }
}
```

## Data Persistence Strategy

### Current SCORM Data Flow
```
LMS ↔ SCORM API ↔ Browser Memory ↔ UI Updates
        ↓
   Suspend Data (JSON) ↔ Periodic Commits
```

### Data Saved in Suspend Data
```javascript
{
    "quizState": {
        "currentQuestionIndex": 2,
        "answers": {
            "0": 1,
            "1": [0, 2]
        },
        "score": 2,
        "completed": false
    },
    "taskState": {
        "completedSteps": [0, 1, 3],
        "revealedHints": [
            {
                "step": 2,
                "timestamp": "2024-01-15T10:30:00.000Z"
            }
        ],
        "hintsStartTime": "2024-01-15T10:15:00.000Z"
    },
    "timestamp": "2024-01-15T10:45:30.123Z",
    "sessionTime": 1830
}
```

## Best Practices

### 1. SCORM Compliance
- Follow SCORM 2004 4th Edition specifications
- Use appropriate data model elements
- Handle all error conditions gracefully
- Provide meaningful fallback behavior

### 2. Error Handling
- Always check SCORM API availability
- Implement comprehensive error handling
- Provide user-friendly error messages
- Maintain functionality in standalone mode

### 3. Performance
- Minimize SCORM API calls
- Batch updates when possible
- Use efficient data structures
- Implement debouncing for frequent updates

### 4. Data Integrity
- Validate data before storing
- Implement proper data sanitization
- Handle concurrent access scenarios
- Provide data recovery mechanisms

### 5. User Experience
- Maintain state across page refreshes
- Provide clear progress indicators
- Ensure responsive design for mobile
- Support accessibility requirements

## Troubleshooting

### Common SCORM Issues
1. **API Not Found**: Check LMS configuration and package structure
2. **Data Not Persisting**: Verify commit calls and error handling
3. **Learner Data Missing**: Check data model element access patterns
4. **Completion Status Not Updating**: Verify status value validation
5. **Suspend Data Too Large**: Implement data compression or selective saving

### Debug Information
```javascript
// SCORM debugging information
function getSCORMDebugInfo() {
    return {
        apiAvailable: !!scormAPI,
        learnerData: scormLearnerData,
        lastError: scormAPI ? scormAPI.GetLastError() : null,
        suspendDataSize: getSCORMValue("cmi.suspend_data", "").length,
        sessionTime: sessionTime,
        progress: calculateProgress()
    };
}

// Log debug information
console.log('🔍 SCORM Debug Info:', getSCORMDebugInfo());
```

This SCORM integration provides a robust foundation for LMS compatibility while maintaining flexibility for standalone operation and future stateful enhancements.