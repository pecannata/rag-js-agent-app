'use client';

import { useState, useEffect, useRef } from 'react';

interface MessageHistoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
}

interface HistoryEntry {
  message: string;
  timestamp?: string;
  usageCount?: number;
}

export default function MessageHistoryInput({
  value,
  onChange,
  placeholder = "Enter your message",
  label = "Message",
  disabled = false,
  className = "",
  labelClassName = "text-gray-700",
  inputClassName = ""
}: MessageHistoryInputProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load history on component mount to show if there are items
  useEffect(() => {
    loadHistoryQuietly();
  }, []);

  // Load history quietly (without showing loading states)
  const loadHistoryQuietly = async () => {
    try {
      const response = await fetch('/api/message-history');
      const result = await response.json();
      if (result.success) {
        setHistory(result.history || []);
      }
    } catch (err) {
      // Fail silently for initial load
      console.warn('Could not load history on mount:', err);
    }
  };

  // Load history from the API
  const loadHistory = async () => {
    console.log('📡 Starting to load history from API...');
    setIsLoadingHistory(true);
    setError(null);
    try {
      const response = await fetch('/api/message-history');
      const result = await response.json();
      console.log('📬 API response:', result);
      
      if (result.success) {
        console.log('✅ History loaded successfully:', result.history?.length || 0, 'items');
        setHistory(result.history || []);
      } else {
        setError('Failed to load history');
        console.error('Failed to load message history:', result.error);
      }
    } catch (err) {
      setError('Failed to load history');
      console.error('Error loading message history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Save message to history
  const saveToHistory = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      const response = await fetch('/api/message-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });
      
      const result = await response.json();
      if (!result.success) {
        console.error('Failed to save message to history:', result.error);
      }
    } catch (err) {
      console.error('Error saving message to history:', err);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Handle input blur - save to history
  const handleInputBlur = () => {
    if (value.trim()) {
      saveToHistory(value);
    }
  };

  // Handle history item selection
  const selectHistoryItem = (message: string) => {
    onChange(message);
    setShowHistory(false);
    saveToHistory(message); // Update usage count
    inputRef.current?.focus();
  };

  // Handle history button click
  const toggleHistory = () => {
    console.log('🔍 History button clicked, current state:', showHistory);
    if (!showHistory) {
      console.log('📖 Loading history...');
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  // Close history when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        historyRef.current &&
        !historyRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory]);

  return (
    <div className={`relative ${className}`}>
      <label className={`block text-sm font-medium mb-1 ${labelClassName}`}>
        {label}:
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 ${inputClassName}`}
        />
        
        {/* History Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleHistory}
          disabled={disabled}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 text-xs font-medium transition-colors bg-blue-600 text-white rounded border shadow-md hover:bg-blue-700 disabled:text-gray-300 disabled:bg-gray-200`}
          title={history.length > 0 ? `Show message history (${history.length} items)` : "Show message history"}
        >
          <div className="flex items-center gap-1">
            History
            {history.length > 0 && (
              <span className="bg-blue-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* History Popup */}
      {showHistory && (
        <div
          ref={historyRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Message History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {isLoadingHistory && (
            <div className="px-3 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                Loading history...
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoadingHistory && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={loadHistory}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* History Items */}
          {!isLoadingHistory && !error && (
            <>
              {history.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No message history found
                </div>
              ) : (
                <div className="py-1">
                  {history.map((message, index) => (
                    <button
                      key={index}
                      onClick={() => selectHistoryItem(message)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0"
                      title={`Click to use: ${message}`}
                    >
                      <div className="truncate">
                        {message}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Clear History Option */}
              {history.length > 0 && (
                <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to clear all message history?')) {
                        try {
                          const response = await fetch('/api/message-history', {
                            method: 'DELETE'
                          });
                          const result = await response.json();
                          if (result.success) {
                            setHistory([]);
                            setShowHistory(false);
                          }
                        } catch (err) {
                          console.error('Error clearing history:', err);
                        }
                      }
                    }}
                    className="w-full text-xs text-red-600 hover:text-red-800 text-center py-1 hover:bg-red-50 rounded transition-colors"
                  >
                    Clear All History
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
