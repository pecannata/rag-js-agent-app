'use client';

import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import Snippets from './components/Snippets';
import Vectorize from './components/Vectorize';

interface ReActConfig {
  temperature: number;
  domainSimilarityThreshold: number;
  enableDatabaseQueries: boolean;
  contextKeywords: string[];
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  augmentationData?: any;
  domainAnalysis?: any;
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [serpApiKey, setSerpApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sqlQuery, setSqlQuery] = useState('select * from emp join dept on emp.deptno = dept.deptno'); // Default SQL query
  const [activeTab, setActiveTab] = useState<'chat' | 'snippets' | 'vectorize'>('chat');
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  const [reactConfig, setReActConfig] = useState<ReActConfig>({
    temperature: 0.7,
    domainSimilarityThreshold: 0.7,
    enableDatabaseQueries: true,
    contextKeywords: ['Employee']
  });

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('cohere-api-key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeyValid(true);
    }
    
    const savedSerpApiKey = localStorage.getItem('serpapi-key');
    if (savedSerpApiKey) {
      setSerpApiKey(savedSerpApiKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('cohere-api-key', key);
    setIsKeyValid(true);
  };

  const handleClearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('cohere-api-key');
    setIsKeyValid(false);
  };

  const handleSaveSerpApiKey = (key: string) => {
    setSerpApiKey(key);
    localStorage.setItem('serpapi-key', key);
  };

  const handleClearSerpApiKey = () => {
    setSerpApiKey('');
    localStorage.removeItem('serpapi-key');
  };

  const handleSelectSnippet = (snippetSqlQuery: string, snippetUserMessage: string, snippetKeywords: string[]) => {
    // Update the SQL query in sidebar
    setSqlQuery(snippetSqlQuery);
    
    // Update the ReAct config with snippet keywords
    setReActConfig(prev => ({
      ...prev,
      contextKeywords: snippetKeywords
    }));
    
    // Set the initial message for the chat input
    setInitialMessage(snippetUserMessage);
    
    // Switch to chat tab
    setActiveTab('chat');
    
    // Clear the initial message after a short delay to allow the useEffect to trigger
    setTimeout(() => setInitialMessage(undefined), 100);
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <Sidebar 
        apiKey={apiKey}
        isKeyValid={isKeyValid}
        onSaveApiKey={handleSaveApiKey}
        onClearApiKey={handleClearApiKey}
        serpApiKey={serpApiKey}
        onSerpApiKeyChange={setSerpApiKey}
        onSaveSerpApiKey={handleSaveSerpApiKey}
        onClearSerpApiKey={handleClearSerpApiKey}
        sqlQuery={sqlQuery}
        onSqlQueryChange={setSqlQuery}
        reactConfig={reactConfig}
        onReActConfigChange={setReActConfig}
      />
      
      {/* Main Area with Tabs */}
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('snippets')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'snippets'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📝 Snippets
            </button>
            <button
              onClick={() => setActiveTab('vectorize')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'vectorize'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📄 Vectorize
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'chat' ? (
            <Chat 
              apiKey={apiKey}
              isKeyValid={isKeyValid}
              messages={messages}
              setMessages={setMessages}
              sqlQuery={sqlQuery}
              reactConfig={reactConfig}
              serpApiKey={serpApiKey}
              initialMessage={initialMessage}
            />
          ) : activeTab === 'snippets' ? (
            <Snippets 
              onSelectSnippet={handleSelectSnippet}
              apiKey={apiKey}
            />
          ) : (
            <Vectorize 
              apiKey={apiKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}
