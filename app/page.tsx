"use client";

import { useState } from "react";
import ApiKeyPanel from "./components/ApiKeyPanel";
import ChatInterface from "./components/ChatInterface";

export default function Home() {
  const [cohereApiKey, setCohereApiKey] = useState<string>("");

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - API Key Panel */}
      <div className="w-80 bg-white shadow-lg">
        <ApiKeyPanel 
          cohereApiKey={cohereApiKey}
          setCohereApiKey={setCohereApiKey}
        />
      </div>
      
      {/* Main Chat Interface */}
      <div className="flex-1">
        <ChatInterface cohereApiKey={cohereApiKey} />
      </div>
    </div>
  );
}
