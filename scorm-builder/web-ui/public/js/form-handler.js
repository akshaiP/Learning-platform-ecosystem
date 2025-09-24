// Form state management
let formData = {
    learningObjectives: [],
    taskSteps: [],
    concepts: [],
    quizQuestions: []
};

// Auto-save to localStorage
function autoSave() {
    const data = collectFormData();
    localStorage.setItem('scormBuilder_draft', JSON.stringify(data));
    console.log('Draft auto-saved');
}

// Load draft from localStorage
function loadDraft() {
    const saved = localStorage.getItem('scormBuilder_draft');
    if (saved) {
        const data = JSON.parse(saved);
        populateForm(data);
        console.log('Draft loaded');
    }
}

// Learning Objectives Management
function addLearningObjective() {
    const container = document.getElementById('learningObjectives');
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-4 learning-objective-item';
    div.innerHTML = `
        <input type="text" name="learningObjectives[]" 
               class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
               placeholder="What will learners achieve?">
        <button type="button" onclick="removeLearningObjective(this)" 
                class="text-red-500 hover:text-red-700 p-2">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
    
    // Focus on the new input and scroll to it
    const newInput = div.querySelector('input');
    newInput.focus();
    newInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    autoSave();
}

function removeLearningObjective(button) {
    button.closest('.learning-objective-item').remove();
    autoSave();
}

// Task Steps Management
function addTaskStep() {
    const container = document.getElementById('taskSteps');
    const stepNumber = container.children.length + 1;
    const stepId = `step_${stepNumber}`;
    
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-xl p-6 task-step-item';
    div.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Step ${stepNumber}</h3>
            <button type="button" onclick="removeTaskStep(this)" 
                    class="text-red-500 hover:text-red-700 p-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Step Title *</label>
                <input type="text" name="taskStep_${stepId}_title" required
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                       placeholder="e.g., Set up Google Gemini API Access">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Step Description</label>
                <input type="text" name="taskStep_${stepId}_description"
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                       placeholder="Brief description of this step">
            </div>
        </div>
        
        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Instructions *</label>
            <textarea name="taskStep_${stepId}_instructions" required rows="3"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Detailed instructions for completing this step..."></textarea>
        </div>
        
        <!-- Code Section -->
        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Code Example (Optional)</label>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                <select name="taskStep_${stepId}_codeLanguage" 
                        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <option value="">Select Language</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                    <option value="bash">Bash</option>
                </select>
            </div>
            <textarea name="taskStep_${stepId}_code" rows="6"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                      placeholder="// Code example for this step..."></textarea>
        </div>

        <!-- Step Images (Multiple) -->
        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Step Images <span class="text-gray-500 text-xs">(for multiple images, select them all at once and upload)</span>
            </label>
            <div class="flex items-center space-x-4">
                <input type="file" multiple accept="image/*" class="hidden" id="taskStep_${stepId}_images_input" name="taskStep_${stepId}_images">
                <button type="button" onclick="document.getElementById('taskStep_${stepId}_images_input').click()" 
                        class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 text-center hover:border-gray-400 transition-colors">
                    <i class="fas fa-images text-gray-400 mr-2"></i>
                    <span class="text-sm text-gray-600">Upload step images</span>
                </button>
            </div>
            <div id="taskStep_${stepId}_images_preview" class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3"></div>
        </div>
        
        <!-- Hint Section -->
        <div class="mt-6 border-t border-gray-200 pt-6">
            <h4 class="text-md font-semibold text-gray-900 mb-4">Hint (Optional)</h4>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Hint Text</label>
                    <textarea name="taskStep_${stepId}_hintText" rows="2"
                              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              placeholder="Helpful hint for learners who get stuck..."></textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Hint Code</label>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                        <select name="taskStep_${stepId}_hintCodeLanguage" 
                                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                            <option value="">Select Language</option>
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="json">JSON</option>
                            <option value="bash">Bash</option>
                        </select>
                    </div>
                    <textarea name="taskStep_${stepId}_hintCode" rows="4"
                              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
                              placeholder="// Hint code example..."></textarea>
                </div>
                <!-- Hint Images (Multiple) -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Hint Images <span class="text-gray-500 text-xs">(for multiple images, select them all at once and upload)</span>
                    </label>
                    <div class="flex items-center space-x-4">
                        <input type="file" multiple accept="image/*" class="hidden" id="taskStep_${stepId}_hintImages_input" name="taskStep_${stepId}_hintImages">
                        <button type="button" onclick="document.getElementById('taskStep_${stepId}_hintImages_input').click()" 
                                class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 text-center hover:border-gray-400 transition-colors">
                            <i class="fas fa-images text-gray-400 mr-2"></i>
                            <span class="text-sm text-gray-600">Upload hint images</span>
                        </button>
                    </div>
                    <div id="taskStep_${stepId}_hintImages_preview" class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3"></div>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(div);
    // Setup dynamic image previews
    if (typeof setupImagePreview === 'function') {
        setupImagePreview(`taskStep_${stepId}_images_input`, `taskStep_${stepId}_images_preview`, false);
        setupImagePreview(`taskStep_${stepId}_hintImages_input`, `taskStep_${stepId}_hintImages_preview`, false);
    }
    
    // Focus on the new step and scroll to it
    const newStep = div.querySelector('input[name*="_title"]');
    if (newStep) {
        newStep.focus();
        newStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    autoSave();
}

function removeTaskStep(button) {
    button.closest('.task-step-item').remove();
    updateStepNumbers();
    autoSave();
}

function updateStepNumbers() {
    const steps = document.querySelectorAll('.task-step-item h3');
    steps.forEach((step, index) => {
        step.textContent = `Step ${index + 1}`;
    });
}

// Concepts Management
function addConcept() {
    const container = document.getElementById('concepts');
    const conceptNumber = container.children.length + 1;
    const conceptId = `concept_${conceptNumber}`;
    
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-xl p-6 concept-item';
    div.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h4 class="text-md font-semibold text-gray-900">Key Concept</h4>
            <button type="button" onclick="removeConcept(this)" 
                    class="text-red-500 hover:text-red-700 p-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Concept Title *</label>
                <input type="text" name="concept_${conceptId}_title" required
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                       placeholder="e.g., Natural Language Processing">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Learn More Context</label>
                <input type="text" name="concept_${conceptId}_learnMoreContext"
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                       placeholder="e.g., nlp_fundamentals">
            </div>
        </div>
        
        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Summary *</label>
            <textarea name="concept_${conceptId}_summary" required rows="2"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Brief summary of this concept..."></textarea>
        </div>

        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Concept Image</label>
            <div class="flex items-center space-x-4">
                <input type="file" accept="image/*" class="hidden" id="concept_${conceptId}_image_input" name="concept_${conceptId}_image">
                <button type="button" onclick="document.getElementById('concept_${conceptId}_image_input').click()" 
                        class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 text-center hover:border-gray-400 transition-colors">
                    <i class="fas fa-image text-gray-400 mr-2"></i>
                    <span class="text-sm text-gray-600">Upload concept image</span>
                </button>
            </div>
            <div id="concept_${conceptId}_image_preview" class="mt-3"></div>
        </div>
    `;
    
    container.appendChild(div);
    if (typeof setupImagePreview === 'function') {
        setupImagePreview(`concept_${conceptId}_image_input`, `concept_${conceptId}_image_preview`, true);
    }
    
    // Focus on the new concept and scroll to it
    const newConcept = div.querySelector('input[name*="_title"]');
    if (newConcept) {
        newConcept.focus();
        newConcept.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    autoSave();
}

function removeConcept(button) {
    button.closest('.concept-item').remove();
    autoSave();
}

// Quiz Questions Management
function addQuizQuestion() {
    const container = document.getElementById('quizQuestions');
    const questionNumber = container.children.length + 1;
    const questionId = `question_${questionNumber}`;
    
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-xl p-6 quiz-question-item';
    div.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h4 class="text-md font-semibold text-gray-900">Question ${questionNumber}</h4>
            <button type="button" onclick="removeQuizQuestion(this)" 
                    class="text-red-500 hover:text-red-700 p-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Question Type *</label>
            <select name="quizQuestion_${questionId}_type" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    onchange="toggleQuestionType('${questionId}', this.value)">
                <option value="mcq">Single Choice (MCQ)</option>
                <option value="checkbox">Multiple Choice (Checkbox)</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
                Choose the question type based on how many correct answers you want
            </p>
        </div>
        
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
            <textarea name="quizQuestion_${questionId}_question" required rows="2"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter your quiz question..."></textarea>
        </div>
        
        <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">Answer Options *</label>
                <button type="button" onclick="addQuizOption('${questionId}')" 
                        class="text-red-500 hover:text-red-700 text-sm">
                    <i class="fas fa-plus mr-1"></i>Add Option
                </button>
            </div>
            <div id="quizOptions_${questionId}" class="space-y-2">
                <div class="flex items-center space-x-4 quiz-option-item">
                    <input type="radio" name="quizQuestion_${questionId}_correctAnswer" value="0" class="text-red-500 mcq-option">
                    <input type="checkbox" name="quizQuestion_${questionId}_correctAnswers" value="0" class="text-red-500 checkbox-option hidden">
                    <input type="text" name="quizQuestion_${questionId}_options" required
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                           placeholder="Option 1">
                    <button type="button" onclick="removeQuizOption(this)" 
                            class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
                <div class="flex items-center space-x-4 quiz-option-item">
                    <input type="radio" name="quizQuestion_${questionId}_correctAnswer" value="1" class="text-red-500 mcq-option">
                    <input type="checkbox" name="quizQuestion_${questionId}_correctAnswers" value="1" class="text-red-500 checkbox-option hidden">
                    <input type="text" name="quizQuestion_${questionId}_options" required
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                           placeholder="Option 2">
                    <button type="button" onclick="removeQuizOption(this)" 
                            class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">
                Select the button next to the correct answer(s)
            </p>
        </div>
        
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
            <textarea name="quizQuestion_${questionId}_explanation" rows="2"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Explain why this is the correct answer..."></textarea>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Explanation Image</label>
            <div class="flex items-center space-x-4">
                <input type="file" accept="image/*" class="hidden" id="quizQuestion_${questionId}_explanationImage_input" name="quizQuestion_${questionId}_explanationImage">
                <button type="button" onclick="document.getElementById('quizQuestion_${questionId}_explanationImage_input').click()" 
                        class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 text-center hover:border-red-400 transition-colors">
                    <i class="fas fa-image text-gray-400 mr-2"></i>
                    <span class="text-sm text-gray-600">Upload explanation image</span>
                </button>
            </div>
            <div id="quizQuestion_${questionId}_explanationImage_preview" class="mt-3"></div>
        </div>
    `;
    
    container.appendChild(div);
    if (typeof setupImagePreview === 'function') {
        setupImagePreview(`quizQuestion_${questionId}_explanationImage_input`, `quizQuestion_${questionId}_explanationImage_preview`, true);
    }
    
    // Focus on the new question and scroll to it
    const newQuestion = div.querySelector('textarea[name*="_question"]');
    if (newQuestion) {
        newQuestion.focus();
        newQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    autoSave();
}

function removeQuizQuestion(button) {
    button.closest('.quiz-question-item').remove();
    updateQuestionNumbers();
    autoSave();
}

function updateQuestionNumbers() {
    const questions = document.querySelectorAll('.quiz-question-item h4');
    questions.forEach((question, index) => {
        question.textContent = `Question ${index + 1}`;
    });
}

function addQuizOption(questionId) {
    const container = document.getElementById(`quizOptions_${questionId}`);
    const optionIndex = container.children.length;
    
    // Get the current question type from the select dropdown
    const questionItem = container.closest('.quiz-question-item');
    const questionTypeSelect = questionItem.querySelector(`select[name*="_type"]`);
    const currentQuestionType = questionTypeSelect ? questionTypeSelect.value : 'mcq';
    
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-4 quiz-option-item';
    
    // Create the appropriate input based on question type
    let inputHTML = '';
    if (currentQuestionType === 'checkbox') {
        inputHTML = `
            <input type="radio" name="quizQuestion_${questionId}_correctAnswer" value="${optionIndex}" class="text-red-500 mcq-option hidden">
            <input type="checkbox" name="quizQuestion_${questionId}_correctAnswers" value="${optionIndex}" class="text-red-500 checkbox-option">
        `;
    } else {
        inputHTML = `
            <input type="radio" name="quizQuestion_${questionId}_correctAnswer" value="${optionIndex}" class="text-red-500 mcq-option">
            <input type="checkbox" name="quizQuestion_${questionId}_correctAnswers" value="${optionIndex}" class="text-red-500 checkbox-option hidden">
        `;
    }
    
    div.innerHTML = `
        ${inputHTML}
        <input type="text" name="quizQuestion_${questionId}_options" required
               class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
               placeholder="Option ${optionIndex + 1}">
        <button type="button" onclick="removeQuizOption(this)" 
                class="text-red-500 hover:text-red-700 p-1">
            <i class="fas fa-trash text-sm"></i>
        </button>
    `;
    
    container.appendChild(div);
    autoSave();
}

function removeQuizOption(button) {
    const quizItem = button.closest('.quiz-question-item');
    const radio = quizItem.querySelector('input[type="radio"][name*="quizQuestion_"][name$="_correctAnswer"]');
    const radioName = radio ? radio.name : '';
    const questionId = radioName.replace('quizQuestion_', '').replace('_correctAnswer', '');
    const container = document.getElementById(`quizOptions_${questionId}`);
    if (container.children.length > 2) {
        button.closest('.quiz-option-item').remove();
        updateOptionIndices(container);
        autoSave();
    } else {
        alert('Quiz questions must have at least 2 options');
    }
}

function updateOptionIndices(container) {
    const options = container.querySelectorAll('.quiz-option-item');
    options.forEach((option, index) => {
        const radio = option.querySelector('input[type="radio"][name*="_correctAnswer"]');
        const checkbox = option.querySelector('input[type="checkbox"][name*="_correctAnswers"]');
        const input = option.querySelector('input[type="text"][name*="_options"]');
        if (radio) radio.value = index;
        if (checkbox) checkbox.value = index;
        input.placeholder = `Option ${index + 1}`;
    });
}

// Toggle between MCQ and Checkbox question types
function toggleQuestionType(questionId, questionType) {
    // Find the question item by looking for the select element that triggered this function
    const selectElement = event.target;
    const questionItem = selectElement.closest('.quiz-question-item');
    
    if (!questionItem) {
        console.error('Could not find question item for questionId:', questionId);
        return;
    }
    
    const mcqOptions = questionItem.querySelectorAll('.mcq-option');
    const checkboxOptions = questionItem.querySelectorAll('.checkbox-option');
    
    if (questionType === 'mcq') {
        // Show radio buttons, hide checkboxes
        mcqOptions.forEach(option => option.classList.remove('hidden'));
        checkboxOptions.forEach(option => option.classList.add('hidden'));
    } else if (questionType === 'checkbox') {
        // Show checkboxes, hide radio buttons
        mcqOptions.forEach(option => option.classList.add('hidden'));
        checkboxOptions.forEach(option => option.classList.remove('hidden'));
    }
    
    autoSave();
}

// Form Data Collection
function collectFormData() {
    const form = document.getElementById('scormForm');
    
    // Basic fields
    const data = {
        title: form.querySelector('input[name="title"]')?.value || '',
        topicId: form.querySelector('input[name="topicId"]')?.value || '',
        description: form.querySelector('textarea[name="description"]')?.value || '',
        taskStatement: form.querySelector('input[name="taskStatement"]')?.value || '',
        heroImageCaption: form.querySelector('input[name="heroImageCaption"]')?.value || '',
        quizTitle: form.querySelector('input[name="quizTitle"]')?.value || 'Knowledge Check',
        quizDescription: form.querySelector('input[name="quizDescription"]')?.value || 'Test your understanding'
    };
    
    // Learning objectives - collect only from the dynamic inputs, not the static one
    data.learningObjectives = Array.from(form.querySelectorAll('.learning-objective-item input[name="learningObjectives[]"]'))
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    // Task steps - collect dynamically
    data.taskSteps = collectTaskStepsData();
    
    // Concepts
    data.concepts = collectConceptsData();
    
    // Quiz questions
    data.quizQuestions = collectQuizQuestionsData();
    
    return data;
}

// Add these helper functions to form-handler.js
function collectTaskStepsData() {
    const steps = [];
    const stepElements = document.querySelectorAll('.task-step-item');
    
    stepElements.forEach((element, index) => {
        const stepData = {
            title: element.querySelector(`input[name*="taskStep_step_${index + 1}_title"]`)?.value || '',
            description: element.querySelector(`input[name*="taskStep_step_${index + 1}_description"]`)?.value || '',
            instructions: element.querySelector(`textarea[name*="taskStep_step_${index + 1}_instructions"]`)?.value || '',
            code: element.querySelector(`textarea[name*="taskStep_step_${index + 1}_code"]`)?.value || '',
            codeLanguage: element.querySelector(`select[name*="taskStep_step_${index + 1}_codeLanguage"]`)?.value || '',
            hintText: element.querySelector(`textarea[name*="taskStep_step_${index + 1}_hintText"]`)?.value || '',
            hintCode: element.querySelector(`textarea[name*="taskStep_step_${index + 1}_hintCode"]`)?.value || '',
            hintCodeLanguage: element.querySelector(`select[name*="taskStep_step_${index + 1}_hintCodeLanguage"]`)?.value || ''
        };
        
        if (stepData.title) {
            steps.push(stepData);
        }
    });
    
    return steps;
}

function collectConceptsData() {
    const concepts = [];
    const conceptElements = document.querySelectorAll('.concept-item');
    
    conceptElements.forEach((element, index) => {
        const conceptIndex = index + 1;
        const title = element.querySelector(`input[name="concept_concept_${conceptIndex}_title"]`)?.value || '';
        const summary = element.querySelector(`textarea[name="concept_concept_${conceptIndex}_summary"]`)?.value || '';
        const learnMoreContext = element.querySelector(`input[name="concept_concept_${conceptIndex}_learnMoreContext"]`)?.value || '';

        const conceptData = { title, summary, learnMoreContext };
        if (conceptData.title) concepts.push(conceptData);
    });
    
    return concepts;
}

function collectQuizQuestionsData() {
    const questions = [];
    const questionElements = document.querySelectorAll('.quiz-question-item');
    
    questionElements.forEach((element, index) => {
        const qIndex = index + 1;
        const base = `quizQuestion_question_${qIndex}_`;

        const questionText = element.querySelector(`textarea[name="${base}question"]`)?.value || '';
        const questionType = element.querySelector(`select[name="${base}type"]`)?.value || 'mcq';
        const optionInputs = Array.from(element.querySelectorAll(`input[name="${base}options"]`));
        const options = optionInputs.map(input => input.value.trim()).filter(Boolean);
        const explanation = element.querySelector(`textarea[name="${base}explanation"]`)?.value || '';

        let questionData = { 
            question: questionText, 
            type: questionType,
            options, 
            explanation 
        };

        if (questionType === 'mcq') {
            // Single choice question
            const selectedRadio = element.querySelector(`input[type="radio"][name="${base}correctAnswer"]:checked`);
            const correctAnswer = selectedRadio ? parseInt(selectedRadio.value) : 0;
            questionData.correctAnswer = correctAnswer;
        } else if (questionType === 'checkbox') {
            // Multiple choice question
            const selectedCheckboxes = Array.from(element.querySelectorAll(`input[type="checkbox"][name="${base}correctAnswers"]:checked`));
            const correctAnswers = selectedCheckboxes.map(cb => parseInt(cb.value));
            questionData.correctAnswers = correctAnswers;
        }

        if (questionData.question && questionData.options.length >= 2) {
            questions.push(questionData);
        }
    });
    
    return questions;
}

async function openPreview() {
    try {
        const response = await fetch('/start-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.open(result.previewUrl, '_blank');
        } else {
            alert('Preview not available: ' + result.error);
        }
    } catch (error) {
        alert('Failed to open preview. Generate a SCORM package first.');
    }
}

async function generateAndPreview() {
    await generateSCORM(true);
}

// Generate SCORM Package
async function generateSCORM(showPreview = false) {
    try {
        showLoadingModal();
        
        const data = collectFormData();
        console.log('Sending form data:', data); // Debug log
        
        // Create FormData for file uploads - this includes ALL form inputs including files
        const formData = new FormData(document.getElementById('scormForm'));
        
        // Add our structured data as JSON strings
        // Use a distinct key to avoid merging with learningObjectives[]
        formData.set('learningObjectivesJson', JSON.stringify(data.learningObjectives));
        formData.set('taskSteps', JSON.stringify(data.taskSteps));
        formData.set('concepts', JSON.stringify(data.concepts));
        formData.set('quizQuestions', JSON.stringify(data.quizQuestions));
        
        // Ensure basic fields are set
        formData.set('title', data.title);
        formData.set('topicId', data.topicId);
        formData.set('description', data.description);
        formData.set('taskStatement', data.taskStatement);
        formData.set('heroImageCaption', data.heroImageCaption);
        formData.set('quizTitle', data.quizTitle);
        formData.set('quizDescription', data.quizDescription);
        
        // Debug: Log all FormData entries
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        
        // Debug: Check if file inputs exist in DOM
        console.log('File inputs in DOM:');
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            console.log(`Found file input: name="${input.name}", id="${input.id}", files=${input.files.length}`);
        });
        
        const response = await fetch('/build/generate', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        hideLoadingModal();
        
        if (result.success) {
            if (showPreview) {
                setTimeout(() => {
                    window.open('/preview', '_blank');
                }, 500);
            }
            showSuccessModal(result.downloadUrl, result.filename);
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        hideLoadingModal();
        alert(`Error generating SCORM package: ${error.message}`);
        console.error('Generation error:', error);
    }
}


// Cloud-backed topic management
async function listTopics() {
    const res = await fetch('/form/topics');
    const data = await res.json();
    if (data.success) {
        const select = document.getElementById('topicSelect');
        if (select) {
            select.innerHTML = '<option value="">Select a topic...</option>';
            data.topics.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.title ? `${t.title} (${t.id})` : t.id;
                select.appendChild(opt);
            });
        }
    }
}

async function saveTopicToCloud() {
    try {
        const payload = collectFormData();
        // Require valid topicId from the main form field
        const topicId = (payload.topicId || '').trim();
        // Enforce format: coursename-Module-topic (e.g., robotics-M1-T1, robotics-M1-T1.1)
        const topicIdPattern = /^[a-z]+-M\d+-T\d+(?:\.\d+)?$/;
        if (!topicId || !topicIdPattern.test(topicId)) {
            showToast('Provide a valid Topic ID like robotics-M1-T1 or robotics-M1-T1.1', 'error');
            return;
        }
        // Normalize payload to cloud config keys where possible
        payload.learning_objectives = payload.learningObjectives;
        payload.content = payload.content || {};
        payload.quiz = null; // let server rebuild during generate; drafts save structure as-is
        payload.topicId = topicId;

        const res = await fetch('/form/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Save failed');
        showToast('Draft saved to cloud', 'success');
        await listTopics();
    } catch (e) {
        showToast(`Save failed: ${e.message}`, 'error');
    }
}

async function loadTopicFromCloud() {
    const select = document.getElementById('topicSelect');
    const topicId = select ? select.value : '';
    if (!topicId) return;
    try {
        const res = await fetch(`/form/topics/${encodeURIComponent(topicId)}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Load failed');
        populateFormFromCloudConfig(data.data, data.imageUrls || {});
        showToast('Topic loaded', 'success');
    } catch (e) {
        showToast(`Load failed: ${e.message}`, 'error');
    }
}

async function deleteTopicFromCloud() {
    const select = document.getElementById('topicSelect');
    const topicId = select ? select.value : '';
    if (!topicId) return;
    if (!confirm('Delete this topic permanently?')) return;
    try {
        const res = await fetch(`/form/topics/${encodeURIComponent(topicId)}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Delete failed');
        showToast('Topic deleted', 'success');
        await listTopics();
    } catch (e) {
        showToast(`Delete failed: ${e.message}`, 'error');
    }
}

function populateFormFromCloudConfig(config, imageUrls) {
    const form = document.getElementById('scormForm');
    form.querySelector('input[name="title"]').value = config.title || '';
    form.querySelector('input[name="topicId"]').value = config.id || '';
    form.querySelector('textarea[name="description"]').value = config.description || '';
    form.querySelector('input[name="taskStatement"]').value = (config.content && config.content.task_statement) || '';
    form.querySelector('input[name="heroImageCaption"]').value = (config.content && config.content.hero_image && config.content.hero_image.caption) || '';

    // Learning objectives
    document.getElementById('learningObjectives').innerHTML = '';
    (config.learning_objectives || []).forEach(obj => {
        addLearningObjective();
        const items = document.querySelectorAll('.learning-objective-item input[name="learningObjectives[]"]');
        items[items.length - 1].value = obj;
    });

    // Company logo preview
    if (config.content && config.content.company_logo && config.content.company_logo.src) {
        const logoFile = config.content.company_logo.src;
        const logoUrl = imageUrls[logoFile] || '';
        if (logoUrl) {
            const preview = document.getElementById('companyLogoPreview');
            if (preview) {
                preview.classList.remove('hidden');
                const img = preview.querySelector('img');
                if (img) {
                    img.src = logoUrl;
                    img.alt = config.content.company_logo.alt || 'Company Logo';
                }
            }
        }
    }

    // Hero image preview
    if (config.content && config.content.hero_image && config.content.hero_image.src) {
        const heroUrl = imageUrls[config.content.hero_image.src] || '';
        if (heroUrl) {
            const preview = document.getElementById('heroImagePreview');
            if (preview) {
                preview.classList.remove('hidden');
                const img = preview.querySelector('img');
                if (img) {
                    img.src = heroUrl;
                    img.alt = config.title || 'Hero Image';
                }
            }
        }
    }

    // Task steps
    document.getElementById('taskSteps').innerHTML = '';
    (config.content && Array.isArray(config.content.task_steps) ? config.content.task_steps : []).forEach((step, idx) => {
        addTaskStep();
        const i = idx + 1;
        document.querySelector(`input[name="taskStep_step_${i}_title"]`).value = step.title || '';
        document.querySelector(`input[name="taskStep_step_${i}_description"]`).value = step.description || '';
        document.querySelector(`textarea[name="taskStep_step_${i}_instructions"]`).value = step.instructions || '';
        document.querySelector(`textarea[name="taskStep_step_${i}_code"]`).value = (step.code && step.code.content) || '';
        document.querySelector(`select[name="taskStep_step_${i}_codeLanguage"]`).value = (step.code && step.code.language) || '';
        if (step.hint) {
            document.querySelector(`textarea[name="taskStep_step_${i}_hintText"]`).value = step.hint.text || '';
            document.querySelector(`textarea[name="taskStep_step_${i}_hintCode"]`).value = (step.hint.code && step.hint.code.content) || '';
            document.querySelector(`select[name="taskStep_step_${i}_hintCodeLanguage"]`).value = (step.hint.code && step.hint.code.language) || '';
        }
        // Step images preview
        const stepImages = Array.isArray(step.images) ? step.images : [];
        if (stepImages.length) {
            const preview = document.getElementById(`taskStep_step_${i}_images_preview`);
            if (preview) {
                preview.innerHTML = '';
                stepImages.forEach(imgObj => {
                    const url = imageUrls[imgObj.src] || '';
                    if (url) {
                        const imgEl = document.createElement('img');
                        imgEl.src = url;
                        imgEl.alt = imgObj.alt || 'Step image';
                        imgEl.className = 'h-20 w-auto rounded shadow';
                        preview.appendChild(imgEl);
                    }
                });
            }
        }
        // Hint images preview
        if (step.hint && Array.isArray(step.hint.images)) {
            const preview = document.getElementById(`taskStep_step_${i}_hintImages_preview`);
            if (preview) {
                preview.innerHTML = '';
                step.hint.images.forEach(imgObj => {
                    const url = imageUrls[imgObj.src] || '';
                    if (url) {
                        const imgEl = document.createElement('img');
                        imgEl.src = url;
                        imgEl.alt = 'Hint image';
                        imgEl.className = 'h-20 w-auto rounded shadow';
                        preview.appendChild(imgEl);
                    }
                });
            }
        }
    });

    // Concepts
    document.getElementById('concepts').innerHTML = '';
    (config.content && Array.isArray(config.content.concepts) ? config.content.concepts : []).forEach((c, idx) => {
        addConcept();
        const i = idx + 1;
        document.querySelector(`input[name="concept_concept_${i}_title"]`).value = c.title || '';
        document.querySelector(`textarea[name="concept_concept_${i}_summary"]`).value = c.summary || '';
        document.querySelector(`input[name="concept_concept_${i}_learnMoreContext"]`).value = c.learn_more_context || '';
        if (c.image && c.image.src) {
            const url = imageUrls[c.image.src] || '';
            if (url) {
                const preview = document.getElementById(`concept_concept_${i}_image_preview`);
                if (preview) {
                    preview.innerHTML = '';
                    const imgEl = document.createElement('img');
                    imgEl.src = url;
                    imgEl.alt = c.title || 'Concept image';
                    imgEl.className = 'h-20 w-auto rounded shadow';
                    preview.appendChild(imgEl);
                }
            }
        }
    });

    // Quiz
    document.getElementById('quizQuestions').innerHTML = '';
    const quiz = config.quiz || {};
    form.querySelector('input[name="quizTitle"]').value = quiz.title || 'Knowledge Check';
    form.querySelector('input[name="quizDescription"]').value = quiz.description || '';
    (Array.isArray(quiz.questions) ? quiz.questions : []).forEach((q, idx) => {
        addQuizQuestion();
        const i = idx + 1;
        const base = `quizQuestion_question_${i}_`;
        form.querySelector(`textarea[name="${base}question"]`).value = q.question || '';
        form.querySelector(`select[name="${base}type"]`).value = q.type || 'mcq';
        const optionsContainer = document.getElementById(`quizOptions_question_${i}`);
        optionsContainer.innerHTML = '';
        (q.options || []).forEach((opt, oi) => {
            addQuizOption(`question_${i}`);
            const rows = optionsContainer.querySelectorAll('.quiz-option-item');
            const row = rows[rows.length - 1];
            row.querySelector('input[type="text"]').value = opt;
            if (q.type === 'mcq' && oi === (q.correct_answer || 0)) {
                row.querySelector('input[type="radio"]').checked = true;
            }
            if (q.type === 'checkbox' && Array.isArray(q.correct_answers) && q.correct_answers.includes(oi)) {
                row.querySelector('input[type="checkbox"]').checked = true;
            }
        });
        toggleQuestionType(`question_${i}`, q.type || 'mcq');
        if (q.explanation_image && q.explanation_image.src) {
            const url = imageUrls[q.explanation_image.src] || '';
            if (url) {
                const preview = document.getElementById(`quizQuestion_question_${i}_explanationImage_preview`);
                if (preview) {
                    preview.innerHTML = '';
                    const imgEl = document.createElement('img');
                    imgEl.src = url;
                    imgEl.alt = 'Explanation image';
                    imgEl.className = 'h-20 w-auto rounded shadow';
                    preview.appendChild(imgEl);
                }
            }
        }
    });
}

function showToast(message, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `fixed top-4 right-4 px-4 py-2 rounded shadow text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
}

// Modal functions
function showLoadingModal() {
    document.getElementById('loadingModal').classList.remove('hidden');
}

function hideLoadingModal() {
    document.getElementById('loadingModal').classList.add('hidden');
}

function showSuccessModal(downloadUrl, filename) {
    const modal = document.getElementById('successModal');
    const downloadBtn = document.getElementById('downloadBtn');
    
    downloadBtn.onclick = () => {
        window.location.href = downloadUrl;
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
}

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
    // Load any saved draft
    loadDraft();
    
    // Set up auto-save on form changes
    const form = document.getElementById('scormForm');
    form.addEventListener('input', debounce(autoSave, 1000));
    
    // Auto-generate topic ID from title
    const titleInput = form.querySelector('input[name="title"]');
    const topicIdInput = form.querySelector('input[name="topicId"]');
    
    titleInput.addEventListener('input', () => {
        if (!topicIdInput.value) {
            const id = titleInput.value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            topicIdInput.value = id;
        }
    });
    
    console.log('SCORM Builder form initialized');
    // Always refresh topic list on page load
    listTopics().catch(() => {});
});

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}