import { NextApiRequest, NextApiResponse } from 'next';
import { ChatCohere } from '@langchain/cohere';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { DynamicTool } from '@langchain/core/tools';

// Simple calculator tool for demonstration
const calculatorTool = new DynamicTool({
  name: 'calculator',
  description: 'Useful for doing math calculations. Input should be a mathematical expression.',
  func: async (input: string) => {
    try {
      // Simple evaluation - in production, use a safer math parser
      const result = eval(input);
      return `The result is: ${result}`;
    } catch (error) {
      return 'Error: Invalid mathematical expression';
    }
  },
});

// Weather tool for demonstration
const weatherTool = new DynamicTool({
  name: 'weather',
  description: 'Get current weather information for a location. Input should be a city name.',
  func: async (input: string) => {
    // Mock weather data - in production, integrate with real weather API
    return `The weather in ${input} is sunny with a temperature of 72°F.`;
  },
});

const tools = [calculatorTool, weatherTool];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { message, apiKey } = req.body;

  if (!apiKey || !message) {
    return res.status(400).json({ error: 'API key and message are required' });
  }

  try {
    // Initialize Cohere LLM
    const llm = new ChatCohere({
      apiKey: apiKey,
      model: 'command', // Use Cohere's command model
      temperature: 0.1,
    });

    // For now, let's try a simple response without ReAct to test the basic setup
    const result = await llm.invoke([
      {
        role: 'human',
        content: message,
      },
    ]);

    res.status(200).json({ response: result.content });
  } catch (error) {
    console.error('Error in chat API:', error);
    res.status(500).json({ 
      error: 'Error processing request with Cohere API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default handler;
