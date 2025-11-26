"use client";

import { useState, useCallback, useEffect } from "react";
import { MCQ, AnswerFeedback } from "@/lib/types";
import { Button, ProgressBar } from "@/components/common";
import { classNames } from "@/lib/utils";

interface MCQPanelProps {
  question: MCQ;
  currentIndex: number;
  totalQuestions: number;
  objectiveTitle?: string;
  onAnswer: (answer: number) => void;
  onContinue: () => void;
  onRetry: () => void;
  isLoading: boolean;
  answerFeedback: AnswerFeedback | null;
}

export function MCQPanel({
  question,
  currentIndex,
  totalQuestions,
  objectiveTitle,
  onAnswer,
  onContinue,
  onRetry,
  isLoading,
  answerFeedback,
}: MCQPanelProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Reset selection when question changes
  useEffect(() => {
    setSelectedOption(null);
  }, [question.id]);

  // When showing feedback, set the selected option to the user's answer
  // When feedback is cleared (e.g., Continue clicked), also clear selection
  useEffect(() => {
    if (answerFeedback) {
      setSelectedOption(answerFeedback.selectedAnswer);
    } else {
      setSelectedOption(null);
    }
  }, [answerFeedback]);

  const handleOptionSelect = useCallback(
    (index: number) => {
      if (isLoading || answerFeedback) return;
      setSelectedOption(index);
    },
    [isLoading, answerFeedback]
  );

  const handleSubmit = useCallback(() => {
    if (selectedOption === null || isLoading) return;
    onAnswer(selectedOption);
  }, [selectedOption, onAnswer, isLoading]);

  const handleRetry = useCallback(() => {
    setSelectedOption(null);
    onRetry();
  }, [onRetry]);

  const getOptionClass = (index: number) => {
    const base = "mcq-option flex items-center gap-3 w-full";

    // If we have feedback, show correct/incorrect highlighting
    if (answerFeedback) {
      // Only show correct answer (green) when user got it right
      if (index === answerFeedback.correctAnswer && answerFeedback.isCorrect) {
        return classNames(base, "correct");
      }
      if (index === answerFeedback.selectedAnswer && !answerFeedback.isCorrect) {
        return classNames(base, "incorrect");
      }
      return base;
    }

    return classNames(base, selectedOption === index && "selected");
  };

  const getRadioClass = (index: number) => {
    const base = "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0";

    if (answerFeedback) {
      // Only show correct answer (green) when user got it right
      if (index === answerFeedback.correctAnswer && answerFeedback.isCorrect) {
        return `${base} border-green-500 bg-green-500`;
      }
      if (index === answerFeedback.selectedAnswer && !answerFeedback.isCorrect) {
        return `${base} border-red-500 bg-red-500`;
      }
      return `${base} border-gray-300`;
    }

    return selectedOption === index
      ? `${base} border-primary-500 bg-primary-500`
      : `${base} border-gray-300`;
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      <div className="max-w-2xl mx-auto w-full">
        {/* Objective title */}
        {objectiveTitle && (
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{objectiveTitle}</h1>
        )}

        {/* Progress bar */}
        <ProgressBar
          value={currentIndex}
          max={totalQuestions}
          label={`Question ${currentIndex + 1} of ${totalQuestions}`}
          showPercentage
          className="mb-6"
        />

        {/* Question */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-medium text-gray-800 mb-6">{question.question}</h2>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isLoading || !!answerFeedback}
                className={getOptionClass(index)}
              >
                <div className={getRadioClass(index)}>
                  {(selectedOption === index ||
                    (answerFeedback &&
                      (index === answerFeedback.correctAnswer ||
                        index === answerFeedback.selectedAnswer))) && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-gray-700">{option}</span>
              </button>
            ))}
          </div>

          {/* Feedback section */}
          {answerFeedback && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                answerFeedback.isCorrect
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`font-medium ${
                  answerFeedback.isCorrect ? "text-green-800" : "text-red-800"
                }`}
              >
                {answerFeedback.isCorrect ? "Correct!" : "Incorrect"}
              </p>
              <p
                className={`mt-2 text-sm ${
                  answerFeedback.isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {answerFeedback.isCorrect ? answerFeedback.explanation : answerFeedback.hint}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          {!answerFeedback ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              isLoading={isLoading}
              loadingText="Submitting..."
              fullWidth
            >
              Submit Answer
            </Button>
          ) : answerFeedback.isCorrect ? (
            <Button
              onClick={onContinue}
              isLoading={isLoading}
              loadingText="Loading next..."
              fullWidth
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleRetry} fullWidth variant="secondary">
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
