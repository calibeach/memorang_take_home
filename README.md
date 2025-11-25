# Memorang Learning Agent

An AI-powered learning agent that transforms PDFs into interactive MCQ lessons with intelligent tutoring support.

## Features

- **PDF Upload & Processing**: Upload any educational PDF and automatically extract key concepts
- **Personalized Learning Plans**: AI generates 3-5 learning objectives tailored to the content
- **Human-in-the-Loop Approval**: Review and approve learning plans before starting
- **Interactive MCQs**: Multiple choice questions with visual feedback (green/red)
- **Smart Learning Assistant**: CopilotKit chat that provides hints without giving away answers
- **Graduated Hint System**: Adaptive assistance based on struggle level
- **Progress Tracking**: Final report with score, study tips, and areas to review

## Enhanced Chat Features

The learning assistant uses advanced educational techniques:

### Socratic Method

- Asks guiding questions instead of giving answers
- Helps students discover solutions through reasoning
- Builds critical thinking skills

### Graduated Hints

1. **Level 1**: Focuses attention on key concepts
2. **Level 2**: Helps eliminate wrong answers through logic
3. **Level 3**: Provides more specific guidance while maintaining discovery

### Answer Protection

- Never reveals correct answers directly
- Filters out accidental answer revelations
- Redirects to educational guidance

### Context-Aware Assistance

- Knows current question, options, and difficulty
- Tracks user attempts and adjusts help accordingly
- Connects questions to broader learning objectives

## Setup

1. **Install dependencies**:

   ```bash
   npx pnpm install
   ```

2. **Configure environment**:

   ```bash
   # Copy environment files
   cp .env.example .env
   cp agent/.env.example agent/.env
   cp ui/.env.local.example ui/.env.local

   # Add your OpenAI API key to all .env files
   ```

3. **Start development servers**:

   ```bash
   # Start both agent and UI
   npx pnpm dev

   # Or start individually:
   # Terminal 1 - Agent (port 8000)
   cd agent && npx pnpm dev

   # Terminal 2 - UI (port 3000)
   cd ui && npx pnpm dev
   ```

4. **Open browser**: Navigate to http://localhost:3000

## Testing the Chat Integration

### During Quiz Phase

Try these prompts to test the educational features:

1. **Request a hint**:
   - "I'm stuck on this question, can you help?"
   - "Can you give me a hint?"

2. **Ask about specific options**:
   - "What about option 2?"
   - "Can you explain why option A might work?"

3. **Review concepts**:
   - "Can you explain [concept] from the material?"
   - "What does this question relate to?"

### What to Verify

- ✅ Assistant never directly says which option is correct
- ✅ Hints become more helpful with more attempts
- ✅ Explanations focus on reasoning, not answers
- ✅ Assistant knows the current question context
- ✅ Different messages appear for different phases

### Example Interaction

**Student**: "What's the answer to this question?"

**Assistant**: "Let's think about what this question is really asking. Focus on the key words in the question. What concept is being tested here?"

**Student**: "I think it might be option B"

**Assistant**: "Let's think about option B. Consider: How does this relate to the question? What assumptions would make this correct or incorrect? Think through the implications of choosing this option."

## Project Structure

```
memorang-learning-agent/
├── agent/                 # LangGraph.js backend
│   ├── src/
│   │   ├── nodes/        # Workflow nodes
│   │   ├── schemas/      # Zod schemas
│   │   ├── graph.ts      # StateGraph workflow
│   │   └── server.ts     # Express API
│   └── package.json
├── ui/                    # Next.js + CopilotKit frontend
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities & types
│   └── package.json
└── pnpm-workspace.yaml   # Monorepo config
```

## Technologies

- **Backend**: LangGraph.js, Express, TypeScript
- **Frontend**: Next.js 14, CopilotKit, Tailwind CSS
- **AI**: OpenAI GPT-4, Structured Output with Zod
- **Package Manager**: pnpm workspaces

## Key Components

### Answer Protection System

- `ui/src/lib/answerProtection.ts` - Filters direct answer revelations
- Pattern matching to detect and remove answer giveaways
- Educational response generation

### Smart Actions

- `provideHint` - Graduated hints based on attempts
- `explainOption` - Analyze specific MCQ options
- `reviewConcept` - Connect to learning objectives

### Dynamic UI

- Phase-aware chat labels
- Context-specific placeholder text
- Adaptive assistant personality

## License

MIT
