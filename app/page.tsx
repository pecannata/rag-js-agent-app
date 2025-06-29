"use client";

import { useState } from "react";
import ApiKeyPanel from "./components/ApiKeyPanel";
import ChatInterface from "./components/ChatInterface";
import OracleReActTool from "./components/OracleReActTool";

export default function Home() {
  const [cohereApiKey, setCohereApiKey] = useState<string>("");
  const [sqlContext, setSqlContext] = useState<string>("");
  const [userContext, setUserContext] = useState<string>("");

  const handleSqlResult = (result: string) => {
    setSqlContext(result);
  };

  const handleUserContext = (context: string) => {
    setUserContext(context);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - API Key Panel */}
      <div className="w-80 bg-white shadow-lg">
        <ApiKeyPanel 
          cohereApiKey={cohereApiKey}
          setCohereApiKey={setCohereApiKey}
        />
      </div>
      
      {/* Right of Sidebar - Oracle ReAct Tool */}
      <div className="w-96 bg-gray-50 border-l border-r border-gray-300 overflow-y-auto">
        <div className="p-4">
          <OracleReActTool 
            cohereApiKey={cohereApiKey}
            onSqlResult={handleSqlResult}
            onUserContext={handleUserContext}
          />
        </div>
      </div>
      
      {/* Main Chat Interface */}
      <div className="flex-1">
        <ChatInterface cohereApiKey={cohereApiKey} sqlContext={sqlContext} userContext={userContext} />
      </div>
    </div>
  );
}
