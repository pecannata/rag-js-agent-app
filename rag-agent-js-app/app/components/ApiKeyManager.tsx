"use client";

import { useState } from "react";
import { Key, Check, X, Eye, EyeOff } from "lucide-react";

interface ApiKeyManagerProps {
  apiKey: string;
  isApiKeySet: boolean;
  onSave: (key: string) => void;
  onClear: () => void;
}

export default function ApiKeyManager({ apiKey, isApiKeySet, onSave, onClear }: ApiKeyManagerProps) {
  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (inputKey.trim()) {
      onSave(inputKey.trim());
      setInputKey("");
    }
  };

  const handleClear = () => {
    onClear();
    setInputKey("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-800">API Configuration</h2>
      </div>

      {/* API Key Status */}
      <div className="p-3 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Cohere API Key</span>
          <div className="flex items-center gap-1">
            {isApiKeySet ? (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-xs">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <X className="w-4 h-4" />
                <span className="text-xs">Not Set</span>
              </div>
            )}
          </div>
        </div>
        
        {isApiKeySet && (
          <div className="flex items-center gap-2 mb-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              readOnly
              className="flex-1 text-xs bg-gray-50 border rounded px-2 py-1 font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* API Key Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter Cohere API Key
          </label>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter your Cohere API key..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!inputKey.trim()}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Save Key
          </button>
          
          {isApiKeySet && (
            <button
              onClick={handleClear}
              className="px-3 py-2 bg-red-100 text-red-600 border border-red-200 rounded-md hover:bg-red-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
        <p className="mb-1">• Get your API key from <a href="https://dashboard.cohere.ai/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Cohere Dashboard</a></p>
        <p>• API keys are stored locally in your browser</p>
      </div>
    </div>
  );
}
