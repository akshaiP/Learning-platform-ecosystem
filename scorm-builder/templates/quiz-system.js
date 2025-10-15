// Multi-Question Quiz System
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

    loadQuestion(questionIndex) {
        if (!this.questions || questionIndex >= this.questions.length) return;

        const question = this.questions[questionIndex];
        const container = document.getElementById('quizQuestionContainer');

        if (!container) return;

        const questionType = question.type || 'mcq'; // Default to MCQ for backward compatibility

        // Build question HTML based on type
        let questionHTML = `
            <div class="quiz-question-container">
                <!-- Question Images (Individual display like task/hint sections) -->
                ${question.images && question.images.length > 0 ? `
                    <div class="mb-6">
                        ${question.images.length > 1 ? `
                            <!-- Multiple Images - Individual Display -->
                            <div class="relative" data-carousel="question" data-question-index="${questionIndex}">
                                <div class="bg-gray-50 rounded-2xl p-4 shadow-soft">
                                    <div class="h-64 sm:h-80 flex items-center justify-center">
                                        <img id="question-image-${questionIndex}"
                                             src="${question.images[0].src}"
                                             alt="${question.images[0].alt || 'Question image 1'}"
                                             class="max-w-full h-full object-contain rounded-xl shadow-medium cursor-zoom-in transition-transform duration-300 hover:scale-105"
                                             onclick="openImageModal(this.src, this.alt)">
                                    </div>
                                    <p id="question-image-caption-${questionIndex}" class="text-sm text-gray-600 mt-3 font-medium text-center">${question.images[0].caption || ''}</p>
                                </div>
                                <!-- Carousel Controls -->
                                <div class="flex justify-between items-center mt-3">
                                    <button class="px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-soft text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                                            data-question-index="${questionIndex}" onclick="prevQuestionImage(this.dataset.questionIndex)">
                                        <i class="fas fa-chevron-left mr-1"></i>Prev
                                    </button>
                                    <div class="text-xs text-gray-500 font-medium">
                                        <span id="question-carousel-indicator-${questionIndex}">1</span> / ${question.images.length}
                                    </div>
                                    <button class="px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-soft text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                                            data-question-index="${questionIndex}" onclick="nextQuestionImage(this.dataset.questionIndex)">
                                        Next<i class="fas fa-chevron-right ml-1"></i>
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <!-- Single Image -->
                            <div class="text-center">
                                <div class="inline-block bg-gray-50 rounded-2xl p-4 shadow-soft">
                                    <img src="${question.images[0].src}" alt="${question.images[0].alt || 'Question image'}"
                                         class="max-w-full h-64 sm:h-80 object-contain rounded-xl shadow-medium cursor-zoom-in transition-transform duration-300 hover:scale-105"
                                         onclick="openImageModal('${question.images[0].src}', '${question.images[0].alt || 'Question image'}')">
                                    ${question.images[0].caption ? `
                                        <p class="text-sm text-gray-600 mt-3 font-medium text-center">${question.images[0].caption}</p>
                                    ` : ''}
                                </div>
                            </div>
                        `}
                    </div>
                ` : ''}

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
            // MCQ - Single choice with radio buttons
            questionHTML += `
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
        } else if (questionType === 'checkbox') {
            // Checkbox - Multiple choice with checkboxes
            const optionsPerColumn = Math.ceil(question.options.length / 2);
            const leftColumnOptions = question.options.slice(0, optionsPerColumn);
            const rightColumnOptions = question.options.slice(optionsPerColumn);
            
            questionHTML += `
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

        questionHTML += `
                <div id="quizResult" class="hidden mb-6 p-6 rounded-2xl shadow-soft"></div>
                
                ${question.explanation_image ? `
                    <div id="quizExplanationImage" class="hidden mb-8 text-center">
                        <div class="inline-block bg-gray-50 rounded-2xl p-4 shadow-soft">
                            <img src="${question.explanation_image.src}" alt="${question.explanation_image.alt}" 
                                 class="max-w-full h-auto rounded-xl shadow-medium mx-auto">
                            <p class="text-sm text-gray-600 mt-4 font-medium italic">Visual explanation</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = questionHTML;
        this.updateQuestionDots(questionIndex);

        // Check if question was already answered
        if (this.answers[questionIndex] !== undefined) {
            if (questionType === 'mcq') {
                const selectedOption = this.answers[questionIndex];
                const optionElement = container.querySelector(`[data-option-index="${selectedOption}"]`);
                if (optionElement) {
                    this.selectOption(optionElement, selectedOption, true);
                }
            } else if (questionType === 'checkbox') {
                const selectedOptions = this.answers[questionIndex];
                if (Array.isArray(selectedOptions)) {
                    selectedOptions.forEach(optionIndex => {
                        const checkbox = container.querySelector(`input[data-option-index="${optionIndex}"]`);
                        if (checkbox) {
                            checkbox.checked = true;
                            this.updateCheckboxVisualState(optionIndex, true);
                        }
                    });
                    
                    // Disable all checkboxes and labels if already answered
                    const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
                    allCheckboxes.forEach(cb => {
                        cb.disabled = true;
                        cb.style.pointerEvents = 'none';
                    });
                    
                    const allLabels = container.querySelectorAll('.quiz-checkbox-option');
                    allLabels.forEach(label => {
                        label.style.pointerEvents = 'none';
                        label.style.cursor = 'default';
                    });
                    
                    // Disable submit button
                    const submitBtn = container.querySelector('#submitCheckboxAnswer');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Answer Submitted';
                    }
                    
                    // Show the result if already answered
                    this.showCheckboxResult(questionIndex, selectedOptions, true);
                }
            }
        }
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

    // New methods for checkbox questions
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

    updateCheckboxVisualState(optionIndex, isSelected) {
        const label = document.querySelector(`label[data-option-index="${optionIndex}"]`);
        if (label) {
            if (isSelected) {
                label.classList.add('bg-nebula-50', 'border-nebula-400');
                label.classList.remove('border-gray-200');
            } else {
                label.classList.remove('bg-nebula-50', 'border-nebula-400');
                label.classList.add('border-gray-200');
            }
        }
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
        
        // Disable submit button and ALL checkboxes (not just checked ones)
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

    showCheckboxResult(questionIndex, selectedOptions, isReview = false) {
        const question = this.questions[questionIndex];
        const correctAnswers = question.correct_answers || [];
        const result = document.getElementById('quizResult');
        const explanationImage = document.getElementById('quizExplanationImage');
        
        // Check if answer is correct
        const isCorrect = this.arraysEqual(selectedOptions.sort(), correctAnswers.sort());
        
        // Update visual states for all options
        const allOptions = document.querySelectorAll('.quiz-checkbox-option');
        allOptions.forEach((option, index) => {
            const isSelected = selectedOptions.includes(index);
            const isCorrectOption = correctAnswers.includes(index);
            
            option.classList.remove('bg-green-100', 'border-green-500', 'text-green-800',
                                  'bg-red-100', 'border-red-500', 'text-red-800',
                                  'bg-emerald-100', 'border-emerald-400', 'text-emerald-800');
            
            if (isCorrectOption && isSelected) {
                // Correct option selected - bright green
                option.classList.add('bg-green-100', 'border-green-500', 'text-green-800');
            } else if (isCorrectOption && !isSelected) {
                // Correct option not selected - lighter green shade
                option.classList.add('bg-emerald-100', 'border-emerald-400', 'text-emerald-800');
            } else if (!isCorrectOption && isSelected) {
                // Incorrect option selected
                option.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
            }
        });
        
        // Show result message
        if (result) {
            if (isCorrect) {
                result.className = 'block mb-4 p-4 rounded-xl bg-green-100 text-green-800 border border-green-300';
                result.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-check-circle text-green-600"></i>
                        <span class="font-semibold">Correct!</span>
                    </div>
                    <p class="mt-2">${question.explanation || 'Great job! You understand this concept well.'}</p>
                `;
                
                if (!isReview) {
                    this.score++;
                    window.quizScore = this.score;
                    this.updateScore();
                }
            } else {
                result.className = 'block mb-4 p-4 rounded-xl bg-red-100 text-red-800 border border-red-300';
                result.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-times-circle text-red-600"></i>
                        <span class="font-semibold">Incorrect</span>
                    </div>
                    <p class="mt-2">${question.explanation || 'Let me help you understand the correct answer.'}</p>
                    ${!isReview ? `
                        <div class="mt-4 pt-3 border-t border-red-200">
                            <button onclick="quizSystem.askAIForHelp('checkbox', ${JSON.stringify(selectedOptions)})" 
                                    class="group bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-medium hover:shadow-strong transform hover:-translate-y-1 flex items-center space-x-2">
                                <i class="fas fa-robot group-hover:animate-pulse"></i>
                                <span>Ask AI: Why are these answers wrong?</span>
                            </button>
                        </div>
                    ` : ''}
                `;
            }
            result.classList.remove('hidden');
        }
        
        if (explanationImage) explanationImage.classList.remove('hidden');
    }

    arraysEqual(a, b) {
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }

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

    scrollToQuizTop() {
        // Find the quiz question container and scroll to it smoothly
        const quizContainer = document.getElementById('quizQuestionContainer');
        if (quizContainer) {
            quizContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        } else {
            // Fallback: find quiz section
            const quizSection = document.querySelector('section.bg-gradient-to-br.from-gray-50.to-white');
            if (quizSection) {
                quizSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            window.currentQuestionIndex = this.currentQuestionIndex;
            this.loadQuestion(this.currentQuestionIndex);
            this.updateProgress();
            this.updateNavigation();
            
            // Scroll to top of quiz section
            this.scrollToQuizTop();
        } else {
            this.completeQuiz();
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            window.currentQuestionIndex = this.currentQuestionIndex;
            this.loadQuestion(this.currentQuestionIndex);
            this.updateProgress();
            this.updateNavigation();
            
            // Scroll to top of quiz section
            this.scrollToQuizTop();
        }
    }

    completeQuiz() {
        this.completed = true;
        window.quizCompleted = true;

        // Hide quiz content and show results
        const questionContainer = document.getElementById('quizQuestionContainer');
        const resultsContainer = document.getElementById('quizResults');
        const finalScore = document.getElementById('finalScore');

        if (questionContainer) questionContainer.style.display = 'none';
        if (resultsContainer) resultsContainer.classList.remove('hidden');
        if (finalScore) finalScore.textContent = this.score;

        // Update progress
        if (typeof updateProgress === 'function') updateProgress(4);

        // Show next button
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.classList.remove('hidden');
    }

    retryQuiz() {
        // Reset quiz state
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.score = 0;
        this.completed = false;

        // Update global variables
        window.currentQuestionIndex = this.currentQuestionIndex;
        window.quizAnswers = this.answers;
        window.quizScore = this.score;
        window.quizCompleted = this.completed;

        // Hide results and show first question
        const resultsContainer = document.getElementById('quizResults');
        const questionContainer = document.getElementById('quizQuestionContainer');

        if (resultsContainer) resultsContainer.classList.add('hidden');
        if (questionContainer) questionContainer.style.display = 'block';

        // Reload first question
        this.loadQuestion(0);
        this.updateProgress();
        this.updateNavigation();
        this.updateScore();
    }

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

    updateScore() {
        const scoreElement = document.getElementById('currentScore');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
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
}

// Global quiz system instance
window.quizSystem = new QuizSystem();

// Global functions for backward compatibility
function initializeQuiz() {
    if (window.templateData && window.templateData.quiz) {
        window.quizSystem.initialize(window.templateData.quiz);
    }
}

function nextQuestion() {
    window.quizSystem.nextQuestion();
}

function previousQuestion() {
    window.quizSystem.previousQuestion();
}

function retryQuiz() {
    window.quizSystem.retryQuiz();
}

// Question image carousel functions (individual display like task/hint sections)
function nextQuestionImage(questionIndex) {
    const indicator = document.getElementById(`question-carousel-indicator-${questionIndex}`);
    const imgElement = document.getElementById(`question-image-${questionIndex}`);
    const captionElement = document.getElementById(`question-image-caption-${questionIndex}`);

    if (!indicator || !imgElement) return;

    // Get the quiz data to access the images
    const question = window.quizSystem.questions[questionIndex];
    if (!question || !question.images || question.images.length <= 1) return;

    const totalImages = question.images.length;
    const current = parseInt(indicator.textContent);

    if (current < totalImages) {
        const nextIndex = current; // 0-based index for the images array
        const nextImage = question.images[nextIndex];

        // Update image source and alt text
        imgElement.src = nextImage.src;
        imgElement.alt = nextImage.alt || `Question image ${nextIndex + 1}`;

        // Update caption if available
        if (captionElement) {
            captionElement.textContent = nextImage.caption || '';
        }

        // Update indicator
        indicator.textContent = current + 1;
    } else {
        console.log('Already at last image');
    }
}

function prevQuestionImage(questionIndex) {
    const indicator = document.getElementById(`question-carousel-indicator-${questionIndex}`);
    const imgElement = document.getElementById(`question-image-${questionIndex}`);
    const captionElement = document.getElementById(`question-image-caption-${questionIndex}`);

    if (!indicator || !imgElement) return;

    // Get the quiz data to access the images
    const question = window.quizSystem.questions[questionIndex];
    if (!question || !question.images || question.images.length <= 1) return;

    const current = parseInt(indicator.textContent);

    if (current > 1) {
        const prevIndex = current - 2; // 0-based index for the images array
        const prevImage = question.images[prevIndex];

        // Update image source and alt text
        imgElement.src = prevImage.src;
        imgElement.alt = prevImage.alt || `Question image ${prevIndex + 1}`;

        // Update caption if available
        if (captionElement) {
            captionElement.textContent = prevImage.caption || '';
        }

        // Update indicator
        indicator.textContent = current - 1;
    } else {
        console.log('Already at first image');
    }
}

// Export for global access
window.initializeQuiz = initializeQuiz;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.retryQuiz = retryQuiz;
window.nextQuestionImage = nextQuestionImage;
window.prevQuestionImage = prevQuestionImage;
