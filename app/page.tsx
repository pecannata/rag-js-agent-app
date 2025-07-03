'use client';

import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';

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
  const [reactConfig, setReActConfig] = useState<ReActConfig>({
    temperature: 0.7,
    domainSimilarityThreshold: 0.7,
    enableDatabaseQueries: true,
    contextKeywords: []
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
      
      {/* Main Chat Area */}
      <div className="flex-1">
        <Chat 
          apiKey={apiKey}
          isKeyValid={isKeyValid}
          messages={messages}
          setMessages={setMessages}
          sqlQuery={sqlQuery}
          reactConfig={reactConfig}
          serpApiKey={serpApiKey}
        />
      </div>
    </div>
  );
}
