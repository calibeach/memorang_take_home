"use client";

import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { useLearningContext } from "@/contexts";

/**
 * Sets up CopilotKit readables and actions for the learning assistant.
 * This hook encapsulates all AI tutor integration logic.
 */
export function useCopilotSetup() {
  const { state, actions } = useLearningContext();
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
  useCopilotReadable({
    description: "Current MCQ full context",
    value: currentMcq
      ? {
          question: currentMcq.question,
          options: currentMcq.options,
          hasHint: Boolean(currentMcq.hint),
          currentObjective: objectives.find((o) => o.id === currentMcq.objectiveId),
          attemptCount: userAttempts[currentMcq.id] || 0,
          questionNumber: mcqIndex + 1,
          totalQuestions: totalMcqs,
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
}
