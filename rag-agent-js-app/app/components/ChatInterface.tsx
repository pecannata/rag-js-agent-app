"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  apiKey: string;
}

export default function ChatInterface({ apiKey }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add welcome message on component mount
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "Hello! I'm your RAG agent powered by Cohere and LangGraph. I can help you with questions and information retrieval. What would you like to know?",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the RAG agent API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          apiKey: apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.response || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling RAG agent:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "I'm sorry, there was an error processing your request. Please check your API key and try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">RAG Agent</h2>
            <p className="text-sm text-gray-500">Intelligent Q&A with Retrieval Augmented Generation</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.type === "assistant" && (
              <div className="flex-shrink-0">
                <Bot className="w-8 h-8 text-blue-600 bg-blue-100 rounded-full p-2" />
              </div>
            )}
            
            <div className={`max-w-3xl ${
              message.type === "user" 
                ? "bg-blue-600 text-white" 
                : "bg-white text-gray-800 border border-gray-200"
            } rounded-lg p-4 shadow-sm`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-2 ${
                message.type === "user" ? "text-blue-100" : "text-gray-500"
              }`}>
                {formatTime(message.timestamp)}
              </div>
            </div>
            
            {message.type === "user" && (
              <div className="flex-shrink-0">
                <User className="w-8 h-8 text-gray-600 bg-gray-200 rounded-full p-2" />
              </div>
            )}
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <Bot className="w-8 h-8 text-blue-600 bg-blue-100 rounded-full p-2" />
            </div>
            <div className="bg-white text-gray-800 border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
