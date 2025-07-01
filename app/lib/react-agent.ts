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
                           
  // Only use RAG if specifically mentioned for knowledge base queries
  const shouldUseRAG = actionUpper.includes('USE_RAG') || 
                       decisionUpper.includes('RAG') ||
                       (actionUpper.includes('BOTH') && decisionUpper.includes('BOTH'));
  
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
    // Directly ensure no RAG usage for employee-related queries
    const isDatabaseSpecific = query.includes('empno') || 
                               query.includes('employee') ||
                               query.includes('employees');
    
    if (isDatabaseSpecific) {
      return {
        thought: 'Direct database relevance detected.',
        action: 'USE_DATABASE_ONLY',
        shouldUseDatabase: true,
        shouldUseRAG: false,
        reasoning: 'Question specifically requests employee numbers from the database.'
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
