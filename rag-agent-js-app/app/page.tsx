'use client';
import React from 'react';
import ApiKeySidebar from './components/ApiKeySidebar';
import ChatInterface from './components/ChatInterface';

export default function Home() {
  return (
    <div className="flex h-screen">
      {/* Left sidebar for API key management */}
      <ApiKeySidebar />
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-100 p-4 border-b">
          <h1 className="text-xl font-bold">ReAct Agent Chatbot</h1>
          <p className="text-gray-600">Powered by LangChain, LangGraph, and Cohere</p>
        </header>
        
        <ChatInterface />
      </div>
    </div>
  );
}
