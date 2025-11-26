export interface LearningObjective {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface MCQ {
  id: string;
  objectiveId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
  explanation: string;
}

export interface ProgressReport {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  objectivesCompleted: number;
  studyTips: string[];
  areasToReview: string[];
}

export type Phase = "upload" | "parsing" | "planning" | "approval" | "quiz" | "summary";

export interface LearningState {
  pdfPath: string | null;
  pdfContent: string | null;
  learningObjectives: LearningObjective[] | null;
  planApproved: boolean;
  currentObjectiveIdx: number;
  mcqs: MCQ[] | null;
  currentMcqIdx: number;
  userAnswers: Record<string, number>;
  correctAnswers: number;
  progressReport: ProgressReport | null;
  sessionComplete: boolean;
  error: string | null;
  currentPhase: Phase;
}

export interface InterruptData {
  type: "approve_plan" | "answer_mcq";
  questionId?: string;
  objectiveId?: string;
  question?: string;
  options?: string[];
  correctAnswer?: number;
  hint?: string;
  explanation?: string;
  currentIndex?: number;
  totalQuestions?: number;
  attemptCount?: number;
  plan?: {
    objectives: LearningObjective[];
    estimatedTime: string;
    summary: string;
  };
}

// Answer feedback state for showing correct/incorrect UI
export interface AnswerFeedback {
  isCorrect: boolean;
  selectedAnswer: number;
  correctAnswer: number;
  hint?: string;
  explanation?: string;
  attemptCount?: number;
}
