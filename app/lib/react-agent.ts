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
const REACT_PROMPT_TEMPLATE = `You are a precise semantic alignment checker. You must decide if the database query fits the described context and user question.

You have the following inputs:
- Context: {databaseContext}
- SQL Query: {sqlQuery}
- User Query: {userQuery}

DECISION RULES:
1. Identify the context of the data.
2. Verify the SQL query pertains to the context domain.
3. Ensure the user query aligns with the same domain as the context.
4. All three inputs must strictly belong to one domain.

MISALIGNED EXAMPLES:
- "Cat data" context + movies SQL → MISALIGNED
- "Cat data" context + customers user query → MISALIGNED

ALIGNED EXAMPLES:
- "Movie data" context + movies SQL + user asks about movies → ALIGNED
- "Customer data" context + customers SQL + user asks about customers → ALIGNED

IF ANY INPUT DIFFERS IN DOMAIN, SELECT USE_NEITHER.

Format your output strictly like this:

Thought: [Analyze: Is the domain the same for context, SQL, and user? Determine any misalignment.]

Action: [Based purely on domain check:
- USE_DATABASE: Context, SQL, and user query are all the same domain.
- USE_NEITHER: At least one input is a different domain.]

Decision: [Conclude your action as USE_DATABASE or USE_NEITHER]

Reasoning: [Details on why they align or misalign. Context: X, SQL: Y, User query: Z -> Result alignment: [yes/no]]`;

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
