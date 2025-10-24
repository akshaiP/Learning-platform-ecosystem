# Quiz and Task System Implementation

## Overview
The SCORM Builder includes comprehensive quiz and task systems that provide interactive learning experiences. Currently, these systems operate in-memory and lose state on page refresh, making them stateless. This documentation covers the current implementation which serves as the foundation for the planned stateful enhancement.

## Quiz System Architecture

### 1. Quiz System Core
**File**: `templates/quiz-system.js`

Manages multi-question quizzes with support for multiple choice formats, progress tracking, and scoring.

#### Quiz System Class
```javascript
class QuizSystem {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.score = 0;
        this.completed = false;
        this.settings = {};
    }

    initialize(quizData) {
        if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
            console.warn('No valid quiz data provided');
            return;
        }

        this.questions = quizData.questions;
        this.settings = quizData.settings || {};
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.score = 0;
        this.completed = false;

        // Set global variables for backward compatibility
        window.quizQuestions = this.questions;
        window.currentQuestionIndex = this.currentQuestionIndex;
        window.quizAnswers = this.answers;
        window.quizScore = this.score;
        window.quizCompleted = this.completed;

        this.loadQuestion(0);
        this.updateProgress();
        this.updateNavigation();
    }
}
```

#### Question Loading and Rendering
```javascript
loadQuestion(questionIndex) {
    if (!this.questions || questionIndex >= this.questions.length) return;

    const question = this.questions[questionIndex];
    const container = document.getElementById('quizQuestionContainer');

    if (!container) return;

    const questionType = question.type || 'mcq'; // Default to MCQ

    // Build question HTML based on type
    let questionHTML = `
        <div class="quiz-question-container">
            <!-- Question Images (Individual display like task/hint sections) -->
            ${question.images && question.images.length > 0 ? this.generateImageHTML(question, questionIndex) : ''}

            <h4 class="text-xl font-bold text-gray-900 mb-8 leading-relaxed">${question.question}</h4>
            <div class="mb-4">
                <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    questionType === 'mcq'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                }">
                    ${questionType === 'mcq' ? 'Single Choice' : 'Multiple Choice'}
                </span>
            </div>
    `;

    if (questionType === 'mcq') {
        questionHTML += this.generateMCQOptions(question, questionIndex);
    } else if (questionType === 'checkbox') {
        questionHTML += this.generateCheckboxOptions(question, questionIndex);
    }

    questionHTML += `
            <div id="quizResult" class="hidden mb-6 p-6 rounded-2xl shadow-soft"></div>

            ${question.explanation_image ? this.generateExplanationImageHTML(question) : ''}
        </div>
    `;

    container.innerHTML = questionHTML;
    this.updateQuestionDots(questionIndex);

    // Check if question was already answered (for state restoration)
    if (this.answers[questionIndex] !== undefined) {
        this.restoreAnswerState(questionIndex, questionType);
    }
}
```

#### MCQ (Multiple Choice) Implementation
```javascript
generateMCQOptions(question, questionIndex) {
    return `
        <div class="space-y-4 mb-8" id="quizOptionsContainer">
            ${question.options.map((option, index) => `
                <button class="w-full text-left p-6 rounded-2xl border-2 border-gray-200 transition-all duration-300 quiz-option group shadow-soft"
                        data-option-index="${index}" onclick="quizSystem.selectOption(this, ${index})">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-600 transition-colors option-letter">
                            ${String.fromCharCode(65 + index)}.
                        </div>
                        <span class="option-text text-gray-800 font-medium text-lg">${option}</span>
                    </div>
                </button>
            `).join('')}
        </div>
    `;
}

selectOption(element, optionIndex, isReview = false) {
    const questionIndex = this.currentQuestionIndex;
    const question = this.questions[questionIndex];
    const questionType = question.type || 'mcq';

    // Only handle MCQ questions here
    if (questionType !== 'mcq') return;

    // Store answer
    this.answers[questionIndex] = optionIndex;
    window.quizAnswers = this.answers;

    // Update visual states
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.classList.remove('bg-green-100', 'border-green-500', 'text-green-800',
                            'bg-red-100', 'border-red-500', 'text-red-800');
    });

    const result = document.getElementById('quizResult');
    const explanationImage = document.getElementById('quizExplanationImage');

    if (optionIndex === question.correct_answer) {
        element.classList.add('bg-green-100', 'border-green-500', 'text-green-800');
        if (result) {
            result.className = 'block mb-4 p-4 rounded-xl bg-green-100 text-green-800 border border-green-300';
            result.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-check-circle text-green-600"></i>
                    <span class="font-semibold">Correct!</span>
                </div>
                <p class="mt-2">${question.explanation || 'Great job! You understand this concept well.'}</p>
            `;
        }

        if (!isReview) {
            this.score++;
            window.quizScore = this.score;
            this.updateScore();
        }

        if (explanationImage) explanationImage.classList.remove('hidden');

    } else {
        element.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
        if (result) {
            result.className = 'block mb-4 p-4 rounded-xl bg-red-100 text-red-800 border border-red-300';
            result.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-times-circle text-red-600"></i>
                    <span class="font-semibold">Incorrect</span>
                </div>
                <p class="mt-2">${question.explanation || 'Let me help you understand the correct answer.'}</p>
                ${!isReview ? `
                    <div class="mt-4 pt-3 border-t border-red-200">
                        <button onclick="quizSystem.askAIForHelp('mcq', ${optionIndex})"
                                class="group bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-medium hover:shadow-strong transform hover:-translate-y-1 flex items-center space-x-2">
                            <i class="fas fa-robot group-hover:animate-pulse"></i>
                            <span>Ask AI: Why is this answer wrong?</span>
                        </button>
                    </div>
                ` : ''}
            `;
        }

        if (explanationImage) explanationImage.classList.remove('hidden');
    }

    if (result) result.classList.remove('hidden');

    // Disable all options after selection to prevent changes
    try {
        options.forEach(opt => {
            opt.disabled = true;
            opt.classList.add('cursor-not-allowed', 'opacity-75');
        });
    } catch (e) {
        // no-op safeguard
    }

    this.updateNavigation();
}
```

#### Checkbox (Multiple Choice) Implementation
```javascript
generateCheckboxOptions(question, questionIndex) {
    const optionsPerColumn = Math.ceil(question.options.length / 2);
    const leftColumnOptions = question.options.slice(0, optionsPerColumn);
    const rightColumnOptions = question.options.slice(optionsPerColumn);

    return `
        <div class="mb-8" id="quizOptionsContainer">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="space-y-3">
                    ${leftColumnOptions.map((option, index) => `
                        <label class="flex items-start space-x-3 p-4 rounded-2xl border-2 border-gray-200 transition-all duration-300 cursor-pointer quiz-checkbox-option group shadow-soft"
                               data-option-index="${index}">
                            <input type="checkbox" class="mt-1 w-5 h-5 text-nebula-600 bg-gray-100 border-gray-300 rounded focus:ring-nebula-500 focus:ring-2"
                                   data-option-index="${index}" onchange="quizSystem.toggleCheckboxOption(this, ${index})">
                            <div class="flex items-center space-x-3 flex-1">
                                <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors text-sm">
                                    ${String.fromCharCode(65 + index)}.
                                </div>
                                <span class="option-text text-gray-800 font-medium">${option}</span>
                            </div>
                        </label>
                    `).join('')}
                </div>
                <div class="space-y-3">
                    ${rightColumnOptions.map((option, index) => `
                        <label class="flex items-start space-x-3 p-4 rounded-2xl border-2 border-gray-200 transition-all duration-300 cursor-pointer quiz-checkbox-option group shadow-soft"
                               data-option-index="${index + optionsPerColumn}">
                            <input type="checkbox" class="mt-1 w-5 h-5 text-nebula-600 bg-gray-100 border-gray-300 rounded focus:ring-nebula-500 focus:ring-2"
                                   data-option-index="${index + optionsPerColumn}" onchange="quizSystem.toggleCheckboxOption(this, ${index + optionsPerColumn})">
                            <div class="flex items-center space-x-3 flex-1">
                                <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors text-sm">
                                    ${String.fromCharCode(65 + index + optionsPerColumn)}.
                                </div>
                                <span class="option-text text-gray-800 font-medium">${option}</span>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="mt-6 text-center">
                <button id="submitCheckboxAnswer" onclick="quizSystem.submitCheckboxAnswer()"
                        class="bg-gradient-to-r from-nebula-500 to-nebula-purple-500 hover:from-nebula-600 hover:to-nebula-purple-600 text-white px-8 py-3 rounded-2xl font-semibold transition-all duration-300 shadow-medium hover:shadow-strong transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    Submit Answer
                </button>
            </div>
        </div>
    `;
}

toggleCheckboxOption(checkbox, optionIndex) {
    // Check if this question is already answered
    const questionIndex = this.currentQuestionIndex;
    if (this.answers[questionIndex] !== undefined) {
        // Question already answered, prevent changes
        checkbox.checked = !checkbox.checked; // Revert the change
        return;
    }

    this.updateCheckboxVisualState(optionIndex, checkbox.checked);
}

submitCheckboxAnswer() {
    const questionIndex = this.currentQuestionIndex;
    const question = this.questions[questionIndex];

    // Get selected options
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const selectedOptions = Array.from(checkboxes).map(cb => parseInt(cb.dataset.optionIndex));

    // Store answer
    this.answers[questionIndex] = selectedOptions;
    window.quizAnswers = this.answers;

    // Show result
    this.showCheckboxResult(questionIndex, selectedOptions);

    // Disable submit button and ALL checkboxes
    const submitBtn = document.getElementById('submitCheckboxAnswer');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Answer Submitted';
    }

    // Disable ALL checkboxes in the current question
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    allCheckboxes.forEach(cb => {
        cb.disabled = true;
        cb.style.pointerEvents = 'none';
    });

    // Also disable the labels to prevent clicking
    const allLabels = document.querySelectorAll('.quiz-checkbox-option');
    allLabels.forEach(label => {
        label.style.pointerEvents = 'none';
        label.style.cursor = 'default';
    });

    this.updateNavigation();
}
```

#### Progress Tracking and Navigation
```javascript
updateProgress() {
    const progressText = document.getElementById('quizProgressText');
    const progressBar = document.getElementById('quizProgressBar');

    if (progressText) {
        progressText.textContent = `${this.currentQuestionIndex + 1} of ${this.questions.length}`;
    }

    if (progressBar) {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

updateQuestionDots(activeIndex) {
    const dots = document.querySelectorAll('.question-dot');
    dots.forEach((dot, index) => {
        if (index === activeIndex) {
            dot.classList.remove('bg-gray-300');
            dot.classList.add('bg-nebula-500');
        } else if (this.answers[index] !== undefined) {
            dot.classList.remove('bg-gray-300');
            dot.classList.add('bg-green-500');
        } else {
            dot.classList.remove('bg-nebula-500', 'bg-green-500');
            dot.classList.add('bg-gray-300');
        }
    });
}

updateNavigation() {
    const prevBtn = document.getElementById('prevQuestionBtn');
    const nextBtn = document.getElementById('nextQuestionBtn');
    const retryBtn = document.getElementById('retryQuizBtn');

    if (prevBtn) {
        prevBtn.disabled = this.currentQuestionIndex === 0;
    }

    if (nextBtn) {
        // Check if current question is answered
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const questionType = currentQuestion?.type || 'mcq';
        const isAnswered = this.answers[this.currentQuestionIndex] !== undefined;

        // For checkbox questions, check if answer is submitted
        const isCheckboxSubmitted = questionType === 'checkbox' ?
            document.getElementById('submitCheckboxAnswer')?.disabled : true;

        const canProceed = isAnswered && (questionType === 'mcq' || isCheckboxSubmitted);

        nextBtn.disabled = !canProceed;

        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.innerHTML = '<span>Finish Quiz</span><i class="fas fa-check group-hover:translate-x-1 transition-transform duration-200"></i>';
        } else {
            nextBtn.innerHTML = '<span>Next</span><i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform duration-200"></i>';
        }
    }

    if (retryBtn) {
        retryBtn.classList.toggle('hidden', !this.completed);
    }
}
```

## Task System Architecture

### 1. Task System Core
**File**: `templates/task-system.js`

Manages step-by-step task completion with hint tracking and progress visualization.

#### Task System Class
```javascript
class TaskSystem {
    constructor() {
        this.completedSteps = new Set();
        this.revealedHints = [];
        this.hintsStartTime = null;
    }

    initialize() {
        // Initialize task progress tracking
        this.updateTaskProgress();

        // Initialize step-based hint tracking
        this.revealedHints = [];
        window.revealedHints = this.revealedHints;

        console.log('✅ Step-based task system initialized');
        console.log('📊 Task steps available:', window.templateData?.content?.task_steps?.length || 0);
    }
}
```

#### Step Completion Tracking
```javascript
markStepCompleted(stepIndex) {
    const idx = parseInt(stepIndex);
    if (Number.isNaN(idx)) return;
    if (this.completedSteps.has(idx)) return; // Already completed

    this.completedSteps.add(idx);

    // Update complete button
    const btn = document.getElementById(`complete-btn-${idx}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check-circle mr-1"></i><span class="align-middle">Completed</span>';
        btn.classList.remove('border-green-500', 'text-green-600');
        btn.classList.add('bg-green-500', 'text-white', 'border-green-600');
    }

    // Hide Reveal Hint button
    const hintBtn = document.querySelector(`.step-hint-btn[data-step-index="${idx}"]`);
    if (hintBtn) {
        hintBtn.style.display = 'none';
    }

    this.updateTaskProgress();
}

updateTaskProgress() {
    const progressBar = document.getElementById('taskProgressBar');
    const progressText = document.getElementById('taskProgressText');
    const hintsUsedDisplay = document.getElementById('hintsUsedDisplay');

    // Get task steps from template data
    const totalSteps = window.templateData?.taskSteps?.length || 0;
    const hintsUsed = this.revealedHints.length;
    const totalAvailableHints = window.templateData?.taskSteps?.filter(step => step.hint).length || 0;
    const completed = this.completedSteps.size;

    // Update hints used display
    if (hintsUsedDisplay) {
        hintsUsedDisplay.textContent = `${hintsUsed}/${totalAvailableHints}`;
    }

    // Update progress text
    if (progressText) {
        progressText.textContent = `${completed} of ${totalSteps} steps completed`;
    }

    // Update progress bar (based on completed steps)
    if (progressBar && totalSteps > 0) {
        const progressPercentage = (completed / totalSteps) * 100;
        progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
    }
}
```

#### Hint System Implementation
```javascript
revealStepHint(stepIndex) {
    const hintContent = document.getElementById(`step-hint-${stepIndex}`);
    const hintBtn = document.querySelector(`.step-hint-btn[data-step-index="${stepIndex}"]`);
    const completeBtn = document.getElementById(`complete-btn-${stepIndex}`);

    if (hintContent && hintBtn && !hintBtn.disabled) {
        // Check if already revealed or step is completed
        if (this.completedSteps.has(parseInt(stepIndex)) || this.revealedHints.some(h => h.step === parseInt(stepIndex))) {
            return; // Don't reveal if completed or already shown
        }

        // Disable and hide the hint button
        hintBtn.disabled = true;
        hintBtn.style.display = 'none';

        // Show hint content
        hintContent.classList.remove('hidden');

        // Track hint usage
        this.revealedHints.push({ step: parseInt(stepIndex), timestamp: new Date().toISOString() });
        window.revealedHints = this.revealedHints;

        // Ensure Mark Completed button remains visible
        if (completeBtn) {
            completeBtn.style.display = 'block';
        }

        // Update progress and animate reveal
        this.updateTaskProgress();
        hintContent.style.opacity = '0';
        hintContent.style.transform = 'translateY(20px)';
        hintContent.style.transition = 'all 0.5s ease-out';
        setTimeout(() => {
            hintContent.style.opacity = '1';
            hintContent.style.transform = 'translateY(0)';
        }, 50);

        this.checkAllHintsUsed();
    }
}

checkAllHintsUsed() {
    const totalAvailableHints = window.templateData?.content?.task_steps?.filter(step => step.hint).length || 0;
    const hintsUsed = this.revealedHints.length;

    if (hintsUsed >= totalAvailableHints && totalAvailableHints > 0) {
        const allHintsBtn = document.getElementById('allHintsUsedBtn');
        if (allHintsBtn) {
            allHintsBtn.classList.remove('hidden');
            allHintsBtn.style.animation = 'slideInUp 0.5s ease-out';
        }
    }
}
```

## Current Data Structures

### 1. Quiz Data Structure
```javascript
// Current quiz state (lost on refresh)
{
    questions: [
        {
            id: "q1",
            question: "What is robotics?",
            type: "mcq", // or "checkbox"
            options: ["Option A", "Option B", "Option C"],
            correct_answer: 0, // for mcq
            correct_answers: [0, 2], // for checkbox
            explanation: "Explanation text",
            explanation_image: {
                src: "explanation.png",
                alt: "Explanation visual"
            },
            images: [
                {
                    src: "question.png",
                    alt: "Question image",
                    caption: "Image caption"
                }
            ]
        }
    ],
    settings: {
        allow_retry: true,
        show_progress: true,
        randomize_questions: false,
        passing_score: 3
    },
    currentQuestionIndex: 0,
    answers: {
        0: 1, // Question 0 answered with option 1
        1: [0, 2] // Question 1 answered with options 0 and 2
    },
    score: 2,
    completed: false
}
```

### 2. Task Data Structure
```javascript
// Current task state (lost on refresh)
{
    completedSteps: new Set([0, 1, 3]), // Steps 0, 1, and 3 are completed
    revealedHints: [
        {
            step: 2,
            timestamp: "2024-01-15T10:30:00.000Z"
        }
    ],
    hintsStartTime: null,
    totalSteps: 5,
    availableHints: 3
}
```

## Integration Points

### 1. Template Integration
```html
<!-- Quiz Section -->
{{#quiz}}
<section class="bg-gradient-to-br from-gray-50 to-white border-t border-gray-200">
    <!-- Quiz Header -->
    <div class="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white px-8 py-8">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <i class="fas fa-brain text-white text-2xl"></i>
                </div>
                <div>
                    <h3 class="text-3xl font-bold">{{quiz.title}}</h3>
                    <p class="text-purple-100 mt-1 text-lg">{{quiz.description}}</p>
                </div>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold" id="quizProgressText">1 of {{quiz.questions.length}}</div>
                <div class="text-purple-200 text-sm">Questions</div>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div id="quizProgressBar" class="h-full bg-gradient-to-r from-white/40 to-white/60 rounded-full transition-all duration-500 ease-out" style="width: 33.33%"></div>
        </div>
    </div>

    <!-- Quiz Content -->
    <div class="p-8">
        <!-- Question Navigation -->
        <div class="flex justify-center mb-8">
            <div class="flex space-x-2" id="questionDots">
                {{#quiz.questions}}
                <div class="w-3 h-3 rounded-full bg-gray-300 question-dot" data-question="{{@index}}"></div>
                {{/quiz.questions}}
            </div>
        </div>

        <!-- Current Question Container -->
        <div id="quizQuestionContainer">
            <!-- Question will be dynamically loaded here -->
        </div>
    </div>
</section>
{{/quiz}}

<!-- Task Steps Section -->
{{#content.task_steps.length}}
<div class="flex flex-col space-y-8">
    {{#content.task_steps}}
    <div class="task-step bg-white rounded-3xl shadow-medium border border-gray-200 overflow-hidden" data-step="{{_idx}}">
        <!-- Step Header -->
        <div class="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-8 py-6 border-b border-gray-200">
            <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-medium">
                    {{displayIndex}}
                </div>
                <div class="flex-1">
                    <h4 class="text-xl font-bold text-gray-900">{{title}}</h4>
                    {{#description}}
                    <p class="text-gray-600 mt-1">{{description}}</p>
                    {{/description}}
                </div>
                <div class="flex items-center">
                    <button id="complete-btn-{{_idx}}" data-step-index="{{_idx}}" onclick="markStepCompleted(this.dataset.stepIndex)" class="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-60">
                        <i class="fas fa-check mr-1"></i>
                        <span class="align-middle">Mark Completed</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Step Content with Hint -->
        {{#hint}}
        <div class="mt-8 pt-6 border-t border-gray-200">
            <button onclick="revealStepHint(this.dataset.stepIndex)"
                    data-step-index="{{_idx}}"
                    class="step-hint-btn group bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-200 shadow-medium hover:shadow-strong transform hover:-translate-y-1 flex items-center space-x-3">
                <i class="fas fa-lightbulb group-hover:animate-pulse"></i>
                <span>Reveal Hint</span>
            </button>

            <div id="step-hint-{{_idx}}" class="step-hint-content hidden mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                <!-- Hint content -->
            </div>
        </div>
        {{/hint}}
    </div>
    {{/content.task_steps}}
</div>
{{/content.task_steps.length}}
```

### 2. Chat Integration
```javascript
// Quiz failure triggers chat
askAIForHelp(questionType, userAnswer) {
    const questionIndex = this.currentQuestionIndex;
    const question = this.questions[questionIndex];

    if (typeof openQuizFailureChat === 'function') {
        if (questionType === 'checkbox') {
            // Format selected options text for checkbox questions
            const selectedOptions = Array.isArray(userAnswer) ? userAnswer : JSON.parse(userAnswer);
            const selectedOptionsText = selectedOptions.map(index => question.options[index]).join(', ');
            const correctAnswers = question.correct_answers || [];
            const correctOptionsText = correctAnswers.map(index => question.options[index]).join(', ');

            // Create a modified question object with formatted text
            const formattedQuestion = {
                ...question,
                selectedOptionsText: selectedOptionsText,
                correctOptionsText: correctOptionsText,
                questionType: 'checkbox'
            };

            openQuizFailureChat(formattedQuestion, selectedOptionsText);
        } else {
            // Handle MCQ questions
            openQuizFailureChat(question, userAnswer);
        }
    }
}

// Hints exhausted triggers chat
checkAllHintsUsed() {
    const totalAvailableHints = window.templateData?.content?.task_steps?.filter(step => step.hint).length || 0;
    const hintsUsed = this.revealedHints.length;

    if (hintsUsed >= totalAvailableHints && totalAvailableHints > 0) {
        const allHintsBtn = document.getElementById('allHintsUsedBtn');
        if (allHintsBtn) {
            allHintsBtn.classList.remove('hidden');
            allHintsBtn.style.animation = 'slideInUp 0.5s ease-out';
        }
    }
}
```

## Current Limitations (Stateless Behavior)

### 1. Data Persistence Issues
```javascript
// All quiz state is stored in memory and lost on refresh
window.quizSystem = new QuizSystem();
window.currentQuestionIndex = 0;
window.quizAnswers = {};
window.quizScore = 0;
window.quizCompleted = false;

// All task state is stored in memory and lost on refresh
window.taskSystem = new TaskSystem();
window.completedSteps = new Set();
window.revealedHints = [];
```

### 2. No Backend Integration
```javascript
// Current systems only update UI state
selectOption(element, optionIndex, isReview = false) {
    // Store answer only in memory
    this.answers[questionIndex] = optionIndex;
    window.quizAnswers = this.answers;

    // Update UI only
    // No backend persistence
}

markStepCompleted(stepIndex) {
    // Store completion only in memory
    this.completedSteps.add(idx);

    // Update UI only
    // No backend persistence
}
```

### 3. No User Session Tracking
```javascript
// No user identification for personalization
// No session management for progress continuity
// No analytics or performance tracking
```

## Foundation for Stateful Enhancement

The current implementation provides excellent foundation for adding stateful capabilities:

### 1. Well-Structured Data Models
- Clear separation between quiz and task systems
- Comprehensive state tracking in memory
- Event-driven architecture for state changes

### 2. Modular Design
- Separate classes for QuizSystem and TaskSystem
- Clean interfaces for integration
- Extensible architecture for new features

### 3. Rich Interaction Tracking
- Detailed hint usage tracking with timestamps
- Complete answer history for quizzes
- Progress metrics and completion states

### 4. Integration Points Ready
- Chat system integration for contextual help
- Template system for dynamic rendering
- Event system for state change notifications

## Best Practices in Current Implementation

### 1. User Experience
- Clear visual feedback for all interactions
- Progress indicators and navigation controls
- Smooth animations and transitions
- Responsive design for mobile devices

### 2. Accessibility
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility
- High contrast and clear typography

### 3. Performance
- Efficient DOM manipulation
- Event delegation for dynamic content
- Optimized rendering for large datasets
- Memory-efficient data structures

### 4. Error Handling
- Graceful degradation for missing data
- Input validation and sanitization
- Comprehensive logging for debugging
- Fallback behaviors for edge cases

## Data Flow Analysis

### Current Data Flow
```
Topic Config (JSON) → Template Rendering → In-Memory State → UI Updates
                                     ↑
                            Lost on Page Refresh
```

### Target Stateful Data Flow (Future Enhancement)
```
Topic Config (JSON) → Template Rendering → Backend Sync → Persistent State → UI Updates
                                     ↑                    ↓
                            User Interaction → State Updates → Backend Storage
```

The current implementation provides a solid foundation that can be enhanced with backend persistence while maintaining the existing user experience and functionality.