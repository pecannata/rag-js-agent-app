'use client';

export default function DevAuthHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Agentic RAG Chat
          </h1>
          <p className="text-sm text-orange-600 font-medium">
            🚧 Development Mode - Authentication Disabled
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-orange-600">
            <span className="bg-orange-100 px-2 py-1 rounded text-xs">
              Setup Clerk to enable authentication
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
