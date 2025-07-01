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
  databaseContext?: string;
  sqlQuery?: string;
}

// Shared ReAct prompt template
const REACT_PROMPT_TEMPLATE = `You are an intelligent agent that uses ReAct (Reasoning and Acting) to evaluate whether a database query should be executed and whether RAG knowledge should be used.

You are given:
- Context: {databaseContext}
- SQL Query: {sqlQuery}
- User Query: {userQuery}

Your task is to determine what resources are needed to answer the user's question properly.

CRITICAL: Only use the database if the SQL query is semantically relevant to the stated context. For example:
- If context is "Cat data" but SQL queries employee tables, DO NOT use database
- If context is "Employee data" and SQL queries employee tables, USE database
- If context is "Product data" but SQL queries customer tables, DO NOT use database

Follow this exact format:

Thought: [Analyze: Does the SQL query match the stated context? Does the user question relate to the context? Are they all aligned?]

Action: [Choose one:
- USE_DATABASE: if SQL query matches context and answers user question
- USE_RAG: if question needs knowledge base information
- USE_BOTH: if both database and knowledge are needed
- USE_NEITHER: if neither database nor RAG are needed]

Decision: [Restate your action clearly]

Reasoning: [Explain the semantic alignment between context, SQL query, and user question]`;

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
export function parseReActDecision(response: string, userQuery?: string): ReActDecision {
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
  
  // Handle USE_NEITHER case explicitly
  if (actionUpper.includes('USE_NEITHER') || decisionUpper.includes('USE_NEITHER')) {
    return {
      thought,
      action,
      shouldUseDatabase: false,
      shouldUseRAG: false,
      reasoning
    };
  }
  
  const shouldUseDatabase = actionUpper.includes('USE_DATABASE') || 
                           decisionUpper.includes('DATABASE') || 
                           actionUpper.includes('USE_BOTH') ||
                           decisionUpper.includes('BOTH');
                           
  // Use RAG for knowledge queries or when explicitly mentioned
  const shouldUseRAG = actionUpper.includes('USE_RAG') || 
                       actionUpper.includes('USE_BOTH') ||
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
    model: 'command-r-plus',
    temperature: 0.1 // Low temperature for consistent decision making
  });

  const prompt = PromptTemplate.fromTemplate(REACT_PROMPT_TEMPLATE);
  
  try {
    // Always use the LLM-based ReAct decision for proper context evaluation
    const response = await prompt
      .pipe(llm)
      .pipe(new StringOutputParser())
      .invoke({
        userQuery: context.userQuery,
        databaseContext: context.databaseContext || 'No context provided',
        sqlQuery: context.sqlQuery || 'No SQL query provided'
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
