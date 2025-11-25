"use client";

import { LearningObjective } from "@/lib/types";

interface PlanApprovalProps {
  objectives: LearningObjective[];
  estimatedTime?: string;
  summary?: string;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

const difficultyColors = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

export function PlanApproval({
  objectives,
  estimatedTime,
  summary,
  onApprove,
  onReject,
  isLoading,
}: PlanApprovalProps) {
  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      <div className="max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Learning Plan</h2>
        <p className="text-gray-600 mb-6">
          {summary || "Review your personalized learning objectives"}
        </p>

        {estimatedTime && (
          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-primary-700 font-medium">Estimated time: {estimatedTime}</span>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {objectives.map((objective, index) => (
            <div
              key={objective.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 font-medium">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{objective.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                    difficultyColors[objective.difficulty]
                  }`}
                >
                  {objective.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium
              hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject Plan
          </button>
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium
              hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              "Approve & Start Learning"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
