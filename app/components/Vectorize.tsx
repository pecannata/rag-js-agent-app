'use client';

import { useState, useRef } from 'react';

interface VectorizeProps {
  apiKey: string;
}

interface Chunk {
  id: number;
  text: string;
  charCount: number;
  wordCount: number;
}

export default function Vectorize({ }: VectorizeProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunkSize, setChunkSize] = useState<number>(1000);
  const [overlap, setOverlap] = useState<number>(200);
  const [showChunks, setShowChunks] = useState<boolean>(false);
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
    setChunks([]);
    setError(null);
    setShowChunks(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createChunks = (text: string, size: number, overlapSize: number): Chunk[] => {
    // Remove document header and focus on actual content
    const contentStart = text.indexOf('\n\n');
    const actualContent = contentStart > 0 ? text.substring(contentStart + 2) : text;
    
    if (!actualContent.trim()) {
      return [];
    }

    const chunks: Chunk[] = [];
    let startIndex = 0;
    let chunkId = 1;

    while (startIndex < actualContent.length) {
      const endIndex = Math.min(startIndex + size, actualContent.length);
      let chunkText = actualContent.substring(startIndex, endIndex);
      
      // Try to break at word boundaries unless we're at the end
      if (endIndex < actualContent.length) {
        const lastSpaceIndex = chunkText.lastIndexOf(' ');
        if (lastSpaceIndex > size * 0.8) { // Only break at word if it's not too far back
          chunkText = chunkText.substring(0, lastSpaceIndex);
        }
      }
      
      const trimmedChunk = chunkText.trim();
      if (trimmedChunk.length > 0) {
        chunks.push({
          id: chunkId++,
          text: trimmedChunk,
          charCount: trimmedChunk.length,
          wordCount: trimmedChunk.split(/\s+/).length
        });
      }
      
      // Move to next chunk with overlap
      const actualChunkLength = chunkText.length;
      startIndex += Math.max(actualChunkLength - overlapSize, 1);
    }

    return chunks;
  };

  const handleCreateChunks = () => {
    if (!pdfContent) {
      setError('No PDF content available to chunk');
      return;
    }

    try {
      const newChunks = createChunks(pdfContent, chunkSize, overlap);
      setChunks(newChunks);
      setShowChunks(true);
      setError(null);
    } catch (err) {
      setError('Failed to create chunks: ' + (err instanceof Error ? err.message : 'Unknown error'));
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

          {/* Document Chunking Section */}
          {pdfContent && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">✂️ Document Chunking</h2>
              
              <div className="space-y-4">
                {/* Chunking Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chunk Size (characters)
                    </label>
                    <input
                      type="number"
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Math.max(100, parseInt(e.target.value) || 1000))}
                      min="100"
                      max="5000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 500-2000 characters</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overlap (characters)
                    </label>
                    <input
                      type="number"
                      value={overlap}
                      onChange={(e) => setOverlap(Math.max(0, Math.min(chunkSize / 2, parseInt(e.target.value) || 200)))}
                      min="0"
                      max={Math.floor(chunkSize / 2)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Overlap between chunks to preserve context</p>
                  </div>
                </div>
                
                {/* Create Chunks Button */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateChunks}
                    disabled={!pdfContent}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                  >
                    ✂️ Create Chunks
                  </button>
                  
                  {chunks.length > 0 && (
                    <button
                      onClick={() => setShowChunks(!showChunks)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {showChunks ? '🙈 Hide Chunks' : '👁️ Show Chunks'} ({chunks.length})
                    </button>
                  )}
                </div>
                
                {/* Chunk Statistics */}
                {chunks.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-green-900 mb-2">📊 Chunking Results</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-green-700 font-medium">Total Chunks:</span>
                        <span className="ml-2 text-green-900">{chunks.length}</span>
                      </div>
                      <div>
                        <span className="text-green-700 font-medium">Avg Size:</span>
                        <span className="ml-2 text-green-900">
                          {chunks.length > 0 ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.charCount, 0) / chunks.length) : 0} chars
                        </span>
                      </div>
                      <div>
                        <span className="text-green-700 font-medium">Avg Words:</span>
                        <span className="ml-2 text-green-900">
                          {chunks.length > 0 ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0) / chunks.length) : 0} words
                        </span>
                      </div>
                      <div>
                        <span className="text-green-700 font-medium">Total Words:</span>
                        <span className="ml-2 text-green-900">
                          {chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)} words
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Chunks Display */}
          {showChunks && chunks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📑 Document Chunks</h2>
              
              <div className="space-y-4 max-h-96 overflow-auto">
                {chunks.map((chunk, index) => (
                  <div key={chunk.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        Chunk {chunk.id}
                      </h3>
                      <div className="text-xs text-gray-500 space-x-4">
                        <span>{chunk.charCount} chars</span>
                        <span>{chunk.wordCount} words</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 max-h-32 overflow-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {chunk.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Future Features */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 Next Steps</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>✅ PDF text extraction</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>✅ Document chunking with user controls</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>🚧 Vector embeddings generation (Cohere API)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>🚧 Semantic search across chunks</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>🚧 Integration with chat queries</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
