import { NextRequest, NextResponse } from 'next/server';
import { RagAgent, ReActConfig } from '../../lib/agent';

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, history, sqlQuery, config } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
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
    const agent = new RagAgent(apiKey, config);
    await agent.initialize();
    
    const result = await agent.processMessage(
      message, 
      history || [], 
      sqlQuery,
      config
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
