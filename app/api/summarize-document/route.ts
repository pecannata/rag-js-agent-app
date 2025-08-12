import { NextRequest, NextResponse } from 'next/server';
import { ChatCohere } from '@langchain/cohere';

export async function POST(request: NextRequest) {
  console.log('=== DOCUMENT SUMMARIZATION API ROUTE CALLED ===');
  
  try {
    const { text, filename, apiKey, documentType, metadata, userMessage } = await request.json();
    
    console.log('Summarization request received for:', filename);
    console.log('Document type:', documentType);
    console.log('Text length:', text?.length || 0);
    console.log('User message:', userMessage);
    
    if (!apiKey) {
      console.log('No API key provided, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'API key is required for document summarization' 
      }, { status: 400 });
    }

    if (!text) {
      console.log('No text provided, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'Text content is required for summarization' 
      }, { status: 400 });
    }

    // Validate API key format
    console.log('API key provided, length:', apiKey.length);
    console.log('API key starts with:', apiKey.substring(0, 8) + '...');
    
    if (apiKey.length < 10) {
      console.log('API key appears to be too short, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'Invalid API key format - key appears to be too short' 
      }, { status: 400 });
    }

    // Initialize LLM for summarization with explicit configuration
    console.log('Initializing ChatCohere with command-r-plus model...');
    let llm;
    try {
      llm = new ChatCohere({
        apiKey: apiKey,
        model: 'command-r-plus',
        temperature: 0.3,
        streaming: false,
      });
      console.log('ChatCohere initialized successfully');
    } catch (initError) {
      console.error('Failed to initialize ChatCohere:', initError);
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize Cohere API - possible API key issue'
      }, { status: 401 });
    }

    // Test the API key with a simple invocation
    console.log('Testing API key with simple invocation...');
    try {
      const testResponse = await llm.invoke('Test message');
      console.log('API key test successful, response length:', (testResponse.content as string).length);
    } catch (testError) {
      console.error('API key test failed:', testError);
      
      const testErrorMessage = testError instanceof Error ? testError.message : 'Unknown error';
      if (testErrorMessage.includes('401') || testErrorMessage.includes('Unauthorized')) {
        return NextResponse.json({
          success: false,
          error: 'API key is invalid or unauthorized. Please check your Cohere API key.'
        }, { status: 401 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Cohere API: ' + testErrorMessage
      }, { status: 500 });
    }

    // Simple summarization approach
    const summaryPrompt = `You are an expert document analyst. Please provide a comprehensive summary of this ${documentType} document.

Document: ${filename}
Type: ${documentType}
Length: ${text.length} characters

${userMessage ? `CRITICAL USER REQUIREMENT: "${userMessage}" - This must be the PRIMARY FOCUS of your analysis.\n\n` : ''}

Please provide a detailed analysis covering:

1. **Document Purpose & Overview**:
   - Main objectives and scope
   - Target audience and context
   - Key value propositions

2. **Main Content Analysis**:
   - Primary themes and topics
   - Key findings and conclusions
   - Important data and statistics

3. **Strategic Intelligence**:
   - Business implications
   - Recommendations and action items
   - Risk and opportunity assessment

4. **Key Takeaways**:
   - Most important insights
   - Critical decisions points
   - Next steps and priorities

Provide extensive detail while maintaining clear organization.

Document Text:
${text.substring(0, 120000)}

Comprehensive Summary:`;

    console.log('Generating comprehensive summary...');
    try {
      const summaryResponse = await llm.invoke(summaryPrompt);
      const summary = summaryResponse.content as string;
      
      console.log('Summary generated successfully, length:', summary.length);

      // Extract key topics
      const topicsPrompt = `Based on this summary, extract 6-8 key topics as a comma-separated list:

${summary}

Key topics:`;

      const topicsResponse = await llm.invoke(topicsPrompt);
      const keyTopics = (topicsResponse.content as string)
        .split(',')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0)
        .slice(0, 8);

      console.log('Key topics extracted:', keyTopics);

      return NextResponse.json({
        success: true,
        summary: summary,
        keyTopics: keyTopics,
        documentInfo: {
          filename,
          documentType,
          originalLength: text.length,
          summaryLength: summary.length,
          chunksProcessed: 1,
          metadata
        },
        timestamp: new Date().toISOString()
      });

    } catch (summaryError) {
      console.error('Error generating summary:', summaryError);
      
      const summaryErrorMessage = summaryError instanceof Error ? summaryError.message : 'Unknown error';
      if (summaryErrorMessage.includes('401') || summaryErrorMessage.includes('Unauthorized')) {
        return NextResponse.json({
          success: false,
          error: 'API key is invalid or unauthorized. Please check your Cohere API key.'
        }, { status: 401 });
      }
      
      throw summaryError;
    }

  } catch (error) {
    console.error('Error in document summarization:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json({
        success: false,
        error: 'API key is invalid or unauthorized. Please check your Cohere API key.'
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to summarize document: ' + errorMessage
    }, { status: 500 });
  }
}
