import { NextResponse } from 'next/server';
import { OllamaService } from '../../../lib/ollama-service';

export async function GET(_request: Request) {
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
          currentModel: ollama.getModel(),
          message: 'Ollama service is running and ready'
        });
    } catch (_modelError) {
        return NextResponse.json({
          available: true,
          status: 'running',
          models: [],
          currentModel: ollama.getModel(),
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
    console.warn('⚠️ Ollama status check failed - this is expected in deployment environments:', error);
    return NextResponse.json({
      available: false,
      status: 'not available',
      models: [],
      message: 'Ollama is not available in this deployment environment. This is normal for cloud deployments.',
      error: (error as Error).message
    });
  }
}
