import { ProgressReportSchema } from "../schemas/index.js";
import type { LearningState } from "../state.js";
import { logger, logAgentThinking, logAgentSuccess, logAgentError } from "../utils/logger.js";
import {
  AIModelFactory,
  ContentProcessor,
  ScoreCalculator,
  NodeResponse,
} from "../services/index.js";

/**
 * Node that generates a progress report and study tips at the end of the session.
 */
export async function summaryNode(state: LearningState): Promise<Partial<LearningState>> {
  logger.startSection("Summary Agent");
  logAgentThinking("Summary", "Generating progress report...");

  const { mcqs, userAnswers, learningObjectives, pdfContent } = state;

  if (!mcqs || mcqs.length === 0) {
    logAgentError("Summary", "No quiz data available for summary");
    logger.endSection();
    return NodeResponse.error("No quiz data available for summary.");
  }

  try {
    // Calculate scores using ScoreCalculator service
    const scoreResult = ScoreCalculator.calculateScore(mcqs, userAnswers);
    const areasToReview = ScoreCalculator.identifyAreasToReview(
      mcqs,
      userAnswers,
      learningObjectives || []
    );

    logAgentThinking("Summary", "Score calculated", {
      score: scoreResult.score,
      correct: scoreResult.correctCount,
      total: scoreResult.totalQuestions,
    });

    // Generate personalized study tips using AI
    const structuredModel = AIModelFactory.createStructured(
      "summary",
      ProgressReportSchema,
      "generate_progress_report"
    );

    // Truncate content using ContentProcessor service
    const { content: truncatedContent } = ContentProcessor.truncate(
      pdfContent || "",
      "summary",
      "Summary"
    );

    const report = await structuredModel.invoke([
      {
        role: "system",
        content: `You are a supportive learning coach. Generate a progress report with personalized study tips based on the student's performance.

Be encouraging but honest. Focus on:
1. Celebrating successes
2. Identifying specific areas for improvement
3. Providing actionable study strategies
4. Recommending next steps`,
      },
      {
        role: "user",
        content: `Student Performance Summary:
- Total Questions: ${scoreResult.totalQuestions}
- Correct Answers: ${scoreResult.correctCount}
- Score: ${scoreResult.score}%
- Objectives Completed: ${learningObjectives?.length || 0}
- Areas Needing Review: ${areasToReview.length > 0 ? areasToReview.join(", ") : "None - Great job!"}

Document Topics (for context):
${truncatedContent.slice(0, 500)}...

Please generate a detailed progress report with 3-5 personalized study tips.`,
      },
    ]);

    logAgentSuccess("Summary", `Generated progress report. Score: ${scoreResult.score}%`);
    logger.endSection();

    return {
      progressReport: {
        totalQuestions: scoreResult.totalQuestions,
        correctAnswers: scoreResult.correctCount,
        score: scoreResult.score,
        objectivesCompleted: learningObjectives?.length || 0,
        studyTips: report.studyTips,
        areasToReview,
      },
      sessionComplete: true,
      currentPhase: "summary",
      error: null,
    };
  } catch (err) {
    const errorMessage = NodeResponse.extractErrorMessage(err);
    logAgentError("Summary", `Error generating summary: ${errorMessage}`);
    logger.endSection();

    // Return basic stats even if AI generation fails (reuse ScoreCalculator)
    const fallbackScore = ScoreCalculator.calculateScore(mcqs, userAnswers);

    return {
      progressReport: {
        totalQuestions: fallbackScore.totalQuestions,
        correctAnswers: fallbackScore.correctCount,
        score: fallbackScore.score,
        objectivesCompleted: learningObjectives?.length || 0,
        studyTips: ["Review the material and try again!", "Practice makes perfect."],
        areasToReview: [],
      },
      sessionComplete: true,
      currentPhase: "summary",
      error: null,
    };
  }
}
