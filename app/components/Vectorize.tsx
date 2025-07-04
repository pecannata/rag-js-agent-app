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
  console.log('🔥 Vectorize component loaded/re-rendered');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunkSize, setChunkSize] = useState<number>(1000);
  const [overlap, setOverlap] = useState<number>(200);
  const [showChunks, setShowChunks] = useState<boolean>(false);
  const [sqlStatements, setSqlStatements] = useState<string>('');
  const [showSql, setShowSql] = useState<boolean>(false);
  const [documentName, setDocumentName] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResults, setExecutionResults] = useState<{success: number, failed: number, errors: string[]}>({success: 0, failed: 0, errors: []});
  const [isGeneratingVectors, setIsGeneratingVectors] = useState<boolean>(false);
  const [vectorResults, setVectorResults] = useState<{success: number, failed: number, errors: string[]}>({success: 0, failed: 0, errors: []});
  const [vectorStatements, setVectorStatements] = useState<string>('');
  const [showVectorSql, setShowVectorSql] = useState<boolean>(false);
  const [showExtractedContent, setShowExtractedContent] = useState<boolean>(false);
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deletionResults, setDeletionResults] = useState<{success: boolean, error?: string}>({success: false});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setDocumentName(file.name.replace('.pdf', '').replace(/'/g, ''));
        setError(null);
      } else {
        setError('Please select a PDF file');
        setSelectedFile(null);
        setDocumentName('');
      }
    }
  };

  const handleProcessPdf = async (): Promise<string> => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      throw new Error('No file selected');
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

      let extractedText = '';
      if (result.success) {
        extractedText = result.text;
        setPdfContent(result.text);
      } else {
        // Handle partial success (when PDF processing fails but we get fallback info)
        extractedText = result.text || 'No text content extracted';
        setPdfContent(extractedText);
        if (result.error) {
          setError(`Warning: ${result.error}`);
        }
      }
      
      return extractedText;
    } catch (err) {
      console.error('PDF processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process PDF';
      setError(errorMessage);
      throw err;
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
    setDocumentName('');
    setIsExecuting(false);
    setExecutionResults({success: 0, failed: 0, errors: []});
    setIsGeneratingVectors(false);
    setVectorResults({success: 0, failed: 0, errors: []});
    setVectorStatements('');
    setShowVectorSql(false);
    setShowExtractedContent(false);
    setIsRunningAll(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createChunksWithPython = async (text: string, chunkSize: number, overlap: number): Promise<Chunk[]> => {
    console.log('🐍 Using Python langchain chunking');
    console.log('Input parameters:', { textLength: text.length, chunkSize, overlap });
    
    try {
      const response = await fetch('/api/chunk-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          chunkSize,
          overlap
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to chunk text');
      }

      if (!result.success) {
        throw new Error(result.error || 'Chunking failed');
      }

      console.log('✅ Python chunking successful:', result.metadata);
      return result.chunks;
      
    } catch (error) {
      console.error('❌ Python chunking failed:', error);
      throw error;
    }
  };

  const handleCreateChunks = async (contentToChunk?: string): Promise<Chunk[]> => {
    const content = contentToChunk || pdfContent;
    if (!content) {
      setError('No PDF content available to chunk');
      throw new Error('No PDF content available to chunk');
    }

    console.log('=== CHUNK CREATION STARTED ===');
    console.log('Current chunk size state:', chunkSize);
    console.log('Current overlap state:', overlap);
    console.log('Document name:', documentName);
    console.log('PDF content length:', content.length);
    console.log('Using content from:', contentToChunk ? 'parameter' : 'state');

    setError(null);
    
    try {
      const newChunks = await createChunksWithPython(content, chunkSize, overlap);
      console.log('Created chunks:', newChunks.map(c => ({ id: c.id, preview: c.text.substring(0, 50) + '...' })));
      setChunks(newChunks);
      setShowChunks(true);

      // Generate SQL statements for each chunk
      const sqls = newChunks.map(chunk => {
        // Properly escape the chunk text for SQL
        const escapedText = chunk.text
          .replace(/'/g, "''")
          .replace(/\\/g, "\\\\")
          .replace(/\r?\n/g, ' ')
          .replace(/\t/g, ' ')
          .trim();
        
        return `insert into segs (id, seg, doc) values (${chunk.id}, '${escapedText}', '${documentName}')`;
      }).join('\n');
      console.log('Generated SQL statements preview:', sqls.split('\n').slice(0, 3));
      setSqlStatements(sqls);
      
      // Generate vector embedding UPDATE statements for each chunk
      const vectorSqls = newChunks.map(chunk => 
        `update segs set vec = (SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING seg as data) FROM segs where id = ${chunk.id} and doc = '${documentName}') where id = ${chunk.id} and doc = '${documentName}'`
      ).join('\n');
      setVectorStatements(vectorSqls);
      console.log('=== CHUNK CREATION COMPLETED ===');
      
      return newChunks;
    } catch (err) {
      console.error('Chunking error:', err);
      const errorMessage = 'Failed to create chunks: ' + (err instanceof Error ? err.message : 'Unknown error');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleDeleteRecords = async () => {
    console.log('🗑️ Delete Records button clicked!');
    setIsDeleting(true);
    setError(null);

    try {
      const deleteSql = `delete from segs where doc = '${documentName.replace(/'/g, "''")}'`;
      console.log('Executing delete SQL:', deleteSql);

      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sqlQuery: deleteSql,
          forceExecute: true
        })
      });

      const result = await response.json();

      if (result.success && result.executed) {
        setDeletionResults({ success: true });
        console.log('✅ Delete executed successfully');
      } else {
        throw new Error(result.error || result.reason || 'Unknown delete error');
      }
    } catch (error) {
      console.error('Delete process error:', error);
      setError(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDeletionResults({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteSQL = async (chunksToExecute?: Chunk[]) => {
    const chunksForExecution = chunksToExecute || chunks;
    if (!chunksForExecution.length) {
      setError('No chunks available to execute');
      throw new Error("No chunks available to execute");
    }

    setIsExecuting(true);
    setError(null);
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // Execute each SQL statement individually
      for (let i = 0; i < chunksForExecution.length; i++) {
        const chunk = chunksForExecution[i];
        // Properly escape the chunk text for SQL execution
        const escapedText = chunk.text
          .replace(/'/g, "''")
          .replace(/\\/g, "\\\\")
          .replace(/\r?\n/g, ' ')
          .replace(/\t/g, ' ')
          .trim();
        
        const sqlStatement = `insert into segs (id, seg, doc) values (${chunk.id}, '${escapedText}', '${documentName}')`;
        
        try {
          console.log(`Executing SQL ${i + 1}/${chunksForExecution.length}:`, sqlStatement.substring(0, 100) + '...');
          
          const response = await fetch('/api/database', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sqlQuery: sqlStatement,
              forceExecute: true // Bypass domain checking for direct SQL execution
            })
          });

          const result = await response.json();
          
          if (result.success && result.executed) {
            successCount++;
            console.log(`✅ SQL ${i + 1} executed successfully`);
          } else {
            failedCount++;
            const errorMsg = result.error || result.reason || 'Unknown execution error';
            errors.push(`Chunk ${chunk.id}: ${errorMsg}`);
            console.error(`❌ SQL ${i + 1} failed:`, errorMsg);
          }
        } catch (executeError) {
          failedCount++;
          const errorMsg = executeError instanceof Error ? executeError.message : 'Network error';
          errors.push(`Chunk ${chunk.id}: ${errorMsg}`);
          console.error(`❌ SQL ${i + 1} network error:`, executeError);
        }
        
        // Small delay between executions to avoid overwhelming the database
        if (i < chunksForExecution.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setExecutionResults({ success: successCount, failed: failedCount, errors });
      
      if (failedCount === 0) {
        setError(null);
      } else if (successCount > 0) {
        setError(`Partial success: ${successCount} succeeded, ${failedCount} failed`);
      } else {
        setError(`All executions failed. Check database connection.`);
      }
      
    } catch (error) {
      console.error('Execution process error:', error);
      setError(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setExecutionResults({ success: successCount, failed: failedCount, errors });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunAll = async () => {
    console.log('🎯 DEBUGGING: handleRunAll function started');
    
    if (!selectedFile) {
      console.log('❌ No file selected, stopping');
      setError('Please select a PDF file first');
      throw new Error('Please select a PDF file first');
    }

    console.log('🚀 Run All started - Complete pipeline with delete');
    console.log('📂 Selected file:', selectedFile.name);
    console.log('📄 Current PDF content length:', pdfContent.length);
    
    setIsRunningAll(true);
    setError(null);
    
    try {
      console.log('🚀 RUNNING COMPLETE PIPELINE...');
      console.log('📋 STEP 1 START: Processing PDF...');
      
      // Step 1: Process PDF
      console.log('📄 Step 1: Processing PDF...');
      console.log('🔍 About to call handleProcessPdf()...');
      
      let extractedContent;
      try {
        console.log('⏳ Calling handleProcessPdf()...');
        extractedContent = await handleProcessPdf();
        console.log('✅ handleProcessPdf completed successfully');
        console.log('📝 Extracted content length:', extractedContent?.length || 0);
      } catch (pdfError) {
        console.error('❌ PDF processing failed:', pdfError);
        console.error('📊 PDF error details:', {
          name: pdfError?.name,
          message: pdfError?.message,
          stack: pdfError?.stack
        });
        throw pdfError;
      }
      
      // Verify we got content
      if (!extractedContent || extractedContent.trim().length === 0) {
        console.log('⚠️ No PDF content extracted, stopping pipeline...');
        throw new Error('PDF content not available after processing. Please try again.');
      }
      
      console.log(`✅ PDF processed successfully, extracted ${extractedContent.length} characters`);
      console.log('📋 STEP 2 START: Creating chunks...');
      
      // Step 2: Create Chunks (using extracted content)
      console.log('✂️ Step 2: Creating chunks...');
      let createdChunks;
      try {
        createdChunks = await handleCreateChunks(extractedContent);
        console.log('✅ handleCreateChunks completed successfully');
      } catch (chunkError) {
        console.error('❌ Chunking failed:', chunkError);
        throw chunkError;
      }
      
      // Verify chunks were created
      if (!createdChunks || createdChunks.length === 0) {
        console.log('⚠️ No chunks were created, stopping pipeline...');
        throw new Error('Failed to create chunks from PDF content.');
      }
      
      console.log(`✅ Successfully created ${createdChunks.length} chunks`);
      console.log('📋 STEP 3 START: Deleting existing records...');
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Delete Existing Records (before inserting new ones)
      console.log('🗑️ Step 3: Deleting existing records...');
      try {
        await handleDeleteRecords();
        console.log('✅ handleDeleteRecords completed successfully');
      } catch (deleteError) {
        console.error('❌ Delete failed:', deleteError);
        throw deleteError;
      }
      
      console.log('📋 STEP 4 START: Executing SQL statements...');
      
      // Wait a moment for deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4: Execute SQL
      console.log('💾 Step 4: Executing SQL statements...');
      try {
        await handleExecuteSQL(createdChunks);
        console.log('✅ handleExecuteSQL completed successfully');
      } catch (sqlError) {
        console.error('❌ SQL execution failed:', sqlError);
        throw sqlError;
      }
      
      console.log('📋 STEP 5 START: Generating vectors...');
      
      // Wait a moment for SQL execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 5: Generate Vectors
      console.log('🧠 Step 5: Generating vectors...');
      try {
        await handleGenerateVectors(createdChunks);
        console.log('✅ handleGenerateVectors completed successfully');
      } catch (vectorError) {
        console.error('❌ Vector generation failed:', vectorError);
        throw vectorError;
      }
      
      console.log('✅ PIPELINE COMPLETED SUCCESSFULLY!');
      
    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      setError('Pipeline failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleGenerateVectors = async (chunksToVectorize?: Chunk[]) => {
    const chunksForVectors = chunksToVectorize || chunks;
    if (!chunksForVectors.length) {
      setError('No chunks available to generate vectors for');
      throw new Error('Please select a PDF file first');
    }

    console.log(`🧠 Generating vectors for ${chunksForVectors.length} chunks...`);
    setIsGeneratingVectors(true);
    setError(null);
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // Execute each vector UPDATE statement individually
      for (let i = 0; i < chunksForVectors.length; i++) {
        const chunk = chunksForVectors[i];
        const vectorStatement = `update segs set vec = (SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING seg as data) FROM segs where id = ${chunk.id} and doc = '${documentName}') where id = ${chunk.id} and doc = '${documentName}'`;
        
        try {
          console.log(`Generating vector ${i + 1}/${chunksForVectors.length} for chunk ${chunk.id}...`);
          
          const response = await fetch('/api/database', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sqlQuery: vectorStatement,
              forceExecute: true // Bypass domain checking for direct SQL execution
            })
          });

          const result = await response.json();
          
          if (result.success && result.executed) {
            successCount++;
            console.log(`✅ Vector ${i + 1} generated successfully for chunk ${chunk.id}`);
          } else {
            failedCount++;
            const errorMsg = result.error || result.reason || 'Unknown vector generation error';
            errors.push(`Chunk ${chunk.id}: ${errorMsg}`);
            console.error(`❌ Vector ${i + 1} failed for chunk ${chunk.id}:`, errorMsg);
          }
        } catch (executeError) {
          failedCount++;
          const errorMsg = executeError instanceof Error ? executeError.message : 'Network error';
          errors.push(`Chunk ${chunk.id}: ${errorMsg}`);
          console.error(`❌ Vector ${i + 1} network error for chunk ${chunk.id}:`, executeError);
        }
        
        // Small delay between executions to avoid overwhelming the database
        if (i < chunksForVectors.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Slightly longer delay for vector operations
        }
      }

      setVectorResults({ success: successCount, failed: failedCount, errors });
      
      if (failedCount === 0) {
        setError(null);
      } else if (successCount > 0) {
        setError(`Vector generation partial success: ${successCount} succeeded, ${failedCount} failed`);
      } else {
        setError(`All vector generations failed. Check database connection and VECTOR_EMBEDDING function.`);
      }
      
    } catch (error) {
      console.error('Vector generation process error:', error);
      setError(`Vector generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setVectorResults({ success: successCount, failed: failedCount, errors });
    } finally {
      setIsGeneratingVectors(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">📄 Vectorize Documents [NEW CODE ACTIVE] 🔥</h1>
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

              {/* Process PDF Button */}
              {selectedFile && (
                <div className="mt-4">
                  <button onClick={handleProcessPdf} disabled={isLoading || isRunningAll} className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500">
                    {isLoading ? "⏳ Processing PDF..." : "📄 Process PDF"}
                  </button>
                </div>
              )}



              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">❌ {error}</p>
                </div>
              )}
            </div>
          </div>

          {/* PDF Content Display - Accordion */}
          {pdfContent && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => setShowExtractedContent(!showExtractedContent)}
                className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <h2 className="text-lg font-semibold text-gray-900">📝 Extracted Content</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {pdfContent.length.toLocaleString()} characters
                  </span>
                  <div className={`transform transition-transform duration-200 ${
                    showExtractedContent ? 'rotate-180' : 'rotate-0'
                  }`}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>
              
              {showExtractedContent && (
                <div className="mt-4">
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {pdfContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Document Chunking Section */}
          {selectedFile && (
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
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const newValue = inputValue === '' ? '' : parseInt(inputValue);
                        console.log('Chunk size input changed:', inputValue, '=>', newValue);
                        setChunkSize(isNaN(newValue) ? 1000 : newValue);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Current: {chunkSize} characters | Set any chunk size you prefer (e.g., 500, 1000, 2000, 5000+)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overlap (characters)
                    </label>
                    <input
                      type="number"
                      value={overlap}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const newValue = inputValue === '' ? '' : parseInt(inputValue);
                        console.log('Overlap input changed:', inputValue, '=>', newValue);
                        setOverlap(isNaN(newValue) ? 200 : Math.max(0, newValue));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Current: {overlap} characters | Overlap between chunks to preserve context</p>
                  </div>
                </div>
                
                {/* Pipeline Control Buttons */}
                <div className="space-y-4">
                  {/* Run All Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        console.log('🔴 Run All button clicked!');
                        handleRunAll();
                      }}
                      disabled={!selectedFile || isRunningAll}
                      className={`px-8 py-3 rounded-lg text-lg font-semibold transition-colors ${
                        selectedFile && !isRunningAll
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isRunningAll ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Running Complete Pipeline...
                        </div>
                      ) : (
                        '🚀 Run All (Chunk → Delete → Execute → Vectorize)'
                      )}
                    </button>
                  </div>
                  
                  {/* Individual Step Buttons */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => handleCreateChunks()}
                      disabled={!pdfContent || isRunningAll}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        pdfContent && !isRunningAll
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      ✂️ Chunk ({chunkSize})
                    </button>
                    
                    <button
                      onClick={handleDeleteRecords}
                      disabled={isDeleting || isRunningAll}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        !isDeleting && !isRunningAll
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      style={{ display: 'block !important' }} // Force visibility with !important
                    >
                      {isDeleting ? '⏳ Deleting...' : '🗑️ Delete Records'}
                    </button>

                    <button
                      onClick={handleExecuteSQL}
                      disabled={chunks.length === 0 || isExecuting || isRunningAll}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        chunks.length > 0 && !isExecuting && !isRunningAll
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isExecuting ? '⏳' : '💾'} Execute SQL
                    </button>
                    
                    <button
                      onClick={() => handleGenerateVectors()}
                      disabled={executionResults.success === 0 || isGeneratingVectors || isRunningAll}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        executionResults.success > 0 && !isGeneratingVectors && !isRunningAll
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isGeneratingVectors ? '⏳' : '🧠'} Vectorize
                    </button>
                  </div>
                  
                  {/* View Buttons */}
                  {chunks.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setShowChunks(!showChunks)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        {showChunks ? '🙈 Hide' : '👁️ Show'} Chunks ({chunks.length})
                      </button>
                      <button
                        onClick={() => setShowSql(!showSql)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        {showSql ? '🙈 Hide' : '👁️ Show'} SQL
                      </button>
                      <button
                        onClick={() => setShowVectorSql(!showVectorSql)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        {showVectorSql ? '🙈 Hide' : '👁️ Show'} Vector SQL
                      </button>
                    </div>
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
          
          {/* SQL Display */}
          {showSql && chunks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">💾 SQL Insert Statements</h2>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {sqlStatements}
                </pre>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {chunks.length} INSERT statements generated
              </div>
            </div>
          )}
          
          {/* Vector SQL Display */}
          {showVectorSql && chunks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🧠 Vector Embedding SQL Statements</h2>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {vectorStatements}
                </pre>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {chunks.length} vector UPDATE statements generated
              </div>
            </div>
          )}
          
          {/* Vector Generation Results */}
          {(vectorResults.success > 0 || vectorResults.failed > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🧠 Vector Generation Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-blue-800 font-semibold">✅ Vectors Generated</div>
                  <div className="text-2xl font-bold text-blue-900">{vectorResults.success}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-semibold">❌ Failed</div>
                  <div className="text-2xl font-bold text-red-900">{vectorResults.failed}</div>
                </div>
              </div>
              {vectorResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-red-800 font-semibold mb-2">Vector Generation Error Details:</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {vectorResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Execution Results */}
          {(executionResults.success > 0 || executionResults.failed > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Execution Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-800 font-semibold">✅ Successful</div>
                  <div className="text-2xl font-bold text-green-900">{executionResults.success}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-semibold">❌ Failed</div>
                  <div className="text-2xl font-bold text-red-900">{executionResults.failed}</div>
                </div>
              </div>
              {executionResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-red-800 font-semibold mb-2">Error Details:</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {executionResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>✅ Vector embeddings generation (Oracle VECTOR_EMBEDDING)</span>
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
