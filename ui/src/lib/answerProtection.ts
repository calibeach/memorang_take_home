import { MCQ } from "./types";

/**
 * Filters out content that directly reveals the answer
 */
export function filterSensitiveContent(response: string, currentMcq: MCQ | null): string {
  if (!currentMcq) return response;

  let filtered = response;

  // Get the correct option text
  const correctOption = currentMcq.options[currentMcq.correctAnswer];

  // Remove direct mentions of the correct answer
  const correctAnswerPatterns = [
    // Direct answer revelations
    new RegExp(`the correct answer is.{0,20}${escapeRegExp(correctOption)}`, "gi"),
    new RegExp(`${escapeRegExp(correctOption)}.{0,20}is correct`, "gi"),
    new RegExp(`choose.{0,10}${escapeRegExp(correctOption)}`, "gi"),
    new RegExp(`select.{0,10}${escapeRegExp(correctOption)}`, "gi"),
    new RegExp(`pick.{0,10}${escapeRegExp(correctOption)}`, "gi"),

    // Option letter/number references
    /the correct answer is.{0,5}[A-Da-d1-4]/gi,
    /option [A-Da-d1-4] is correct/gi,
    /choose option [A-Da-d1-4]/gi,
    /select option [A-Da-d1-4]/gi,
    /the answer is option [A-Da-d1-4]/gi,
    /^[A-Da-d1-4]\.?\s*$/gm, // Just a letter/number alone

    // Absolute statements
    /definitely.{0,10}(is|choose|select)/gi,
    /obviously.{0,10}(is|choose|select)/gi,
    /clearly.{0,10}(is|choose|select)/gi,
    /the only.{0,10}(correct|right|valid)/gi,
  ];

  // Apply all patterns
  correctAnswerPatterns.forEach((pattern) => {
    filtered = filtered.replace(
      pattern,
      "[I cannot directly reveal the answer - let's think through this together]"
    );
  });

  // Check if the response is just giving the answer index
  const optionIndexPattern = new RegExp(`^.{0,10}${currentMcq.correctAnswer + 1}.{0,10}$`, "i");
  if (optionIndexPattern.test(filtered.trim())) {
    return "[Let me help you think through this question instead of giving the answer directly]";
  }

  // If the entire response is too direct, replace it
  if (containsDirectAnswer(filtered, correctOption)) {
    return "I'm here to help you learn, not just give answers. Let's think about this question: What key concepts are being tested? What can you eliminate and why?";
  }

  return filtered;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if response contains overly direct answer indication
 */
function containsDirectAnswer(response: string, correctAnswer: string): boolean {
  const lowerResponse = response.toLowerCase();
  const lowerAnswer = correctAnswer.toLowerCase();

  // Check for too direct phrasing
  const directPhrases = [
    "the answer is",
    "correct answer is",
    "you should choose",
    "you should select",
    "pick option",
    "it's definitely",
    "it's obviously",
  ];

  for (const phrase of directPhrases) {
    if (lowerResponse.includes(phrase) && lowerResponse.includes(lowerAnswer)) {
      return true;
    }
  }

  return false;
}

/**
 * Generates appropriate educational response based on context
 */
export function generateEducationalResponse(
  attemptCount: number,
  hasHint: boolean,
  _difficulty: string
): string {
  if (attemptCount === 0) {
    return "Let me help you approach this question. First, what is the question really asking? Look for key terms that might guide your thinking.";
  } else if (attemptCount === 1) {
    return "Good effort! Let's think about this differently. Can you identify which options seem less likely? Sometimes eliminating wrong answers helps clarify the right one.";
  } else if (attemptCount >= 2 && hasHint) {
    return "You're working hard on this one! Here's a strategy: Break down each option and think about when it would or wouldn't apply. The context of the question is key.";
  } else {
    return "This is challenging! Remember to consider the specific wording of the question. Every word matters. What distinction is being tested here?";
  }
}

/**
 * Validates that a hint doesn't give away the answer
 */
export function validateHint(hint: string, mcq: MCQ): string {
  const filtered = filterSensitiveContent(hint, mcq);

  // Additional validation for hints specifically
  const correctOption = mcq.options[mcq.correctAnswer];
  if (hint.toLowerCase().includes(correctOption.toLowerCase())) {
    return "Think about what makes each option unique. Consider the context and implications of each choice.";
  }

  return filtered;
}
