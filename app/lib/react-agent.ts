import { ChatCohere } from '@langchain/cohere';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

export interface ReActDecision {
  thought: string;
  action: string;
  shouldUseDatabase: boolean;
  shouldUseRAG: boolean;
  reasoning: string;
}

export interface ReActContext {
  userQuery: string;
  ragContext?: string;
  databaseResults?: string;
  previousThoughts?: string[];
}

// Shared ReAct prompt template
const REACT_PROMPT_TEMPLATE = `You are an intelligent agent that uses ReAct (Reasoning and Acting) to make decisions about how to answer user queries.

You have access to two main tools:
1. RAG System: A knowledge base containing information about LangChain, LangGraph, Cohere, RAG, and ReAct
2. Oracle Database: A database that can be queried using SQL

Your task is to analyze the user's query and decide which tools to use based on strict relevance checking.

User Query: {userQuery}

Follow this exact format for your reasoning:

Thought: [Analyze what the user is asking and what information would be needed to answer properly]

Action: [Decide which tools to use based on the following criteria:
- Use RAG if the query relates to: LangChain, LangGraph, Cohere, RAG, ReAct, or general AI/ML concepts from our knowledge base
- Use Database if the query explicitly asks for data retrieval, SQL operations, or database-specific information
- Use both if the query requires combining database results with knowledge base information
- Use neither if it's a general question that can be answered with your training data]

Decision: [State clearly: "USE_RAG", "USE_DATABASE", "USE_BOTH", or "USE_GENERAL"]

Reasoning: [Explain why you made this decision based on strict relevance to the available tools]`;

// Context relevance checker
export function checkContextRelevance(query: string, context: string): boolean {
  const queryLower = query.toLowerCase();
  const contextLower = context.toLowerCase();
  
  // Check for keyword overlap and semantic relevance
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 3);
  const contextWords = contextLower.split(/\s+/);
  
  let relevanceScore = 0;
  for (const queryWord of queryWords) {
    if (contextWords.some(contextWord => 
      contextWord.includes(queryWord) || queryWord.includes(contextWord)
    )) {
      relevanceScore++;
    }
  }
  
  // Require at least 30% keyword overlap for relevance
  return (relevanceScore / queryWords.length) >= 0.3;
}

// Parse ReAct decision from LLM response
export function parseReActDecision(response: string): ReActDecision {
  const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let thought = '';
  let action = '';
  let decision = '';
  let reasoning = '';
  
  for (const line of lines) {
    if (line.startsWith('Thought:')) {
      thought = line.substring(8).trim();
    } else if (line.startsWith('Action:')) {
      action = line.substring(7).trim();
    } else if (line.startsWith('Decision:')) {
      decision = line.substring(9).trim();
    } else if (line.startsWith('Reasoning:')) {
      reasoning = line.substring(10).trim();
    }
  }
  
  // Check both action and decision fields for USE_DATABASE/USE_RAG
  const actionUpper = action.toUpperCase();
  const decisionUpper = decision.toUpperCase();
  
  const shouldUseDatabase = actionUpper.includes('USE_DATABASE') || 
                           decisionUpper.includes('DATABASE') || 
                           decisionUpper.includes('BOTH');
                           
  const shouldUseRAG = actionUpper.includes('USE_RAG') || 
                      decisionUpper.includes('RAG') || 
                      decisionUpper.includes('BOTH');
  
  return {
    thought,
    action,
    shouldUseDatabase,
    shouldUseRAG,
    reasoning
  };
}

// Main ReAct decision function
export async function makeReActDecision(
  context: ReActContext,
  apiKey: string
): Promise<ReActDecision> {
  const llm = new ChatCohere({
    apiKey: apiKey,
    model: 'command',
    temperature: 0.1 // Low temperature for consistent decision making
  });

  const prompt = PromptTemplate.fromTemplate(REACT_PROMPT_TEMPLATE);
  
  try {
    const response = await prompt
      .pipe(llm)
      .pipe(new StringOutputParser())
      .invoke({
        userQuery: context.userQuery
      });
    
    return parseReActDecision(response);
  } catch (error) {
    console.error('Error in ReAct decision making:', error);
    // Fallback decision logic
    const query = context.userQuery.toLowerCase();
    const isRAGRelevant = query.includes('langchain') || 
                         query.includes('langgraph') ||
                         query.includes('cohere') ||
                         query.includes('rag') ||
                         query.includes('react');
    
    const isDatabaseRelevant = query.includes('sql') ||
                              query.includes('database') ||
                              query.includes('query') ||
                              query.includes('select') ||
                              query.includes('table');
    
    return {
      thought: `Fallback analysis: Analyzing query "${context.userQuery}"`,
      action: `Fallback decision based on keyword detection`,
      shouldUseDatabase: isDatabaseRelevant,
      shouldUseRAG: isRAGRelevant,
      reasoning: 'Used fallback logic due to LLM error'
    };
  }
}

// Format ReAct process for display
export function formatReActProcess(decision: ReActDecision): string {
  return `--- ReAct Process ---
Thought: ${decision.thought}
Action: ${decision.action}
Reasoning: ${decision.reasoning}`;
}
