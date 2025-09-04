// Core Learning Functions
let templateData = {};
let currentHint = 0;
let maxHints = 0;
let quizCompleted = false;
let progressSteps = 0;
let quizCorrectAnswer = 0;
let topicConfig = {};

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
    
    // Initialize learning content
    updateProgress(1);
    setupQuizOptions();
}

function updateProgress(step) {
    progressSteps = step;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const percentage = (step / 4) * 100;
    if (progressFill) progressFill.style.width = percentage + '%';
    
    const steps = [
        'Step 1 of 4: Understanding the Task',
        'Step 2 of 4: Learning Prerequisites',
        'Step 3 of 4: Implementation Practice', 
        'Step 4 of 4: Knowledge Assessment'
    ];
    
    if (progressText) progressText.textContent = steps[step - 1] || steps[0];
    
    if (step >= 4) {
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
        
        option.addEventListener('click', function() {
            const optionIndex = parseInt(this.getAttribute('data-option-index'));
            selectQuizOption(this, optionIndex);
        });
    });
}

function toggleHints() {
    const hintsSection = document.getElementById('hintsSection');
    if (hintsSection) {
        hintsSection.classList.toggle('hidden');
        if (!hintsSection.classList.contains('hidden')) {
            updateProgress(2);
        }
    }
}

function revealNextHint() {
    if (currentHint < maxHints) {
        const hint = document.querySelector(`[data-hint-index="${currentHint}"]`);
        if (hint) {
            hint.classList.remove('opacity-30');
            hint.classList.add('opacity-100', 'border-yellow-400', 'bg-yellow-100');
            currentHint++;
        }
        
        if (currentHint >= maxHints) {
            const exhaustedBtn = document.getElementById('hintsExhaustedBtn');
            if (exhaustedBtn) exhaustedBtn.classList.remove('hidden');
        }
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTemplate);
} else {
    initializeTemplate();
}