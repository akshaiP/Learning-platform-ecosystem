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

        // Build question HTML
        const questionHTML = `
            <div class="quiz-question-container">
                <h4 class="text-xl font-bold text-gray-900 mb-8 leading-relaxed">${question.question}</h4>
                <div class="space-y-4 mb-8" id="quizOptionsContainer">
                    ${question.options.map((option, index) => `
                        <button class="w-full text-left p-6 rounded-2xl border-2 border-gray-200 hover:border-nebula-400 hover:bg-nebula-50 transition-all duration-300 quiz-option group shadow-soft hover:shadow-medium" 
                                data-option-index="${index}" onclick="quizSystem.selectOption(this, ${index})">
                            <div class="flex items-center space-x-4">
                                <div class="w-10 h-10 bg-gray-100 group-hover:bg-nebula-100 rounded-xl flex items-center justify-center font-bold text-gray-600 group-hover:text-nebula-600 transition-colors option-letter">
                                    ${String.fromCharCode(65 + index)}.
                                </div>
                                <span class="option-text text-gray-800 font-medium text-lg">${option}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
                
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
            const selectedOption = this.answers[questionIndex];
            const optionElement = container.querySelector(`[data-option-index="${selectedOption}"]`);
            if (optionElement) {
                this.selectOption(optionElement, selectedOption, true);
            }
        }
    }

    selectOption(element, optionIndex, isReview = false) {
        const questionIndex = this.currentQuestionIndex;
        const question = this.questions[questionIndex];

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
                `;
            }

            if (explanationImage) explanationImage.classList.remove('hidden');

            // Trigger remedial chat for wrong answers (only on first attempt)
            if (!isReview) {
                setTimeout(() => {
                    if (typeof openQuizFailureChat === 'function') {
                        openQuizFailureChat(question, optionIndex);
                    }
                }, 2000);
            }
        }

        if (result) result.classList.remove('hidden');
        this.updateNavigation();
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            window.currentQuestionIndex = this.currentQuestionIndex;
            this.loadQuestion(this.currentQuestionIndex);
            this.updateProgress();
            this.updateNavigation();
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

// Export for global access
window.initializeQuiz = initializeQuiz;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.retryQuiz = retryQuiz;
