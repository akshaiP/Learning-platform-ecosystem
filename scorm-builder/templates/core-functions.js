// Enhanced Core Learning Functions for Task-Based Learning
let templateData = {};
let currentHint = 0;
let maxHints = 0;
let quizCompleted = false;
let progressStep = 0;
let quizCorrectAnswer = 0;
let topicConfig = {};
let learnerData = {};
let selectedQuizOption = null;

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
    quizCorrectAnswer = templateData.quiz ? templateData.quiz.correct_answer : 0;
    
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
    setupQuizOptions();
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
    if (step >= 4 && quizCompleted) {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.classList.remove('hidden');
    }
}

function setupQuizOptions() {
    const options = document.querySelectorAll('.quiz-option');
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    options.forEach((option, index) => {
        const letterSpan = option.querySelector('.option-letter');
        if (letterSpan && letters[index]) {
            letterSpan.textContent = letters[index] + '.';
        }
        
        // Remove existing listeners and add new ones
        option.removeEventListener('click', handleQuizClick);
        option.addEventListener('click', function() {
            handleQuizClick(this, index);
        });
    });
}

function handleQuizClick(element, optionIndex) {
    // Prevent multiple selections (fixed answer approach)
    if (selectedQuizOption !== null) return;
    
    selectedQuizOption = optionIndex;
    const options = document.querySelectorAll('.quiz-option');
    
    // Update visual states
    options.forEach((opt, i) => {
        opt.classList.remove('bg-green-100', 'border-green-500', 'text-green-800', 
                            'bg-red-100', 'border-red-500', 'text-red-800');
        
        if (i === optionIndex) {
            if (optionIndex === quizCorrectAnswer) {
                opt.classList.add('bg-green-100', 'border-green-500', 'text-green-800');
            } else {
                opt.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
            }
        }
    });
    
    // Show results and actions
    const result = document.getElementById('quizResult');
    const actions = document.getElementById('quizActions');
    const explanationImage = document.getElementById('quizExplanationImage');
    
    if (optionIndex === quizCorrectAnswer) {
        // Correct answer
        if (result) {
            result.className = 'block mb-4 p-4 rounded-xl bg-green-100 text-green-800 border border-green-300';
            result.textContent = '✅ Excellent! You understand the concept correctly.';
        }
        
        if (explanationImage) explanationImage.classList.remove('hidden');
        
        const proceedBtn = document.getElementById('proceedBtn');
        if (proceedBtn) proceedBtn.classList.remove('hidden');
        
        quizCompleted = true;
        updateProgress(4);
        
    } else {
        // Wrong answer
        if (result) {
            result.className = 'block mb-4 p-4 rounded-xl bg-red-100 text-red-800 border border-red-300';
            result.textContent = '❌ Not quite right. Let me help you understand the correct answer.';
        }
        
        if (explanationImage) explanationImage.classList.remove('hidden');
        
        // Trigger remedial chat after a brief delay
        setTimeout(() => {
            if (typeof openQuizFailureChat === 'function') {
                openQuizFailureChat();
            }
        }, 2000);
    }
    
    if (actions) actions.classList.remove('hidden');
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

// Chat sidebar management functions
function openChatSidebar() {
    const sidebar = document.getElementById('chatSidebar');
    const pageWrapper = document.getElementById('pageWrapper');
    
    if (sidebar) {
        sidebar.classList.remove('hidden');
        setTimeout(() => {
            sidebar.classList.remove('translate-x-full');
            if (pageWrapper) {
                pageWrapper.style.marginRight = '384px'; // 24rem = 384px
            }
        }, 10);
    }
}

function closeChatSidebar() {
    const sidebar = document.getElementById('chatSidebar');
    const pageWrapper = document.getElementById('pageWrapper');
    
    if (sidebar) {
        sidebar.classList.add('translate-x-full');
        if (pageWrapper) {
            pageWrapper.style.marginRight = '0';
        }
        
        setTimeout(() => {
            sidebar.classList.add('hidden');
        }, 300);
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

// Utility functions for template interaction
function resetQuiz() {
    selectedQuizOption = null;
    quizCompleted = false;
    
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.classList.remove('bg-green-100', 'border-green-500', 'text-green-800', 
                            'bg-red-100', 'border-red-500', 'text-red-800');
    });
    
    const result = document.getElementById('quizResult');
    const actions = document.getElementById('quizActions');
    const explanationImage = document.getElementById('quizExplanationImage');
    
    if (result) result.classList.add('hidden');
    if (actions) actions.classList.add('hidden');
    if (explanationImage) explanationImage.classList.add('hidden');
}

function getCompletionStatus() {
    return {
        progressStep: progressStep,
        hintsRevealed: currentHint,
        quizCompleted: quizCompleted,
        quizAnswer: selectedQuizOption,
        isCorrect: selectedQuizOption === quizCorrectAnswer
    };
}

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
window.openChatSidebar = openChatSidebar;
window.closeChatSidebar = closeChatSidebar;
window.startTask = startTask;
window.taskCompleted = taskCompleted;
window.getCompletionStatus = getCompletionStatus;