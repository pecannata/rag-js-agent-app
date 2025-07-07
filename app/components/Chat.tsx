'use client';

import { useState, useEffect, useRef } from 'react';
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
  initialMessage?: string;
  provider?: 'cohere' | 'ollama';
  onProviderChange?: (provider: 'cohere' | 'ollama') => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export default function Chat({ apiKey, isKeyValid, messages, setMessages, sqlQuery, reactConfig, serpApiKey, initialMessage, provider = 'cohere', onProviderChange, selectedModel, onModelChange }: ChatProps) {
  const [input, setInput] = useState('How many employees did you find? And find the manager of each employee and tell me the department name of the manager and the location of the manager including the location\'s state (in a separate column) and the current population of the state (in a separate column) and the surrounding states. Even if values are null, please put each employee, manager, department, state, population, and a list of surrounding states in one table at the end of your analysis.'); // Default message
  const [isLoading, setIsLoading] = useState(false);
  const [_expandedAugmentation, _setExpandedAugmentation] = useState<number | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; message: string; models?: any[] } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update input when initialMessage changes
  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage);
    }
  }, [initialMessage]);

  // Check Ollama status when provider changes to Ollama
  useEffect(() => {
    if (provider === 'ollama') {
      checkOllamaStatus();
    }
  }, [provider]);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch('/api/ollama/status');
      const status = await response.json();
      setOllamaStatus(status);
    } catch (error) {
      console.error('Error checking Ollama status:', error);
      setOllamaStatus({
        available: false,
        message: 'Error checking Ollama status'
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // For Ollama, we don't need a valid API key but need service to be available
    if (provider === 'cohere' && !isKeyValid) return;
    if (provider === 'ollama' && !ollamaStatus?.available) {
      alert('Ollama service is not available. Please ensure Ollama is running.');
      return;
    }

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
          serpApiKey: serpApiKey,
          provider: provider,
          selectedModel: selectedModel
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
      const errorText = (error as Error).message;
      let errorMessage: Message;
      
      if (errorText.includes('Ollama service is not available in this deployment environment')) {
        errorMessage = { 
          role: 'ai', 
          content: '🚨 Ollama is not available in this deployment environment. Please switch to Cohere provider using the dropdown above, or contact your administrator if you need local AI capabilities.' 
        };
      } else {
        errorMessage = { 
          role: 'ai', 
          content: 'Sorry, I encountered an error processing your request. Please check your settings and try again.' 
        };
      }
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Agentic RAG Chat</h1>
        <div className="flex items-center gap-4">
          {/* Provider Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">AI Provider:</label>
            <select
              value={provider}
              onChange={(e) => onProviderChange?.(e.target.value as 'cohere' | 'ollama')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cohere">Cohere (Cloud)</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          
          {/* Model Selector - Only shown for Ollama */}
          {provider === 'ollama' && ollamaStatus?.available && ollamaStatus.models && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Model:</label>
              <select
                value={selectedModel || 'qwen2.5:14b'}
                onChange={(e) => onModelChange?.(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ollamaStatus.models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} ({typeof model.size === 'string' ? model.size : (model.size / 1024**3).toFixed(1) + 'GB'})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={handleClearChat}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {provider === 'cohere' && !isKeyValid && (
          <div className="text-center text-gray-500 py-8">
            Please configure your Cohere API key in the sidebar to start chatting.
          </div>
        )}
        
        {provider === 'ollama' && (
          <div className={`text-center py-2 text-sm rounded-lg ${
            ollamaStatus?.available 
              ? 'text-green-600 bg-green-50' 
              : 'text-red-600 bg-red-50'
          }`}>
            {ollamaStatus?.available 
              ? `✅ Ollama ready (${ollamaStatus.models?.length || 0} models available)` 
              : `❌ ${ollamaStatus?.message || 'Checking Ollama status...'}`}
            {ollamaStatus?.available && selectedModel && (
              <div className="text-xs text-green-500 mt-1">Using {selectedModel}</div>
            )}
          </div>
        )}
        
        {messages.length === 0 && (provider === 'ollama' || isKeyValid) && (
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
        
        {/* Scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              provider === 'ollama' ? "Ask me anything... (using local Ollama)" :
              isKeyValid ? "Ask me anything..." : "Configure API key first"
            }
            disabled={(provider === 'cohere' && !isKeyValid) || (provider === 'ollama' && !ollamaStatus?.available) || isLoading}
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
            disabled={!input.trim() || (provider === 'cohere' && !isKeyValid) || (provider === 'ollama' && !ollamaStatus?.available) || isLoading}
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
