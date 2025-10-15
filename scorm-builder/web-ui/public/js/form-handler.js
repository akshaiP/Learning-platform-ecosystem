// Form state management
let formData = {
    learningObjectives: [],
    taskSteps: [],
    concepts: [],
    quizQuestions: []
};

// Multi-page navigation state
let currentPage = 1;
const totalPages = 4;

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
        
        <!-- Task Page Section -->
        <div class="mt-6 border-t border-gray-200 pt-6">
            <div class="flex items-center justify-between mb-4">
                <h4 class="text-md font-semibold text-gray-900">Task Workspace (Optional)</h4>
                <div class="flex items-center space-x-2">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="taskStep_${stepId}_taskPage_enabled" name="taskStep_${stepId}_taskPage_enabled"
                               class="sr-only peer" onchange="toggleTaskPageSection('${stepId}', this.checked)">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span class="ml-3 text-sm font-medium text-gray-700">Enable</span>
                    </label>
                </div>
            </div>

            <div id="taskStep_${stepId}_taskPage_section" class="hidden">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Task Page URL
                            <span class="text-gray-400 text-xs ml-2">
                                <i class="fas fa-info-circle"></i> 
                                External tool/page that opens in split-screen workspace
                            </span>
                        </label>
                        <input type="url" name="taskStep_${stepId}_taskPageUrl"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               placeholder="https://example.com/task-page">
                        <p class="text-xs text-gray-500 mt-1">
                            Enter a URL to open an interactive workspace alongside this step (e.g., coding environment, simulation, etc.)
                        </p>
                    </div>
                </div>
            </div>
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

// Carousel Management Functions
function toggleCarouselSection(conceptId, isEnabled) {
    const section = document.getElementById(`concept_${conceptId}_carousel_section`);
    if (isEnabled) {
        section.classList.remove('hidden');
        // Add first slide if none exist
        const slidesContainer = document.getElementById(`concept_${conceptId}_carousel_slides`);
        if (slidesContainer.children.length === 0) {
            addCarouselSlide(conceptId);
        }
    } else {
        section.classList.add('hidden');
    }
}

function toggleTaskPageSection(stepId, isEnabled) {
    const section = document.getElementById(`taskStep_${stepId}_taskPage_section`);
    if (isEnabled) {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
        // Clear the URL field when disabled to ensure clean data
        const urlInput = document.querySelector(`input[name="taskStep_${stepId}_taskPageUrl"]`);
        if (urlInput) {
            urlInput.value = '';
        }
    }
    autoSave();
}

function addCarouselSlide(conceptId) {
    const container = document.getElementById(`concept_${conceptId}_carousel_slides`);
    const slideNumber = container.children.length + 1;
    const slideId = `${conceptId}_slide_${slideNumber}`;

    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-lg p-4 carousel-slide-item bg-gray-50';
    div.setAttribute('data-slide-id', slideId);
    div.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <h5 class="text-sm font-semibold text-gray-900">Slide ${slideNumber}</h5>
            <button type="button" onclick="removeCarouselSlide('${conceptId}', '${slideId}')"
                    class="remove-slide-btn text-red-500 hover:text-red-700 p-1">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Slide Topic *</label>
                <input type="text" name="carousel_${slideId}_topic" required
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                       placeholder="e.g., Understanding the Basics">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">AI Prompt Keywords *</label>
                <input type="text" name="carousel_${slideId}_prompt" required
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                       placeholder="e.g., fundamentals, basics, introduction">
            </div>
        </div>

        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea name="carousel_${slideId}_description" required rows="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Detailed description with **markdown** support. Use *italic* or **bold** text for emphasis..."></textarea>
            <p class="text-xs text-gray-500 mt-1">Supports markdown: **bold**, *italic*, \u0060code\u0060</p>
        </div>

        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Slide Image *</label>
            <div class="flex items-center space-x-3">
                <input type="file" accept="image/*" class="hidden" id="carousel_${slideId}_image_input" name="carousel_${slideId}_image">
                <button type="button" onclick="document.getElementById('carousel_${slideId}_image_input').click()"
                        class="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-2 text-center hover:border-gray-400 transition-colors flex-1">
                    <i class="fas fa-image text-gray-400 mr-2"></i>
                    <span class="text-sm text-gray-600">Choose slide image</span>
                </button>
            </div>
            <div id="carousel_${slideId}_image_preview" class="mt-2"></div>
            <p class="text-xs text-gray-500 mt-1">Max file size: 2MB. Recommended: 1400×800px (7:4 ratio)</p>
        </div>
    `;

    container.appendChild(div);

    // Setup image preview for this slide
    if (typeof setupImagePreview === 'function') {
        setupImagePreview(`carousel_${slideId}_image_input`, `carousel_${slideId}_image_preview`, true);
    }

    // Setup change event listener for image input to update slide data
    const imageInput = document.getElementById(`carousel_${slideId}_image_input`);
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            // If there was already an image loaded from cloud, mark it for deletion
            const previewDiv = document.getElementById(`carousel_${slideId}_image_preview`);
            if (previewDiv) {
                const existingImg = previewDiv.querySelector('img');
                const deleteBtn = previewDiv.querySelector('button[onclick*="removeLoadedSingleImage"]');
                if (existingImg && deleteBtn) {
                    // Extract filename from the existing delete button
                    const onclickAttr = deleteBtn.getAttribute('onclick');
                    const filenameMatch = onclickAttr.match(/removeLoadedSingleImage[^,]*,\s*[^,]*,\s*['"]([^'"]+)['"]/);
                    if (filenameMatch && filenameMatch[1]) {
                        // Mark the old image for deletion
                        if (typeof markImageForDeletion === 'function') {
                            markImageForDeletion(filenameMatch[1]);
                        }
                    }
                }
            }
            autoSave();
        });
    }

    // Focus on the new slide and scroll to it
    const newSlide = div.querySelector('input[name*="_topic"]');
    if (newSlide) {
        newSlide.focus();
        newSlide.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    autoSave();
}

function removeCarouselSlide(conceptId, slideId) {
    const slideElement = document.querySelector(`[data-slide-id="${slideId}"]`);
    if (slideElement) {
        // Check if there's an image preview with a delete button and trigger deletion
        const imagePreview = slideElement.querySelector('[id$="_image_preview"]');
        if (imagePreview) {
            const deleteButton = imagePreview.querySelector('button[onclick*="removeLoadedSingleImage"]');
            if (deleteButton) {
                // Extract the image filename from the onclick handler
                const onclickAttr = deleteButton.getAttribute('onclick');
                const filenameMatch = onclickAttr.match(/removeLoadedSingleImage[^,]*,\s*[^,]*,\s*['"]([^'"]+)['"]/);
                if (filenameMatch && filenameMatch[1]) {
                    // Mark the image for deletion
                    if (typeof markImageForDeletion === 'function') {
                        markImageForDeletion(filenameMatch[1]);
                    }
                }
            }
        }

        slideElement.remove();
        renumberCarouselSlides(conceptId);
        autoSave();
    }
}

function renumberCarouselSlides(conceptId) {
    const container = document.getElementById(`concept_${conceptId}_carousel_slides`);
    const slides = container.querySelectorAll('.carousel-slide-item');

    slides.forEach((slide, index) => {
        const slideNumber = index + 1;
        const newSlideId = `${conceptId}_slide_${slideNumber}`;

        // Update slide number heading
        const heading = slide.querySelector('h5');
        if (heading) {
            heading.textContent = `Slide ${slideNumber}`;
        }

        // Update data-slide-id attribute
        slide.setAttribute('data-slide-id', newSlideId);

        // Update remove button onclick
        const removeButton = slide.querySelector('button[onclick*="removeCarouselSlide"]');
        if (removeButton) {
            removeButton.setAttribute('onclick', `removeCarouselSlide('${conceptId}', '${newSlideId}')`);
        }

        // Update all input and textarea names and IDs
        const inputs = slide.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            const oldName = input.name;
            const oldId = input.id;

            if (oldName && oldName.includes('carousel_')) {
                const newName = oldName.replace(/carousel_[^_]+_slide_\d+/, `carousel_${newSlideId}`);
                input.name = newName;
            }

            if (oldId && oldId.includes('carousel_')) {
                const newId = oldId.replace(/carousel_[^_]+_slide_\d+/, `carousel_${newSlideId}`);
                input.id = newId;

                // Update label for attribute if it exists
                const label = slide.querySelector(`label[for="${oldId}"]`);
                if (label) {
                    label.setAttribute('for', newId);
                }

                // Update button onclick if it references this ID
                const button = slide.querySelector(`button[onclick*="${oldId}"]`);
                if (button) {
                    button.setAttribute('onclick', `document.getElementById('${newId}').click()`);
                }
            }
        });

        // Update preview div ID
        const previewDiv = slide.querySelector('[id$="_image_preview"]');
        if (previewDiv) {
            previewDiv.id = `carousel_${newSlideId}_image_preview`;
        }
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
                <label class="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
                <input type="text" name="concept_${conceptId}_learnMoreContext"
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                       placeholder="e.g., Explain about xxx , yyy..">
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

        <!-- Interactive Carousel Section -->
        <div class="mt-6 border-t border-gray-200 pt-6">
            <div class="flex items-center justify-between mb-4">
                <h4 class="text-md font-semibold text-gray-900">Interactive Carousel</h4>
                <div class="flex items-center space-x-2">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="concept_${conceptId}_carousel_enabled" name="concept_${conceptId}_carousel_enabled"
                               class="sr-only peer" onchange="toggleCarouselSection('${conceptId}', this.checked)">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span class="ml-3 text-sm font-medium text-gray-700">Enable</span>
                    </label>
                </div>
            </div>

            <div id="concept_${conceptId}_carousel_section" class="hidden">
                <!-- Voice Assistant URL -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Voice Assistant URL (Optional)
                        <i class="fas fa-info-circle text-gray-400 ml-1" title="URL for the AI assistant iframe"></i>
                    </label>
                    <input type="url" name="concept_${conceptId}_carousel_botUrl"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="https://example.com/widget.html">
                    <p class="text-xs text-gray-500 mt-1">Leave empty to use default voice assistant</p>
                </div>

                <!-- Carousel Slides -->
                <div class="mb-4">
                    <div class="flex items-center justify-between mb-3">
                        <label class="block text-sm font-medium text-gray-700">Carousel Slides</label>
                        <button type="button" onclick="addCarouselSlide('${conceptId}')"
                                class="add-slide-btn bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                            <i class="fas fa-plus mr-1"></i>Add Slide
                        </button>
                    </div>

                    <div id="concept_${conceptId}_carousel_slides" class="carousel-slides-container space-y-4">
                        <!-- Carousel slides will be dynamically added here -->
                    </div>
                </div>

                <!-- Info Text -->
                <div class="carousel-info-panel bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p class="text-xs text-blue-800">
                        <i class="fas fa-info-circle mr-1"></i>
                        <strong>Recommended image size:</strong> 1400×800 pixels (7:4 ratio)<br>
                        <strong>Supported formats:</strong> JPG, PNG, WebP (max 2MB)<br>
                        <strong>Description supports:</strong> Markdown syntax for formatting
                    </p>
                </div>
            </div>
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
                <option value="mcq">Single Answer (Radio button)</option>
                <option value="checkbox">Multiple Answer (Checkbox)</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
                Choose the question type based on how many correct answers you want
            </p>
        </div>
        
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Question Images <span class="text-gray-500 text-xs">(for multiple images, select them all at once and upload)</span></label>
            <div class="flex items-center space-x-4">
                <input type="file" multiple accept="image/*" class="hidden" id="quizQuestion_${questionId}_images_input" name="quizQuestion_${questionId}_images">
                <button type="button" onclick="document.getElementById('quizQuestion_${questionId}_images_input').click()"
                        class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 text-center hover:border-red-400 transition-colors">
                    <i class="fas fa-images text-gray-400 mr-2"></i>
                    <span class="text-sm text-gray-600">Upload question images</span>
                </button>
            </div>
            <div id="quizQuestion_${questionId}_images_preview" class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3"></div>
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
        setupImagePreview(`quizQuestion_${questionId}_images_input`, `quizQuestion_${questionId}_images_preview`, false);
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
function toggleQuestionType(questionId, questionType, triggerEl) {
    // Works when called from onchange (event present), with explicit triggerEl, or programmatically
    let questionItem = null;
    if (triggerEl && triggerEl.closest) {
        questionItem = triggerEl.closest('.quiz-question-item');
    }
    if (!questionItem && typeof event !== 'undefined' && event && event.target) {
        questionItem = event.target.closest('.quiz-question-item');
    }
    if (!questionItem) {
        const selectEl = document.querySelector(`select[name="quizQuestion_${questionId}_type"]`);
        if (selectEl) questionItem = selectEl.closest('.quiz-question-item');
    }
    if (!questionItem) {
        console.error('Could not find question item for questionId:', questionId);
        return;
    }
    
    const mcqOptions = questionItem.querySelectorAll('.mcq-option');
    const checkboxOptions = questionItem.querySelectorAll('.checkbox-option');
    
    if (questionType === 'mcq') {
        mcqOptions.forEach(option => option.classList.remove('hidden'));
        checkboxOptions.forEach(option => option.classList.add('hidden'));
    } else if (questionType === 'checkbox') {
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
        
        // Add task page data if enabled and URL is provided
        const taskPageEnabled = element.querySelector(`input[name*="taskStep_step_${index + 1}_taskPage_enabled"]`)?.checked;
        const taskPageUrl = element.querySelector(`input[name*="taskStep_step_${index + 1}_taskPageUrl"]`)?.value || '';
        
        if (taskPageEnabled && taskPageUrl) {
            stepData.taskPage = {
                url: taskPageUrl
            };
        }
        
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

        // Collect carousel data (both enabled and disabled states)
        const carouselEnabled = element.querySelector(`input[name="concept_concept_${conceptIndex}_carousel_enabled"]`)?.checked;
        const botUrl = element.querySelector(`input[name="concept_concept_${conceptIndex}_carousel_botUrl"]`)?.value || '';
        const slides = collectCarouselSlidesData(element, conceptIndex);

        // Always include interactive_carousel field to preserve data when toggling
        conceptData.interactive_carousel = {
            enabled: carouselEnabled,
            bot_iframe_url: botUrl,
            slides: carouselEnabled ? slides : []
        };

        if (conceptData.title) concepts.push(conceptData);
    });

    return concepts;
}

function collectCarouselSlidesData(conceptElement, conceptIndex) {
    const slides = [];
    const slideElements = conceptElement.querySelectorAll('.carousel-slide-item');

    slideElements.forEach((slideElement, slideIndex) => {
        const slideNumber = slideIndex + 1;
        const slideId = `concept_${conceptIndex}_slide_${slideNumber}`;

        const topic = slideElement.querySelector(`input[name="carousel_${slideId}_topic"]`)?.value || '';
        const description = slideElement.querySelector(`textarea[name="carousel_${slideId}_description"]`)?.value || '';
        const prompt = slideElement.querySelector(`input[name="carousel_${slideId}_prompt"]`)?.value || '';
        const imageInput = slideElement.querySelector(`input[name="carousel_${slideId}_image"]`);

        if (topic && description && prompt) {
            const slideData = {
                topic: topic.trim(),
                description: description.trim(),
                prompt: prompt.trim()
            };

            // Handle image file
            if (imageInput && imageInput.files && imageInput.files.length > 0) {
                slideData.image = imageInput.files[0];
            } else {
                // Check if there's already an image reference from cloud loading
                const previewDiv = slideElement.querySelector(`[id$="_image_preview"]`);
                if (previewDiv && previewDiv.querySelector('img')) {
                    // There's an existing image that wasn't re-uploaded
                    // This will be handled by the server-side merge logic
                }
            }

            slides.push(slideData);
        }
    });

    return slides;
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
            _id: `question_${qIndex}`,
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

// Frontend validation before SCORM generation
function validateFormData() {
    const errors = [];
    const data = collectFormData();
    
    // Basic required fields validation
    if (!data.title?.trim()) {
        errors.push('Topic Title is required');
    }
    if (!data.topicId?.trim()) {
        errors.push('Topic ID is required');
    }
    if (!data.description?.trim()) {
        errors.push('Description is required');
    }
    if (!data.taskStatement?.trim()) {
        errors.push('Task Statement is required');
    }
    
    // Validate topic ID format
    if (data.topicId && !/^[A-Za-z]+-M\d+-T\d+(?:\.\d+)?$/.test(data.topicId)) {
        errors.push('Topic ID must follow format: CourseName-Mx-Ty (e.g., Robotics-M1-T1)');
    }
    
    // Validate learning objectives (only if they exist)
    if (data.learningObjectives && data.learningObjectives.length > 0) {
        data.learningObjectives.forEach((objective, index) => {
            if (!objective?.trim()) {
                errors.push(`Learning Objective ${index + 1}: Text is required`);
            }
        });
    }
    
    // Validate task steps (only if they exist)
    if (data.taskSteps && data.taskSteps.length > 0) {
        data.taskSteps.forEach((step, index) => {
            if (!step.title?.trim()) {
                errors.push(`Task Step ${index + 1}: Title is required`);
            }
            if (!step.instructions?.trim()) {
                errors.push(`Task Step ${index + 1}: Instructions are required`);
            }
        });
    }
    
    // Validate concepts (only if they exist)
    if (data.concepts && data.concepts.length > 0) {
        data.concepts.forEach((concept, index) => {
            if (!concept.title?.trim()) {
                errors.push(`Concept ${index + 1}: Title is required`);
            }
            if (!concept.summary?.trim()) {
                errors.push(`Concept ${index + 1}: Summary is required`);
            }
        });
    }
    
    // Validate quiz questions (only if they exist)
    if (data.quizQuestions && data.quizQuestions.length > 0) {
        data.quizQuestions.forEach((question, index) => {
            if (!question.question?.trim()) {
                errors.push(`Quiz Question ${index + 1}: Question text is required`);
            }
            if (!question.options || question.options.length < 2) {
                errors.push(`Quiz Question ${index + 1}: At least 2 answer options are required`);
            }
            if (question.type === 'mcq' && (question.correctAnswer === undefined || question.correctAnswer === null)) {
                errors.push(`Quiz Question ${index + 1}: Please select the correct answer`);
            }
            if (question.type === 'checkbox' && (!question.correctAnswers || question.correctAnswers.length === 0)) {
                errors.push(`Quiz Question ${index + 1}: Please select at least one correct answer`);
            }
        });
    }
    
    return errors;
}

// Generate SCORM Package
async function generateSCORM(showPreview = false) {
    try {
        // Frontend validation first
        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            const errorMessage = 'Please fix the following errors:\n\n' + validationErrors.join('\n');
            alert(errorMessage);
            return;
        }    
        showLoadingModal('Generating SCORM Package', 'Building your learning content...');
        
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
                const maxLength = 200;
                const displayValue = value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
                console.log(`${key}: ${displayValue}`);
            }
        }
        
        // Debug: Log the task steps data being sent
        console.log('🔍 Generating with task steps:', JSON.stringify(data.taskSteps, null, 2));
        
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
            // Parse server error message
            let errorMessage = 'Unknown error occurred';
            
            if (result.error) {
                errorMessage = result.error;
            } else if (result.message) {
                errorMessage = result.message;
            } else if (result.details) {
                errorMessage = result.details;
            } else if (!response.ok) {
                errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }
            
            // Check if the error contains build output details
            const buildOutput = result.buildOutput || result.buildStderr || '';
            if (buildOutput) {
                // Look for specific error patterns in the build output
                if (buildOutput.includes('task_steps') && buildOutput.includes('hint') && buildOutput.includes('missing text property')) {
                    errorMessage = 'Task step hint is missing required text. Please add hint text or remove the hint section.';
                } else if (buildOutput.includes('Required image not found')) {
                    const imageMatch = buildOutput.match(/Required image not found: (.+)/);
                    if (imageMatch) {
                        errorMessage = `Image not found: ${imageMatch[1]}. Please upload the required image or remove the reference.`;
                    }
                } else if (buildOutput.includes('Failed to build')) {
                    const buildMatch = buildOutput.match(/Failed to build [^:]+: (.+)/);
                    if (buildMatch) {
                        errorMessage = buildMatch[1];
                    }
                } else if (buildOutput.includes('missing text property')) {
                    errorMessage = 'Task step hint is missing required text. Please add hint text or remove the hint section.';
                }
            }
            
            // Parse common error patterns and provide user-friendly messages
            if (errorMessage.includes('Required image not found')) {
                const imageMatch = errorMessage.match(/Required image not found: (.+)/);
                if (imageMatch) {
                    errorMessage = `Image not found: ${imageMatch[1]}. Please upload the required image or remove the reference.`;
                }
            } else if (errorMessage.includes('missing text property')) {
                errorMessage = 'Task step hint is missing required text. Please add hint text or remove the hint section.';
            } else if (errorMessage.includes('task_steps') && errorMessage.includes('hint')) {
                errorMessage = 'Task step hint validation failed. Please ensure hints have proper text content or remove empty hint sections.';
            } else if (errorMessage.includes('task_steps')) {
                errorMessage = 'Task step validation failed. Please check that all required fields are filled.';
            } else if (errorMessage.includes('concepts')) {
                errorMessage = 'Concept validation failed. Please check that all concept fields are properly filled.';
            } else if (errorMessage.includes('quiz')) {
                errorMessage = 'Quiz validation failed. Please check that all quiz questions have proper answers selected.';
            } else if (errorMessage.includes('Topic not found')) {
                errorMessage = 'Topic configuration not found. Please try saving your topic first.';
            } else if (errorMessage.includes('Failed to download file')) {
                const fileMatch = errorMessage.match(/Failed to download file (.+):/);
                if (fileMatch) {
                    errorMessage = `Failed to download image: ${fileMatch[1]}. Please check that the image exists and is properly uploaded.`;
                }
            } else if (errorMessage.includes('Command failed: npm run build:topic')) {
                // This is a generic build failure - we need to check the server logs for specific errors
                errorMessage = 'Build process failed. Please check that all required fields are properly filled and try again.';
            }
            
            showDetailedError('SCORM Generation Failed', errorMessage);
        }
        
    } catch (error) {
        hideLoadingModal();
        console.error('Generation error:', error);
        // Handle network errors or other exceptions
        let errorMessage = 'Network error occurred. Please check your connection and try again.';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.message.includes('HTTP error')) {
            errorMessage = 'Server error occurred. Please try again or contact support.';
        } else {
            errorMessage = error.message;
        }
        
        showDetailedError('Generation Error', errorMessage);
    }
}


// Cloud-backed topic management
let topicsCache = [];
let selectedTopicId = '';

function parseTopicIdParts(topicId) {
    // Expected formats: Course-Mx-Ty or CourseName-M12-T3.1
    // Return { course, module, topic }
    if (!topicId || typeof topicId !== 'string') return { course: '', module: '', topic: '' };
    const parts = topicId.split('-');
    const course = parts[0] || '';
    const module = (parts.find(p => /^M\d+$/i.test(p)) || '').toUpperCase();
    const topic = (parts.find(p => /^T\d+(?:\.\d+)?$/i.test(p)) || '').toUpperCase();
    return { course, module, topic };
}

function buildCourseFilterOptions() {
    const courseFilter = document.getElementById('courseFilter');
    if (!courseFilter) return;
    const courses = Array.from(new Set((topicsCache || []).map(t => parseTopicIdParts(t.id).course).filter(Boolean))).sort();
    const current = courseFilter.value;
    courseFilter.innerHTML = '<option value="">All Courses</option>' + courses.map(c => `<option value="${c}">${c}</option>`).join('');
    if (courses.includes(current)) courseFilter.value = current;
}

function buildModuleFilterOptions() {
    const courseFilter = document.getElementById('courseFilter');
    const moduleFilter = document.getElementById('moduleFilter');
    if (!moduleFilter) return;
    const selectedCourse = courseFilter ? courseFilter.value : '';
    const modules = Array.from(new Set((topicsCache || [])
        .filter(t => !selectedCourse || parseTopicIdParts(t.id).course === selectedCourse)
        .map(t => parseTopicIdParts(t.id).module)
        .filter(Boolean))).sort((a,b)=>{
            const na = Number(a.replace(/[^\d]/g,''));
            const nb = Number(b.replace(/[^\d]/g,''));
            return na - nb;
        });
    const current = moduleFilter.value;
    moduleFilter.innerHTML = '<option value="">All Modules</option>' + modules.map(m => `<option value="${m}">${m}</option>`).join('');
    if (modules.includes(current)) moduleFilter.value = current;
}

function onCourseChange() {
    buildModuleFilterOptions();
    refreshTopicView();
}

function setSelectedTopic(topicId) {
    selectedTopicId = topicId || '';
    // Toggle card selection styles
    const grid = document.getElementById('topicsGrid');
    if (grid) {
        grid.querySelectorAll('[data-topic-id]').forEach(card => {
            if (card.getAttribute('data-topic-id') === selectedTopicId) {
                card.classList.add('ring-2','ring-nebula-500','border-nebula-500','bg-nebula-50');
            } else {
                card.classList.remove('ring-2','ring-nebula-500','border-nebula-500','bg-nebula-50');
            }
        });
    }
    // Keep hidden select in sync for compatibility
    const select = document.getElementById('topicSelect');
    if (select) select.value = selectedTopicId;
    // Enable/disable action buttons
    const canAct = Boolean(selectedTopicId);
    const loadBtn = document.getElementById('loadTopicBtn');
    const delBtn = document.getElementById('deleteTopicBtn');
    if (loadBtn) loadBtn.disabled = !canAct;
    if (delBtn) delBtn.disabled = !canAct;
}

function renderTopicCards(list) {
    const grid = document.getElementById('topicsGrid');
    const hint = document.getElementById('topicsHint');
    const countEl = document.getElementById('topicsCount');
    if (!grid) return;
    grid.innerHTML = '';
    (list || []).forEach(t => {
        const { course, module, topic } = parseTopicIdParts(t.id || '');
        const card = document.createElement('div');
        card.setAttribute('data-topic-id', t.id);
        card.className = 'border border-gray-200 rounded-xl p-4 hover:shadow-sm transition cursor-pointer bg-white';
        card.onclick = () => setSelectedTopic(t.id);
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <div class="text-base font-semibold text-gray-900 truncate max-w-xs" title="${t.title || t.id}">${(t.title || '').trim() || '(Untitled)'}</div>
                    <div class="text-xs text-gray-400 mt-1">${t.id}</div>
                </div>
                <div class="text-gray-400"><i class="fas fa-chevron-right"></i></div>
            </div>
        `;
        grid.appendChild(card);
    });
    if (countEl) countEl.textContent = String(list.length);
    // Toggle hint/grid visibility
    if (hint && grid) {
        if ((list || []).length === 0) {
            hint.classList.remove('hidden');
            grid.classList.add('hidden');
        } else {
            hint.classList.add('hidden');
            grid.classList.remove('hidden');
        }
    }
}

function refreshTopicView() {
    const search = (document.getElementById('topicSearch')?.value || '').toLowerCase();
    const course = document.getElementById('courseFilter')?.value || '';
    const module = document.getElementById('moduleFilter')?.value || '';
    // If no filter and no search, show nothing (encourage filtering)
    const shouldShow = Boolean(course || module || search);
    if (!shouldShow) {
        renderTopicCards([]);
        setSelectedTopic('');
        return;
    }
    const filtered = (topicsCache || []).filter(t => {
        const id = (t.id || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        const parts = parseTopicIdParts(t.id);
        const matchesSearch = !search || id.includes(search) || title.includes(search);
        const matchesCourse = !course || parts.course === course;
        const matchesModule = !module || parts.module === module;
        return matchesSearch && matchesCourse && matchesModule;
    });
    renderTopicCards(filtered);
    // Preserve selection if it is still visible
    if (!filtered.find(t => t.id === selectedTopicId)) {
        setSelectedTopic('');
    } else {
        setSelectedTopic(selectedTopicId);
    }
}
async function listTopics() {
    try {
        const select = document.getElementById('topicSelect');
        if (select) select.innerHTML = '<option value="">Loading topics...</option>';
        const res = await fetch('/form/topics');
        const data = await res.json();
        if (data.success) {
            topicsCache = Array.isArray(data.topics) ? data.topics : [];
            // Populate hidden select for compatibility
            if (select) {
                select.innerHTML = '<option value="">Select a topic...</option>';
                topicsCache.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.title ? `${t.title} (${t.id})` : t.id;
                    select.appendChild(opt);
                });
            }
            // Build filters and render grid
            buildCourseFilterOptions();
            buildModuleFilterOptions();
            refreshTopicView();
        } else {
            if (select) select.innerHTML = '<option value="">No topics found</option>';
            topicsCache = [];
            buildCourseFilterOptions();
            buildModuleFilterOptions();
            renderTopicCards([]);
        }
    } catch (err) {
        const select = document.getElementById('topicSelect');
        if (select) select.innerHTML = '<option value="">Failed to load topics</option>';
        topicsCache = [];
        buildCourseFilterOptions();
        buildModuleFilterOptions();
        renderTopicCards([]);
        showToast('Could not load topics. Click Refresh to retry.', 'error');
    }
}

async function saveTopicToCloud() {
    if (isBusy) return;
    isBusy = true;
    showLoadingModal('Saving draft…', 'Uploading content and assets to cloud');
    try {
    const data = collectFormData();
    const topicId = (data.topicId || '').trim();
    // Allow uppercase letters in CourseName, no spaces/special chars in that segment
    // Full format: CourseName-Mx-Ty(.z)
    const topicIdPattern = /^[A-Za-z]+-M\d+-T\d+(?:\.\d+)?$/;
    if (!topicId || !topicIdPattern.test(topicId)) {
        showToast('Provide Topic ID as CourseName-Mx-Ty (e.g., Robotics-M1-T1 or RoboticsAI-M2-T3.1). CourseName: letters only, no spaces.', 'error');
        return;
    }

        const formEl = document.getElementById('scormForm');
        const formData = new FormData(formEl);
        formData.set('learningObjectivesJson', JSON.stringify(data.learningObjectives));
        formData.set('taskSteps', JSON.stringify(data.taskSteps));
        formData.set('concepts', JSON.stringify(data.concepts));
        formData.set('quizQuestions', JSON.stringify(data.quizQuestions));
        formData.set('title', data.title);
        formData.set('topicId', data.topicId);
        formData.set('description', data.description);
        formData.set('taskStatement', data.taskStatement);
        formData.set('heroImageCaption', data.heroImageCaption);
        formData.set('quizTitle', data.quizTitle);
        formData.set('quizDescription', data.quizDescription);
        
        const res = await fetch('/build/save', { method: 'POST', body: formData });
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error || 'Save failed');
        showToast('Draft saved to cloud', 'success');
        await listTopics();
    } catch (e) {
        showToast(`Save failed: ${e.message}`, 'error');
    } finally {
        hideLoadingModal();
        isBusy = false;
    }
}

async function loadTopicFromCloud() {
    if (isBusy) return;
    isBusy = true;
    showLoadingModal('Loading topic…', 'Fetching topic configuration and images');
    // Prefer card selection; fallback to select
    const select = document.getElementById('topicSelect');
    const topicId = selectedTopicId || (select ? select.value : '');
    if (!topicId) return;
    try {
        const res = await fetch(`/form/topics/${encodeURIComponent(topicId)}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Load failed');
        populateFormFromCloudConfig(data.data, data.imageUrls || {});
        showToast('Topic loaded', 'success');
    } catch (e) {
        showToast(`Load failed: ${e.message}`, 'error');
    } finally {
        hideLoadingModal();
        isBusy = false;
    }
}

async function deleteTopicFromCloud() {
    if (isBusy) return;
    const select = document.getElementById('topicSelect');
    const topicId = selectedTopicId || (select ? select.value : '');
    if (!topicId) return;
    if (!confirm('Delete this topic permanently?')) return;
    isBusy = true;
    showLoadingModal('Deleting topic…', 'Removing the topic from cloud storage');
    try {
        const res = await fetch(`/form/topics/${encodeURIComponent(topicId)}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Delete failed');
        showToast('Topic deleted', 'success');
        clearAllFormFields(); // Clear all form data
        await listTopics();
        setSelectedTopic('');
    } catch (e) {
        showToast(`Delete failed: ${e.message}`, 'error');
    } finally {
        hideLoadingModal();
        isBusy = false;
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
            renderSingleLoadedImagePreview('companyLogoPreview', 'companyLogoInput', logoUrl, logoFile, config.content.company_logo.alt || 'Company Logo');
        }
    }

    // Hero image preview
    if (config.content && config.content.hero_image && config.content.hero_image.src) {
        const heroUrl = imageUrls[config.content.hero_image.src] || '';
        if (heroUrl) {
            renderSingleLoadedImagePreview('heroImagePreview', 'heroImageInput', heroUrl, config.content.hero_image.src, config.title || 'Hero Image');
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
        
        // Task page data
        if (step.taskPage) {
            const taskPageEnabled = document.querySelector(`input[name="taskStep_step_${i}_taskPage_enabled"]`);
            const taskPageUrl = document.querySelector(`input[name="taskStep_step_${i}_taskPageUrl"]`);
            
            if (taskPageEnabled && taskPageUrl) {
                taskPageEnabled.checked = true;
                taskPageUrl.value = step.taskPage.url || '';
                // Show the task page section
                toggleTaskPageSection(`step_${i}`, true);
            }
        }
        
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
                        renderMultiLoadedImageThumb(preview, url, imgObj.src, 'Step image');
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
                        renderMultiLoadedImageThumb(preview, url, imgObj.src, 'Hint image');
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

        // Handle carousel data (both enabled and disabled)
        if (c.interactive_carousel) {
            const carouselCheckbox = document.querySelector(`input[name="concept_concept_${i}_carousel_enabled"]`);
            const carouselSection = document.getElementById(`concept_concept_${i}_carousel_section`);
            const botUrlInput = document.querySelector(`input[name="concept_concept_${i}_carousel_botUrl"]`);

            // Set the checkbox state based on enabled flag
            carouselCheckbox.checked = c.interactive_carousel.enabled || false;

            // Show/hide section based on enabled state
            if (c.interactive_carousel.enabled) {
                carouselSection.classList.remove('hidden');
            } else {
                carouselSection.classList.add('hidden');
            }

            // Always set the bot URL if it exists
            if (c.interactive_carousel.bot_iframe_url) {
                botUrlInput.value = c.interactive_carousel.bot_iframe_url;
            }

            // Add carousel slides if they exist (even if disabled - to preserve data)
            if (c.interactive_carousel.slides && Array.isArray(c.interactive_carousel.slides)) {
                c.interactive_carousel.slides.forEach((slideData, slideIdx) => {
                    addCarouselSlide(`concept_${i}`);
                    const slideNumber = slideIdx + 1;
                    const slideId = `concept_${i}_slide_${slideNumber}`;

                    // Populate slide data
                    const topicInput = document.querySelector(`input[name="carousel_${slideId}_topic"]`);
                    const descriptionInput = document.querySelector(`textarea[name="carousel_${slideId}_description"]`);
                    const promptInput = document.querySelector(`input[name="carousel_${slideId}_prompt"]`);

                    if (topicInput) topicInput.value = slideData.topic || '';
                    if (descriptionInput) descriptionInput.value = slideData.description || '';
                    if (promptInput) promptInput.value = slideData.prompt || '';

                    // Handle slide image
                    if (slideData.image) {
                        const url = imageUrls[slideData.image] || '';
                        if (url) {
                            renderSingleLoadedImagePreview(`carousel_${slideId}_image_preview`, `carousel_${slideId}_image_input`, url, slideData.image, `Slide ${slideNumber} image`);
                        }
                    }
                });
            }
        }

        if (c.image && c.image.src) {
            const url = imageUrls[c.image.src] || '';
            if (url) {
                renderSingleLoadedImagePreview(`concept_concept_${i}_image_preview`, `concept_concept_${i}_image_input`, url, c.image.src, c.title || 'Concept image');
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
            // Robust selection of correct answers (supports legacy and new keys, coerces to numbers)
            const correctAnswerIdx = Number(q.correct_answer != null ? q.correct_answer : q.correctAnswer);
            const correctAnswersArr = Array.isArray(q.correct_answers) ? q.correct_answers : (Array.isArray(q.correctAnswers) ? q.correctAnswers : []);
            const correctAnswersNums = correctAnswersArr.map(v => Number(v)).filter(v => !Number.isNaN(v));
            if (q.type === 'mcq' && !Number.isNaN(correctAnswerIdx) && oi === correctAnswerIdx) {
                const radio = row.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            }
            if (q.type === 'checkbox' && correctAnswersNums.includes(oi)) {
                const cb = row.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = true;
            }
        });
        // Extra fallback selection by explicit input query (covers any order/visibility issues)
        const caIdxNum = Number(q.correct_answer != null ? q.correct_answer : q.correctAnswer);
        if (q.type === 'mcq' && !Number.isNaN(caIdxNum)) {
            const radio = form.querySelector(`input[type="radio"][name="${base}correctAnswer"][value="${caIdxNum}"]`);
            if (radio) radio.checked = true;
        }
        if (q.type === 'checkbox') {
            const caArr = Array.isArray(q.correct_answers) ? q.correct_answers : (Array.isArray(q.correctAnswers) ? q.correctAnswers : []);
            caArr.map(v => Number(v)).filter(v => !Number.isNaN(v)).forEach(v => {
                const cb = form.querySelector(`input[type="checkbox"][name="${base}correctAnswers"][value="${v}"]`);
                if (cb) cb.checked = true;
            });
        }
        // Set explanation text
        const explanationText = q.explanation != null ? q.explanation : (q.explanation_text || '');
        const expEl = form.querySelector(`textarea[name="${base}explanation"]`);
        if (expEl) expEl.value = explanationText;
        const selectEl = document.querySelector(`select[name="${base}type"]`);
        toggleQuestionType(`question_${i}`, q.type || 'mcq', selectEl);

        // Handle question images (multiple images)
        if (q.images && Array.isArray(q.images) && q.images.length > 0) {
            const questionImagesPreview = document.getElementById(`quizQuestion_question_${i}_images_preview`);
            if (questionImagesPreview) {
                questionImagesPreview.innerHTML = '';
                q.images.forEach((imgObj, imgIndex) => {
                    const url = imageUrls[imgObj.src] || '';
                    if (url) {
                        renderMultiLoadedImageThumb(questionImagesPreview, url, imgObj.src, `Question image ${imgIndex + 1}`);
                    }
                });
            }
        }

        // Handle explanation image (single image)
        if (q.explanation_image && q.explanation_image.src) {
            const url = imageUrls[q.explanation_image.src] || '';
            if (url) {
                renderSingleLoadedImagePreview(`quizQuestion_question_${i}_explanationImage_preview`, `quizQuestion_question_${i}_explanationImage_input`, url, q.explanation_image.src, 'Explanation image');
            }
        }
    });
}

// Helpers to manage loaded image previews and deletions
function ensureDeleteImagesContainer() {
    let container = document.getElementById('deleteImagesContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'deleteImagesContainer';
        container.className = 'hidden';
        const form = document.getElementById('scormForm');
        form.appendChild(container);
    }
    return container;
}

function markImageForDeletion(filename) {
    const container = ensureDeleteImagesContainer();
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'deleteImages';
    input.value = filename;
    container.appendChild(input);
}

function renderSingleLoadedImagePreview(previewId, inputId, url, filename, altText) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    preview.classList.remove('hidden');
    preview.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block';
    wrapper.innerHTML = `
        <img src="${url}" alt="${altText || 'Image'}" class="h-20 w-auto rounded-lg shadow-sm">
        <button type="button" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
            title="Remove image"
            onclick="removeLoadedSingleImage('${previewId}', '${inputId}', '${filename}')">
            <i class="fas fa-times text-xs"></i>
        </button>
    `;
    preview.appendChild(wrapper);
}

function renderMultiLoadedImageThumb(previewContainer, url, filename, altText) {
    const item = document.createElement('div');
    item.className = 'relative';
    item.innerHTML = `
        <img src="${url}" alt="${altText || 'Image'}" class="w-full h-32 object-cover rounded shadow">
        <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
            title="Remove image"
            onclick="removeLoadedMultiImage(this, '${filename}')">
            <i class="fas fa-times text-xs"></i>
        </button>
    `;
    previewContainer.appendChild(item);
}

// Global functions for onclick
function removeLoadedSingleImage(previewId, inputId, filename) {
    const preview = document.getElementById(previewId);
    if (preview) {
        preview.innerHTML = '';
        preview.classList.add('hidden');
    }
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }
    if (filename) markImageForDeletion(filename);
    autoSave();
}

function removeLoadedMultiImage(button, filename) {
    const item = button.closest('.relative');
    if (item) item.remove();
    if (filename) markImageForDeletion(filename);
    autoSave();
}

function showToast(message, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `fixed z-50 bottom-4 right-4 px-4 py-2 rounded shadow text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
}

function showDetailedError(title, message) {
    // Create a more detailed error modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900">${title}</h3>
            </div>
            <div class="mb-6">
                <p class="text-gray-700 leading-relaxed">${message}</p>
            </div>
            <div class="flex justify-end">
                <button type="button" onclick="this.closest('.fixed').remove()" 
                        class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    <i class="fas fa-times mr-2"></i>Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Modal functions
let isBusy = false;

function showLoadingModal(title, subtitle) {
    const modal = document.getElementById('loadingModal');
    const t = document.getElementById('loadingTitle');
    const s = document.getElementById('loadingSubtitle');
    if (t && title) t.textContent = title;
    if (s && subtitle) s.textContent = subtitle;
    modal.classList.remove('hidden');
}

function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    const t = document.getElementById('loadingTitle');
    const s = document.getElementById('loadingSubtitle');
    // Reset default text for next use
    if (t) t.textContent = 'Please wait';
    if (s) s.textContent = 'Processing your request...';
    modal.classList.add('hidden');
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
    // Initialize page navigation first
    initializePageNavigation();
    
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
    // Always refresh topic list on DOM ready
    listTopics().catch(() => {});
});

// Extra safeguard: also try once when window fully loads (images, etc.)
window.addEventListener('load', function() {
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

// Multi-page navigation functions
function showPage(pageNumber) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show the requested page
    const targetPage = document.getElementById(`page-${pageNumber}`);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
    
    // Update progress indicator
    updateProgressIndicator(pageNumber);
    
    // Update navigation buttons
    updateNavigationButtons(pageNumber);
    
    // Auto-save current form data
    autoSave();
}

function updateProgressIndicator(pageNumber) {
    const progressSteps = document.querySelectorAll('.progress-step');
    
    progressSteps.forEach((step, index) => {
        const circle = step.querySelector('div');
        const text = step.querySelector('span');
        
        if (index + 1 === pageNumber) {
            // Current page
            circle.className = 'w-10 h-10 step-circle rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-110 transition-transform';
            if (text) text.className = 'text-sm font-medium text-gray-700 hidden sm:block';
        } else if (index + 1 < pageNumber) {
            // Completed pages
            circle.className = 'w-10 h-10 step-circle rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-110 transition-transform';
            if (text) text.className = 'text-sm font-medium text-gray-700 hidden sm:block';
        } else {
            // Future pages
            circle.className = 'w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm cursor-pointer hover:scale-110 transition-transform';
            if (text) text.className = 'text-sm font-medium text-gray-500 hidden sm:block';
        }
    });
}

function updateNavigationButtons(pageNumber) {
    // Update both top and bottom navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const bottomPrevBtn = document.getElementById('bottomPrevBtn');
    const bottomNextBtn = document.getElementById('bottomNextBtn');
    const currentPageNumber = document.getElementById('currentPageNumber');
    
    // Update page number display
    if (currentPageNumber) {
        currentPageNumber.textContent = pageNumber;
    }
    
    // Update Previous buttons
    const prevButtons = [prevBtn, bottomPrevBtn].filter(Boolean);
    prevButtons.forEach(btn => {
        if (pageNumber === 1) {
            btn.disabled = true;
            btn.className = 'bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
        } else {
            btn.disabled = false;
            btn.className = 'bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors';
        }
    });
    
    // Update Next buttons
    const nextButtons = [nextBtn, bottomNextBtn].filter(Boolean);
    nextButtons.forEach(btn => {
        if (pageNumber === totalPages) {
            btn.innerHTML = 'Finish<i class="fas fa-check ml-2"></i>';
            btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors';
        } else {
            btn.innerHTML = 'Next<i class="fas fa-arrow-right ml-2"></i>';
            btn.className = 'btn-primary nav-button px-4 py-2 rounded-lg text-white';
        }
    });
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        showPage(currentPage);
    } else {
        // On the last page, scroll to generate section
        document.querySelector('section.bg-gradient-to-r').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

function goToPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        showPage(currentPage);
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
    }
}

// Validation function removed - users can navigate freely between pages

// Clear all form fields
function clearAllFormFields() {
    const form = document.getElementById('scormForm');
    if (!form) return;
    
    // Clear basic fields
    form.querySelector('input[name="title"]').value = '';
    form.querySelector('input[name="topicId"]').value = '';
    form.querySelector('textarea[name="description"]').value = '';
    form.querySelector('input[name="taskStatement"]').value = '';
    form.querySelector('input[name="heroImageCaption"]').value = '';
    form.querySelector('input[name="quizTitle"]').value = 'Knowledge Check';
    form.querySelector('input[name="quizDescription"]').value = '';
    
    // Clear file inputs
    form.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
    });
    
    // Clear learning objectives
    const learningObjectivesContainer = document.getElementById('learningObjectives');
    if (learningObjectivesContainer) {
        learningObjectivesContainer.innerHTML = `
            <div class="flex items-center space-x-4 learning-objective-item">
                <input type="text" name="learningObjectives[]" 
                       class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       placeholder="What will learners achieve?">
                <button type="button" onclick="removeLearningObjective(this)" 
                        class="text-red-500 hover:text-red-700 p-2">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }
    
    // Clear task steps
    const taskStepsContainer = document.getElementById('taskSteps');
    if (taskStepsContainer) {
        taskStepsContainer.innerHTML = '';
    }
    
    // Clear concepts
    const conceptsContainer = document.getElementById('concepts');
    if (conceptsContainer) {
        conceptsContainer.innerHTML = '';
    }
    
    // Clear quiz questions
    const quizQuestionsContainer = document.getElementById('quizQuestions');
    if (quizQuestionsContainer) {
        quizQuestionsContainer.innerHTML = '';
    }
    
    // Clear image previews
    document.querySelectorAll('[id$="Preview"]').forEach(preview => {
        preview.innerHTML = '';
        preview.classList.add('hidden');
    });
    
    // Clear any delete images container
    const deleteContainer = document.getElementById('deleteImagesContainer');
    if (deleteContainer) {
        deleteContainer.innerHTML = '';
    }
    
    // Auto-save the cleared state
    autoSave();
}

// Initialize page navigation
function initializePageNavigation() {
    showPage(1); // Start with page 1
}