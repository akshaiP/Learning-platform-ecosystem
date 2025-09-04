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
        scormLearnerData.id = scormAPI.GetValue("cmi.learner_id") || "anonymous";
        scormLearnerData.name = scormAPI.GetValue("cmi.learner_name") || "Anonymous Learner";
        scormLearnerData.progress = scormAPI.GetValue("cmi.completion_status") || "not attempted";
        
        // Update the global learnerData for other scripts
        if (typeof learnerData !== 'undefined') {
            learnerData.id = scormLearnerData.id;
            learnerData.name = scormLearnerData.name;
            learnerData.progress = scormLearnerData.progress;
        }
        
        updateLearnerInfo();
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
            <span class="text-white font-medium">Welcome, <strong>${scormLearnerData.name}</strong></span>
            <span class="text-white/80 text-sm">Progress: ${scormLearnerData.progress}</span>
        `;
    }
}

var sessionStartTime = Date.now();
var sessionTime = 0;

setInterval(() => {
    sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
}, 1000);