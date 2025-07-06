/**
 * Ollama Client for Node.js
 * Provides easy integration with locally running Ollama models
 */

class OllamaClient {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Send a chat message to the model
   * @param {string} message - The message to send
   * @param {string} model - The model to use (default: llama3.1:8b)
   * @param {Object} options - Additional options
   * @returns {Promise<string>} The model's response
   */
  async chat(message, model = 'llama3.1:8b', options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: message,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            ...options
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      throw error;
    }
  }

  /**
   * Stream chat responses for real-time conversation
   * @param {string} message - The message to send
   * @param {string} model - The model to use
   * @param {Function} onChunk - Callback for each response chunk
   * @param {Object} options - Additional options
   */
  async chatStream(message, model = 'llama3.1:8b', onChunk, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: message,
          stream: true,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            ...options
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                onChunk(data.response);
              }
              if (data.done) {
                return;
              }
    } catch (_e) {
              console.warn('Failed to parse JSON:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming from Ollama:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama service is running
   * @returns {Promise<boolean>} True if service is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get list of available models
   * @returns {Promise<Array>} List of available models
   */
  async getModels() {
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
}

module.exports = OllamaClient;
