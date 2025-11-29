"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import { useStudyBuddy } from "@/hooks/useStudyBuddy";
import { useLearningContext } from "@/contexts";

/**
 * Custom chat input component that adds an "Ask Study Buddy" button.
 * When the button is clicked, the question goes directly to Study Buddy
 * instead of the regular Copilot.
 */
export function CustomChatInput() {
  const [inputValue, setInputValue] = useState("");
  const { appendMessage, isLoading: copilotLoading } = useCopilotChat();
  const { askQuestion, isLoading: studyBuddyLoading } = useStudyBuddy();
  const { state } = useLearningContext();

  const isLoading = copilotLoading || studyBuddyLoading;
  const isQuizPhase = state.phase === "quiz";

  // Send to Copilot (default behavior)
  const sendToCopilot = useCallback(() => {
    if (!inputValue.trim() || isLoading) return;

    // Use appendMessage to send to Copilot
    appendMessage(
      new TextMessage({
        role: MessageRole.User,
        content: inputValue.trim(),
      })
    );
    setInputValue("");
  }, [inputValue, isLoading, appendMessage]);

  // Send to Study Buddy directly (bypasses Copilot entirely)
  const sendToStudyBuddy = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const question = inputValue.trim();
    setInputValue("");

    // Add user message to chat (followUp: false prevents Copilot from responding)
    appendMessage(
      new TextMessage({
        role: MessageRole.User,
        content: `[To **Study Buddy**]: ${question}`,
      }),
      { followUp: false }
    );

    // Get Study Buddy response
    const result = await askQuestion(question);

    if (result) {
      // Add Study Buddy response to chat
      appendMessage(
        new TextMessage({
          role: MessageRole.Assistant,
          content: `**📚 Study Buddy** says:\n\n${result.response}`,
        }),
        { followUp: false }
      );
    } else {
      // Show error message in chat
      appendMessage(
        new TextMessage({
          role: MessageRole.Assistant,
          content: `**📚 Study Buddy** couldn't respond. Please try again.`,
        }),
        { followUp: false }
      );
    }
  }, [inputValue, isLoading, appendMessage, askQuestion]);

  // Handle Enter key
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendToCopilot();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-gray-200">
      {/* Study Buddy button - only shown during quiz phase */}
      {isQuizPhase && (
        <button
          onClick={sendToStudyBuddy}
          disabled={!inputValue.trim() || isLoading}
          className="w-full px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {studyBuddyLoading ? "Asking Study Buddy..." : "📚 Ask Study Buddy"}
        </button>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isQuizPhase ? "Type your question..." : "Ask anything..."}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={sendToCopilot}
          disabled={!inputValue.trim() || isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copilotLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
