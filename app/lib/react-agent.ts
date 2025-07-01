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
const REACT_PROMPT_TEMPLATE = `You are an intelligent agent that uses ReAct (Reasoning and Acting) to evaluate whether a SQL query should be executed based on context relevance.

You are given:
- Context: {databaseContext}
- SQL Query: {sqlQuery}
- User Query: {userQuery}

Your task is to determine if the SQL query is relevant to the given context and should be executed.

Follow this exact format for your reasoning:

Thought: [Analyze the relationship between the context, SQL query, and user question. Does the SQL query make sense given the context?]

Action: [Evaluate the relevance:
- Use DATABASE if the SQL query is relevant to the context and would provide meaningful data
- Do not use DATABASE if the SQL query doesn't match the context or wouldn't provide relevant information]

Decision: [State clearly: "USE_DATABASE" if the query should be executed, or "DO_NOT_USE_DATABASE" if it should not]

Reasoning: [Explain why the SQL query is or isn't relevant to the given context]`;

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
  
  const shouldUseDatabase = actionUpper.includes('USE_DATABASE') || 
                           decisionUpper.includes('DATABASE') || 
                           decisionUpper.includes('BOTH');
                           
  // Use RAG for knowledge queries or when explicitly mentioned
  const shouldUseRAG = actionUpper.includes('USE_RAG') || 
                       actionUpper.includes('USE_DATABASE_WITH_RAG') ||
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
    model: 'command',
    temperature: 0.1 // Low temperature for consistent decision making
  });

  const prompt = PromptTemplate.fromTemplate(REACT_PROMPT_TEMPLATE);
  
  try {
    const query = context.userQuery.toLowerCase();
    
    // Check if this is a database-relevant query
    const isDatabaseRelevant = query.includes('empno') || 
                              query.includes('employee') ||
                              query.includes('employees') ||
                              query.includes('sql') ||
                              query.includes('database') ||
                              query.includes('table');
    
    // Check if this is a RAG-relevant query
    const isRAGRelevant = query.includes('langchain') || 
                         query.includes('langgraph') ||
                         query.includes('cohere') ||
                         query.includes('rag') ||
                         query.includes('react') ||
                         query.includes('framework') ||
                         query.includes('tool');
    
    // If it's clearly both database and RAG relevant, use both
    if (isDatabaseRelevant && isRAGRelevant) {
      return {
        thought: 'Query appears to need both database data and RAG knowledge.',
        action: 'USE_BOTH',
        shouldUseDatabase: true,
        shouldUseRAG: true,
        reasoning: 'Question involves both database content and requires additional context knowledge.'
      };
    }
    
    // If it's primarily database-focused, use database but also allow RAG for context
    if (isDatabaseRelevant) {
      return {
        thought: 'Database relevance detected, also checking for additional context needs.',
        action: 'USE_DATABASE_WITH_RAG',
        shouldUseDatabase: true,
        shouldUseRAG: true, // Allow RAG to provide additional context
        reasoning: 'Question involves database content and may benefit from additional knowledge context.'
      };
    }
    
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
