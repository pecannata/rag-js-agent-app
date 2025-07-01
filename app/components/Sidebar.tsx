'use client';

import { useEffect, useState } from 'react';

interface SidebarProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  isApiKeyActive: boolean;
  setIsApiKeyActive: (active: boolean) => void;
  onDatabaseQuery: (context: string, query: string) => Promise<string>;
}

export default function Sidebar({ apiKey, setApiKey, isApiKeyActive, setIsApiKeyActive, onDatabaseQuery }: SidebarProps) {
  const [inputKey, setInputKey] = useState<string>('');
  
  // Database ReAct state
  const [databaseContext, setDatabaseContext] = useState<string>('Employee data');
  const [sqlQuery, setSqlQuery] = useState<string>('select * from emp');
  const [isDatabaseLoading, setIsDatabaseLoading] = useState<boolean>(false);
  const [reactDecision, setReactDecision] = useState<string>('');

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem('cohere-api-key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsApiKeyActive(true);
    }
  }, [setApiKey, setIsApiKeyActive]);

  // Save API key to localStorage and set as active
  const saveApiKey = () => {
    if (inputKey.trim()) {
      localStorage.setItem('cohere-api-key', inputKey);
      setApiKey(inputKey);
      setIsApiKeyActive(true);
      setInputKey('');
    }
  };

  // Clear API key from localStorage and state
  const clearApiKey = () => {
    localStorage.removeItem('cohere-api-key');
    setApiKey('');
    setIsApiKeyActive(false);
    setInputKey('');
  };

  // Handle database query execution
  const handleDatabaseQuery = async () => {
    if (!isApiKeyActive || isDatabaseLoading) return;
    
    setIsDatabaseLoading(true);
    setReactDecision(''); // Clear previous decision
    try {
      const decision = await onDatabaseQuery(databaseContext, sqlQuery);
      setReactDecision(decision);
    } finally {
      setIsDatabaseLoading(false);
    }
  };

  return (
    <div className="w-80 bg-white shadow-lg p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-6 text-gray-800">API Configuration</h2>
      
      {/* API Key Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cohere API Key
        </label>
        <input
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder="Enter your Cohere API key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={saveApiKey}
            disabled={!inputKey.trim()}
            className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            Save
          </button>
          <button
            onClick={clearApiKey}
            className="flex-1 bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* API Key Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${isApiKeyActive ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm font-medium">
            API Key: {isApiKeyActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {isApiKeyActive && (
          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
            Key: {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
          </div>
        )}
      </div>

      {/* Database ReAct Section */}
      <div className="mb-6 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Database ReAct Agent</h3>
        
        {/* Context for ReAct Decision */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Context for ReAct Decision
          </label>
          <input
            type="text"
            value={databaseContext}
            onChange={(e) => setDatabaseContext(e.target.value)}
            placeholder="Enter context for decision making"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        
        {/* SQL Query */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SQL Query
          </label>
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            placeholder="Enter your SQL query"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
        </div>
        
        {/* Execute Button */}
        <button
          onClick={handleDatabaseQuery}
          disabled={!isApiKeyActive || isDatabaseLoading || !sqlQuery.trim()}
          className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
        >
          {isDatabaseLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            'Execute with ReAct'
          )}
        </button>
        
        {/* ReAct Decision Display */}
        {reactDecision && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">ReAct Decision:</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{reactDecision}</pre>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="mt-auto pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">RAG Agent Chatbot</h3>
        <p className="text-xs text-gray-500">
          Powered by LangChain, LangGraph, and Cohere with Oracle Database
        </p>
      </div>
    </div>
  );
}
