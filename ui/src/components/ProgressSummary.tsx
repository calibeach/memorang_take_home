"use client";

import { ProgressReport } from "@/lib/types";

interface ProgressSummaryProps {
  report: ProgressReport;
  onRestart: () => void;
}

export function ProgressSummary({ report, onRestart }: ProgressSummaryProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success-600";
    if (score >= 60) return "text-yellow-600";
    return "text-error-600";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return "Excellent!";
    if (score >= 80) return "Great job!";
    if (score >= 70) return "Good work!";
    if (score >= 60) return "Nice effort!";
    return "Keep practicing!";
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      <div className="max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Session Complete!</h2>
          <p className="text-gray-600">{getScoreEmoji(report.score)}</p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6 text-center">
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(report.score)}`}>
            {report.score}%
          </div>
          <p className="text-gray-600">
            {report.correctAnswers} of {report.totalQuestions} questions correct
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {report.objectivesCompleted} learning objectives completed
            </p>
          </div>
        </div>

        {/* Study tips */}
        {report.studyTips && report.studyTips.length > 0 && (
          <div className="bg-primary-50 rounded-xl p-6 mb-6">
            <h3 className="font-medium text-primary-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Study Tips
            </h3>
            <ul className="space-y-2">
              {report.studyTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-primary-700">
                  <span className="text-primary-500 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas to review */}
        {report.areasToReview && report.areasToReview.length > 0 && (
          <div className="bg-yellow-50 rounded-xl p-6 mb-6">
            <h3 className="font-medium text-yellow-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Areas to Review
            </h3>
            <ul className="space-y-2">
              {report.areasToReview.map((area, index) => (
                <li key={index} className="flex items-start gap-2 text-yellow-700">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Restart button */}
        <button
          onClick={onRestart}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium
            hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Start New Session
        </button>
      </div>
    </div>
  );
}
