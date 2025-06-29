# RAG Agent Chatbot App

A modern chat application powered by **Cohere**, **LangChain**, **LangGraph**, and the **ReAct** (Reasoning + Acting) paradigm. This RAG (Retrieval Augmented Generation) agent can answer questions by retrieving relevant information from its knowledge base and generating intelligent responses.

## Features

- 🤖 **RAG Agent**: Combines retrieval and generation for intelligent responses
- 🔄 **ReAct Pattern**: Uses Reasoning + Acting paradigm for structured thinking
- 🧠 **Cohere LLM**: Powered by Cohere's command-r model for high-quality responses
- 🔍 **Vector Search**: Uses embeddings for semantic similarity search
- 💻 **Modern UI**: Clean, responsive interface with real-time chat
- 🔑 **API Key Management**: Secure local storage of API keys
- ⚡ **Fast & Lightweight**: Built with Next.js and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Cohere API key (get it from [Cohere Dashboard](https://dashboard.cohere.ai/api-keys))

### Installation

1. Navigate to the project directory:
```bash
cd rag-agent-js-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Enter API Key**: In the left sidebar, enter your Cohere API key and click "Save Key"
2. **Start Chatting**: Once the API key is set, you can start asking questions in the chat interface
3. **RAG in Action**: The agent will retrieve relevant information from its knowledge base and provide intelligent responses using the ReAct pattern

## Architecture

### Components

- **ApiKeyManager**: Handles secure API key storage and management
- **ChatInterface**: Main chat UI with message handling and real-time updates
- **RAG Agent API** (`/api/chat`): Backend logic for processing queries

### RAG Implementation

1. **Knowledge Base**: Pre-loaded with information about LangChain, LangGraph, RAG, and AI concepts
2. **Embeddings**: Uses Cohere's `embed-english-v3.0` model for vector representations
3. **Vector Store**: In-memory vector database for fast similarity search
4. **ReAct Prompting**: Structured prompt template that encourages reasoning before responding
5. **LLM**: Cohere's `command-r` model for generating final responses

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **LLM**: Cohere (command-r model)
- **Embeddings**: Cohere (embed-english-v3.0)
- **Framework**: LangChain, LangGraph
- **Icons**: Lucide React
- **Styling**: Tailwind CSS

## Example Questions

Try asking the RAG agent questions like:

- "What is LangChain?"
- "How does RAG work?"
- "Explain the ReAct paradigm"
- "What are embeddings?"
- "Tell me about AI agents"

## Development

### Project Structure

```
rag-agent-js-app/
├── app/
│   ├── components/
│   │   ├── ApiKeyManager.tsx    # API key management component
│   │   └── ChatInterface.tsx    # Main chat interface
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── pages/
│   └── api/
│       └── chat.ts              # RAG agent API endpoint
└── package.json
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Notes

- API keys are stored locally in your browser's localStorage
- The knowledge base is currently pre-loaded with sample data
- Vector store is recreated on each API call (for simplicity)
- No error checking or debugging code included (as requested)

## License

This project is open source and available under the MIT License.
