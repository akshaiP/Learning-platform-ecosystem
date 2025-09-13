// Enhanced Core Learning Functions for Task-Based Learning
let templateData = {};
let currentHint = 0;
let maxHints = 0;
let progressStep = 0;
let topicConfig = {};
let learnerData = {};

function initializeTemplate() {
    // Parse template data
    try {
        templateData = JSON.parse(document.getElementById('templateData').textContent);
    } catch (e) {
        console.error('Failed to parse template data:', e);
        templateData = { hints: [], quiz: null, id: '', backendUrl: '', chatContexts: {} };
    }

    // Initialize variables
    maxHints = templateData.hints ? templateData.hints.length : 0;
    
    topicConfig = {
        topic: templateData.id,
        backendUrl: templateData.backendUrl,
        contexts: templateData.chatContexts || {}
    };
    
    // Initialize with default learner data
    learnerData = {
        id: 'anonymous',
        name: 'Learner',
        progress: 'not_attempted'
    };
    
    // Initialize UI
    updateProgress(1);
    setupHintSystem();
}

function updateProgress(step) {
    progressStep = step;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const percentage = (step / 4) * 100;
    if (progressFill) progressFill.style.width = percentage + '%';
    
    const steps = [
        'Task Understanding',
        'Working on Solution', 
        'Practice & Application',
        'Knowledge Assessment'
    ];
    
    if (progressText) progressText.textContent = steps[step - 1] || steps[0];
    
    // Show next button when completed
    if (step >= 4 && (window.quizCompleted || false)) {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.classList.remove('hidden');
    }
}

function setupHintSystem() {
    const hints = document.querySelectorAll('.hint-card');
    hints.forEach((hint, index) => {
        hint.setAttribute('data-hint-index', index);
        if (index > 0) {
            hint.classList.add('opacity-50');
        }
    });
}

function toggleHintsSection() {
    const container = document.getElementById('hintsContainer');
    const toggleText = document.getElementById('hintsToggleText');
    
    if (container && toggleText) {
        const isHidden = container.classList.contains('hidden');
        
        if (isHidden) {
            container.classList.remove('hidden');
            toggleText.textContent = 'Hide Hints';
            updateProgress(2);
        } else {
            container.classList.add('hidden');
            toggleText.textContent = 'Show Hints';
        }
    }
}

function revealNextHint() {
    if (currentHint < maxHints) {
        const hint = document.querySelector(`[data-hint-index="${currentHint}"]`);
        if (hint) {
            hint.classList.remove('opacity-50');
            hint.classList.add('opacity-100');
            hint.style.transform = 'scale(1.02)';
            
            // Add subtle animation
            setTimeout(() => {
                hint.style.transform = 'scale(1)';
            }, 200);
            
            currentHint++;
        }
        
        // Show "need more help" button when all hints are exhausted
        if (currentHint >= maxHints) {
            const exhaustedBtn = document.getElementById('hintsExhaustedBtn');
            if (exhaustedBtn) {
                exhaustedBtn.classList.remove('hidden');
            }
        }
        
        // Update progress when hints are being used
        if (currentHint === 1) {
            updateProgress(2);
        }
    }
}

// Learning state management
function recordLearningAction(action, context = {}) {
    const learningEvent = {
        timestamp: new Date().toISOString(),
        action: action,
        topic: topicConfig.topic,
        progress: progressStep,
        context: context
    };
    
    // Store in session for potential SCORM reporting
    if (typeof sessionStorage !== 'undefined') {
        const events = JSON.parse(sessionStorage.getItem('learningEvents') || '[]');
        events.push(learningEvent);
        sessionStorage.setItem('learningEvents', JSON.stringify(events));
    }
    
    console.log('Learning Action:', learningEvent);
}

// Task interaction tracking
function startTask() {
    recordLearningAction('task_started');
    updateProgress(2);
    
    // Open help automatically for task guidance
    if (typeof openTaskHelp === 'function') {
        openTaskHelp();
    }
}

function taskCompleted() {
    recordLearningAction('task_completed');
    updateProgress(3);
}

function getCompletionStatus() {
    // Get quiz status from the multi-question system if available
    const multiQuizStatus = {
        quizCompleted: window.quizCompleted || false,
        quizScore: window.quizScore || 0,
        currentQuestionIndex: window.currentQuestionIndex || 0,
        totalQuestions: window.quizQuestions ? window.quizQuestions.length : 0,
        answers: window.quizAnswers || {}
    };
    
    return {
        progressStep: progressStep,
        hintsRevealed: currentHint,
        quizCompleted: multiQuizStatus.quizCompleted,
        multiQuiz: multiQuizStatus
    };
}

// Code Modal Functions
function openCodeModal(code, language) {
    const modal = document.getElementById('codeModal');
    const codeContent = document.getElementById('modalCodeContent');
    
    if (!modal || !codeContent) return;
    
    // Clear previous content and classes
    codeContent.textContent = code;
    codeContent.className = '';

    // Remove previous highlight state if any
    if (codeContent.dataset && codeContent.dataset.highlighted) {
        codeContent.removeAttribute('data-highlighted');
    }

    // Apply new language class
    codeContent.classList.add(`language-${language}`);
    
    // Re-highlight
    if (typeof hljs !== 'undefined') {
        hljs.highlightElement(codeContent);
    }
    
    modal.classList.remove('hidden');
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}

function closeCodeModal() {
    const modal = document.getElementById('codeModal');
    if (!modal) return;
    
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function copyModalCode() {
    const codeContent = document.getElementById('modalCodeContent');
    if (!codeContent) return;
    
    navigator.clipboard.writeText(codeContent.textContent).then(() => {
        const btn = document.getElementById('modalCopyBtn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', (event) => {
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
        });
    }
});

// Code modal event listeners
document.addEventListener('click', (e) => {
    if (e.target.closest('.open-code-modal-btn')) {
        const button = e.target.closest('.open-code-modal-btn');
        const code = button.dataset.code;
        const language = button.dataset.language;
        
        if (code && language) {
            // Decode HTML entities back to original text
            const decodedCode = code
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#10;/g, '\n')
                .replace(/&#13;/g, '\r')
                .replace(/&#9;/g, '\t')
                .replace(/&#x2028;/g, '\u2028')
                .replace(/&#x2029;/g, '\u2029')
                .replace(/&amp;/g, '&');
                
            openCodeModal(decodedCode, language);
        }
    }
});

// Close modal on overlay click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('codeModal');
    if (e.target === modal && modal) {
        closeCodeModal();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('codeModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeCodeModal();
        }
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTemplate);
} else {
    initializeTemplate();
}

// Export functions for global access
window.updateProgress = updateProgress;
window.revealNextHint = revealNextHint;
window.toggleHintsSection = toggleHintsSection;
window.startTask = startTask;
window.taskCompleted = taskCompleted;
window.getCompletionStatus = getCompletionStatus;
window.openCodeModal = openCodeModal;
window.closeCodeModal = closeCodeModal;
window.copyModalCode = copyModalCode;