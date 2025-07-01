'use client';

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

interface DatabaseQuery {
  context: string;
  query: string;
  timestamp: number;
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyActive, setIsApiKeyActive] = useState<boolean>(false);
  const [databaseQuery, setDatabaseQuery] = useState<DatabaseQuery | null>(null);

  // Handle database query from sidebar - only get ReAct decision, don't execute
  const handleDatabaseQuery = async (context: string, query: string): Promise<string> => {
    if (!isApiKeyActive) return 'API key not configured';
    
    try {
      // Get the current user message from chat input
      const chatInput = document.querySelector('textarea')?.value || 'How many employees are there?';
      
      // Call API for ReAct decision only
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          apiKey: apiKey,
          type: 'react-only',
          databaseContext: context,
          sqlQuery: query
        }),
      });
      
      const data = await response.json();
      return data.reactProcess || 'ReAct decision not available';
    } catch (error) {
      return 'Error getting ReAct decision: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar for API Key Management */}
      <Sidebar 
        apiKey={apiKey}
        setApiKey={setApiKey}
        isApiKeyActive={isApiKeyActive}
        setIsApiKeyActive={setIsApiKeyActive}
        onDatabaseQuery={handleDatabaseQuery}
      />
      
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        <ChatInterface 
          apiKey={apiKey}
          isApiKeyActive={isApiKeyActive}
          databaseQuery={databaseQuery}
          onDatabaseQueryProcessed={() => setDatabaseQuery(null)}
        />
      </div>
    </div>
  );
}
