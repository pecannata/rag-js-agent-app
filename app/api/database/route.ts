import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ChatCohere } from '@langchain/cohere';

const execAsync = promisify(exec);

interface ReActConfig {
  temperature: number;
  domainSimilarityThreshold: number;
  enableDatabaseQueries: boolean;
  contextKeywords: string[];
}

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Direct Database Query Execution:', sqlQuery);
    
    // Execute the SQLclScript.sh with the SQL query
    const { stdout, stderr } = await execAsync(`bash ../SQLclScript.sh "${sqlQuery.replace(/"/g, '\\"')}"`);
    
    if (stderr) {
      console.error('❌ Database query error:', stderr);
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
    return { success: false, error: (error as Error).message };
  }
}

// ReAct-based domain similarity checker
async function checkDomainSimilarity(
  apiKey: string,
  contextKeywords: string[], 
  userMessage: string, 
  config: ReActConfig
): Promise<{ shouldExecute: boolean; reasoning: string; confidence: number }> {
  try {
    const domainCheckerLlm = new ChatCohere({
      apiKey: apiKey,
      model: 'command-r-plus',
      temperature: 0.1, // Lower temperature for consistent domain checking
    });

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
    
    const response = await domainCheckerLlm.invoke(domainCheckPrompt);
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

// POST /api/database - Execute database queries with optional ReAct domain checking
export async function POST(request: NextRequest) {
  try {
    const { 
      sqlQuery, 
      apiKey, 
      userMessage, 
      config, 
      forceExecute = false 
    } = await request.json();

    if (!sqlQuery) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    let domainAnalysis = null;
    let shouldExecute = forceExecute; // Force execution bypasses domain checking

    // If not forcing execution and we have domain checking parameters
    if (!forceExecute && apiKey && userMessage && config) {
      console.log('\n🚀 Starting ReAct Domain Analysis for Database Route...');
      
      domainAnalysis = await checkDomainSimilarity(
        apiKey,
        config.contextKeywords || [],
        userMessage,
        config
      );
      
      shouldExecute = domainAnalysis.shouldExecute;
    }

    if (shouldExecute) {
      console.log('✅ Domain analysis PASSED or FORCED - Executing database query');
      
      const databaseResult = await executeOracleQuery(sqlQuery);
      
      return NextResponse.json({
        success: true,
        executed: true,
        data: databaseResult.data,
        error: databaseResult.error,
        domainAnalysis,
        sqlQuery
      });
    } else {
      console.log('❌ Domain analysis FAILED - Skipping database query');
      console.log('🛡️ Reason:', domainAnalysis?.reasoning || 'Domain checking required');
      
      return NextResponse.json({
        success: false,
        executed: false,
        reason: domainAnalysis?.reasoning || 'Domain checking failed or not provided',
        domainAnalysis,
        sqlQuery
      });
    }
    
  } catch (error) {
    console.error('Error in database API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

// GET /api/database - Test database connection
export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    const testQuery = 'SELECT 1 FROM dual';
    const result = await executeOracleQuery(testQuery);
    
    return NextResponse.json({
      success: true,
      connectionTest: result.success,
      message: result.success ? 'Database connection successful' : 'Database connection failed',
      error: result.error
    });
    
  } catch (error) {
    console.error('Database connection test failed:', error);
    return NextResponse.json(
      { 
        success: false,
        connectionTest: false,
        message: 'Database connection test failed',
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
