import { NextRequest, NextResponse } from 'next/server';
import { RagAgent } from '../../lib/agent';

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, history, sqlQuery, config, serpApiKey, provider } = await request.json();

    // Only require API key for Cohere provider
    if (provider === 'cohere' && !apiKey) {
      return NextResponse.json(
        { error: 'API key is required for Cohere provider' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Initialize and use the RAG agent with config
    const agent = new RagAgent(apiKey, config, provider || 'cohere');
    await agent.initialize();
    
    const result = await agent.processMessage(
      message, 
      history || [], 
      sqlQuery,
      config,
      serpApiKey
    );
    
    return NextResponse.json({
      response: result.response,
      augmentationData: result.augmentationData,
      domainAnalysis: result.domainAnalysis
    });
    
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
