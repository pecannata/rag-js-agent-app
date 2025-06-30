# RAG Agent Chatbot

A modern AI chatbot application built with Next.js, LangChain, LangGraph, and Cohere. This application demonstrates a Retrieval Augmented Generation (RAG) system with ReAct reasoning capabilities.

## Features

- **RAG System**: Uses vector embeddings to retrieve relevant information from a knowledge base
- **ReAct Reasoning**: Implements Reasoning and Acting paradigm for better problem-solving
- **LangChain Integration**: Built using LangChain framework for LLM applications
- **LangGraph**: Utilizes LangGraph for multi-step reasoning workflows
- **Cohere LLM**: Powered by Cohere's state-of-the-art language models
- **Responsive UI**: Clean, modern interface with Tailwind CSS
- **API Key Management**: Secure local storage of API keys with visual status indicators

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI/ML**: LangChain, LangGraph, Cohere
- **Storage**: Local browser storage for API keys
- **Vector Store**: In-memory vector store with Cohere embeddings

## Prerequisites

Before running this application, you need:

1. Node.js 18+ installed on your system
2. A Cohere API key (get one from [Cohere Dashboard](https://dashboard.cohere.ai/))

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

4. **Configure your API key:**
   - Enter your Cohere API key in the sidebar
   - Click "Save" to store it locally
   - The status indicator will show "Active" when configured correctly

5. **Start chatting:**
   - Type your questions in the chat input
   - The system will use RAG to find relevant information
   - ReAct reasoning process is shown with each response

## How It Works

### RAG (Retrieval Augmented Generation)
The application maintains a knowledge base of documents about LangChain, LangGraph, Cohere, RAG, and ReAct. When you ask a question:
1. Your query is converted to embeddings using Cohere's embedding model
2. Similar documents are retrieved from the vector store
3. The retrieved context is used to generate a more accurate response

### ReAct (Reasoning and Acting)
The system implements a simplified ReAct approach:
1. **Thought**: Analyzes what the user is asking
2. **Action**: Determines if knowledge base retrieval is needed
3. **Response**: Combines retrieved information with reasoning

### Sample Questions to Try

- "What is LangChain?"
- "How does RAG work?"
- "Tell me about LangGraph"
- "What is ReAct reasoning?"
- "How does Cohere compare to other LLMs?"

## Project Structure

```
rag-agent-js-app/
├── app/
│   ├── api/chat/
│   │   └── route.ts          # API endpoint for chat processing
│   ├── components/
│   │   ├── Sidebar.tsx       # API key management sidebar
│   │   └── ChatInterface.tsx # Main chat interface
│   ├── layout.tsx            # Root layout
│   ├── page.tsx             # Main page
│   └── globals.css          # Global styles
├── package.json
└── README.md
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify your Cohere API key is correct
   - Check that you have sufficient credits in your Cohere account

2. **Build Errors**
   - Ensure all dependencies are installed: `npm install`
   - Check that you're using Node.js 18+

3. **Chat Not Responding**
   - Make sure your API key is saved and shows as "Active"
   - Check the browser console for any error messages
