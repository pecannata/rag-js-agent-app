'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'database';
  content: string;
  timestamp: Date;
  databaseExecuted?: boolean;
  jsonData?: any;
  debugInfo?: {
    promptContext?: string;
    empnoCount?: number;
    uniqueEmpnos?: number[];
  };
}

interface DatabaseQuery {
  context: string;
  query: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  apiKey: string;
  isApiKeyActive: boolean;
  databaseQuery: DatabaseQuery | null;
  onDatabaseQueryProcessed: () => void;
}

export default function ChatInterface({ apiKey, isApiKeyActive, databaseQuery, onDatabaseQueryProcessed }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState<string>('How many employees are there?');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDatabaseLoading, setIsDatabaseLoading] = useState<boolean>(false);
    const lastProcessedQueryRef = useRef<number | null>(null);

  // Send message to the RAG agent
  const sendMessage = async () => {
    if (!inputMessage.trim() || !isApiKeyActive || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the API route for agent processing
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          apiKey: apiKey,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
        debugInfo: data.debugInfo
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat history
  const clearChat = () => {
    setMessages([]);
  };

  // Handle database query execution
  const handleDatabaseQuery = async (context: string, query: string, userQuery: string) => {
    if (!isApiKeyActive || isDatabaseLoading) return;

    setIsDatabaseLoading(true);
    
    // Add user query message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userQuery,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call the API route for database processing
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userQuery,
          apiKey: apiKey,
          type: 'database',
          databaseContext: context,
          sqlQuery: query
        }),
      });

      const data = await response.json();

      const databaseMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'database',
        content: data.reactProcess || 'ReAct decision process not available',
        timestamp: new Date(),
        databaseExecuted: data.databaseExecuted,
        jsonData: null // Don't show JSON data for ReAct decisions
      };

      setMessages(prev => [...prev, databaseMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'database',
        content: 'Sorry, I encountered an error processing your database query.',
        timestamp: new Date(),
        databaseExecuted: false
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsDatabaseLoading(false);
  };

  // Handle incoming database queries from props
  useEffect(() => {
    if (databaseQuery && databaseQuery.timestamp !== lastProcessedQueryRef.current) {
      lastProcessedQueryRef.current = databaseQuery.timestamp;
      handleDatabaseQuery(databaseQuery.context, databaseQuery.query, inputMessage);
      onDatabaseQueryProcessed();
    }
  }, [databaseQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">RAG Agent Chat</h1>
        <button
          onClick={clearChat}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">Welcome to RAG Agent Chat!</p>
            <p className="text-sm">
              {isApiKeyActive 
                ? "Start a conversation by typing a message below." 
                : "Please configure your Cohere API key in the sidebar to get started."}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`w-full max-w-4xl px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'database'
                    ? 'bg-green-50 border border-green-300 text-gray-800'
                    : 'bg-white border border-gray-300 text-gray-800'
                }`}
              >
                {/* Database execution status */}
                {message.type === 'database' && (
                  <div className="mb-2 flex items-center gap-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        message.databaseExecuted ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs font-medium">
                      {message.databaseExecuted 
                        ? 'Database query executed successfully' 
                        : 'Database query was not run'
                      }
                    </span>
                  </div>
                )}
                
                <pre className="text-sm whitespace-pre-wrap font-mono">{message.content}</pre>
                
                {/* Debug Information Display */}
                {message.debugInfo && message.debugInfo.promptContext && (
                  <div className="mt-3 pt-3 border-t border-yellow-200 bg-yellow-50 -mx-4 -mb-2 p-4">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-yellow-800 mb-2">🔍 Debug Info - LLM Prompt Context</summary>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-yellow-700 mb-1">Exact Context Sent to LLM:</p>
                        <pre className="text-xs bg-white p-2 rounded border max-h-64 overflow-y-auto">
                          {message.debugInfo.promptContext}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
                
                {/* JSON Data Display */}
                {message.jsonData && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">Query Results (JSON):</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(message.jsonData, null, 2)}
                    </pre>
                  </div>
                )}
                
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-300 text-gray-800 w-full max-w-4xl px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isApiKeyActive ? "Type your message..." : "Configure API key to start chatting"}
            disabled={!isApiKeyActive || isLoading}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !isApiKeyActive || isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
