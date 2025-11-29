/**
 * Study Buddy Agent - LangChain v1 Middleware Demo
 *
 * A helper agent that provides on-demand learning assistance using
 * a custom middleware pattern with beforeModel/afterModel hooks.
 *
 * This demonstrates:
 * - Middleware architecture for LLM calls
 * - beforeModel: Dynamic context injection
 * - afterModel: Output guardrails and validation
 * - Runtime context passing
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import {
  type StudyBuddyContext,
  studyBuddyContextSchema,
  contextInjectionMiddleware,
  educationalGuardrailsMiddleware,
} from "../middleware/index.js";
import { logger, logAgentThinking, logAgentSuccess, logAgentError } from "../utils/logger.js";
import { AI_CONFIG } from "../config/ai.config.js";

/**
 * Message format for middleware state
 */
interface MiddlewareMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Middleware state containing messages
 */
interface MiddlewareState {
  messages: MiddlewareMessage[];
}

/**
 * Runtime context for middleware
 */
interface MiddlewareRuntime {
  context: StudyBuddyContext;
}

/**
 * Middleware function types
 */
type BeforeModelHook = (
  state: MiddlewareState,
  runtime: MiddlewareRuntime
) => MiddlewareState | undefined;

type AfterModelHook = (
  state: MiddlewareState,
  runtime: MiddlewareRuntime
) => MiddlewareState | undefined;

/**
 * Middleware configuration interface
 */
interface Middleware {
  name: string;
  beforeModel?: BeforeModelHook;
  afterModel?: AfterModelHook;
}

/**
 * Apply beforeModel middleware hooks
 */
function applyBeforeModelHooks(
  state: MiddlewareState,
  runtime: MiddlewareRuntime,
  middleware: Middleware[]
): MiddlewareState {
  let currentState = state;

  console.log("\n" + "=".repeat(60));
  console.log("🔧 MIDDLEWARE PIPELINE: beforeModel Phase");
  console.log("=".repeat(60));

  for (const mw of middleware) {
    if (mw.beforeModel) {
      console.log(`\n▶ Executing: ${mw.name}.beforeModel()`);

      const result = mw.beforeModel(currentState, runtime);
      if (result) {
        currentState = result;
        console.log(`✓ ${mw.name} modified state`);
      } else {
        console.log(`○ ${mw.name} no changes`);
      }
    }
  }

  return currentState;
}

/**
 * Apply afterModel middleware hooks
 */
function applyAfterModelHooks(
  state: MiddlewareState,
  runtime: MiddlewareRuntime,
  middleware: Middleware[]
): MiddlewareState {
  let currentState = state;

  console.log("\n" + "=".repeat(60));
  console.log("🔧 MIDDLEWARE PIPELINE: afterModel Phase");
  console.log("=".repeat(60));

  for (const mw of middleware) {
    if (mw.afterModel) {
      console.log(`\n▶ Executing: ${mw.name}.afterModel()`);

      const result = mw.afterModel(currentState, runtime);
      if (result) {
        currentState = result;
        console.log(`✓ ${mw.name} modified state (response may have been filtered)`);
      } else {
        console.log(`○ ${mw.name} approved response`);
      }
    }
  }

  return currentState;
}

/**
 * Convert middleware messages to LangChain messages
 */
function toBaseMessages(messages: MiddlewareMessage[]): BaseMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case "system":
        return new SystemMessage(msg.content);
      case "user":
        return new HumanMessage(msg.content);
      case "assistant":
        return new AIMessage(msg.content);
      default:
        return new HumanMessage(msg.content);
    }
  });
}

/**
 * Study Buddy Agent class with middleware support
 *
 * This implements a LangChain v1-style agent with custom middleware
 * for context injection (beforeModel) and guardrails (afterModel).
 */
class StudyBuddyAgent {
  private model: ChatOpenAI;
  private middleware: Middleware[];

  constructor(options: { model?: string; middleware?: Middleware[] } = {}) {
    const modelName = options.model || AI_CONFIG.models.studyBuddy;
    const isGpt5 = modelName.startsWith("gpt-5");

    this.model = new ChatOpenAI({
      model: modelName,
      ...(isGpt5 ? {} : { temperature: 0.7 }),
    });

    this.middleware = options.middleware || [];
  }

  /**
   * Invoke the agent with middleware pipeline
   *
   * Flow:
   * 1. beforeModel hooks process input state
   * 2. Model generates response
   * 3. afterModel hooks validate/transform output
   */
  async invoke(
    input: { messages: MiddlewareMessage[] },
    options: { context: StudyBuddyContext }
  ): Promise<{ messages: MiddlewareMessage[]; content: string }> {
    const runtime: MiddlewareRuntime = { context: options.context };

    console.log("\n" + "█".repeat(60));
    console.log("█  STUDY BUDDY AGENT - MIDDLEWARE PIPELINE START");
    console.log("█".repeat(60));
    console.log(`\n📝 User Question: "${input.messages[0]?.content.slice(0, 80)}..."`);
    console.log(`🎓 Expertise Level: ${options.context.userExpertise}`);
    console.log(`📚 Has Learning Objective: ${!!options.context.currentObjective}`);
    console.log(`❓ Has Active Quiz Question: ${!!options.context.currentMcq}`);

    // Phase 1: Apply beforeModel middleware
    let state: MiddlewareState = { messages: input.messages };
    state = applyBeforeModelHooks(state, runtime, this.middleware);

    // Phase 2: Call the model
    console.log("\n" + "=".repeat(60));
    console.log(`🤖 CALLING LLM MODEL: ${AI_CONFIG.models.studyBuddy}`);
    console.log("=".repeat(60));
    console.log(`   Messages in context: ${state.messages.length}`);

    const baseMessages = toBaseMessages(state.messages);
    const response = await this.model.invoke(baseMessages);
    const assistantContent =
      typeof response.content === "string" ? response.content : JSON.stringify(response.content);

    console.log(`\n✅ Model response received (${assistantContent.length} chars)`);
    console.log(`   Preview: "${assistantContent.slice(0, 100)}..."`);

    // Add assistant response to state
    state.messages.push({
      role: "assistant",
      content: assistantContent,
    });

    // Phase 3: Apply afterModel middleware
    state = applyAfterModelHooks(state, runtime, this.middleware);

    // Return the final state
    const finalMessage = state.messages[state.messages.length - 1];

    console.log("\n" + "█".repeat(60));
    console.log("█  MIDDLEWARE PIPELINE COMPLETE");
    console.log("█".repeat(60));
    console.log(`\n📤 Final response length: ${finalMessage.content.length} chars\n`);

    return {
      messages: state.messages,
      content: finalMessage.content,
    };
  }
}

/**
 * Pre-configured Study Buddy agent instance with middleware
 */
const studyBuddyAgent = new StudyBuddyAgent({
  model: AI_CONFIG.models.studyBuddy,
  middleware: [
    contextInjectionMiddleware as Middleware,
    educationalGuardrailsMiddleware as Middleware,
  ],
});

/**
 * Ask the Study Buddy agent for help with a learning question.
 *
 * This is the main entry point for the Study Buddy feature.
 * It demonstrates LangChain v1's middleware pattern:
 * - beforeModel: Injects learning context into the prompt
 * - afterModel: Validates response doesn't reveal answers
 *
 * @param question - The student's question
 * @param context - Learning context from the main workflow
 * @returns The agent's response
 */
export async function askStudyBuddy(question: string, context: StudyBuddyContext): Promise<string> {
  logger.startSection("Study Buddy Agent (Middleware Demo)");

  logAgentThinking("StudyBuddy", "Processing student question", {
    questionPreview: question.slice(0, 100),
    hasObjective: !!context.currentObjective,
    hasQuestion: !!context.currentMcq,
    expertise: context.userExpertise,
    attemptCount: context.attemptCount,
  });

  try {
    // Validate context
    const validatedContext = studyBuddyContextSchema.parse(context);

    // Invoke agent with middleware pipeline
    const result = await studyBuddyAgent.invoke(
      {
        messages: [{ role: "user", content: question }],
      },
      { context: validatedContext }
    );

    logAgentSuccess("StudyBuddy", "Generated response", {
      responseLength: result.content.length,
      response: result.content,
    });

    logger.endSection();
    return result.content;
  } catch (error) {
    logAgentError(
      "StudyBuddy",
      "Failed to generate response",
      error instanceof Error ? { message: error.message } : { error: String(error) }
    );
    logger.endSection();
    throw error;
  }
}

// Re-export types for server.ts
export type { StudyBuddyContext };
export { studyBuddyContextSchema };
