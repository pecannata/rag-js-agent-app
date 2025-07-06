import { NextRequest, NextResponse } from 'next/server';
import { OllamaService } from '../../../lib/ollama-service';

export async function GET(request: NextRequest) {
  try {
    const ollama = new OllamaService();
    
    // Check if Ollama service is available
    const isAvailable = await ollama.isAvailable();
    
    if (isAvailable) {
      // Get available models
      try {
        const models = await ollama.getModels();
        return NextResponse.json({
          available: true,
          status: 'running',
          models: models,
          message: 'Ollama service is running and ready'
        });
      } catch (modelError) {
        return NextResponse.json({
          available: true,
          status: 'running',
          models: [],
          message: 'Ollama service is running but model list unavailable'
        });
      }
    } else {
      return NextResponse.json({
        available: false,
        status: 'not running',
        models: [],
        message: 'Ollama service is not available. Please ensure Ollama is running.'
      });
    }
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    return NextResponse.json({
      available: false,
      status: 'error',
      models: [],
      message: 'Error checking Ollama status',
      error: (error as Error).message
    }, { status: 500 });
  }
}
