import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { LearningStateAnnotation, type LearningState } from "./state.js";
import {
  pdfParserNode,
  plannerNode,
  humanApprovalNode,
  quizGeneratorNode,
  feedbackNode,
  summaryNode,
} from "./nodes/index.js";

// Define node names as constants
const NODES = {
  pdfParser: "pdfParser",
  planner: "planner",
  humanApproval: "humanApproval",
  quizGenerator: "quizGenerator",
  feedback: "feedback",
  summary: "summary",
} as const;

type NodeName = (typeof NODES)[keyof typeof NODES];

/**
 * Routing function: After PDF parsing, check for errors
 */
function afterPdfParse(state: LearningState): NodeName | typeof END {
  if (state.error) {
    console.log("[Router] PDF parsing failed, ending workflow");
    return END;
  }
  return NODES.planner;
}

/**
 * Routing function: After planning, check for errors
 */
function afterPlanner(state: LearningState): NodeName | typeof END {
  if (state.error) {
    console.log("[Router] Planning failed, ending workflow");
    return END;
  }
  return NODES.humanApproval;
}

/**
 * Routing function: After human approval, proceed or end
 */
function afterApproval(state: LearningState): NodeName | typeof END {
  if (!state.planApproved) {
    console.log("[Router] Plan rejected, ending workflow");
    return END;
  }
  return NODES.quizGenerator;
}

/**
 * Routing function: After quiz generation, check what to do next
 */
function afterQuizGenerator(state: LearningState): NodeName {
  if (state.error) {
    console.log("[Router] Quiz generation had an error, moving to summary");
    return NODES.summary;
  }
  if (!state.mcqs || state.mcqs.length === 0) {
    console.log("[Router] No MCQs generated, moving to summary");
    return NODES.summary;
  }
  return NODES.feedback;
}

/**
 * Routing function: After feedback, determine next step
 */
function afterFeedback(state: LearningState): NodeName {
  const { mcqs, currentMcqIdx, learningObjectives, currentObjectiveIdx, userAnswers } = state;

  if (!mcqs || !learningObjectives) {
    return NODES.summary;
  }

  // Check if there are more MCQs to answer
  if (currentMcqIdx < mcqs.length) {
    const currentMcq = mcqs[currentMcqIdx];
    if (currentMcq) {
      const userAnswer = userAnswers[currentMcq.id];
      if (userAnswer === currentMcq.correctAnswer) {
        if (currentMcqIdx + 1 < mcqs.length) {
          return NODES.feedback;
        }
      } else if (userAnswer !== undefined) {
        return NODES.feedback;
      } else {
        return NODES.feedback;
      }
    }
  }

  // Check if there are more objectives
  if (currentObjectiveIdx + 1 < learningObjectives.length) {
    console.log("[Router] Moving to next objective");
    return NODES.quizGenerator;
  }

  console.log("[Router] All objectives completed, moving to summary");
  return NODES.summary;
}

/**
 * Build the learning agent workflow graph
 * Note: Using type assertion due to LangGraph.js TypeScript limitations
 * The runtime behavior is correct, but the types don't fully align
 */
function buildGraph() {
  // Type assertion necessary due to LangGraph.js type definitions
  // This is a known limitation and the recommended approach
  const builder = new StateGraph(LearningStateAnnotation) as any;

  // Add all nodes
  builder.addNode(NODES.pdfParser, pdfParserNode);
  builder.addNode(NODES.planner, plannerNode);
  builder.addNode(NODES.humanApproval, humanApprovalNode);
  builder.addNode(NODES.quizGenerator, quizGeneratorNode);
  builder.addNode(NODES.feedback, feedbackNode);
  builder.addNode(NODES.summary, summaryNode);

  // Define the flow
  builder.addEdge(START, NODES.pdfParser);
  builder.addConditionalEdges(NODES.pdfParser, afterPdfParse);
  builder.addConditionalEdges(NODES.planner, afterPlanner);
  builder.addConditionalEdges(NODES.humanApproval, afterApproval);
  builder.addConditionalEdges(NODES.quizGenerator, afterQuizGenerator);
  builder.addConditionalEdges(NODES.feedback, afterFeedback);
  builder.addEdge(NODES.summary, END);

  return builder;
}

// Create the checkpointer for persistence
const checkpointer = new MemorySaver();

// Build and compile the graph
const graphBuilder = buildGraph();
export const graph = graphBuilder.compile({
  checkpointer,
});

// Export for use in server
export { checkpointer };
