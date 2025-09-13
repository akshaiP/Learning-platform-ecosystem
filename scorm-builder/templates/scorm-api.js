// SCORM API Integration
var scormAPI = null;
var scormLearnerData = {
    id: null,
    name: null,
    progress: null
};

function findAPI(win) {
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
        var result = scormAPI.Initialize("");
        console.log("🔗 SCORM API Initialize result:", result);
        
        // Try multiple SCORM data model elements for learner information
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
        
        // Update the global learnerData for other scripts
        if (typeof window.learnerData !== 'undefined') {
            window.learnerData.id = scormLearnerData.id;
            window.learnerData.name = scormLearnerData.name;
            window.learnerData.progress = scormLearnerData.progress;
        }
        
        updateLearnerInfo();
        
        // Re-initialize chat system with updated learner data
        if (window.chatSystem && window.templateData && window.topicConfig && window.learnerData) {
            window.chatSystem.initialize(window.templateData, window.topicConfig, window.learnerData);
            console.log('✅ Chat system re-initialized with SCORM learner data:', window.learnerData);
        }
        
        return true;
    } catch (error) {
        console.error("SCORM initialization error:", error);
        return false;
    }
}

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

var sessionStartTime = Date.now();
var sessionTime = 0;

setInterval(() => {
    sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
}, 1000);

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

// Export functions for global access
window.updateLearnerInfo = updateLearnerInfo;
window.updateHeaderWithLearnerData = updateHeaderWithLearnerData;