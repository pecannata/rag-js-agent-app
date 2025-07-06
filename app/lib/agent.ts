import { ChatCohere } from '@langchain/cohere';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getJson } from 'serpapi';
import { OllamaService, OllamaMessage } from './ollama-service';

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
  } catch (_error) {
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


// Search tool using SerpAPI
async function searchWeb(query: string, apiKey?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!apiKey) {
      console.log('❌ SerpAPI key not provided - web search skipped');
      return { success: false, error: 'SerpAPI key not provided' };
    }
    
    console.log('🌐 SERPAPI CALL INITIATED');
    console.log('🔍 SerpAPI Query:', query);
    console.log('🔑 SerpAPI Key:', '...' + apiKey.slice(-8));
    
    const result = await getJson({
      engine: "google",
      q: query,
      api_key: apiKey,
      num: 3 // Limit to 3 results for efficiency
    });
    
    console.log('✅ SERPAPI CALL COMPLETED SUCCESSFULLY');
    console.log('📊 SerpAPI Results Count:', result.organic_results?.length || 0);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ SERPAPI CALL FAILED:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Oracle database tool
async function executeOracleQuery(sqlQuery: string, userMessage?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Replace <USER_MESSAGE> placeholder with actual user message if provided
    let processedQuery = sqlQuery;
    if (userMessage && sqlQuery.includes('<USER_MESSAGE>')) {
      // Escape single quotes in user message for SQL safety
      const escapedUserMessage = userMessage.replace(/'/g, "''");
      processedQuery = sqlQuery.replace(/<USER_MESSAGE>/g, escapedUserMessage);
      console.log('🔄 Replaced <USER_MESSAGE> placeholder in SQL query');
      console.log('📝 Original query:', sqlQuery);
      console.log('📝 User message:', userMessage);
      console.log('📝 Processed query:', processedQuery);
    }
    
    console.log('🔍 Executing Oracle database query:', processedQuery);
    
    // Execute the SQLclScript.sh with the SQL query
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${processedQuery.replace(/"/g, '\\"')}"`);
    
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
    } catch (_parseError) {
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
  private ollama: OllamaService;

  constructor(apiKey: string, config?: Partial<ReActConfig>, private provider: 'cohere' | 'ollama' = 'cohere') {
    if (this.provider === 'cohere') {
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
    } else {
      this.ollama = new OllamaService();
    }
  }

  async initialize() {
    // Check Ollama availability if using Ollama provider
    if (this.provider === 'ollama') {
      const isAvailable = await this.ollama.isAvailable();
      if (!isAvailable) {
        throw new Error('Ollama service is not available. Please ensure Ollama is running (brew services start ollama)');
      }
      console.log('✅ Ollama service is available and ready');
    }
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
      
      let response;
      if (this.provider === 'cohere') {
        response = await this.domainCheckerLlm.invoke(domainCheckPrompt);
      } else {
        response = await this.ollama.chat(domainCheckPrompt, { temperature: 0.1 });
      }
      const responseText = this.provider === 'cohere' ? 
        response.content as string :
        response.response as string;
      
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
    config?: ReActConfig,
    serpApiKey?: string
  ): Promise<{ response: string; augmentationData?: any; domainAnalysis?: any }> {
    try {
      // Create context from history
      const context = history.length > 0 
        ? history.map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`).join('\n') + '\n\n'
        : '';

        const augmentationData: any = {};
      let domainAnalysis: any = null;
      let databaseResult: any = null;

      // ReAct-based domain checking for database queries
      if (sqlQuery && config) {
        // Check if context keywords are provided
        if (!config.contextKeywords || config.contextKeywords.length === 0) {
          console.log('❌ No context keywords provided - Skipping database query');
          console.log('🛡️ Reason: Context keywords are required for domain similarity checking');
          
          domainAnalysis = {
            shouldExecute: false,
            reasoning: 'No context keywords provided. Context keywords are required to determine domain relevance.',
            confidence: 0
          };
          
          augmentationData.domainAnalysis = domainAnalysis;
          augmentationData.databaseQuery = {
            query: sqlQuery,
            executed: false,
            reason: 'No context keywords provided'
          };
        } else {
          console.log('\n🚀 Starting ReAct Domain Analysis...');
          
          domainAnalysis = await this.checkDomainSimilarity(
            config.contextKeywords, 
            message, 
            config
          );
          
          augmentationData.domainAnalysis = domainAnalysis;
          
          if (domainAnalysis.shouldExecute) {
            console.log('✅ Domain analysis PASSED - Executing database query');
            databaseResult = await executeOracleQuery(sqlQuery, message);
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

      // Multi-step ReAct reasoning for complex queries
      let webSearchContext = '';
      if (serpApiKey) {
        console.log('🧠 Starting multi-step ReAct analysis...');
        
        const stepAnalysisPrompt = `You are a ReAct (Reasoning and Acting) agent that breaks down complex queries into executable steps.

User Query: "${message}"
Database Available: ${databaseResult ? 'Yes' : 'No'}
Database Result: ${databaseResult ? JSON.stringify(databaseResult.data).substring(0, 500) + '...' : 'None'}

Analyze this query and break it down into steps. Identify what information:
1. Can be answered from the database (already executed)
2. Requires current/real-time web search (population, prices, weather, etc.)
3. Can be answered from LLM knowledge (general facts, relationships, etc.)

For web search needs, focus on:
- Current population data
- Recent statistics
- Time-sensitive information
- Real-time data

Provide your analysis in this exact JSON format:
{
  "steps": [
    {
      "step": 1,
      "description": "What this step accomplishes",
      "method": "database|websearch|knowledge",
      "needsExecution": true/false,
      "searchQuery": "specific search query if websearch needed",
      "confidence": 0.0-1.0
    }
  ],
  "needsWebSearch": true/false,
  "webSearchSteps": ["list of steps that need web search"]
}

Response:`;

        try {
          console.log('🕰️ Starting LLM analysis with timeout...');
          console.log('🔍 Query being analyzed:', message);
          console.log('🗃️ Database available:', databaseResult ? 'Yes' : 'No');
          console.log('🔑 SerpAPI key available:', serpApiKey ? 'Yes (...' + serpApiKey.slice(-4) + ')' : 'No');
          
          // Create a timeout promise (reduced to 15 seconds)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('LLM analysis timeout after 15 seconds')), 15000);
          });
          
          // Race between LLM call and timeout
          let analysisResponse;
          if (this.provider === 'cohere') {
            analysisResponse = await Promise.race([
              this.domainCheckerLlm.invoke(stepAnalysisPrompt),
              timeoutPromise
            ]);
          } else {
            analysisResponse = await Promise.race([
              this.ollama.chat(stepAnalysisPrompt, { temperature: 0.1 }),
              timeoutPromise
            ]);
          }
          
          console.log('✅ LLM analysis completed');
          const analysisText = this.provider === 'cohere' ? 
            (analysisResponse as any).content as string :
            (analysisResponse as any).response as string;
          
          console.log('📝 Step Analysis Response:', analysisText.substring(0, 500) + '...');
          
          // Parse JSON response with better error handling
          let stepAnalysis;
          try {
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              stepAnalysis = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found in LLM response');
            }
          } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError);
            throw new Error('Failed to parse LLM analysis response');
          }
          
          console.log('🎯 Multi-step Analysis:', {
            totalSteps: stepAnalysis.steps?.length || 0,
            needsWebSearch: stepAnalysis.needsWebSearch,
            webSearchSteps: stepAnalysis.webSearchSteps
          });
          
          augmentationData.stepAnalysis = stepAnalysis;
            
            // Execute web search steps
            if (stepAnalysis.needsWebSearch && stepAnalysis.steps) {
              const webSearchSteps = stepAnalysis.steps.filter((step: any) => 
                step.method === 'websearch' && step.needsExecution && step.confidence >= 0.7
              );
              
              if (webSearchSteps.length > 0) {
                console.log(`🌐 Executing ${webSearchSteps.length} web search step(s)...`);
                
                const webSearchResults = [];
                
                for (const step of webSearchSteps) {
                  let searchQuery = step.searchQuery || message;
                  
                  // Let LLM enhance search query with database context if available
                  if (databaseResult && databaseResult.success && step.searchQuery) {
                    const currentYear = new Date().getFullYear();
                    const contextEnhancementPrompt = `You are a search query optimizer. Given a search query and database results, enhance the search query to be more specific and effective.

Current Year: ${currentYear}
Original Search Query: "${step.searchQuery}"
Database Results Sample: ${JSON.stringify(databaseResult.data).substring(0, 1000)}...

Optimize the search query by:
1. Adding specific entities found in the database results
2. Making it more targeted for current/real-time information
3. Including relevant geographic or demographic terms from the data
4. Adding temporal context (use ${currentYear} as the current year) if appropriate
5. Do NOT hardcode any year - use ${currentYear} if you need to reference the current year

Return ONLY the optimized search query, nothing else.`;
                    
                    try {
                      let enhancementResponse;
                      if (this.provider === 'cohere') {
                        enhancementResponse = await this.domainCheckerLlm.invoke(contextEnhancementPrompt);
                      } else {
                        enhancementResponse = await this.ollama.chat(contextEnhancementPrompt, { temperature: 0.1 });
                      }
                      const enhancedQuery = this.provider === 'cohere' ? 
                        enhancementResponse.content as string :
                        enhancementResponse.response as string;
                      searchQuery = enhancedQuery.trim();
                      console.log(`🔧 Enhanced search query: "${searchQuery}"`);
                    } catch (_error) {
                      console.log(`⚠️ Query enhancement failed, using original: "${searchQuery}"`);
                    }
                  }
                  
                  // Add current year if not already present
                  const currentYear = new Date().getFullYear().toString();
                  const hasYear = searchQuery.includes(currentYear) || 
                                searchQuery.includes((parseInt(currentYear) - 1).toString()) ||
                                searchQuery.includes((parseInt(currentYear) + 1).toString());
                  
                  if (!hasYear) {
                    searchQuery += ` ${currentYear}`;
                  }
                  
                  console.log(`🔍 Step ${step.step}: Searching for "${searchQuery}"`);
                  const webResult = await searchWeb(searchQuery, serpApiKey);
                  
                  if (webResult.success && webResult.data) {
                    const organicResults = webResult.data.organic_results || [];
                    const searchSummary = organicResults.slice(0, 3).map((result: any) => 
                      `${result.title}: ${result.snippet}`
                    ).join('\n');
                    
                    webSearchResults.push({
                      step: step.step,
                      description: step.description,
                      query: searchQuery,
                      results: organicResults.slice(0, 3),
                      summary: searchSummary
                    });
                  }
                }
                
                if (webSearchResults.length > 0) {
                  const combinedSummary = webSearchResults.map(result => 
                    `Step ${result.step} (${result.description}):\n${result.summary}`
                  ).join('\n\n');
                  
                  webSearchContext = `\n\nCurrent Information from Multi-step Web Search:\n${combinedSummary}`;
                  augmentationData.webSearch = {
                    method: 'multi-step',
                    steps: webSearchResults,
                    combinedSummary: combinedSummary,
                    stepAnalysis: stepAnalysis
                  };
                }
              } else {
                console.log('🚫 No high-confidence web search steps to execute');
              }
            } else {
              console.log('🚫 Step analysis indicates no web search needed');
            }
        } catch (error) {
          console.error('❌ Multi-step analysis error:', error);
          // Fallback to simple detection
          const fallbackResult = await this.executeSimpleWebSearch(message, databaseResult, serpApiKey, augmentationData);
          if (fallbackResult) {
            webSearchContext = fallbackResult;
          }
        }
      }

      // Include database data in context if available
      let databaseContext = '';
      if (databaseResult && databaseResult.success) {
        console.log('📊 Database result available for LLM context');
        console.log('📊 Database data preview:', JSON.stringify(databaseResult.data).substring(0, 200) + '...');
        databaseContext = `\n\nDatabase Query Result:\n${JSON.stringify(databaseResult.data, null, 2)}`;
      } else {
        console.log('❌ No database result available for LLM context');
        if (databaseResult) {
          console.log('❌ Database result status:', databaseResult.success);
          console.log('❌ Database result error:', databaseResult.error);
        }
      }

      // Create ReAct-style prompt with explicit web search prioritization
      const hasWebSearchData = webSearchContext.includes('Current Information from');
      const webSearchInstruction = hasWebSearchData ? 
        `\n\n🌐 REAL-TIME DATA AVAILABLE: You have access to current, authoritative information from web search. When this data is available:
        
        • Treat web search results as your PRIMARY and AUTHORITATIVE source
        • Present the information with confidence as current facts
        • Use specific numbers and details from the search results
        • Avoid hedging language that suggests uncertainty when you have current data
        • Trust the search results over any general knowledge from training
        
        The goal is to provide users with the most current, accurate information available through live data sources.` : '';
      
      const reactPrompt = `You are a helpful AI assistant that uses ReAct (Reasoning and Acting) methodology. You think step by step and can access tools when needed.

Available capabilities:
- Mathematical calculations
- Knowledge base search (LangChain, ReAct, Cohere, RAG, LangGraph, Next.js)
- Oracle database queries (when contextually relevant)
- Web search for current information (when SerpAPI key is available)
- General conversation and assistance${webSearchInstruction}

${context}Human: ${message}${knowledgeContext}${databaseContext}${webSearchContext}

Thought: Let me analyze this request and provide a helpful response using the available information.

Assistant:`;
      
      console.log('📝 Final prompt length:', reactPrompt.length);
      console.log('📝 Database context included:', databaseContext.length > 0);
      console.log('📝 Web search context included:', webSearchContext.length > 0);
      console.log('📝 Knowledge context included:', knowledgeContext.length > 0);
      
      // Log a sample of the prompt to see what's being sent to LLM
      console.log('📝 Prompt preview (last 500 chars):', reactPrompt.slice(-500));
      
let response;
if (this.provider === 'cohere') {
  response = await this.llm.invoke(reactPrompt);
} else {
  response = await this.ollama.chat(reactPrompt);
}
      
      return {
        response: this.provider === 'cohere' ? 
          response.content as string :
          response.response as string,
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

  // Fallback simple web search method
  private async executeSimpleWebSearch(
    message: string, 
    databaseResult: any, 
    serpApiKey: string, 
    augmentationData: any
  ): Promise<string | null> {
    console.log('🔄 Fallback: Using simple keyword detection for web search');
    
    // Enhanced keyword detection for population and current data
    const simpleKeywords = ['current', 'latest', 'recent', 'today', '2024', '2025', 'population', 'price', 'weather'];
    const populationKeywords = ['population', 'current population', 'state population', 'census', 'demographics'];
    
    const needsSearch = simpleKeywords.some(keyword => message.toLowerCase().includes(keyword)) ||
                       populationKeywords.some(keyword => message.toLowerCase().includes(keyword));
    
    console.log('🔍 Fallback keyword check:', {
      message: message.substring(0, 100) + '...',
      foundKeywords: simpleKeywords.filter(k => message.toLowerCase().includes(k)),
      foundPopulationKeywords: populationKeywords.filter(k => message.toLowerCase().includes(k)),
      needsSearch: needsSearch
    });
    
    if (needsSearch) {
      let searchQuery = message;
      
      // Let LLM enhance search query with database context if available
      if (databaseResult && databaseResult.success) {
        const contextEnhancementPrompt = `You are a search query optimizer. Given a search query and database results, enhance the search query to be more specific and effective.

Original Search Query: "${searchQuery}"
Database Results Sample: ${JSON.stringify(databaseResult.data).substring(0, 1000)}...

Optimize the search query by:
1. Adding specific entities found in the database results
2. Making it more targeted for current/real-time information
3. Including relevant geographic or demographic terms from the data
4. Adding temporal context (current year) if appropriate

Return ONLY the optimized search query, nothing else.`;
        
        try {
          let enhancementResponse;
          if (this.provider === 'cohere') {
            enhancementResponse = await this.domainCheckerLlm.invoke(contextEnhancementPrompt);
          } else {
            enhancementResponse = await this.ollama.chat(contextEnhancementPrompt, { temperature: 0.1 });
          }
          const enhancedQuery = this.provider === 'cohere' ? 
            enhancementResponse.content as string :
            enhancementResponse.response as string;
          searchQuery = enhancedQuery.trim();
          console.log(`🔧 Fallback enhanced search query: "${searchQuery}"`);
        } catch (_error) {
          console.log(`⚠️ Fallback query enhancement failed, using original: "${searchQuery}"`);
        }
      }
      
      // Add current year if not already present
      const currentYear = new Date().getFullYear().toString();
      const hasYear = searchQuery.includes(currentYear) || 
                    searchQuery.includes((parseInt(currentYear) - 1).toString()) ||
                    searchQuery.includes((parseInt(currentYear) + 1).toString());
      
      if (!hasYear) {
        searchQuery += ` ${currentYear}`;
      }
      
      const webResult = await searchWeb(searchQuery, serpApiKey);
      
      if (webResult.success && webResult.data) {
        const organicResults = webResult.data.organic_results || [];
        const searchSummary = organicResults.slice(0, 3).map((result: any) => 
          `${result.title}: ${result.snippet}`
        ).join('\n');
        
        augmentationData.webSearch = {
          method: 'fallback',
          query: searchQuery,
          results: organicResults.slice(0, 3),
          summary: searchSummary
        };
        
        // Return the web search context for inclusion in LLM prompt
        return `\n\nCurrent Information from Web Search (Fallback):\n${searchSummary}`;
      }
    }
    
    // No search needed or search failed
    return null;
  }
}
