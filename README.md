# Memorang Learning Agent

An AI-powered learning agent that transforms PDFs into interactive MCQ lessons with intelligent tutoring support.

## What Makes This Different

Beyond the standard LangGraph workflow (interrupt patterns, PostgreSQL checkpointing), this project tackles three non-obvious problems:

1. **Answer Protection as Systems Design** - The AI tutor needs context to help, but can't leak answers. Prompt engineering alone isn't reliable.
2. **Dynamic System Prompts** - The AI adapts its language and approach based on expertise level, attempt count, and answer history at runtime.
3. **Quality Gates** - LLM-generated MCQs go through self-critique before reaching students.

## Architecture

### Two-Agent System: Trust Boundaries

This project uses two separate AI assistants with different trust levels:

| Agent           | Runs On     | Correct Answer Access | Use Case                            |
| --------------- | ----------- | --------------------- | ----------------------------------- |
| **CopilotKit**  | Client-side | No (by design)        | General tutoring, concept questions |
| **Study Buddy** | Server-side | Yes (for validation)  | Quiz-specific help, graduated hints |

**Why two agents?** It's not just about answer protection - Study Buddy gives _better answers_ because it has richer context. The system prompt is rewritten at runtime based on the student's state.

### LangChain v1 Middleware Patterns

Study Buddy is built using LangChain v1 patterns:

- **`beforeModel` hooks** - Dynamic context injection
- **`afterModel` hooks** - Response validation before delivery
- **Runtime prompt rewriting** - Not static prompts, but prompts that adapt to state

These are the same middleware patterns that power LangChain's new deep agents.

## Answer Protection: Defense in Depth

Four layers prevent the AI from revealing quiz answers:

**Layer 1: Context Omission**
CopilotKit's readable context excludes `correctAnswer` entirely. The client-side tutor literally cannot see it.

**Layer 2: Server-Side Validation**
Study Buddy runs on the server with answer access, but responses go through a middleware pipeline _before_ reaching the client.

**Layer 3: Pattern Matching**
Regex catches obvious leaks: "the answer is", "option B is correct", "you should pick".

**Layer 4: Semantic Detection**
If the response contains the exact text of the correct option in a revealing context, it's replaced with a safe redirect.

**Key insight**: This isn't a prompt problem - it's a trust boundary problem. CopilotKit uses request-level middleware (`onBeforeRequest`), while Study Buddy uses LangChain v1's model-level middleware (`beforeModel`/`afterModel`) that runs on every LLM call with full state access. Where does computation happen, and what does each layer have access to?

## Dynamic System Prompts

Study Buddy's `beforeModel` middleware builds a context-aware system prompt that includes:

- **Expertise-level adaptation** - Beginner: "use simple language, avoid jargon." Advanced: "use precise technical language, be rigorous."
- **Answer state awareness** - Knows if you answered, what you picked, whether you were right/wrong, and adapts guidance accordingly
- **Struggle detection** - If `attemptCount >= 3`, adds: "The student is struggling. Be extra supportive. Break concepts into smaller parts."
- **PDF content access** - Can reference actual source material (truncated to 3000 chars)
- **Conversation continuity** - Recent messages injected for natural follow-up

A beginner on their fifth attempt gets a fundamentally different AI than an advanced student on their first try.

## MCQ Quality Gates

Generated MCQs aren't reliable enough to ship directly. A reflection loop adds quality control:

1. **Generate** - Create MCQ batch
2. **Critique** - Score 1-10 on clarity and accuracy
3. **Refine** - If below 7, regenerate with feedback
4. **Repeat** - Up to 2 iterations

The critique catches:

- "Option C could also be correct"
- "The question assumes knowledge not in the PDF"
- "This tests reading comprehension, not the concept"

Trade-off is latency (~1 second per iteration), but for educational content, a bad question is worse than a slow one.

## Features

- **PDF Upload & Processing** - Upload any educational PDF and extract key concepts
- **Personalized Learning Plans** - AI generates 3-5 learning objectives tailored to content
- **Human-in-the-Loop Approval** - Review and approve plans before starting (LangGraph interrupt pattern)
- **Interactive MCQs** - Multiple choice questions with visual feedback
- **Two AI Assistants** - CopilotKit for general help, Study Buddy for quiz-specific guidance
- **Graduated Hint System** - Adaptive assistance based on struggle level
- **Progress Tracking** - Final report with score, study tips, and areas to review
- **PostgreSQL Persistence** - Sessions survive browser refreshes and server restarts

## Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Configure environment**:

   ```bash
   # Copy environment files
   cp .env.example .env
   cp agent/.env.example agent/.env
   cp ui/.env.local.example ui/.env.local

   # Add your OpenAI API key to all .env files
   # Add DATABASE_URL for PostgreSQL
   ```

3. **Start development servers**:

   ```bash
   # Start both agent and UI
   pnpm dev

   # Or start individually:
   # Terminal 1 - Agent (port 8000)
   cd agent && pnpm dev

   # Terminal 2 - UI (port 3000)
   cd ui && pnpm dev
   ```

4. **Open browser**: Navigate to http://localhost:3000

## Project Structure

```
memorang-learning-agent/
├── agent/                    # LangGraph.js backend
│   ├── src/
│   │   ├── nodes/           # Workflow nodes (parser, planner, quiz, etc.)
│   │   ├── agents/          # Study Buddy agent
│   │   ├── middleware/      # LangChain v1 beforeModel/afterModel hooks
│   │   ├── schemas/         # Zod schemas for structured output
│   │   ├── services/        # AI model factory, reflection service
│   │   ├── graph.ts         # StateGraph workflow
│   │   └── server.ts        # Express API
│   └── package.json
├── ui/                       # Next.js + CopilotKit frontend
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── hooks/           # useCopilotSetup, useStudyBuddy
│   │   └── lib/             # API client, answer protection
│   └── package.json
└── pnpm-workspace.yaml      # Monorepo config
```

## Technologies

- **Backend**: LangGraph.js, Express, TypeScript, PostgreSQL
- **Frontend**: Next.js 14, CopilotKit, Tailwind CSS
- **AI**: OpenAI GPT-4o-mini, Structured Output with Zod
- **Patterns**: LangChain v1 middleware, human-in-the-loop, reflection loops

## Key Files

| File                              | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `agent/src/middleware/index.ts`   | beforeModel/afterModel hooks, dynamic prompts       |
| `agent/src/agents/studyBuddy.ts`  | Server-side quiz assistant with middleware pipeline |
| `agent/src/services/reflection/`  | MCQ self-critique and refinement                    |
| `ui/src/hooks/useCopilotSetup.ts` | CopilotKit context (answer omitted)                 |
| `ui/src/lib/answerProtection.ts`  | Client-side answer filtering                        |

## License

MIT
