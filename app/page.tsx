'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [serpApiKey, setSerpApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sqlQuery, setSqlQuery] = useState('select * from emp join dept on emp.deptno = dept.deptno'); // Default SQL query
  const [activeTab, setActiveTab] = useState<'chat' | 'snippets' | 'vectorize'>('chat');
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<'cohere' | 'ollama'>('cohere');
  const [reactConfig, setReActConfig] = useState<ReActConfig>({
    temperature: 0.7,
    domainSimilarityThreshold: 0.7,
    enableDatabaseQueries: true,
    contextKeywords: ['Employee']
  });

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Load API keys and provider from localStorage on mount
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
    
    const savedProvider = localStorage.getItem('ai-provider') as 'cohere' | 'ollama';
    if (savedProvider) {
      setProvider(savedProvider);
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

  const handleProviderChange = (newProvider: 'cohere' | 'ollama') => {
    setProvider(newProvider);
    localStorage.setItem('ai-provider', newProvider);
    // Clear messages when switching providers to avoid confusion
    setMessages([]);
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

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Agentic RAG Chat</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {session.user?.email}
            </span>
            {session.user?.email === 'phil.cannata@yahoo.com' && (
              <button
                onClick={() => router.push('/admin/users')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
              >
                Manage Users
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-full">
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
        {/* Provider Indicator */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">AI Provider:</span>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                provider === 'cohere' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  provider === 'cohere' ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
                <span>
                  {provider === 'cohere' ? '☁️ Cohere (Cloud)' : '🖥️ Ollama (Local)'}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {provider === 'cohere' 
                ? 'Using cloud-based AI with your API key'
                : 'Using local Llama 3.1 8B model'
              }
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-8 py-4 text-lg font-semibold border-b-3 transition-all duration-200 transform hover:scale-105 ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600 bg-gradient-to-t from-blue-50 to-blue-25 shadow-md'
                  : 'border-transparent text-gray-600 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-25'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <span className="font-bold">Chat</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('snippets')}
              className={`px-8 py-4 text-lg font-semibold border-b-3 transition-all duration-200 transform hover:scale-105 ${
                activeTab === 'snippets'
                  ? 'border-green-500 text-green-600 bg-gradient-to-t from-green-50 to-green-25 shadow-md'
                  : 'border-transparent text-gray-600 hover:text-green-500 hover:border-green-300 hover:bg-green-25'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <span className="font-bold">Snippets</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('vectorize')}
              className={`px-8 py-4 text-lg font-semibold border-b-3 transition-all duration-200 transform hover:scale-105 ${
                activeTab === 'vectorize'
                  ? 'border-purple-500 text-purple-600 bg-gradient-to-t from-purple-50 to-purple-25 shadow-md'
                  : 'border-transparent text-gray-600 hover:text-purple-500 hover:border-purple-300 hover:bg-purple-25'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <span className="font-bold">Vectorize</span>
              </span>
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
              provider={provider}
              onProviderChange={handleProviderChange}
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
    </div>
  );
}
