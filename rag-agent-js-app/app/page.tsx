"use client";

import { useState, useEffect } from "react";
import { Key } from "lucide-react";
import ChatInterface from "./components/ChatInterface";
import ApiKeyManager from "./components/ApiKeyManager";

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("cohere-api-key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsApiKeySet(true);
    }
  }, []);

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    setIsApiKeySet(true);
    localStorage.setItem("cohere-api-key", key);
  };

  const handleApiKeyClear = () => {
    setApiKey("");
    setIsApiKeySet(false);
    localStorage.removeItem("cohere-api-key");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - API Key Management */}
      <div className="w-80 bg-white shadow-lg border-r border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">RAG Agent Chat</h1>
          <p className="text-sm text-gray-600">Powered by Cohere & LangGraph</p>
        </div>
        
        <ApiKeyManager
          apiKey={apiKey}
          isApiKeySet={isApiKeySet}
          onSave={handleApiKeySave}
          onClear={handleApiKeyClear}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {isApiKeySet ? (
          <ChatInterface apiKey={apiKey} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">API Key Required</h2>
              <p className="text-gray-500">Please enter your Cohere API key in the sidebar to start chatting.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
