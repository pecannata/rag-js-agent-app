import { NextRequest, NextResponse } from 'next/server';
import { RagAgent, ReActConfig } from '../../lib/agent';
import { withAuth } from '@/lib/auth/with-auth';
import { logApiActivity } from '@/lib/auth/api-auth';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const { message, apiKey, history, sqlQuery, config, serpApiKey } = await request.json();

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
      config,
      serpApiKey
    );
    
    // Log chat activity
    await logApiActivity(user.clerkUserId, 'chat_interaction', {
      messageLength: message.length,
      hasHistory: history && history.length > 0,
      configUsed: config
    }, request);
    
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
});
