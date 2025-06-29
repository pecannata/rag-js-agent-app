"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface ChatInterfaceProps {
  cohereApiKey: string;
  sqlContext?: string;
  userContext?: string;
}

export default function ChatInterface({ cohereApiKey, sqlContext, userContext }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDatabaseQuerying, setIsDatabaseQuerying] = useState(false);
  const [dbProgress, setDbProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !cohereApiKey) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputText.trim(),
          apiKey: cohereApiKey,
          sqlContext: sqlContext || '',
          userContext: userContext || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : "Sorry, I encountered an error processing your request. Please check your API key and try again.",
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg px-6 py-5">
        <h1 className="text-2xl font-bold text-white">RAG Agent Chatbot</h1>
        <p className="text-sm text-blue-100">
          {cohereApiKey ? "✨ Ready to chat! Powered by Cohere & LangChain" : "🔑 Please configure your API key to get started"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-gray-100">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <h3 className="text-lg font-medium mb-2">Welcome to RAG Agent!</h3>
            <p>Start a conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] px-6 py-4 rounded-xl ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                    : "bg-white border border-gray-200 text-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.text}
                </div>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-800 shadow-md max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] px-6 py-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
                <span className="text-sm text-gray-600 font-medium">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex space-x-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={cohereApiKey ? "Type your message..." : "Configure API key first"}
            disabled={!cohereApiKey || isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || !cohereApiKey || isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
