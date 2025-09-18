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
                    <input type="radio" name="quizQuestion_${questionId}_correctAnswer" value="0" class="text-red-500">
                    <input type="text" name="quizQuestion_${questionId}_options" required
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                           placeholder="Option 1">
                    <button type="button" onclick="removeQuizOption(this)" 
                            class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
                <div class="flex items-center space-x-4 quiz-option-item">
                    <input type="radio" name="quizQuestion_${questionId}_correctAnswer" value="1" class="text-red-500">
                    <input type="text" name="quizQuestion_${questionId}_options" required
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                           placeholder="Option 2">
                    <button type="button" onclick="removeQuizOption(this)" 
                            class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Select the radio button next to the correct answer</p>
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
    
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-4 quiz-option-item';
    div.innerHTML = `
        <input type="radio" name="quizQuestion_${questionId}_correctAnswer" value="${optionIndex}" class="text-red-500">
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
        const input = option.querySelector('input[type="text"][name*="_options"]');
        radio.value = index;
        input.placeholder = `Option ${index + 1}`;
    });
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
        const optionInputs = Array.from(element.querySelectorAll(`input[name="${base}options"]`));
        const options = optionInputs.map(input => input.value.trim()).filter(Boolean);
        const explanation = element.querySelector(`textarea[name="${base}explanation"]`)?.value || '';
        const selectedRadio = element.querySelector(`input[type="radio"][name="${base}correctAnswer"]:checked`);
        const correctAnswer = selectedRadio ? parseInt(selectedRadio.value) : 0;

        const questionData = { question: questionText, options, explanation, correctAnswer };
        if (questionData.question && questionData.options.length >= 2) questions.push(questionData);
    });
    
    return questions;
}

// Generate SCORM Package
async function generateSCORM() {
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

// Preview functionality
function previewTopic() {
    const data = collectFormData();
    if (!data.title || !data.topicId) {
        alert('Please fill in at least the title and topic ID to preview');
        return;
    }
    
    // Open preview in new window
    const preview = window.open('', '_blank', 'width=1200,height=800');
    preview.document.write(`
        <html>
            <head><title>Preview: ${data.title}</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>${data.title}</h1>
                <p><strong>Task:</strong> ${data.taskStatement}</p>
                <p><strong>Description:</strong> ${data.description}</p>
                <h3>Learning Objectives:</h3>
                <ul>${data.learningObjectives.map(obj => `<li>${obj}</li>`).join('')}</ul>
                <p style="color: #666; margin-top: 40px;"><em>This is a basic preview. The actual SCORM package will have full interactivity.</em></p>
            </body>
        </html>
    `);
}

// Save draft
function saveDraft() {
    autoSave();
    
    // Show temporary success message
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check mr-2"></i>Saved!';
    button.style.backgroundColor = '#10B981';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '';
    }, 2000);
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