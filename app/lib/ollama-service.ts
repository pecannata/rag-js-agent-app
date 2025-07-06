/**
 * Ollama Service for Node.js with TypeScript
 * Provides integration with locally running Ollama models
 */

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaResponse {
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaStreamChunk {
  response: string;
  done: boolean;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.1:8b') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Send a chat message to Ollama
   */
  async chat(
    message: string,
    options: {
      temperature?: number;
      top_p?: number;
      context?: number[];
      stream?: boolean;
    } = {}
  ): Promise<OllamaResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: message,
          stream: options.stream || false,
          context: options.context,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      throw error;
    }
  }

  /**
   * Send a conversational chat with history support
   */
  async chatWithHistory(
    messages: OllamaMessage[],
    options: {
      temperature?: number;
      top_p?: number;
    } = {}
  ): Promise<OllamaResponse> {
    // Convert messages to a single prompt with context
    const prompt = this.formatMessagesAsPrompt(messages);
    
    return this.chat(prompt, options);
  }

  /**
   * Format messages array into a single prompt string
   */
  private formatMessagesAsPrompt(messages: OllamaMessage[]): string {
    return messages.map(msg => {
      const role = msg.role === 'assistant' ? 'Assistant' : 
                   msg.role === 'system' ? 'System' : 'Human';
      return `${role}: ${msg.content}`;
    }).join('\n\n') + '\n\nAssistant:';
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama service check failed:', error);
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<Array<{ name: string; size: string; modified: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error getting models:', error);
      throw error;
    }
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }
}
