# Template System Architecture

## Overview
The SCORM Builder uses a template-based system to generate dynamic learning content from JSON configuration files. The template system transforms structured topic data into interactive SCORM packages with quizzes, tasks, hints, and chat functionality.

## Core Components

### 1. Main Template File
**File**: `templates/topic-template.html`

The master template file that serves as the foundation for all generated SCORM packages. It uses Mustache templating to inject dynamic content and includes all necessary JavaScript modules.

**Key Features**:
- Responsive design with Tailwind CSS
- Multi-section layout (Hero, Concepts, Task Steps, Quiz)
- SCORM API integration
- Chat widget integration
- Progress tracking
- Image modal and code viewing capabilities

### 2. Template Data Structure

#### Core Template Variables
```html
<script id="templateData" type="application/json">
{
    "hints": {{{hintsJson}}},
    "quiz": {{{quizJson}}},
    "id": "{{id}}",
    "title": {{{titleJson}}},
    "description": {{{descriptionJson}}},
    "taskStatement": {{{taskStatementJson}}},
    "taskRequirements": {{{taskRequirementsJson}}},
    "learningObjectives": {{{learningObjectivesJson}}},
    "concepts": {{{conceptsJson}}},
    "taskSteps": {{{taskStepsJson}}},
    "backendUrl": "{{backend_url}}",
    "chatContexts": {{{chatContextsJson}}}
}
</script>
```

#### Topic Configuration Structure
```json
{
    "title": "Topic Title",
    "description": "Topic description",
    "learning_objectives": ["Objective 1", "Objective 2"],
    "content": {
        "company_logo": {
            "src": "logo.png",
            "alt": "Company Logo"
        },
        "task_statement": "Main task description",
        "task_steps": [
            {
                "title": "Step Title",
                "description": "Step description",
                "instructions": "Step instructions (supports HTML)",
                "images": [
                    {
                        "src": "image.png",
                        "alt": "Alt text",
                        "caption": "Image caption"
                    }
                ],
                "video": {
                    "src": "video.mp4 or YouTube URL",
                    "type": "local or embed",
                    "caption": "Video caption"
                },
                "code": {
                    "content": "code content",
                    "language": "javascript"
                },
                "hint": {
                    "text": "Hint text",
                    "image": {
                        "src": "hint.png",
                        "alt": "Hint image",
                        "caption": "Hint caption"
                    },
                    "code": {
                        "content": "hint code",
                        "language": "python"
                    }
                },
                "taskPage": "external-workspace-url" // Optional
            }
        ],
        "hero_image": {
            "src": "hero.png",
            "alt": "Hero image",
            "caption": "Hero caption"
        },
        "concepts": [
            {
                "title": "Concept Title",
                "summary": "Concept summary",
                "image": {
                    "src": "concept.png",
                    "alt": "Concept image"
                },
                "learn_more_context": "chat_context_key",
                "interactive_carousel": {
                    "enabled": true
                }
            }
        ]
    },
    "quiz": {
        "title": "Quiz Title",
        "description": "Quiz description",
        "questions": [
            {
                "id": "q1",
                "question": "Question text",
                "type": "mcq", // or "checkbox"
                "options": ["Option A", "Option B", "Option C"],
                "correct_answer": 0, // for mcq
                "correct_answers": [0, 2], // for checkbox
                "explanation": "Explanation text",
                "explanation_image": {
                    "src": "explanation.png",
                    "alt": "Explanation image"
                },
                "images": [
                    {
                        "src": "question.png",
                        "alt": "Question image",
                        "caption": "Question caption"
                    }
                ]
            }
        ],
        "settings": {
            "allow_retry": true,
            "show_progress": true,
            "randomize_questions": false,
            "passing_score": 3
        }
    },
    "chat_contexts": {
        "task_help": "Chat context for task help",
        "concept_name": "Specific concept context",
        "quiz_failed": "Context for quiz failure",
        "hints_exhausted": "Context when all hints used"
    }
}
```

### 3. Template Processing Pipeline

#### Step 1: Data Injection
The `scripts/generate-topic.js` file processes topic configurations and injects data into the template:

```javascript
// Key data transformations
data.hintsJson = JSON.stringify(data.hints || []);
data.quizJson = JSON.stringify(data.quiz || {});
data.titleJson = JSON.stringify(data.title || '');
data.taskStepsJson = JSON.stringify(data.content?.task_steps || []);
data.learningObjectivesJson = JSON.stringify(data.learning_objectives || []);
data.conceptsJson = JSON.stringify(data.content?.concepts || []);
data.chatContextsJson = JSON.stringify(data.chat_contexts || {});
```

#### Step 2: Template Rendering
Mustache templating engine renders the dynamic content:

```html
{{#content.task_steps}}
<div class="task-step" data-step="{{_idx}}">
    <h4>{{title}}</h4>
    <p>{{description}}</p>
    <div>{{{instructionsHtml}}}</div>
    {{#images}}
    <img src="{{src}}" alt="{{alt}}">
    {{/images}}
</div>
{{/content.task_steps}}
```

#### Step 3: Asset Integration
Images and other assets are processed and referenced correctly:
- Local images copied to build directory
- Cloud images converted to public URLs
- Code blocks get syntax highlighting
- Image carousels for multiple images

### 4. Dynamic Template Features

#### Multi-Image Support
- Single images display directly
- Multiple images create carousels with navigation
- Support for both step images and hint images

#### Code Block Integration
```html
{{#code.content}}
<pre><code class="language-{{code.language}}">{{{code.content}}}</code></pre>
{{/code.content}}
```

#### Task Workspace Integration
Optional external workspace integration via `taskPage` parameter:
```html
{{#taskPage}}
<button onclick="openSplitScreen('{{taskPage}}', '{{_idx}}')">
    Open Task Workspace
</button>
{{/taskPage}}
```

#### Interactive Elements
- Hint reveal buttons
- Step completion tracking
- Quiz navigation
- Chat triggers for concepts
- Image modals
- Code copying functionality

### 5. JavaScript Module Integration

The template loads JavaScript modules in dependency order:

```html
<!-- Core JS Files -->
<script src="scorm-api.js"></script>
<script src="{{backend_url}}/chat-service.js"></script>
<script src="{{backend_url}}/enhanced-chat-widget.js"></script>
<script src="chat-integration.js"></script>
<script src="core-functions.js"></script>
<script src="quiz-system.js"></script>
<script src="chat-system.js"></script>
<script src="task-system.js"></script>
<script src="task-split-screen.js"></script>
```

### 6. Template Configuration

#### Backend Integration
```javascript
window.templateConfig = {
    backendUrl: "{{backend_url}}",
    chatMode: "{{chat_mode}}", // "custom_backend" | "direct_gemini"
    fallbackEnabled: true
};
```

#### Template Data Loading
```javascript
window.templateData = JSON.parse(document.getElementById('templateData').textContent);
```

### 7. Responsive Design Features

#### Mobile-First Approach
- Tailwind CSS responsive utilities
- Flexible grid layouts
- Touch-friendly interactions
- Adaptive image sizing

#### Accessibility Features
- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- High contrast support

### 8. Video Support in Task Steps

The SCORM Builder now supports video content in task steps, providing an alternative to static images. Each task step can include either images OR video (not both), maintaining a clean and focused learning experience.

#### Video Configuration

Video content is configured using the `video` field in task steps:

```json
{
  "title": "Step with Video Content",
  "description": "Step description",
  "instructions": "Step instructions",
  "video": {
    "src": "video-file.mp4",
    "type": "local",
    "caption": "Video caption text"
  }
}
```

#### Video Types

**1. Local Videos (type: "local")**
- Supported formats: MP4, WebM, OGG
- Maximum file size: 50MB
- Automatically processed and included in SCORM package
- Rendered using HTML5 `<video>` element with controls

```json
{
  "video": {
    "src": "demo-video.mp4",
    "type": "local",
    "caption": "Watch the step-by-step demonstration"
  }
}
```

**2. Embedded Videos (type: "embed")**
- Supports YouTube, Vimeo, and other video platforms
- URLs are automatically converted to embed formats
- Rendered in iframe with appropriate parameters
- No file size limits (streamed from external platform)

```json
{
  "video": {
    "src": "https://www.youtube.com/watch?v=VIDEO_ID",
    "type": "embed",
    "caption": "Learn from this comprehensive tutorial"
  }
}
```

#### Video URL Formats

**YouTube URLs:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

**Vimeo URLs:**
- `https://vimeo.com/VIDEO_ID`

#### UI/UX Features

- **Video Preview**: Thumbnail with play button overlay
- **Type Badge**: Visual indicator showing "Local Video" or "Online Video"
- **Fullscreen Mode**: Click to open in modal with larger player
- **Keyboard Navigation**: ESC to close modal
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: ARIA labels and keyboard navigation support

#### Technical Implementation

- **Video Modal**: Professional modal overlay with dark background
- **Local Video Processing**: Automatic file validation and path mapping
- **Embed URL Conversion**: Intelligent parsing of video platform URLs
- **Error Handling**: Fallback messages for failed video loads
- **Asset Management**: Videos stored in `assets/videos/` directory

#### Video vs Images

Each task step can contain either images OR video, but not both:

```json
// ✅ Valid - Video only
{
  "video": {
    "src": "demo.mp4",
    "type": "local",
    "caption": "Demo video"
  }
}

// ✅ Valid - Images only
{
  "images": [
    {
      "src": "step1.png",
      "alt": "Step 1",
      "caption": "Step 1 illustration"
    }
  ]
}

// ❌ Invalid - Both images and video
{
  "images": [...],
  "video": {...}
}
```

#### Best Practices for Video Content

1. **File Optimization**: Keep local videos under 50MB for optimal performance
2. **Format Selection**: MP4 is recommended for best browser compatibility
3. **Captions**: Always provide descriptive captions for accessibility
4. **Duration**: Keep instructional videos concise (2-5 minutes ideal)
5. **Quality**: Ensure good audio and video quality for learning effectiveness
6. **Fallbacks**: For embed videos, ensure the external platform is accessible

### 9. Template Customization Points

#### Branding
- Company logo integration
- Custom color schemes via Tailwind config
- Custom fonts and typography

#### Layout Variations
- Single column vs multi-column layouts
- Optional sections (concepts, quiz, etc.)
- Flexible task step arrangements

#### Interactive Components
- Carousel assistants for concepts
- Voice assistant integration
- Video content integration
- Multi-language support potential

## File Dependencies

### Required JavaScript Modules
1. `scorm-api.js` - SCORM integration
2. `chat-integration.js` - Chat widget management
3. `core-functions.js` - Utility functions
4. `quiz-system.js` - Quiz functionality
5. `chat-system.js` - Chat system logic
6. `task-system.js` - Task progress tracking
7. `task-split-screen.js` - Split-screen workspace

### Required CSS Files
1. Tailwind CSS (CDN)
2. `task-split-screen.css` - Split-screen styles
3. `styles.css` - Generated custom styles
4. `carousel-assistant-styles.css` - Carousel styles

### External Dependencies
1. Font Awesome icons
2. Highlight.js for code syntax
3. Firebase SDK (for feedback form)
4. Custom backend chat widgets

## Usage Examples

### Creating a Simple Topic
```json
{
    "title": "Basic Robotics",
    "description": "Introduction to robotics",
    "content": {
        "task_statement": "Learn robot basics",
        "task_steps": [
            {
                "title": "Step 1",
                "instructions": "Learn the basics",
                "images": [{"src": "step1.png", "alt": "Step 1"}]
            }
        ]
    },
    "quiz": {
        "title": "Test your knowledge",
        "questions": [
            {
                "question": "What is robotics?",
                "options": ["A", "B", "C"],
                "correct_answer": 0
            }
        ]
    }
}
```

### Adding Interactive Elements
```json
{
    "content": {
        "concepts": [
            {
                "title": "Robot Sensors",
                "summary": "Learn about sensors",
                "learn_more_context": "robot_sensors",
                "interactive_carousel": {"enabled": true}
            }
        ],
        "task_steps": [
            {
                "title": "Practice with sensors",
                "hint": {
                    "text": "Check sensor connections",
                    "code": {
                        "content": "sensor.read()",
                        "language": "python"
                    }
                }
            }
        ]
    },
    "chat_contexts": {
        "robot_sensors": "Discuss different types of sensors"
    }
}
```

## Best Practices

1. **Image Organization**: Keep all images in an `images/` folder alongside config.json
2. **Content Structure**: Use clear, hierarchical naming conventions
3. **Instruction Formatting**: Use simple HTML in instructions for better formatting
4. **Hint Strategy**: Provide progressive hints that build understanding
5. **Quiz Design**: Include clear explanations for learning reinforcement
6. **Accessibility**: Provide alt text for all images and captions
7. **Mobile Optimization**: Test content on smaller screens
8. **Performance**: Optimize image sizes for web delivery

## Troubleshooting

### Common Issues
1. **Template Data Not Loading**: Check JSON syntax in config files
2. **Images Not Displaying**: Verify image paths and file existence
3. **Quiz Not Working**: Ensure quiz structure matches expected format
4. **Chat Not Connecting**: Verify backend URL configuration
5. **SCORM Not Initializing**: Check LMS integration and API availability

### Debug Information
Template data is logged to console:
```javascript
console.log('✅ Template data loaded:', window.templateData);
```