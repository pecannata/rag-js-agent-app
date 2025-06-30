import { NextRequest, NextResponse } from 'next/server';
import { ChatCohere } from '@langchain/cohere';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { CohereEmbeddings } from '@langchain/cohere';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

// Sample documents for the RAG system
const sampleDocuments = [
  new Document({
    pageContent: "LangChain is a framework for developing applications powered by language models. It provides tools for connecting language models to other sources of data and allows them to interact with their environment.",
    metadata: { source: "langchain-intro" }
  }),
  new Document({
    pageContent: "LangGraph is a library for building stateful, multi-actor applications with LLMs. It extends the LangChain Expression Language with the ability to coordinate multiple chains across multiple steps of computation.",
    metadata: { source: "langgraph-intro" }
  }),
  new Document({
    pageContent: "Cohere provides state-of-the-art language models via API. Their models can be used for text generation, embeddings, classification, and more. Cohere models are particularly good at following instructions and generating coherent text.",
    metadata: { source: "cohere-intro" }
  }),
  new Document({
    pageContent: "Retrieval Augmented Generation (RAG) is a technique that enhances language model responses by first retrieving relevant information from a knowledge base, then using that information to generate more accurate and contextual responses.",
    metadata: { source: "rag-intro" }
  }),
  new Document({
    pageContent: "ReAct (Reasoning and Acting) is a paradigm that combines reasoning and acting with language models. It allows models to interleave reasoning traces and actions, enabling them to solve complex tasks by breaking them down into steps.",
    metadata: { source: "react-intro" }
  })
];

// Initialize vector store (this would typically be persistent in a real app)
let vectorStore: MemoryVectorStore | null = null;

// Initialize the vector store with sample documents
async function initializeVectorStore(apiKey: string) {
  if (!vectorStore) {
    const embeddings = new CohereEmbeddings({
      apiKey: apiKey,
      model: 'embed-english-v3.0'
    });
    
    vectorStore = await MemoryVectorStore.fromDocuments(
      sampleDocuments,
      embeddings
    );
  }
  return vectorStore;
}

// Create smart RAG chain that falls back to general knowledge
async function createSmartRAGChain(apiKey: string) {
  // Initialize Cohere LLM
  const llm = new ChatCohere({
    apiKey: apiKey,
    model: 'command',
    temperature: 0.7
  });

  return { llm };
}

// Process question with smart RAG approach
async function processQuestion(question: string, apiKey: string) {
  const { llm } = await createSmartRAGChain(apiKey);
  
  // Check if question relates to our knowledge base
  const isKnowledgeBaseQuestion = question.toLowerCase().includes('langchain') || 
      question.toLowerCase().includes('langgraph') ||
      question.toLowerCase().includes('cohere') ||
      question.toLowerCase().includes('rag') ||
      question.toLowerCase().includes('react') ||
      question.toLowerCase().includes('retrieval');

  if (isKnowledgeBaseQuestion) {
    // Use RAG for knowledge base questions
    const store = await initializeVectorStore(apiKey);
    const retriever = store.asRetriever({ k: 3 });
    const docs = await retriever.invoke(question);
    const context = docs.map(doc => doc.pageContent).join('\n\n');
    
    const ragPrompt = PromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Use the following context to provide a comprehensive answer to the question.
      
      Context: {context}
      
      Question: {question}
      
      Answer:`
    );
    
    const response = await ragPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({
      context,
      question
    });
    
    return response;
  } else {
    // Use general knowledge for other questions
    const generalPrompt = PromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Answer the following question using your general knowledge. Be informative and accurate.
      
      Question: {question}
      
      Answer:`
    );
    
    const response = await generalPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({
      question
    });
    
    return response;
  }
}

// ReAct-style reasoning function
function processWithReAct(userMessage: string): string {
  // Simple ReAct-style processing - in a real implementation, this would be more sophisticated
  const thoughts = [];
  
  // Thought: Analyze the user's question
  thoughts.push(`Thought: The user is asking about: "${userMessage}"`);
  
  // Action: Determine if this requires retrieval
  if (userMessage.toLowerCase().includes('langchain') || 
      userMessage.toLowerCase().includes('langgraph') ||
      userMessage.toLowerCase().includes('cohere') ||
      userMessage.toLowerCase().includes('rag') ||
      userMessage.toLowerCase().includes('react')) {
    thoughts.push('Action: This question relates to our knowledge base, so I should retrieve relevant information.');
  } else {
    thoughts.push('Action: This is a general question, I can answer based on my training.');
  }
  
  return thoughts.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Process with ReAct-style reasoning
    const reactThoughts = processWithReAct(message);
    
    // Process question with smart RAG approach
    const response = await processQuestion(message, apiKey);

    // Combine ReAct thoughts with RAG response for demonstration
    const finalResponse = `${response}\n\n--- ReAct Process ---\n${reactThoughts}`;

    return NextResponse.json({ 
      response: finalResponse,
      success: true 
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process your request',
        response: 'I apologize, but I encountered an error processing your request. Please check your API key and try again.'
      },
      { status: 500 }
    );
  }
}
