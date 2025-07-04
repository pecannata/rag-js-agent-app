'use client';

import { useState, useRef } from 'react';

interface VectorizeProps {
  apiKey: string;
}

export default function Vectorize({ }: VectorizeProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select a PDF file');
        setSelectedFile(null);
      }
    }
  };

  const handleProcessPdf = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPdfContent('');

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      console.log('Uploading PDF:', selectedFile.name);

      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));

      // Try to parse JSON response
      let result;
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText.substring(0, 500) + '...');
        
        if (!responseText.trim()) {
          throw new Error('Empty response from server');
        }
        
        result = JSON.parse(responseText);
        console.log('Parsed response data:', result);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error('Server returned invalid JSON response');
      }

      if (!response.ok) {
        throw new Error(result.error || `Failed to process PDF: ${response.statusText}`);
      }

      if (result.success) {
        setPdfContent(result.text);
      } else {
        // Handle partial success (when PDF processing fails but we get fallback info)
        setPdfContent(result.text || 'No text content extracted');
        if (result.error) {
          setError(`Warning: ${result.error}`);
        }
      }
    } catch (err) {
      console.error('PDF processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPdfContent('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">📄 Vectorize Documents</h1>
        <p className="text-gray-600">Upload and process PDF documents for vectorization and analysis.</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* File Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📁 Upload PDF</h2>
            
            <div className="space-y-4">
              {/* File Input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {/* Selected File Info */}
              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Selected File:</p>
                      <p className="text-sm text-blue-700">{selectedFile.name}</p>
                      <p className="text-xs text-blue-600">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={handleClearFile}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleProcessPdf}
                  disabled={!selectedFile || isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFile && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    '🔄 Process PDF'
                  )}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">❌ {error}</p>
                </div>
              )}
            </div>
          </div>

          {/* PDF Content Display */}
          {pdfContent && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Extracted Content</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {pdfContent}
                </pre>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                Character count: {pdfContent.length.toLocaleString()}
              </div>
            </div>
          )}

          {/* Future Features Placeholder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 Coming Soon</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Vector embeddings generation</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Semantic search across documents</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Document chunking and indexing</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Integration with chat queries</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
