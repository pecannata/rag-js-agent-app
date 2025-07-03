# Agentic RAG Chat

A minimal agent-based chatbot application built with LangChain, ReAct methodology, and Next.js, powered by Cohere's command-r-plus model.

## Features

- **Agent-Based Architecture**: Uses ReAct (Reasoning and Acting) methodology for intelligent responses
- **RAG Capabilities**: Includes a knowledge base for LangChain, ReAct, Cohere, and related technologies
- **Mathematical Calculations**: Built-in calculator for mathematical expressions
- **Clean UI**: Separate windows for user (light blue) and AI (light green) messages
- **API Key Management**: Secure local storage of Cohere API keys
- **Chat History**: Maintains conversation context across messages

## Technologies Used

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI/LLM**: Cohere command-r-plus model via LangChain
- **Agent Framework**: Custom ReAct implementation with LangChain integration

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Get Cohere API Key**:
   - Sign up at [Cohere.ai](https://cohere.ai)
   - Generate an API key from your dashboard

3. **Run the Application**:
   ```bash
   npm run dev
   ```

4. **Configure API Key**:
   - Open http://localhost:3000
   - Enter your Cohere API key in the left sidebar
   - Click "Save" to store it locally

## Usage

### Basic Chat
- Type any question or message in the input box
- The AI will respond using ReAct methodology, thinking step by step

### Mathematical Calculations
- Ask math questions like "What is 15 * 25?" or "Calculate 100 / 4"
- The agent automatically detects and processes mathematical expressions

### Knowledge Base Queries
- Ask about LangChain, ReAct, Cohere, RAG, LangGraph, or Next.js
- The agent will retrieve relevant information from the built-in knowledge base

### Example Interactions

1. **General Question**: "How does machine learning work?"
2. **Math**: "What is 25 * 4 + 10?"
3. **Knowledge**: "What is ReAct?"
4. **Complex**: "Explain how RAG works and calculate 15% of 200"

## Architecture

### Components

- **`app/page.tsx`**: Main application page with state management
- **`app/components/Sidebar.tsx`**: API key management and status display
- **`app/components/Chat.tsx`**: Chat interface with message display and input
- **`app/api/chat/route.ts`**: API endpoint for processing chat requests
- **`app/lib/agent.ts`**: RAG agent implementation with ReAct methodology

### Agent Architecture

The RagAgent class implements:
- **Knowledge Retrieval**: Searches built-in knowledge base for relevant information
- **Mathematical Processing**: Handles calculation requests automatically
- **ReAct Prompting**: Uses reasoning-and-acting prompts for better responses
- **Context Management**: Maintains conversation history for coherent interactions

## Customization

### Adding Knowledge
Edit the `knowledgeBase` object in `app/lib/agent.ts`:

```typescript
const knowledgeBase = {
  'your-topic': 'Your information here...',
  // Add more entries
};
```

### Modifying Agent Behavior
Update the ReAct prompt in the `processMessage` method to change how the agent thinks and responds.

## Dependencies

- `@langchain/cohere`: Cohere integration for LangChain
- `@langchain/core`: Core LangChain functionality
- `@langchain/community`: Community tools and integrations
- `@langchain/langgraph`: State management for multi-step workflows
- `cohere-ai`: Direct Cohere API client
- `next`: React framework with API routes
- `react`: UI library
- `typescript`: Type safety
- `tailwindcss`: Utility-first CSS framework

## Notes

- API keys are stored locally in browser localStorage
- No server-side persistence - conversations are lost on page refresh
- Mathematical expressions use basic eval() - in production, use a safer math parser
- Knowledge base is hardcoded - in production, integrate with vector databases
- Error handling is minimal for simplicity
