import { ChatCohere } from '@langchain/cohere';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ReAct configuration interface
export interface ReActConfig {
  temperature: number;
  domainSimilarityThreshold: number;
  enableDatabaseQueries: boolean;
  contextKeywords: string[];
}

// Simple knowledge base for demonstration
const knowledgeBase = {
  'langchain': 'LangChain is a framework for developing applications powered by language models. It provides tools for chaining together LLM calls, managing prompts, and integrating with various data sources.',
  'react': 'ReAct (Reasoning and Acting) is a prompting technique that combines reasoning traces and task-specific actions in language models. It allows models to perform dynamic reasoning to create, maintain, and adjust plans for acting.',
  'cohere': 'Cohere is an AI platform that provides large language models via API. Their models include Command for text generation, Embed for embeddings, and Classify for classification tasks.',
  'rag': 'RAG (Retrieval-Augmented Generation) is a technique that combines retrieval of relevant documents with text generation. It allows models to access external knowledge when generating responses.',
  'langgraph': 'LangGraph is a library for building stateful, multi-actor applications with LLMs. It extends LangChain with the ability to coordinate multiple chains (or actors) across multiple steps of computation.',
  'nextjs': 'Next.js is a React framework that provides features like server-side rendering, static site generation, and API routes out of the box.',
};

// Simple calculator function
function calculateMath(expression: string): string {
  try {
    // Basic safety check - only allow numbers, operators, and parentheses
    const cleanExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
    if (cleanExpression !== expression.replace(/\s/g, '')) {
      return 'Error: Invalid characters in mathematical expression';
    }
    const result = eval(cleanExpression);
    return `The result is: ${result}`;
  } catch (error) {
    return 'Error: Invalid mathematical expression';
  }
}

// Knowledge search function
function searchKnowledge(query: string): string {
  const lowerQuery = query.toLowerCase();
  for (const [key, value] of Object.entries(knowledgeBase)) {
    if (lowerQuery.includes(key)) {
      return `Found relevant information: ${value}`;
    }
  }
  return 'No specific information found in knowledge base.';
}

// Oracle database tool
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Executing Oracle database query:', sqlQuery);
    
    // Execute the SQLclScript.sh with the SQL query
    const { stdout, stderr } = await execAsync(`bash ../SQLclScript.sh "${sqlQuery.replace(/"/g, '\\"')}"`);
    
    if (stderr) {
      console.error('❌ Database query error:', stderr);
      console.log('Database query was not run');
      return { success: false, error: stderr };
    }
    
    console.log('✅ Database query executed successfully');
    
    // Parse JSON response
    try {
      const jsonData = JSON.parse(stdout);
      return { success: true, data: jsonData };
    } catch (parseError) {
      // If not JSON, return raw output
      return { success: true, data: stdout };
    }
  } catch (error) {
    console.error('❌ Database execution error:', error);
    console.log('Database query was not run');
    return { success: false, error: (error as Error).message };
  }
}

export class RagAgent {
  private llm: ChatCohere;
  private domainCheckerLlm: ChatCohere;

  constructor(apiKey: string, config?: Partial<ReActConfig>) {
    this.llm = new ChatCohere({
      apiKey: apiKey,
      model: 'command-r-plus',
      temperature: config?.temperature || 0.7,
    });
    
    // Separate LLM instance for domain checking with lower temperature for consistency
    this.domainCheckerLlm = new ChatCohere({
      apiKey: apiKey,
      model: 'command-r-plus',
      temperature: 0.1, // Lower temperature for more consistent domain checking
    });
  }

  async initialize() {
    // Simple initialization - no complex setup needed
    return Promise.resolve();
  }

  // ReAct-based domain similarity checker using LLM
  async checkDomainSimilarity(
    contextKeywords: string[], 
    userMessage: string, 
    config: ReActConfig
  ): Promise<{ shouldExecute: boolean; reasoning: string; confidence: number }> {
    try {
      const contextString = contextKeywords.join(', ');
      
      const domainCheckPrompt = `You are an expert domain similarity analyzer. Your task is to determine if a user message is semantically related to specific context keywords.

Context Keywords: ${contextString}
User Message: "${userMessage}"

Analyze the semantic relationship between the user message and the context keywords. Consider:
1. Are they discussing the same general domain/topic?
2. Would querying data related to the context keywords help answer the user's question?
3. Is there clear topical alignment?

Important: Be strict in your evaluation. Only indicate a match if there is CLEAR semantic alignment.

Examples of CLEAR alignment:
- Context: "Employee" | Message: "How many employees are there?" → MATCH
- Context: "Employee" | Message: "Show me the salary data" → MATCH
- Context: "Product" | Message: "What products do we sell?" → MATCH

Examples of NO alignment:
- Context: "Employee" | Message: "What is AWS?" → NO MATCH
- Context: "Employee" | Message: "How's the weather?" → NO MATCH
- Context: "Product" | Message: "Tell me about machine learning" → NO MATCH

Provide your analysis in this exact JSON format:
{
  "shouldExecute": true/false,
  "reasoning": "Your detailed reasoning here",
  "confidence": 0.0-1.0
}

Response:`;

      console.log('🤔 ReAct Domain Checker - Analyzing semantic similarity...');
      console.log('Context Keywords:', contextString);
      console.log('User Message:', userMessage);
      
      const response = await this.domainCheckerLlm.invoke(domainCheckPrompt);
      const responseText = response.content as string;
      
      // Parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Additional threshold check
        const finalDecision = analysis.shouldExecute && 
                            analysis.confidence >= config.domainSimilarityThreshold &&
                            config.enableDatabaseQueries;
        
        console.log('🎯 Domain Analysis Result:', {
          shouldExecute: finalDecision,
          reasoning: analysis.reasoning,
          confidence: analysis.confidence,
          thresholdMet: analysis.confidence >= config.domainSimilarityThreshold
        });
        
        return {
          shouldExecute: finalDecision,
          reasoning: analysis.reasoning,
          confidence: analysis.confidence
        };
      } catch (parseError) {
        console.error('❌ Failed to parse domain check response:', parseError);
        console.log('🛡️ Defaulting to NO EXECUTION due to parsing error');
        return {
          shouldExecute: false,
          reasoning: 'Failed to analyze domain similarity - defaulting to safe mode',
          confidence: 0
        };
      }
    } catch (error) {
      console.error('❌ Domain checking error:', error);
      console.log('🛡️ Defaulting to NO EXECUTION due to error');
      return {
        shouldExecute: false,
        reasoning: 'Error in domain analysis - defaulting to safe mode',
        confidence: 0
      };
    }
  }

  async processMessage(
    message: string, 
    history: any[] = [], 
    sqlQuery?: string,
    config?: ReActConfig
  ): Promise<{ response: string; augmentationData?: any; domainAnalysis?: any }> {
    try {
      // Create context from history
      const context = history.length > 0 
        ? history.map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`).join('\n') + '\n\n'
        : '';

      let augmentationData: any = {};
      let domainAnalysis: any = null;
      let databaseResult: any = null;

      // ReAct-based domain checking for database queries
      if (sqlQuery && config) {
        console.log('\n🚀 Starting ReAct Domain Analysis...');
        
        domainAnalysis = await this.checkDomainSimilarity(
          config.contextKeywords, 
          message, 
          config
        );
        
        augmentationData.domainAnalysis = domainAnalysis;
        
        if (domainAnalysis.shouldExecute) {
          console.log('✅ Domain analysis PASSED - Executing database query');
          databaseResult = await executeOracleQuery(sqlQuery);
          augmentationData.databaseQuery = {
            query: sqlQuery,
            result: databaseResult,
            executed: true
          };
        } else {
          console.log('❌ Domain analysis FAILED - Skipping database query');
          console.log('🛡️ Reason:', domainAnalysis.reasoning);
          augmentationData.databaseQuery = {
            query: sqlQuery,
            executed: false,
            reason: domainAnalysis.reasoning
          };
        }
      }

      // Check if this is a math question
      const mathPattern = /(?:calculate|compute|what is|what's|solve|\+|\-|\*|\/|\d+\s*[+\-*/]\s*\d+)/i;
      if (mathPattern.test(message)) {
        const numberPattern = /[\d+\-*/().\s]+/g;
        const mathExpression = message.match(numberPattern)?.join('').trim();
        if (mathExpression) {
          const calculation = calculateMath(mathExpression);
          if (!calculation.startsWith('Error')) {
            augmentationData.calculation = {
              expression: mathExpression,
              result: calculation
            };
          }
        }
      }

      // Check if this might be a knowledge question
      const knowledgeResult = searchKnowledge(message);
      let knowledgeContext = '';
      if (!knowledgeResult.startsWith('No specific')) {
        knowledgeContext = `\n\nRelevant knowledge: ${knowledgeResult}`;
        augmentationData.knowledgeBase = {
          query: message,
          result: knowledgeResult
        };
      }

      // Include database data in context if available
      let databaseContext = '';
      if (databaseResult && databaseResult.success) {
        databaseContext = `\n\nDatabase Query Result:\n${JSON.stringify(databaseResult.data, null, 2)}`;
      }

      // Create ReAct-style prompt
      const reactPrompt = `You are a helpful AI assistant that uses ReAct (Reasoning and Acting) methodology. You think step by step and can access tools when needed.

Available capabilities:
- Mathematical calculations
- Knowledge base search (LangChain, ReAct, Cohere, RAG, LangGraph, Next.js)
- Oracle database queries (when contextually relevant)
- General conversation and assistance

${context}Human: ${message}${knowledgeContext}${databaseContext}

Thought: Let me analyze this request and provide a helpful response using the available information.

Assistant:`;

      const response = await this.llm.invoke(reactPrompt);
      
      return {
        response: response.content as string,
        augmentationData,
        domainAnalysis
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: 'I apologize, but I encountered an error processing your request. Please check your API key and try again.',
        augmentationData: { error: (error as Error).message }
      };
    }
  }
}
