"use client";

import { useLearningContext } from "@/contexts";
import { useLearningWorkflow, useCopilotSetup } from "@/hooks";
import { PDFUpload } from "./PDFUpload";
import { PlanApproval } from "./PlanApproval";
import { MCQPanel } from "./MCQPanel";
import { ProgressSummary } from "./ProgressSummary";
import { LoadingState } from "./LoadingState";
import { ErrorDisplay } from "./ErrorDisplay";

export function LearningContent() {
  const { state } = useLearningContext();
  const { handleUpload, handleApproval, handleAnswer, handleContinue, handleRetry, handleRestart } =
    useLearningWorkflow();

  // Set up CopilotKit integration
  useCopilotSetup();

  const {
    phase,
    isLoading,
    error,
    objectives,
    planSummary,
    estimatedTime,
    currentMcq,
    mcqIndex,
    totalMcqs,
    progressReport,
    answerFeedback,
  } = state;

  // Show error if present
  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRestart} />;
  }

  // Render based on phase
  switch (phase) {
    case "upload":
      return <PDFUpload onUpload={handleUpload} isLoading={isLoading} />;

    case "parsing":
      return <LoadingState message="Analyzing your PDF..." />;

    case "planning":
      return <LoadingState message="Creating your learning plan..." />;

    case "approval":
      return (
        <PlanApproval
          objectives={objectives}
          summary={planSummary}
          estimatedTime={estimatedTime}
          onApprove={() => handleApproval(true)}
          onReject={() => handleApproval(false)}
          isLoading={isLoading}
        />
      );

    case "quiz":
      return currentMcq ? (
        <MCQPanel
          question={currentMcq}
          currentIndex={mcqIndex}
          totalQuestions={totalMcqs}
          onAnswer={handleAnswer}
          onContinue={handleContinue}
          onRetry={handleRetry}
          isLoading={isLoading}
          answerFeedback={answerFeedback}
        />
      ) : (
        <LoadingState message="Loading question..." />
      );

    case "summary":
      return progressReport ? (
        <ProgressSummary report={progressReport} onRestart={handleRestart} />
      ) : (
        <LoadingState message="Generating your progress report..." />
      );

    default:
      return <PDFUpload onUpload={handleUpload} isLoading={isLoading} />;
  }
}
