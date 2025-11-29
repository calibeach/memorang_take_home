import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let openai: OpenAI | null = null;
let serviceAdapter: OpenAIAdapter | null = null;
let runtime: CopilotRuntime | null = null;

function getRuntime() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  if (!serviceAdapter) {
    serviceAdapter = new OpenAIAdapter({
      openai,
      model: "gpt-4o-mini", // Fast and effective for educational use
    });
  }
  if (!runtime) {
    runtime = new CopilotRuntime();
  }
  return { runtime, serviceAdapter };
}

export const POST = async (req: NextRequest) => {
  const { runtime, serviceAdapter } = getRuntime();
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
