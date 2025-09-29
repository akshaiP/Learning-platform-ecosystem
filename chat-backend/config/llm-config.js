// LLM-specific configurations and system prompts (course-agnostic)
const env = process.env.NODE_ENV || 'development';
const runtimeConfig = require(`./${env}`);

module.exports = {
  gemini: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    // Prefer env model -> runtime config -> default
    model: process.env.GEMINI_MODEL || runtimeConfig?.ai?.model || 'gemini-2.0-flash',
    generationConfig: {
      temperature: runtimeConfig?.ai?.temperature ?? 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: runtimeConfig?.ai?.maxTokens ?? 2048,
      stopSequences: []
    }
  },

  // Per-context policies used by the chat route
  contextPolicies: {
    help: { temperature: 0.6, maxOutputTokens: 1200, autoContinue: { enabled: true, maxRounds: 1, continuationMaxTokens: 1200 } },
    learn_more: { temperature: 0.7, maxOutputTokens: 3200, autoContinue: { enabled: true, maxRounds: 3, continuationMaxTokens: 2800 } },
    practice: { temperature: 0.6, maxOutputTokens: 1400, autoContinue: { enabled: false, maxRounds: 0, continuationMaxTokens: 0 } },
    quiz_failed: { temperature: 0.5, maxOutputTokens: 1000, autoContinue: { enabled: false, maxRounds: 0, continuationMaxTokens: 0 } },
    summary: { temperature: 0.6, maxOutputTokens: 2800, autoContinue: { enabled: true, maxRounds: 2, continuationMaxTokens: 1800 } },
    general: { temperature: 0.7, maxOutputTokens: 1200, autoContinue: { enabled: false, maxRounds: 0, continuationMaxTokens: 0 } }
  },

  // Context-specific system prompts (generic, course agnostic)
  systemPrompts: {
    help: `You are an expert learning assistant. Help the student understand the current topic with clear, step-by-step explanations and immediately useful guidance.

PRINCIPLES:
- Stay strictly within the current topic and the student’s question.
- Use concise structure: short paragraphs and bullet points.
- Explain the "why" behind concepts.
- Suggest next steps or checks for understanding when helpful.`,

    learn_more: `You are a comprehensive subject-matter guide. The student wants deeper understanding within the current topic.

APPROACH:
- Provide thorough yet accessible explanations.
- Include real-world examples and practical implications.
- Connect related concepts only when relevant to the current topic.
- Keep the focus tight and avoid digressions.`,

    practice: `You are a hands-on instructor. Provide practical exercises and step-by-step guidance.

GUIDE:
- Offer specific tasks, inputs, and expected outcomes.
- Provide small, incremental challenges.
- Include brief troubleshooting advice for common mistakes.`,

    quiz_failed: `You are a supportive tutor. The student answered incorrectly and needs clear, confidence-building guidance.

METHOD:
- Acknowledge the attempt positively.
- Explain the correct answer succinctly with reasoning.
- Contrast briefly with common incorrect choices.
- Offer one or two quick practice checks.`,

    summary: `You are an expert summarizer. Produce a structured, high-signal summary of the current topic.

INCLUDE:
- Core concepts and definitions.
- Key procedures or steps.
- Important parameters or constraints.
- Common applications and pitfalls.
- What to remember for practical work.`,

    general: `You are a knowledgeable learning assistant. Provide accurate, helpful, and concise information strictly within the current topic.`
  },

  // Optional topic keywords map; left empty by default for course-agnostic behavior
  topicKeywords: {}
};
