"use client";

import { useState, useCallback } from "react";
import { useLearningContext } from "@/contexts";
import { askStudyBuddy } from "@/lib/api";
import { filterSensitiveContent } from "@/lib/answerProtection";

interface StudyBuddyResponse {
  response: string;
  middlewareApplied: string[];
}

/**
 * Hook for directly calling Study Buddy (bypasses Copilot).
 * Used when the user clicks the "Ask Study Buddy" button.
 */
export function useStudyBuddy() {
  const { state } = useLearningContext();
  const { threadId, currentMcq, userAttempts } = state;

  const [isLoading, setIsLoading] = useState(false);

  const askQuestion = useCallback(
    async (question: string): Promise<StudyBuddyResponse | null> => {
      if (!threadId) {
        return null;
      }

      setIsLoading(true);

      try {
        // Determine expertise level based on attempts
        let expertise: "beginner" | "intermediate" | "advanced" = "intermediate";
        if (currentMcq) {
          const attempts = userAttempts[currentMcq.id] || 0;
          if (attempts >= 3) {
            expertise = "beginner"; // Struggling, use simpler language
          } else if (attempts === 0) {
            expertise = "intermediate";
          }
        }

        // Call Study Buddy API
        const result = await askStudyBuddy(threadId, question, expertise);

        // Apply client-side filtering
        const filteredResponse = filterSensitiveContent(result.response, currentMcq);

        return {
          response: filteredResponse,
          middlewareApplied: result.middlewareApplied,
        };
      } catch {
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, currentMcq, userAttempts]
  );

  return { askQuestion, isLoading };
}
