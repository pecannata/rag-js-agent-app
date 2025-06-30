'use client';

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyActive, setIsApiKeyActive] = useState<boolean>(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar for API Key Management */}
      <Sidebar 
        apiKey={apiKey}
        setApiKey={setApiKey}
        isApiKeyActive={isApiKeyActive}
        setIsApiKeyActive={setIsApiKeyActive}
      />
      
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        <ChatInterface 
          apiKey={apiKey}
          isApiKeyActive={isApiKeyActive}
        />
      </div>
    </div>
  );
}
