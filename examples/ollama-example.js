/**
 * Example usage of the Ollama client
 * Run with: node examples/ollama-example.js
 */

const OllamaClient = require('../lib/ollama-client');

async function main() {
  const client = new OllamaClient();

  try {
    // Check if Ollama is available
    const isAvailable = await client.isAvailable();
    console.log('Ollama service available:', isAvailable);

    if (!isAvailable) {
      console.log('Make sure Ollama is running: brew services start ollama');
      return;
    }

    // Get available models
    const models = await client.getModels();
    console.log('Available models:', models.map(m => m.name));

    // Simple chat
    console.log('\n--- Simple Chat ---');
    const response = await client.chat('What is the capital of France?');
    console.log('Response:', response);

    // Chat with custom options
    console.log('\n--- Chat with Custom Options ---');
    const creativeResponse = await client.chat(
      'Write a short poem about programming',
      'llama3.2:3b',
      { temperature: 0.9 }
    );
    console.log('Creative Response:', creativeResponse);

    // Streaming chat
    console.log('\n--- Streaming Chat ---');
    console.log('Streaming response: ');
    await client.chatStream(
      'Tell me a joke',
      'llama3.2:3b',
      (chunk) => {
        process.stdout.write(chunk);
      }
    );
    console.log('\n--- End of stream ---');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
