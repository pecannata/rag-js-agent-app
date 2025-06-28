"use client";

import { useState, useEffect } from "react";

interface ApiKeyPanelProps {
  cohereApiKey: string;
  setCohereApiKey: (key: string) => void;
}

export default function ApiKeyPanel({ cohereApiKey, setCohereApiKey }: ApiKeyPanelProps) {
  const [tempKey, setTempKey] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem("cohereApiKey");
    if (savedKey) {
      setCohereApiKey(savedKey);
      setIsActive(true);
    }
  }, [setCohereApiKey]);

  const handleSave = () => {
    if (tempKey.trim()) {
      localStorage.setItem("cohereApiKey", tempKey.trim());
      setCohereApiKey(tempKey.trim());
      setIsActive(true);
      setTempKey("");
    }
  };

  const handleClear = () => {
    localStorage.removeItem("cohereApiKey");
    setCohereApiKey("");
    setIsActive(false);
    setTempKey("");
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + "..." + key.substring(key.length - 4);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-6 text-gray-800">API Configuration</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cohere API Key
          </label>
          
          {isActive && cohereApiKey ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-700 font-medium">Active</span>
                </div>
                <div className="text-sm text-gray-600 mt-1 font-mono">
                  {maskApiKey(cohereApiKey)}
                </div>
              </div>
              
              <button
                onClick={handleClear}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Clear API Key
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Enter your Cohere API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <button
                onClick={handleSave}
                disabled={!tempKey.trim()}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Save API Key
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Get your API key from Cohere Dashboard</li>
          <li>• Keys are stored locally in your browser</li>
          <li>• Clear the key to enter a new one</li>
        </ul>
      </div>
    </div>
  );
}
