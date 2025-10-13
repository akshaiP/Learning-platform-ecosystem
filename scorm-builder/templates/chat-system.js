// Enhanced Chat System for Learning Platform
class ChatSystem {
    constructor() {
        this.templateData = null;
        this.topicConfig = null;
        this.learnerData = null;
    }

    initialize(templateData, topicConfig, learnerData) {
        this.templateData = templateData;
        this.topicConfig = topicConfig;
        this.learnerData = learnerData;
    }

    buildChatContext(contextType, additionalData = {}) {
        const template = this.templateData;
        
        if (!template) {
            console.warn('No template data available for chat context');
            return this.getDefaultContext();
        }

        switch(contextType) {
            case 'task_help':
                return {
                    context: 'help',
                    message: `I need help with this task: "${template.taskStatement || 'the assigned task'}". Can you guide me through the approach?`,
                    contextData: {
                        taskStatement: template.taskStatement || 'Unknown task',
                        taskRequirements: template.taskRequirements || [],
                        topicTitle: template.title || 'This topic',
                        learnerProgress: window.progressStep || 1
                    }
                };

            case 'learn_more':
                const conceptTitle = additionalData.conceptTitle || 'this concept';
                const learnMoreContext = additionalData.learnMoreContext || 'general';
                const conceptSummary = additionalData.conceptSummary || '';
                let additionalContextText = '';
                if (this.topicConfig && this.topicConfig.contexts) {
                    additionalContextText = this.topicConfig.contexts[learnMoreContext] || '';
                }
                // If mapping not found, fall back to the literal learn_more_context value (which may itself be a prompt)
                if (!additionalContextText && typeof learnMoreContext === 'string') {
                    additionalContextText = learnMoreContext;
                }
                
                return {
                    context: 'learn_more', 
                    message: `I want to understand "${conceptTitle}" in detail. Please explain it with examples and how it relates to ${template.title || 'this topic'}.`,
                    contextData: {
                        conceptTitle: conceptTitle,
                        conceptSummary: conceptSummary,
                        learnMoreContext: learnMoreContext,
                        additionalContextText: additionalContextText,
                        topicTitle: template.title || 'This topic',
                        taskStatement: template.taskStatement || 'The assigned task'
                    }
                };

            case 'quiz_failed':
                const question = additionalData.question || {};
                const userAnswer = additionalData.userAnswer;
                
                let userAnswerText, correctAnswerText, finalMessage;
                
                // Check if this is a checkbox question
                if (question.questionType === 'checkbox' || Array.isArray(userAnswer)) {
                    // Handle checkbox questions
                    const selectedOptionsText = question.selectedOptionsText || 'no options selected';
                    const correctOptionsText = question.correctOptionsText || 'unknown correct answers';
                    
                    userAnswerText = selectedOptionsText;
                    correctAnswerText = correctOptionsText;
                    
                    finalMessage = `I got a quiz question wrong. The question was: "${question.question || 'the quiz question'}". I selected "${userAnswerText}" but the correct answers are "${correctAnswerText}". Please explain why my answer was wrong and help me understand the correct concept.`;
                } else {
                    // Handle MCQ questions (original logic)
                    const correctAnswer = question.correct_answer;
                    
                    userAnswerText = (question.options && Array.isArray(question.options) && typeof userAnswer === 'number' && userAnswer >= 0) 
                        ? question.options[userAnswer] || 'unknown selection'
                        : 'unknown selection';
                        
                    correctAnswerText = (question.options && Array.isArray(question.options) && typeof correctAnswer === 'number' && correctAnswer >= 0) 
                        ? question.options[correctAnswer] || 'unknown answer'
                        : 'unknown answer';
                    
                    finalMessage = `I got a quiz question wrong. The question was: "${question.question || 'the quiz question'}". I selected "${userAnswerText}" but the correct answer is "${correctAnswerText}". Please explain why my answer was wrong and help me understand the correct concept.`;
                }
                
                return {
                    context: 'quiz_failed',
                    message: finalMessage,
                    contextData: {
                        quizQuestion: question.question || 'Unknown question',
                        userAnswer: userAnswer,
                        userAnswerText: userAnswerText,
                        correctAnswer: question.correct_answer || question.correct_answers,
                        correctAnswerText: correctAnswerText,
                        allOptions: question.options || [],
                        topicTitle: template.title || 'This topic',
                        taskStatement: template.taskStatement || 'The assigned task',
                        questionType: question.questionType || 'mcq'
                    }
                };

            case 'quiz_explanation':
                const currentQuestion = window.quizQuestions && window.quizQuestions[window.currentQuestionIndex];
                
                const correctAnswerForExplanation = (currentQuestion?.options && Array.isArray(currentQuestion.options) && typeof currentQuestion.correct_answer === 'number' && currentQuestion.correct_answer >= 0)
                    ? currentQuestion.options[currentQuestion.correct_answer] 
                    : 'the correct answer';
                    
                const explanationMessage = `Please explain the answer to this quiz question in detail: "${currentQuestion?.question || 'the quiz question'}". The correct answer is "${correctAnswerForExplanation}". Help me understand why this is correct and provide examples.`;
                    
                return {
                    context: 'learn_more',
                    message: explanationMessage,
                    contextData: {
                        quizQuestion: currentQuestion?.question || 'Unknown question',
                        correctAnswer: currentQuestion?.correct_answer,
                        correctAnswerText: correctAnswerForExplanation,
                        allOptions: currentQuestion?.options || [],
                        topicTitle: template.title || 'This topic'
                    }
                };

            case 'hints_exhausted':
                const hintsCount = window.revealedHints ? window.revealedHints.length : 0;
                const hintsText = window.revealedHints && window.revealedHints.length > 0 
                    ? window.revealedHints.map((h, i) => `${i+1}. ${h}`).join(' ')
                    : 'the available hints';
                    
                return {
                    context: 'help',
                    message: `I've read all ${hintsCount} hints but I still need more help with the task: "${template.taskStatement || 'the assigned task'}". The hints I've seen were: ${hintsText}. Can you provide additional guidance?`,
                    contextData: {
                        taskStatement: template.taskStatement || 'Unknown task',
                        revealedHints: window.revealedHints || [],
                        hintsCount: hintsCount,
                        topicTitle: template.title || 'This topic',
                        learnerProgress: window.progressStep || 1
                    }
                };

            case 'summary':
                return {
                    context: 'summary',
                    message: `Please provide a comprehensive summary of "${template.title || 'this topic'}". Focus on the key concepts and how they relate to the task: "${template.taskStatement || 'the assigned task'}".`,
                    contextData: {
                        topicTitle: template.title || 'This topic',
                        topicDescription: template.description || 'No description available',
                        taskStatement: template.taskStatement || 'The assigned task',
                        learningObjectives: template.learningObjectives || [],
                        userProgress: {
                            step: window.progressStep || 1,
                            hintsUsed: window.revealedHints ? window.revealedHints.length : 0,
                            quizCompleted: window.quizCompleted || false
                        }
                    }
                };

            case 'practice':
                return {
                    context: 'practice',
                    message: `I want to practice the concepts from "${template.title || 'this topic'}". Can you provide exercises related to: "${template.taskStatement || 'the assigned task'}"?`,
                    contextData: {
                        topicTitle: template.title || 'This topic',
                        taskStatement: template.taskStatement || 'The assigned task',
                        learningObjectives: template.learningObjectives || []
                    }
                };

            default: // 'general'
                return {
                    context: 'general',
                    message: `Hello! I have questions about "${template.title || 'this topic'}". I'm working on: "${template.taskStatement || 'the assigned task'}".`,
                    contextData: {
                        topicTitle: template.title || 'This topic',
                        taskStatement: template.taskStatement || 'The assigned task'
                    }
                };
        }
    }

    getDefaultContext() {
        return {
            context: 'general',
            message: 'Hello! I need help with this learning topic.',
            contextData: {
                topicTitle: 'This topic',
                taskStatement: 'The assigned task'
            }
        };
    }

    openDynamicChat(contextType, additionalData = {}) {
        console.log('🚀 Opening dynamic chat:', contextType, additionalData);
        
        window.ensureChatWidget(() => {
            if (!window.chatWidget || !this.topicConfig) {
                console.warn('Chat widget or topic config not ready');
                return;
            }

            // Build context-specific prompt and data
            const chatConfig = this.buildChatContext(contextType, additionalData);
            
            console.log('💬 Final chat config:', chatConfig);
            
            chatWidget.initChatWidget({
                topic: this.topicConfig.topic,
                context: chatConfig.context,
                backendUrl: this.topicConfig.backendUrl,
                learnerData: this.learnerData,
                initialMessage: chatConfig.message,
                contextData: chatConfig.contextData
            });
            
            console.log('🎯 Dynamic chat opened successfully');
        });
    }
}

// Global chat system instance
window.chatSystem = new ChatSystem();

// Global chat functions for backward compatibility
function openDynamicChat(contextType, additionalData = {}) {
    window.chatSystem.openDynamicChat(contextType, additionalData);
}

function openTaskHelp() {
    openDynamicChat('task_help');
}

function openGeneralChat() {
    openDynamicChat('general');
}

function openLearnMore(learnMoreContext, conceptTitle) {
    // Extract concept summary from template data if available
    let conceptSummary = '';
    if (window.templateData && window.templateData.concepts) {
        const concept = window.templateData.concepts.find(c => c.title === conceptTitle);
        conceptSummary = concept ? concept.summary : '';
    }

    openDynamicChat('learn_more', {
        conceptTitle: conceptTitle,
        learnMoreContext: learnMoreContext,
        conceptSummary: conceptSummary
    });
}

function openQuizFailureChat(question, userAnswer) {
    openDynamicChat('quiz_failed', {
        question: question,
        userAnswer: userAnswer
    });
}

function openHintsExhaustedChat() {
    openDynamicChat('hints_exhausted');
}

function openSummaryChat() {
    openDynamicChat('summary');
}

function openQuizExplanation() {
    openDynamicChat('quiz_explanation');
}

function openPracticeChat() {
    openDynamicChat('practice');
}

// Export for global access
window.openDynamicChat = openDynamicChat;
window.openTaskHelp = openTaskHelp;
window.openGeneralChat = openGeneralChat;
window.openLearnMore = openLearnMore;
window.openQuizFailureChat = openQuizFailureChat;
window.openHintsExhaustedChat = openHintsExhaustedChat;
window.openSummaryChat = openSummaryChat;
window.openQuizExplanation = openQuizExplanation;
window.openPracticeChat = openPracticeChat;
