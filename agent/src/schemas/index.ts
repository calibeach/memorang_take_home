import { z } from "zod";

/**
 * Schema for a learning objective in the plan
 */
export const LearningObjectiveSchema = z.object({
  id: z.string().describe("Unique identifier for the objective"),
  title: z.string().describe("Short title of the learning objective"),
  description: z.string().describe("Detailed description of what will be learned"),
  difficulty: z.enum(["easy", "medium", "hard"]).describe("Difficulty level"),
});

export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;

/**
 * Schema for the learning plan generated from PDF content
 */
export const LearningPlanSchema = z.object({
  objectives: z.array(LearningObjectiveSchema).describe("List of learning objectives"),
  overallDifficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("Overall difficulty of the material"),
  estimatedDuration: z.string().describe("Estimated time to complete (e.g., '30 minutes')"),
});

export type LearningPlan = z.infer<typeof LearningPlanSchema>;

/**
 * Schema for a multiple choice question
 */
export const MCQSchema = z.object({
  id: z.string().describe("Unique identifier for the question"),
  objectiveId: z.string().describe("ID of the learning objective this question tests"),
  question: z.string().describe("The question text"),
  options: z.array(z.string()).length(4).describe("Exactly 4 answer options"),
  correctAnswer: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
  hint: z.string().describe("A hint that helps without revealing the answer"),
  explanation: z.string().describe("Explanation of why the correct answer is correct"),
});

export type MCQ = z.infer<typeof MCQSchema>;

/**
 * Schema for a batch of MCQs for an objective
 */
export const MCQBatchSchema = z.object({
  objectiveId: z.string().describe("ID of the learning objective"),
  questions: z.array(MCQSchema).min(2).max(5).describe("2-5 questions for this objective"),
});

export type MCQBatch = z.infer<typeof MCQBatchSchema>;

/**
 * Schema for the progress report at the end
 */
export const ProgressReportSchema = z.object({
  totalQuestions: z.number().describe("Total number of questions answered"),
  correctAnswers: z.number().describe("Number of correct answers"),
  score: z.number().describe("Percentage score (0-100)"),
  objectivesCompleted: z.number().describe("Number of objectives completed"),
  studyTips: z.array(z.string()).describe("Personalized study tips based on performance"),
  areasToReview: z.array(z.string()).describe("Topics that need more review"),
});

export type ProgressReport = z.infer<typeof ProgressReportSchema>;

// Re-export reflection schemas
export {
  CritiqueSchema,
  RefinedMCQSchema,
  RefinedMCQBatchSchema,
  DEFAULT_REFLECTION_OPTIONS,
  type Critique,
  type RefinedMCQ,
  type RefinedMCQBatch,
  type ReflectionOptions,
} from "./reflection.js";
