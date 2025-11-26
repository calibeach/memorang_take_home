import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type { LearningObjective, MCQ, ProgressReport } from "./schemas/index.js";

/**
 * State annotation for the learning agent workflow.
 * This defines all the state that flows through the graph.
 */
export const LearningStateAnnotation = Annotation.Root({
  // Messages for conversation history
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // PDF content
  pdfPath: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  pdfContent: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  // Learning plan
  learningObjectives: Annotation<LearningObjective[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  planApproved: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),

  // Current progress through objectives
  currentObjectiveIdx: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // MCQs
  mcqs: Annotation<MCQ[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  currentMcqIdx: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  totalExpectedMcqs: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Pre-fetch state for background question generation
  prefetchedMcqs: Annotation<MCQ[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  prefetchObjectiveIdx: Annotation<number>({
    reducer: (_, update) => update,
    default: () => -1, // -1 means no prefetch available
  }),

  // User answers and scoring
  userAnswers: Annotation<Record<string, number>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
  correctAnswers: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Track attempt counts per question for dynamic hints
  attemptCounts: Annotation<Record<string, number>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Progress report
  progressReport: Annotation<ProgressReport | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Session state
  sessionComplete: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Current phase for UI rendering
  currentPhase: Annotation<"upload" | "planning" | "approval" | "quiz" | "summary">({
    reducer: (_, update) => update,
    default: () => "upload",
  }),
});

export type LearningState = typeof LearningStateAnnotation.State;
