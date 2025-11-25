"use client";

import { ReactNode } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import type { Phase } from "@/lib/types";
import { PHASE_SPECIFIC_PROMPTS } from "@/app/api/copilotkit/systemPrompt";
import { useLearningContext } from "@/contexts";

interface MainLayoutProps {
  children: ReactNode;
}

const getLabelsForPhase = (phase: Phase = "upload") => {
  switch (phase) {
    case "quiz":
      return {
        title: "Quiz Assistant",
        initial: PHASE_SPECIFIC_PROMPTS.quiz,
        placeholder: "Need a hint? Ask about a concept or option...",
      };
    case "approval":
      return {
        title: "Learning Planner",
        initial: PHASE_SPECIFIC_PROMPTS.approval,
        placeholder: "Ask about the learning objectives...",
      };
    case "planning":
      return {
        title: "Planning Assistant",
        initial: PHASE_SPECIFIC_PROMPTS.planning,
        placeholder: "Ask about the planning process...",
      };
    case "parsing":
      return {
        title: "Document Analyzer",
        initial: PHASE_SPECIFIC_PROMPTS.parsing,
        placeholder: "Processing your document...",
      };
    case "summary":
      return {
        title: "Progress Review",
        initial: PHASE_SPECIFIC_PROMPTS.summary,
        placeholder: "Ask about your results or next steps...",
      };
    case "upload":
    default:
      return {
        title: "Learning Assistant",
        initial: PHASE_SPECIFIC_PROMPTS.upload,
        placeholder: "Upload a PDF to get started...",
      };
  }
};

export function MainLayout({ children }: MainLayoutProps) {
  const { state } = useLearningContext();
  const labels = getLabelsForPhase(state.phase);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Main content area - 70% */}
      <main className="flex-[7] bg-gray-50 overflow-auto">{children}</main>

      {/* CopilotKit sidebar - 30% */}
      <aside className="flex-[3] border-l border-gray-200 bg-white">
        <CopilotSidebar labels={labels} className="h-full" />
      </aside>
    </div>
  );
}
