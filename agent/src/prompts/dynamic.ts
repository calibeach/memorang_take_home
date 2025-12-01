/**
 * Dynamic system prompt builder for context-aware AI interactions.
 * Adapts prompts based on student state, difficulty, and attempt count.
 */

import { logAgentThinking } from "../utils/logger.js";

/**
 * Context for building dynamic prompts.
 */
export interface PromptContext {
  /** The purpose of the prompt */
  purpose: "quiz" | "critique" | "refine" | "feedback";
  /** Number of attempts on current question (for adaptive hints) */
  attemptCount?: number;
  /** Difficulty level of the current objective */
  objectiveDifficulty?: "beginner" | "intermediate" | "advanced";
  /** Title of the current learning objective */
  objectiveTitle?: string;
  /** Number of questions to generate */
  questionsPerObjective?: number;
}

/**
 * Base prompt templates for each purpose.
 */
export const BASE_PROMPTS = {
  quiz: `You are an expert quiz creator. Generate multiple choice questions to test understanding of a specific learning objective.

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Only ONE option should be correct
3. Options should be plausible (no obviously wrong answers)
4. Provide a helpful hint that references specific concepts from THIS question
5. Provide a clear explanation of why the correct answer is right

Guidelines for good MCQs:
- Questions should directly test the learning objective
- Avoid "all of the above" or "none of the above"
- Keep questions clear and unambiguous
- Hints MUST be specific to the question content - NOT generic advice
  - Good hint: "Consider how recursion differs from iteration in terms of memory usage"
  - Bad hint: "Think about the key terms in the question"
- Explanations should teach, not just state the answer`,

  critique: `You are an expert educational content reviewer. Your task is to critically evaluate the quality of generated multiple choice questions.

Evaluate each question for:
1. **Factual Accuracy**: Is the correct answer actually correct? Are there any factual errors?
2. **Clarity**: Is the question clear and unambiguous? Could it be misinterpreted?
3. **Educational Value**: Does it test meaningful understanding, not just memorization?
4. **Difficulty Balance**: Are the distractors plausible but clearly wrong?
5. **Hint Quality**: Does the hint guide without giving away the answer?
6. **Explanation Quality**: Does the explanation teach the underlying concept?

Be strict but fair. Only flag genuine issues that would impact learning.`,

  refine: `You are an expert educational content writer. Your task is to improve multiple choice questions based on feedback.

When refining questions:
1. Address all issues identified in the critique
2. Maintain the core educational intent
3. Improve clarity without oversimplifying
4. Make distractors more plausible if needed
5. Enhance hints to guide thinking
6. Strengthen explanations to maximize learning

Keep improvements focused and minimal - don't change what's already working well.`,

  feedback: `You are a supportive educational tutor. Your role is to help students understand concepts through clear explanations and encouragement.

When providing feedback:
1. Acknowledge the student's effort
2. Explain concepts clearly and simply
3. Use examples when helpful
4. Encourage without giving away answers
5. Adapt your language to the student's level`,
};

/**
 * Difficulty modifiers for prompts.
 */
const DIFFICULTY_MODIFIERS = {
  beginner: `
Use simple, accessible language. Avoid jargon or explain technical terms.
Questions should focus on fundamental concepts and basic understanding.
Hints should be more direct and supportive.`,

  intermediate: `
Balance technical accuracy with accessibility.
Questions can test deeper understanding and application of concepts.
Hints should encourage thinking without being too obvious.`,

  advanced: `
Use precise technical language appropriate for the topic.
Questions should challenge deeper reasoning and connections between concepts.
Hints should be subtle, encouraging independent problem-solving.`,
};

/**
 * Attempt-based modifiers for feedback prompts.
 */
const ATTEMPT_MODIFIERS = {
  first: `This is the student's first attempt. Provide the standard hint from the question.`,

  second: `The student is on their second attempt. Provide a more specific hint that narrows down the options without revealing the answer directly.`,

  struggling: `The student has attempted this question multiple times and is struggling.
Provide very explicit guidance that strongly points toward the correct answer.
Use simple language and consider breaking down the concept into smaller parts.
Be encouraging and supportive - the student may be frustrated.`,
};

/**
 * Build a dynamic system prompt based on context.
 *
 * @param context - The context for prompt building
 * @returns The complete system prompt
 */
export function buildSystemPrompt(context: PromptContext): string {
  const { purpose, attemptCount, objectiveDifficulty, objectiveTitle, questionsPerObjective } =
    context;

  // Track which modifiers are applied
  const appliedModifiers: string[] = [];

  // Start with base prompt
  let prompt = BASE_PROMPTS[purpose];
  appliedModifiers.push(`base:${purpose}`);

  // Add question count for quiz prompts
  if (purpose === "quiz" && questionsPerObjective) {
    prompt = prompt.replace(
      "Generate multiple choice questions",
      `Generate exactly ${questionsPerObjective} multiple choice questions`
    );
    appliedModifiers.push(`questionCount:${questionsPerObjective}`);
  }

  // Add difficulty modifier
  if (objectiveDifficulty && DIFFICULTY_MODIFIERS[objectiveDifficulty]) {
    prompt += `\n\n## Difficulty Guidance\n${DIFFICULTY_MODIFIERS[objectiveDifficulty]}`;
    appliedModifiers.push(`difficulty:${objectiveDifficulty}`);
  }

  // Add attempt-based modifier for feedback
  if (purpose === "feedback" && attemptCount !== undefined) {
    if (attemptCount === 1) {
      prompt += `\n\n## Attempt Context\n${ATTEMPT_MODIFIERS.first}`;
      appliedModifiers.push("attempt:first");
    } else if (attemptCount === 2) {
      prompt += `\n\n## Attempt Context\n${ATTEMPT_MODIFIERS.second}`;
      appliedModifiers.push("attempt:second");
    } else if (attemptCount >= 3) {
      prompt += `\n\n## Attempt Context\n${ATTEMPT_MODIFIERS.struggling}`;
      appliedModifiers.push("attempt:struggling");
    }
  }

  // Add objective context if available
  if (objectiveTitle) {
    prompt += `\n\n## Current Topic\nLearning Objective: "${objectiveTitle}"`;
    appliedModifiers.push(`objective:${objectiveTitle.substring(0, 30)}...`);
  }

  // Log the dynamic prompt generation
  logAgentThinking("Dynamic Prompt", "Generated system prompt", {
    purpose,
    modifiersApplied: appliedModifiers,
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 200) + "...",
  });

  return prompt;
}

/**
 * Context for generating progressive hints.
 */
export interface HintContext {
  /** The question text */
  question: string;
  /** The answer options */
  options: string[];
  /** The learning objective title */
  objectiveTitle?: string;
}

/**
 * Get a progressive hint based on attempt count and question context.
 * Used by the feedback node to provide increasingly helpful, contextual hints.
 *
 * @param baseHint - The original hint from the MCQ
 * @param attemptCount - Number of attempts so far
 * @param context - Optional question context for more specific hints
 * @returns Modified hint based on attempts and context
 */
export function getProgressiveHint(
  baseHint: string,
  attemptCount: number,
  context?: HintContext
): string {
  let hintLevel: string;
  let result: string;

  if (attemptCount <= 1) {
    hintLevel = "basic";
    result = baseHint;
  } else if (attemptCount === 2) {
    hintLevel = "additional_guidance";
    // Use question context to provide more specific guidance
    if (context) {
      const keyTerms = extractKeyTerms(context.question);
      result = `Pay close attention to "${keyTerms}" in the question. Consider what each option implies about this concept.`;
    } else {
      result = `Re-read the question carefully and consider what distinguishes each option.`;
    }
  } else if (attemptCount === 3) {
    hintLevel = "strong_hint";
    if (context?.objectiveTitle) {
      result = `This question tests "${context.objectiveTitle}". Try eliminating options that don't directly relate to this learning objective.`;
    } else if (context) {
      const keyTerms = extractKeyTerms(context.question);
      result = `Focus on "${keyTerms}". Which option most directly addresses this core concept?`;
    } else {
      result = `Focus on the main concept being tested. Try to eliminate clearly incorrect options first.`;
    }
  } else if (attemptCount === 4) {
    hintLevel = "very_strong_hint";
    if (context?.options) {
      // Give a hint about option elimination
      result = `You've tried several times. Look carefully at the options - some may sound correct but don't match what the question is specifically asking about "${extractKeyTerms(context.question)}".`;
    } else {
      result = `Take a step back. Re-read the question from the beginning and focus on exactly what it's asking.`;
    }
  } else {
    // attemptCount >= 5: Maximum help without revealing answer
    hintLevel = "maximum_hint";
    if (context?.objectiveTitle) {
      result = `Final hint: The answer directly demonstrates "${context.objectiveTitle}". Look for the option that shows a concrete benefit or outcome, not just a general statement.`;
    } else {
      result = `Final hint: The correct answer is the most specific and directly relevant option. Avoid options that are too broad or unrelated.`;
    }
  }

  // Log the progressive hint generation
  logAgentThinking("Progressive Hint", "Generated hint based on attempt count", {
    attemptCount,
    hintLevel,
    hasContext: !!context,
    baseHintPreview: baseHint.substring(0, 50) + "...",
    resultPreview: result.substring(0, 100) + "...",
  });

  return result;
}

/**
 * Extract key terms from a question for use in hints.
 * Focuses on the main subject/concept being asked about.
 */
function extractKeyTerms(question: string): string {
  // Remove common question prefixes
  const cleaned = question
    .replace(/^(what|which|how|why|when|where|who|is|are|does|do|can|could|would|should)\s+/i, "")
    .replace(/\?$/, "")
    .trim();

  // Take the first meaningful phrase (up to 6 words or first comma/dash)
  const words = cleaned.split(/\s+/);
  const firstPhrase = words.slice(0, Math.min(6, words.length)).join(" ");

  // If there's a comma or dash, take content before it
  const beforePunctuation = firstPhrase.split(/[,\-–—]/)[0].trim();

  return beforePunctuation || cleaned.substring(0, 50);
}
