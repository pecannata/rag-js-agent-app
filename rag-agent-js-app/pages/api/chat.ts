import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatCohere } from '@langchain/cohere';

// Sample knowledge base for RAG
const knowledgeBase = [
  "LangChain is a framework for developing applications powered by language models.",
  "LangGraph is a library for building stateful, multi-actor applications with LLMs.",
  "Retrieval Augmented Generation (RAG) combines information retrieval with text generation.",
  "Cohere provides powerful language models for natural language processing tasks.",
  "ReAct (Reasoning + Acting) is a paradigm that combines reasoning and acting with language models.",
  "Vector databases store and retrieve information based on semantic similarity.",
  "Embeddings are numerical representations of text that capture semantic meaning.",
  "AI agents can autonomously perform tasks by reasoning about their environment and taking actions.",
  "Machine learning models can be fine-tuned for specific tasks and domains.",
  "Natural language processing enables computers to understand and generate human language."
];

// Simple text similarity function for basic retrieval
function findRelevantContext(query: string, knowledge: string[]): string {
  const queryLower = query.toLowerCase();
  const relevantPieces = knowledge.filter(piece => {
    const pieceLower = piece.toLowerCase();
    return queryLower.split(' ').some(word => 
      word.length > 3 && pieceLower.includes(word)
    );
  });
  
  // Only return context if we found relevant pieces
  return relevantPieces.length > 0 
    ? relevantPieces.slice(0, 3).join('\n\n')
    : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { message, apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ response: 'API key is missing.' });
  }

  if (!message) {
    return res.status(400).json({ response: 'Message is required.' });
  }

  try {
    // Initialize Cohere chat model
    const llm = new ChatCohere({
      apiKey: apiKey,
      model: "command-r",
      temperature: 0.7,
    });

    // Retrieve relevant context using simple text matching
    const context = findRelevantContext(message, knowledgeBase);

    // Create prompt based on whether we have relevant context
    const prompt = context 
      ? `You are a helpful AI assistant. Use the provided context to help answer the user's question, supplementing with your general knowledge as needed.

Relevant context:
${context}

Question: ${message}

Answer:`
      : `You are a helpful AI assistant. Please answer the following question clearly and accurately.

Question: ${message}

Answer:`;

    // Generate response using Cohere
    const response = await llm.invoke(prompt);
    
    // Extract the content from the response
    const responseText = typeof response.content === 'string' 
      ? response.content 
      : 'I apologize, but I could not generate a proper response.';

    return res.status(200).json({ response: responseText });

  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ 
      response: 'I apologize, but I encountered an error processing your request. Please check your API key and try again.' 
    });
  }
}
