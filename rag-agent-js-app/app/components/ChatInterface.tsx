'use client';
import React, { useState } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const apiKey = localStorage.getItem('cohereApiKey');
    if (!apiKey) {
      alert('Please set your Cohere API key first');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputText,
          apiKey: apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'API request failed');
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Sorry, I encountered an error processing your request.',
        sender: 'agent',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        sender: 'agent',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-16">
            <div className="bg-white rounded-lg p-8 shadow-lg mx-auto max-w-md">
              <h3 className="text-xl font-semibold mb-2 text-gray-700">Welcome to ReAct Agent!</h3>
              <p className="text-sm">Ask me anything. I can help with calculations, weather, and general questions.</p>
              <p className="text-xs mt-4 text-gray-400">Try: "What is 25 * 4?" or "What's the weather in Paris?"</p>
            </div>
          </div>
        )}
        
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`px-6 py-4 rounded-xl shadow-lg border ${
                message.sender === 'user'
                  ? 'w-full max-w-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-300'
                  : 'w-full max-w-6xl bg-white text-gray-800 border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  message.sender === 'user'
                    ? 'bg-blue-300 text-blue-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {message.sender === 'user' ? 'U' : 'AI'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-full max-w-6xl px-6 py-4 rounded-xl shadow-lg border bg-white text-gray-800 border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-200 text-gray-600">
                  AI
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base leading-relaxed">ReAct agent is thinking...</p>
                  <div className="flex space-x-1 mt-2">
                    <div className="animate-bounce w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="animate-bounce w-2 h-2 bg-blue-500 rounded-full" style={{animationDelay: '0.1s'}}></div>
                    <div className="animate-bounce w-2 h-2 bg-blue-500 rounded-full" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
