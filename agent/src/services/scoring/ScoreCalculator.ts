import type { MCQ, LearningObjective } from "../../schemas/index.js";

export interface ScoreResult {
  totalQuestions: number;
  correctCount: number;
  score: number;
}

export interface ObjectivePerformance {
  objectiveId: string;
  total: number;
  correct: number;
  percentage: number;
}

/**
 * Service for calculating quiz scores and performance metrics.
 */
export class ScoreCalculator {
  /**
   * Calculate the overall score from MCQs and user answers.
   * @param mcqs - Array of MCQ questions
   * @param userAnswers - Record of user answers keyed by question ID
   * @returns Score result with counts and percentage
   */
  static calculateScore(mcqs: MCQ[], userAnswers: Record<string, number>): ScoreResult {
    const totalQuestions = mcqs.length;
    let correctCount = 0;

    for (const mcq of mcqs) {
      const userAnswer = userAnswers[mcq.id];
      if (userAnswer === mcq.correctAnswer) {
        correctCount++;
      }
    }

    return {
      totalQuestions,
      correctCount,
      score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    };
  }

  /**
   * Calculate performance breakdown by learning objective.
   * @param mcqs - Array of MCQ questions
   * @param userAnswers - Record of user answers keyed by question ID
   * @returns Array of performance metrics per objective
   */
  static calculateObjectivePerformance(
    mcqs: MCQ[],
    userAnswers: Record<string, number>
  ): ObjectivePerformance[] {
    const performanceMap = new Map<string, { total: number; correct: number }>();

    for (const mcq of mcqs) {
      const current = performanceMap.get(mcq.objectiveId) || { total: 0, correct: 0 };
      current.total++;
      if (userAnswers[mcq.id] === mcq.correctAnswer) {
        current.correct++;
      }
      performanceMap.set(mcq.objectiveId, current);
    }

    return Array.from(performanceMap.entries()).map(([objectiveId, { total, correct }]) => ({
      objectiveId,
      total,
      correct,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    }));
  }

  /**
   * Identify objectives that need review (any incorrect answers).
   * @param mcqs - Array of MCQ questions
   * @param userAnswers - Record of user answers keyed by question ID
   * @param objectives - Array of learning objectives
   * @returns Array of objective titles that need review
   */
  static identifyAreasToReview(
    mcqs: MCQ[],
    userAnswers: Record<string, number>,
    objectives: LearningObjective[]
  ): string[] {
    const performance = this.calculateObjectivePerformance(mcqs, userAnswers);
    const areasToReview: string[] = [];

    for (const perf of performance) {
      if (perf.correct < perf.total) {
        const objective = objectives.find((o) => o.id === perf.objectiveId);
        if (objective) {
          areasToReview.push(objective.title);
        }
      }
    }

    return areasToReview;
  }
}
