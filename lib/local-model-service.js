// Enhanced Local Model Service with Multiple Options

class LocalModelService {
  constructor() {
    this.providers = {
      ollama: {
        baseUrl: 'http://localhost:11434',
        models: {
          'llama3.2:3b': { type: 'general', size: '3B' },
          'codellama:7b': { type: 'code', size: '7B' },
          'mistral:7b': { type: 'general', size: '7B' },
          'phi3:3.8b': { type: 'general', size: '3.8B' },
          'sqlcoder:15b': { type: 'sql', size: '15B' },
          'deepseek-coder:6.7b': { type: 'code', size: '6.7B' },
          'nomic-embed-text': { type: 'embedding', size: '137M' }
        }
      },
      lmstudio: {
        baseUrl: 'http://localhost:1234',
        models: {} // Would be populated based on LM Studio installation
      },
      gpt4all: {
        baseUrl: 'http://localhost:4891',
        models: {} // Would be populated based on GPT4All installation
      }
    };
  }

  // Check which providers are available
  async checkAvailableProviders() {
    const available = {};
    
    for (const [provider, config] of Object.entries(this.providers)) {
      try {
        const response = await fetch(`${config.baseUrl}/api/tags`);
        if (response.ok) {
          available[provider] = await response.json();
        }
      } catch (error) {
        console.log(`${provider} not available:`, error.message);
      }
    }
    
    return available;
  }

  // Get best model for specific task
  getModelForTask(task) {
    const taskModelMap = {
      'sql': ['sqlcoder:15b', 'codellama:7b', 'llama3.2:3b'],
      'code': ['deepseek-coder:6.7b', 'codellama:7b', 'llama3.2:3b'],
      'general': ['mistral:7b', 'llama3.2:3b', 'phi3:3.8b'],
      'embedding': ['nomic-embed-text']
    };
    
    return taskModelMap[task] || ['llama3.2:3b'];
  }

  // Generate text with specified model
  async generateText(prompt, options = {}) {
    const {
      model = 'llama3.2:3b',
      provider = 'ollama',
      temperature = 0.7,
      maxTokens = 1000,
      stream = false
    } = options;

    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const response = await fetch(`${providerConfig.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream,
        options: {
          temperature,
          num_predict: maxTokens,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (stream) {
      return response.body;
    } else {
      const result = await response.json();
      return result.response;
    }
  }

  // Generate embeddings (if using local embedding model)
  async generateEmbeddings(text, model = 'nomic-embed-text') {
    const response = await fetch(`${this.providers.ollama.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.embedding;
  }

  // Pull new model
  async pullModel(model, provider = 'ollama') {
    const providerConfig = this.providers[provider];
    
    const response = await fetch(`${providerConfig.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model })
    });

    return response.body; // Stream for progress updates
  }

  // List available models
  async listModels(provider = 'ollama') {
    const providerConfig = this.providers[provider];
    
    const response = await fetch(`${providerConfig.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

module.exports = { LocalModelService };
