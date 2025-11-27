/**
 * LangChain v1 Middleware for Study Buddy Agent
 *
 * Demonstrates LangChain v1's createMiddleware with:
 * - beforeModel: Context injection for dynamic prompts
 * - afterModel: Educational guardrails to prevent answer reveals
 */

import { z } from "zod";
import {
  logger,
  logAgentThinking,
  logAgentSuccess,
  logAgentError,
  logAgentDecision,
} from "../utils/logger.js";

/**
 * Schema for Study Buddy runtime context.
 * This defines what learning context is available to the middleware.
 */
export const studyBuddyContextSchema = z.object({
  /** Session identifier */
  threadId: z.string(),
  /** User's expertise level for language adaptation */
  userExpertise: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  /** Current learning objective being studied */
  currentObjective: z
    .object({
      title: z.string(),
      description: z.string(),
    })
    .optional(),
  /** Current MCQ for guardrail checks */
  currentMcq: z
    .object({
      question: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.number(),
      userSelectedAnswer: z.number().optional(),
    })
    .optional(),
  /** Number of attempts on current question */
  attemptCount: z.number().default(0),
  /** Truncated PDF content for context */
  pdfContent: z.string().optional(),
  /** Recent chat messages for conversational context */
  recentMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export type StudyBuddyContext = z.infer<typeof studyBuddyContextSchema>;

/**
 * Build a contextual system prompt based on learning state.
 * This is called by the beforeModel hook to inject context.
 */
function buildStudyBuddyPrompt(context: StudyBuddyContext): string {
  let systemPrompt = `You are a helpful Study Buddy assistant for a learning app.
Your role is to help students understand concepts WITHOUT giving away quiz answers.

Guidelines:
- Explain concepts clearly at an appropriate level
- Use examples when helpful
- Guide thinking, don't give direct answers
- Be encouraging and supportive`;

  // Add expertise-based language guidance
  if (context.userExpertise === "beginner") {
    systemPrompt += `

Student Level: Beginner
Use simple language. Avoid jargon. Explain technical terms when you must use them.`;
  } else if (context.userExpertise === "intermediate") {
    systemPrompt += `

Student Level: Intermediate
Balance technical accuracy with accessibility. You can use some domain terminology.`;
  } else if (context.userExpertise === "advanced") {
    systemPrompt += `

Student Level: Advanced
You can use precise technical language. Be detailed and rigorous.`;
  }

  // Add current objective context
  if (context.currentObjective) {
    systemPrompt += `

Current Topic: "${context.currentObjective.title}"
${context.currentObjective.description}`;
  }

  // Add question context (without revealing answer)
  if (context.currentMcq) {
    const { question, options, userSelectedAnswer, correctAnswer } = context.currentMcq;
    const hasAnswered = userSelectedAnswer !== undefined;
    const wasCorrect = hasAnswered && userSelectedAnswer === correctAnswer;

    systemPrompt += `

The student is working on this question: "${question}"
Options: ${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(", ")}`;

    if (hasAnswered) {
      const selectedLetter = String.fromCharCode(65 + userSelectedAnswer);
      systemPrompt += `

The student selected: ${selectedLetter}) ${options[userSelectedAnswer]}
Their answer was: ${wasCorrect ? "CORRECT" : "INCORRECT"}`;

      if (!wasCorrect) {
        systemPrompt += `
Help them understand why their answer was wrong and guide them toward the right concept.
DO NOT directly tell them the correct answer - help them discover it through understanding.`;
      } else {
        systemPrompt += `
Reinforce why their answer was correct and deepen their understanding of the concept.`;
      }
    } else {
      systemPrompt += `

The student has not yet answered this question.
Help them understand the concept WITHOUT telling them the answer.
DO NOT mention which option (A, B, C, D) is correct.`;
    }
  }

  // Add attempt context for adaptive help
  if (context.attemptCount >= 3) {
    systemPrompt += `

Note: The student has attempted this question ${context.attemptCount} times.
They may be struggling. Be extra supportive and break down concepts into smaller parts.`;
  }

  // Add PDF context if available (truncated)
  if (context.pdfContent) {
    const truncated = context.pdfContent.slice(0, 2000);
    systemPrompt += `

Relevant document content:
${truncated}...`;
  }

  // Add recent conversation for natural flow
  if (context.recentMessages?.length) {
    const conversationContext = context.recentMessages
      .map((m) => `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`)
      .join("\n");

    systemPrompt += `

Recent conversation:
${conversationContext}

Continue this conversation naturally. Reference what was just discussed when relevant.`;
  }

  return systemPrompt;
}

/**
 * Check if a response reveals the quiz answer.
 * Used by the afterModel hook for guardrails.
 */
function checkForAnswerReveal(
  content: string,
  mcq: { options: string[]; correctAnswer: number }
): boolean {
  const lowerContent = content.toLowerCase();
  const correctOption = mcq.options[mcq.correctAnswer];

  // Check for direct answer revelation patterns
  const revealPatterns = [
    /the (correct )?answer is/i,
    /the right (choice|option) is/i,
    /you should (choose|pick|select) (option )?(A|B|C|D|[0-3])/i,
    /option (A|B|C|D) is correct/i,
    /the correct option is (A|B|C|D)/i,
  ];

  for (const pattern of revealPatterns) {
    if (pattern.test(content)) {
      return true;
    }
  }

  // Check if the response contains the exact correct answer text prominently
  if (correctOption && lowerContent.includes(correctOption.toLowerCase())) {
    // Only flag if it seems like the answer is being revealed
    const answerPosition = lowerContent.indexOf(correctOption.toLowerCase());
    const surroundingText = lowerContent.slice(
      Math.max(0, answerPosition - 50),
      answerPosition + correctOption.length + 50
    );
    if (
      surroundingText.includes("answer") ||
      surroundingText.includes("correct") ||
      surroundingText.includes("right choice")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Context Injection Middleware (beforeModel hook)
 *
 * Runs before each model call to inject learning context into the prompt.
 * This demonstrates LangChain v1's beforeModel capability for dynamic prompting.
 */
export interface ContextInjectionMiddlewareConfig {
  name: string;
  beforeModel: (
    state: { messages: Array<{ role: string; content: string }> },
    runtime: { context: StudyBuddyContext }
  ) => { messages: Array<{ role: string; content: string }> } | undefined;
}

export const contextInjectionMiddleware: ContextInjectionMiddlewareConfig = {
  name: "ContextInjectionMiddleware",

  beforeModel: (state, runtime) => {
    const context = runtime.context;

    logger.startSection("MIDDLEWARE: beforeModel (Context Injection)");

    logAgentThinking("ContextInjection", "Analyzing learning context", {
      threadId: context.threadId,
      userExpertise: context.userExpertise,
      hasObjective: !!context.currentObjective,
      hasQuestion: !!context.currentMcq,
      attemptCount: context.attemptCount,
      hasPdfContent: !!context.pdfContent,
      hasRecentMessages: !!context.recentMessages?.length,
      recentMessageCount: context.recentMessages?.length || 0,
    });

    // Build contextual system prompt
    const systemPrompt = buildStudyBuddyPrompt(context);

    logAgentDecision("ContextInjection", "Built dynamic system prompt", {
      promptLength: systemPrompt.length,
      expertiseLevel: context.userExpertise,
      objectiveIncluded: !!context.currentObjective,
      questionContextIncluded: !!context.currentMcq,
      adaptedForStruggling: context.attemptCount >= 3,
    });

    logAgentSuccess("ContextInjection", "Context injected into prompt", {
      originalMessageCount: state.messages.length,
      newMessageCount: state.messages.length + 1,
      systemPromptPreview: systemPrompt.slice(0, 150) + "...",
    });

    logger.endSection();

    // Prepend system message to the messages array
    return {
      messages: [{ role: "system", content: systemPrompt }, ...state.messages],
    };
  },
};

/**
 * Educational Guardrails Middleware (afterModel hook)
 *
 * Runs after each model response to ensure educational appropriateness.
 * This demonstrates LangChain v1's afterModel capability for output validation.
 */
export interface EducationalGuardrailsMiddlewareConfig {
  name: string;
  afterModel: (
    state: { messages: Array<{ role: string; content: string }> },
    runtime: { context: StudyBuddyContext }
  ) => { messages: Array<{ role: string; content: string }> } | undefined;
}

export const educationalGuardrailsMiddleware: EducationalGuardrailsMiddlewareConfig = {
  name: "EducationalGuardrailsMiddleware",

  afterModel: (state, runtime) => {
    const context = runtime.context;
    const lastMessage = state.messages[state.messages.length - 1];

    logger.startSection("MIDDLEWARE: afterModel (Educational Guardrails)");

    if (!lastMessage || lastMessage.role !== "assistant") {
      logAgentThinking("Guardrails", "No assistant message to validate", {
        lastMessageRole: lastMessage?.role || "none",
      });
      logger.endSection();
      return undefined;
    }

    const content = lastMessage.content;

    logAgentThinking("Guardrails", "Validating AI response", {
      responseLength: content.length,
      responsePreview: content.slice(0, 100) + "...",
      hasActiveQuestion: !!context.currentMcq,
    });

    // Check if response might reveal the answer
    if (context.currentMcq) {
      logAgentThinking("Guardrails", "Checking for answer reveals", {
        questionPreview: context.currentMcq.question.slice(0, 50) + "...",
        correctAnswerIndex: context.currentMcq.correctAnswer,
      });

      const revealsAnswer = checkForAnswerReveal(content, context.currentMcq);

      if (revealsAnswer) {
        logAgentError("Guardrails", "BLOCKED: Response reveals answer!", {
          questionPreview: context.currentMcq.question.slice(0, 50),
          action: "Replacing with safe response",
        });

        logAgentDecision("Guardrails", "Substituting safe response", {
          reason: "Original response contained answer reveal patterns",
          originalLength: content.length,
        });

        logger.endSection();

        // Replace with a safe response
        return {
          messages: [
            ...state.messages.slice(0, -1),
            {
              role: "assistant",
              content:
                "I want to help you learn this concept without giving away the answer. " +
                "Let me explain the underlying principle instead. " +
                "Think about what the question is really asking and what concepts it's testing. " +
                "Would you like me to break down the key idea in a different way?",
            },
          ],
        };
      }

      logAgentSuccess("Guardrails", "Response passed answer-reveal check", {
        noAnswerPatterns: true,
      });
    } else {
      logAgentThinking("Guardrails", "No active question - skipping answer check", {});
    }

    // Log successful validation
    logAgentSuccess("Guardrails", "Response validated and approved", {
      threadId: context.threadId,
      responseLength: content.length,
      checksPerformed: context.currentMcq ? ["answer_reveal"] : ["basic"],
    });

    logger.endSection();

    return undefined;
  },
};

/**
 * Combined middleware configuration for the Study Buddy agent.
 * This array can be passed to createAgent's middleware option.
 */
export const studyBuddyMiddleware = [contextInjectionMiddleware, educationalGuardrailsMiddleware];
