'use client';

import { useState, useEffect } from 'react';

interface ReActConfig {
  temperature: number;
  domainSimilarityThreshold: number;
  enableDatabaseQueries: boolean;
  contextKeywords: string[];
}

interface SidebarProps {
  apiKey: string;
  isKeyValid: boolean;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
  serpApiKey: string;
  onSerpApiKeyChange: (key: string) => void;
  onSaveSerpApiKey: (key: string) => void;
  onClearSerpApiKey: () => void;
  sqlQuery: string;
  onSqlQueryChange: (query: string) => void;
  reactConfig: ReActConfig;
  onReActConfigChange: (config: ReActConfig) => void;
}

export default function Sidebar({ 
  apiKey, 
  isKeyValid, 
  onSaveApiKey, 
  onClearApiKey,
  serpApiKey,
  onSerpApiKeyChange,
  onSaveSerpApiKey,
  onClearSerpApiKey,
  sqlQuery,
  onSqlQueryChange,
  reactConfig,
  onReActConfigChange
}: SidebarProps) {
  const [inputKey, setInputKey] = useState('');
  const [showReActConfig, setShowReActConfig] = useState(true);
  const [contextKeywordsText, setContextKeywordsText] = useState(
    reactConfig.contextKeywords.join(', ')
  );
  const [dbTestResult, setDbTestResult] = useState<string | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);

  // Manual keyword generation function
  const handleGenerateKeywords = async () => {
    if (!sqlQuery.trim()) {
      setDbTestResult('❌ Please enter a SQL query first');
      return;
    }
    
    if (!isKeyValid) {
      setDbTestResult('❌ Please set your API key first');
      return;
    }

    setIsGeneratingKeywords(true);
    setSuggestedKeywords([]); // Clear previous suggestions
    
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sqlQuery: sqlQuery,
          apiKey: apiKey
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.keywords) {
        setSuggestedKeywords(data.keywords);
        setDbTestResult(`🎯 Generated ${data.keywords.length} keywords from SQL`);
      } else {
        console.error('Failed to generate keywords:', data.error);
        setDbTestResult(`❌ Failed to generate keywords: ${data.error || 'Unknown error'}`);
        setSuggestedKeywords([]);
      }
    } catch (error) {
      console.error('Error generating keywords:', error);
      setDbTestResult(`❌ Keyword generation failed: ${(error as Error).message}`);
      setSuggestedKeywords([]);
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  // Handle accepting suggested keywords
  const handleAcceptSuggestedKeywords = () => {
    const combinedKeywords = [
      ...reactConfig.contextKeywords,
      ...suggestedKeywords.filter(k => !reactConfig.contextKeywords.includes(k))
    ];
    
    setContextKeywordsText(combinedKeywords.join(', '));
    onReActConfigChange({
      ...reactConfig,
      contextKeywords: combinedKeywords
    });
    setSuggestedKeywords([]); // Clear suggestions after accepting
  };

  // Handle rejecting suggested keywords
  const handleRejectSuggestedKeywords = () => {
    setSuggestedKeywords([]);
  };

  const handleSave = () => {
    if (inputKey.trim()) {
      onSaveApiKey(inputKey.trim());
      setInputKey('');
    }
  };

  const handleClear = () => {
    onClearApiKey();
    setInputKey('');
  };

  const handleContextKeywordsChange = (value: string) => {
    setContextKeywordsText(value);
    const keywords = value.split(',').map(k => k.trim()).filter(k => k);
    onReActConfigChange({
      ...reactConfig,
      contextKeywords: keywords
    });
  };

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    
    try {
      const response = await fetch('/api/database', {
        method: 'GET'
      });
      
      const data = await response.json();
      
      if (data.success && data.connectionTest) {
        setDbTestResult('✅ Database connection successful!');
      } else {
        setDbTestResult(`❌ Database connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setDbTestResult(`❌ Database test failed: ${(error as Error).message}`);
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleDirectQuery = async () => {
    if (!sqlQuery.trim()) {
      setDbTestResult('❌ Please enter a SQL query first');
      return;
    }
    
    setIsTestingDb(true);
    setDbTestResult(null);
    
    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sqlQuery: sqlQuery,
          forceExecute: true // Bypass domain checking for direct queries
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.executed) {
        setDbTestResult(`✅ Query executed successfully! Data preview: ${JSON.stringify(data.data).substring(0, 200)}...`);
      } else {
        setDbTestResult(`❌ Query failed: ${data.error || data.reason || 'Unknown error'}`);
      }
    } catch (error) {
      setDbTestResult(`❌ Query execution failed: ${(error as Error).message}`);
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleDomainTest = async () => {
    if (!apiKey) {
      setDbTestResult('❌ Please set your API key first');
      return;
    }
    
    if (!sqlQuery.trim()) {
      setDbTestResult('❌ Please enter a SQL query first');
      return;
    }
    
    setIsTestingDb(true);
    setDbTestResult(null);
    
    // Test with a sample message to see domain checking in action
    const testMessage = "How many employees are there?";
    
    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sqlQuery: sqlQuery,
          apiKey: apiKey,
          userMessage: testMessage,
          config: reactConfig,
          forceExecute: false // Use domain checking
        })
      });
      
      const data = await response.json();
      
      if (data.executed) {
        setDbTestResult(`✅ Domain check PASSED - Query executed\nMessage: "${testMessage}"\nReasoning: ${data.domainAnalysis?.reasoning}\nConfidence: ${data.domainAnalysis?.confidence}`);
      } else {
        setDbTestResult(`❌ Domain check FAILED - Query not executed\nMessage: "${testMessage}"\nReasoning: ${data.domainAnalysis?.reasoning || data.reason}\nConfidence: ${data.domainAnalysis?.confidence || 'N/A'}`);
      }
    } catch (error) {
      setDbTestResult(`❌ Domain test failed: ${(error as Error).message}`);
    } finally {
      setIsTestingDb(false);
    }
  };

  return (
    <div className="w-80 bg-gray-100 p-6 border-r border-gray-300">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={!inputKey.trim()}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={handleClear}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* API Key Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isKeyValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium text-gray-700">
            API Key Status: {isKeyValid ? 'Active' : 'Not Set'}
          </span>
        </div>
        {apiKey && (
          <div className="mt-2 text-xs text-gray-600">
            Key: ...{apiKey.slice(-8)}
          </div>
        )}
      </div>

      {/* SerpAPI Key Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SerpAPI Key (Optional - for current population data)
        </label>
        <input
          type="password"
          value={serpApiKey}
          onChange={(e) => onSerpApiKeyChange(e.target.value)}
          placeholder="Enter your SerpAPI key (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSaveSerpApiKey(serpApiKey)}
            disabled={!serpApiKey.trim()}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={onClearSerpApiKey}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            Clear
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Used for real-time population data. Get your key at serpapi.com
        </div>
        {serpApiKey && (
          <div className="mt-2 text-xs text-gray-600">
            SerpAPI Key: ...{serpApiKey.slice(-8)}
          </div>
        )}
      </div>

      {/* SQL Query Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SQL Query
        </label>
        <textarea
          value={sqlQuery}
          onChange={(e) => onSqlQueryChange(e.target.value)}
          placeholder="select * from emp"
          className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-indigo-50 text-indigo-900 placeholder-indigo-400 font-mono text-sm"
          rows={3}
        />
        
        {/* Database Testing Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={handleTestDatabase}
            disabled={isTestingDb || isGeneratingKeywords}
            className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isTestingDb ? 'Testing...' : 'Test DB'}
          </button>
          <button
            onClick={handleDirectQuery}
            disabled={isTestingDb || isGeneratingKeywords || !sqlQuery.trim()}
            className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isTestingDb ? 'Executing...' : 'Run Query'}
          </button>
          <button
            onClick={handleGenerateKeywords}
            disabled={isTestingDb || isGeneratingKeywords || !sqlQuery.trim() || !isKeyValid}
            className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isGeneratingKeywords ? '🧠 Analyzing...' : '🧠 Keywords'}
          </button>
          <button
            onClick={handleDomainTest}
            disabled={isTestingDb || isGeneratingKeywords || !sqlQuery.trim() || !isKeyValid}
            className="bg-orange-500 text-white px-3 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isTestingDb ? 'Testing...' : 'ReAct Test'}
          </button>
        </div>
        
        {/* Database Test Result Display */}
        {dbTestResult && (
          <div className="mt-3 p-3 border rounded-md bg-gray-50">
            <div className="text-xs text-gray-700 whitespace-pre-wrap">
              {dbTestResult}
            </div>
          </div>
        )}

        {/* Suggested Keywords from SQL */}
        {isGeneratingKeywords && (
          <div className="mt-3 p-3 border border-yellow-300 rounded-md bg-yellow-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-yellow-700">Analyzing SQL for keywords...</span>
            </div>
          </div>
        )}

        {suggestedKeywords.length > 0 && (
          <div className="mt-3 p-3 border border-blue-300 rounded-md bg-blue-50">
            <div className="text-sm font-medium text-blue-800 mb-2">🧠 Suggested Keywords from SQL:</div>
            <div className="text-sm text-blue-700 mb-3">
              <strong>Keywords:</strong> {suggestedKeywords.join(', ')}
            </div>
            <div className="text-xs text-blue-600 mb-3">
              Should these keywords be added to your Context Keywords?
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAcceptSuggestedKeywords}
                className="flex-1 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
              >
                ✅ Add Keywords
              </button>
              <button
                onClick={handleRejectSuggestedKeywords}
                className="flex-1 bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ReAct Configuration Accordion */}
      <div className="mb-6">
        <button
          onClick={() => setShowReActConfig(!showReActConfig)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100"
        >
          <span className="font-medium text-gray-700">ReAct Configuration</span>
          <span className={`transform transition-transform ${showReActConfig ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        {showReActConfig && (
          <div className="mt-3 p-4 border border-gray-300 rounded-md bg-white space-y-4">
            {/* Context Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context Keywords (comma-separated)
              </label>
              <textarea
                value={contextKeywordsText}
                onChange={(e) => handleContextKeywordsChange(e.target.value)}
                placeholder="Employee"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none overflow-y-auto"
                rows={4}
                style={{ maxHeight: '120px' }}
              />
            </div>
            
            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {reactConfig.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={reactConfig.temperature}
                onChange={(e) => onReActConfigChange({
                  ...reactConfig,
                  temperature: parseFloat(e.target.value)
                })}
                className="w-full"
              />
            </div>
            
            {/* Domain Similarity Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain Similarity Threshold: {reactConfig.domainSimilarityThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={reactConfig.domainSimilarityThreshold}
                onChange={(e) => onReActConfigChange({
                  ...reactConfig,
                  domainSimilarityThreshold: parseFloat(e.target.value)
                })}
                className="w-full"
              />
            </div>
            
            {/* Enable Database Queries */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reactConfig.enableDatabaseQueries}
                  onChange={(e) => onReActConfigChange({
                    ...reactConfig,
                    enableDatabaseQueries: e.target.checked
                  })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Database Queries
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Configure your Cohere API key</li>
          <li>Set SQL query for database context</li>
          <li>Adjust ReAct configuration as needed</li>
          <li>Database queries execute only with domain alignment</li>
        </ul>
      </div>
    </div>
  );
}
