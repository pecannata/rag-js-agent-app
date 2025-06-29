'use client';
import React, { useState, useEffect } from 'react';

const ApiKeySidebar = () => {
  const [apiKey, setApiKey] = useState('');
  const [activeKey, setActiveKey] = useState('');

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem('cohereApiKey');
    if (savedKey) {
      setActiveKey(savedKey);
    }
  }, []);

  const saveApiKey = () => {
    localStorage.setItem('cohereApiKey', apiKey);
    setActiveKey(apiKey);
    setApiKey('');
  };

  const clearApiKey = () => {
    localStorage.removeItem('cohereApiKey');
    setApiKey('');
    setActiveKey('');
  };

  return (
    <div className="p-4 border-r border-gray-200 h-full bg-gray-50" style={{ width: '300px' }}>
      <h2 className="font-bold text-lg mb-4">API Key Management</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cohere API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Cohere API Key"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button 
        onClick={saveApiKey} 
        disabled={!apiKey.trim()}
        className="w-full bg-blue-500 text-white p-2 rounded mb-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save API Key
      </button>
      
      <button 
        onClick={clearApiKey} 
        className="w-full bg-red-500 text-white p-2 rounded mb-4 hover:bg-red-600"
      >
        Clear API Key
      </button>
      
      <div className="mt-4 p-3 bg-white rounded border">
        <p className="text-sm font-medium text-gray-700 mb-2">Status:</p>
        <p className={`text-sm ${activeKey ? 'text-green-600' : 'text-red-600'}`}>
          {activeKey ? '✓ API Key Active' : '✗ No API Key Set'}
        </p>
        {activeKey && (
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {activeKey.substring(0, 8)}...{activeKey.substring(activeKey.length - 4)}
          </p>
        )}
      </div>
    </div>
  );
};

export default ApiKeySidebar;
