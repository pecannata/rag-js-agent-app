'use client';

import { useState } from 'react';
import DataTable from './DataTable';
import MarkdownTable from './MarkdownTable';

interface Message {
  role: 'user' | 'ai';
  content: string;
  augmentationData?: any;
  domainAnalysis?: any;
}

interface ReActConfig {
  temperature: number;
  domainSimilarityThreshold: number;
  enableDatabaseQueries: boolean;
  contextKeywords: string[];
}

interface ChatProps {
  apiKey: string;
  isKeyValid: boolean;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  sqlQuery: string;
  reactConfig: ReActConfig;
  serpApiKey: string;
}

export default function Chat({ apiKey, isKeyValid, messages, setMessages, sqlQuery, reactConfig, serpApiKey }: ChatProps) {
  const [input, setInput] = useState('Find the manager of each employee and tell me the department name of the manager and the location of the manager including the location\'s state (in a separate column) and the current population of the state (in a separate column) and the surrounding states.'); // Default message
  const [isLoading, setIsLoading] = useState(false);
  const [expandedAugmentation, setExpandedAugmentation] = useState<{ [key: number]: boolean }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isKeyValid || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          apiKey: apiKey,
          history: messages,
          sqlQuery: sqlQuery,
          config: reactConfig,
          serpApiKey: serpApiKey
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const aiMessage: Message = { 
        role: 'ai', 
        content: data.response,
        augmentationData: data.augmentationData,
        domainAnalysis: data.domainAnalysis
      };
      setMessages([...newMessages, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = { 
        role: 'ai', 
        content: 'Sorry, I encountered an error processing your request. Please check your API key and try again.' 
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Agentic RAG Chat</h1>
        <button
          onClick={handleClearChat}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isKeyValid && (
          <div className="text-center text-gray-500 py-8">
            Please configure your Cohere API key in the sidebar to start chatting.
          </div>
        )}
        
        {messages.length === 0 && isKeyValid && (
          <div className="text-center text-gray-500 py-8">
            Welcome! Start a conversation by typing a message below.
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className="w-full">
            {message.role === 'user' ? (
              <div className="bg-blue-100 p-4 rounded-lg">
                <div className="font-semibold text-blue-800 mb-2">User:</div>
                <div className="text-gray-800 whitespace-pre-wrap">{message.content}</div>
              </div>
            ) : (
              <div className="bg-green-100 p-4 rounded-lg">
                <div className="font-semibold text-green-800 mb-2">AI:</div>
                <div className="text-gray-800">
                  <MarkdownTable content={message.content} />
                </div>
                
                {/* Augmentation Data - Smart Display */}
                {message.augmentationData && (
                  <DataTable 
                    data={message.augmentationData} 
                    title="Database Results"
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="bg-green-100 p-4 rounded-lg">
            <div className="font-semibold text-green-800 mb-2">AI:</div>
            <div className="text-gray-600">Thinking...</div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isKeyValid ? "Ask me anything..." : "Configure API key first"}
            disabled={!isKeyValid || isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none overflow-y-auto"
            rows={4}
            style={{ minHeight: '100px', maxHeight: '200px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || !isKeyValid || isLoading}
            className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed h-fit"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
