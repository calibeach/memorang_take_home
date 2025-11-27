"use client";

import {
  useCopilotReadable,
  useCopilotAction,
  useCopilotMessagesContext,
} from "@copilotkit/react-core";
import { useLearningContext } from "@/contexts";
import { askStudyBuddy } from "@/lib/api";
import { filterSensitiveContent } from "@/lib/answerProtection";
import { LEARNING_ASSISTANT_PROMPT } from "@/app/api/copilotkit/systemPrompt";

/**
 * Sets up CopilotKit readables and actions for the learning assistant.
 * This hook encapsulates all AI tutor integration logic.
 */
export function useCopilotSetup() {
  const { state, actions } = useLearningContext();
  const { messages: copilotMessages } = useCopilotMessagesContext();
  const {
    phase,
    threadId,
    objectives,
    currentMcq,
    mcqIndex,
    totalMcqs,
    userAttempts,
    planSummary,
    estimatedTime,
    pdfSummary,
    progressReport,
  } = state;

  // CRITICAL: System instructions to prevent answer reveals
  // This is injected as a high-priority readable that the AI sees first
  useCopilotReadable({
    description: "SYSTEM INSTRUCTIONS - FOLLOW THESE RULES STRICTLY",
    value: LEARNING_ASSISTANT_PROMPT,
  });

  // Current learning session state
  useCopilotReadable({
    description: "Current learning session state",
    value: {
      phase,
      threadId,
      objectives: objectives.map((o) => o.title),
      currentQuestion: currentMcq?.question,
      progress: totalMcqs > 0 ? `${mcqIndex + 1}/${totalMcqs}` : "Not started",
    },
  });

  // Enhanced MCQ context for smarter assistance
  // IMPORTANT: We intentionally do NOT share correctAnswer to prevent the AI from revealing it
  useCopilotReadable({
    description: "Current MCQ context (answer hidden for educational integrity)",
    value: currentMcq
      ? {
          question: currentMcq.question,
          options: currentMcq.options,
          hasHint: Boolean(currentMcq.hint),
          currentObjective: objectives.find((o) => o.id === currentMcq.objectiveId),
          attemptCount: userAttempts[currentMcq.id] || 0,
          questionNumber: mcqIndex + 1,
          totalQuestions: totalMcqs,
          // correctAnswer: INTENTIONALLY OMITTED - AI should not know the answer
        }
      : null,
  });

  // Learning objectives context
  useCopilotReadable({
    description: "Learning objectives and material",
    value: {
      objectives: objectives.map((o) => ({
        title: o.title,
        description: o.description,
        difficulty: o.difficulty,
      })),
      planSummary,
      estimatedTime,
      documentSummary: pdfSummary,
    },
  });

  // User progress tracking
  useCopilotReadable({
    description: "User progress and performance",
    value: progressReport
      ? {
          score: progressReport.score,
          correctAnswers: progressReport.correctAnswers,
          totalQuestions: progressReport.totalQuestions,
          areasToReview: progressReport.areasToReview,
          currentStreak: 0,
        }
      : null,
  });

  // Smart action: Provide graduated hints
  useCopilotAction({
    name: "provideHint",
    description: "Provide a graduated hint based on student's attempts",
    parameters: [
      {
        name: "level",
        type: "number",
        description: "Hint level (1=subtle, 2=moderate, 3=strong)",
        required: false,
      },
    ],
    handler: async ({ level }) => {
      if (!currentMcq) return "No question is currently active.";

      const attempts = userAttempts[currentMcq.id] || 0;
      const hintLevel = level || Math.min(attempts + 1, 3);

      // Track attempt
      actions.incrementAttempt(currentMcq.id);

      if (hintLevel === 1) {
        return `Let's focus on the key words in the question: "${currentMcq.question}". What is it really asking you to identify?`;
      } else if (hintLevel === 2) {
        return `Consider the differences between these options. Some might be clearly incorrect if you think about the core concept. Can you eliminate any options that don't fit?`;
      } else {
        return (
          currentMcq.hint ||
          `Think carefully about what distinguishes the correct answer from the others. Consider the specific context of the question.`
        );
      }
    },
  });

  // Smart action: Explain a specific option
  useCopilotAction({
    name: "explainOption",
    description: "Explain why a specific option might or might not work",
    parameters: [
      {
        name: "optionIndex",
        type: "number",
        description: "The index of the option (0-based)",
        required: true,
      },
    ],
    handler: async ({ optionIndex }) => {
      if (!currentMcq || !currentMcq.options[optionIndex]) {
        return "Please specify a valid option number.";
      }

      const option = currentMcq.options[optionIndex];
      return `Let's think about "${option}". Consider: How does this relate to the question? What assumptions would make this correct or incorrect? Think through the implications of choosing this option.`;
    },
  });

  // Smart action: Review a concept
  useCopilotAction({
    name: "reviewConcept",
    description: "Review a concept from the learning objectives",
    parameters: [
      {
        name: "concept",
        type: "string",
        description: "The concept to review",
        required: true,
      },
    ],
    handler: async ({ concept }) => {
      const relevantObjective = objectives.find(
        (o) =>
          o.title.toLowerCase().includes(concept.toLowerCase()) ||
          o.description.toLowerCase().includes(concept.toLowerCase())
      );

      if (relevantObjective) {
        return `This relates to the learning objective: "${relevantObjective.title}" - ${relevantObjective.description}. Think about how this concept applies to the current question.`;
      }

      return `Let's think about "${concept}" in the context of what we're learning. How might this concept relate to the current material?`;
    },
  });

  // Study Buddy action: AI-powered help with middleware (LangChain v1 Demo)
  useCopilotAction({
    name: "askStudyBuddyForHelp",
    description:
      "Ask the Study Buddy AI for help understanding a concept. " +
      "This uses LangChain v1 middleware for context-aware responses. " +
      "Use this when the student needs deeper explanation or is struggling with a question.",
    parameters: [
      {
        name: "question",
        type: "string",
        description: "The student's question or what they need help understanding",
        required: true,
      },
      {
        name: "expertiseLevel",
        type: "string",
        description: "Student expertise level: 'beginner', 'intermediate', or 'advanced'",
        required: false,
      },
    ],
    handler: async ({ question, expertiseLevel }) => {
      if (!threadId) {
        return "No active learning session. Please upload a PDF to start learning.";
      }

      try {
        // Determine expertise level based on performance or use provided value
        let expertise: "beginner" | "intermediate" | "advanced" = "beginner";
        if (expertiseLevel) {
          expertise = expertiseLevel as "beginner" | "intermediate" | "advanced";
        } else if (currentMcq) {
          // Auto-detect based on attempts: more attempts = probably struggling = simpler language
          const attempts = userAttempts[currentMcq.id] || 0;
          if (attempts >= 3) {
            expertise = "beginner"; // Struggling, use simpler language
          } else if (attempts === 0) {
            expertise = "intermediate"; // First attempt, normal level
          }
        }

        // Extract recent messages for conversational context (last 5)
        // CopilotKit messages may have different structures, so we safely extract text messages
        const recentMessages = copilotMessages
          .slice(-5)
          .filter((m): m is { role: string; content: string } & typeof m => {
            const msg = m as { role?: string; content?: string };
            return (
              typeof msg.role === "string" &&
              (msg.role === "user" || msg.role === "assistant") &&
              typeof msg.content === "string"
            );
          })
          .map((m) => ({
            role: (m as { role: string }).role as "user" | "assistant",
            content: (m as { content: string }).content,
          }));

        // Call the Study Buddy backend (demonstrates middleware pipeline)
        const result = await askStudyBuddy(threadId, question, expertise, recentMessages);

        // Apply client-side filtering as an extra safety layer
        // This catches anything the backend middleware might have missed
        const filteredResponse = filterSensitiveContent(result.response, currentMcq);

        // Return the response with middleware info for transparency
        return (
          filteredResponse +
          `\n\n---\n_Powered by Study Buddy (${result.middlewareApplied.join(" → ")})_`
        );
      } catch (error) {
        console.error("Study Buddy error:", error);
        return (
          "I'm having trouble connecting to Study Buddy right now. Let me try to help directly: " +
          "Think about the key concepts in the question and how they relate to what you've learned."
        );
      }
    },
  });
}
