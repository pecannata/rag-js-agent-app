'use client';

import React, { useState } from 'react';
import { 
  processDocument, 
  DocumentWorkflowResult, 
  getSupportedFileTypes, 
  isFileTypeSupported, 
  formatFileSize, 
  estimateProcessingTime 
} from '../lib/document-utils';

interface DocumentProcessorProps {
  apiKey?: string;
  onResult?: (result: DocumentWorkflowResult) => void;
}

export default function DocumentProcessorWithSummary({ 
  apiKey = '', 
  onResult 
}: DocumentProcessorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [includeSummary, setIncludeSummary] = useState(false);
  const [result, setResult] = useState<DocumentWorkflowResult | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (isFileTypeSupported(file.name)) {
        setSelectedFile(file);
        setResult(null);
      } else {
        alert(`Unsupported file type. Please select one of: ${getSupportedFileTypes().join(', ')}`);
        event.target.value = '';
      }
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    if (includeSummary && !apiKeyInput.trim()) {
      alert('API key is required for document summarization');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Processing document...');
    setResult(null);

    try {
      const workflowResult = await processDocument(selectedFile, {
        apiKey: apiKeyInput.trim(),
        includeSummary: includeSummary,
        baseUrl: '' // Use relative URLs
      });

      if (includeSummary && workflowResult.processing.success) {
        setProcessingStep('Generating summary...');
      }

      setResult(workflowResult);
      onResult?.(workflowResult);

    } catch (error) {
      console.error('Processing failed:', error);
      setResult({
        processing: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const renderProcessingResult = () => {
    if (!result) return null;

    const { processing, summarization } = result;

    return (
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Processing Results</h3>

        {/* Document Processing Results */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Document Processing</h4>
          {processing.success ? (
            <div className="text-green-600">
              <p>✅ Successfully processed {processing.filename}</p>
              <div className="text-sm text-gray-600 mt-1">
                <p>• Type: {processing.documentType?.toUpperCase()}</p>
                <p>• Size: {formatFileSize(processing.size || 0)}</p>
                <p>• Extracted text: {processing.extractedLength?.toLocaleString()} characters</p>
                {processing.pageCount && <p>• Pages: {processing.pageCount}</p>}
                {processing.slideCount && <p>• Slides: {processing.slideCount}</p>}
                {processing.paragraphCount && <p>• Paragraphs: {processing.paragraphCount}</p>}
                {processing.tableCount && <p>• Tables: {processing.tableCount}</p>}
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              <p>❌ Processing failed: {processing.error}</p>
            </div>
          )}
        </div>

        {/* Summarization Results */}
        {includeSummary && summarization && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Document Summary</h4>
            {summarization.success ? (
              <div className="text-green-600">
                <p>✅ Summary generated successfully</p>
                <div className="mt-3 p-3 bg-white border rounded">
                  <h5 className="font-medium text-gray-800 mb-2">Summary:</h5>
                  <div className="text-gray-700 text-sm whitespace-pre-wrap">
                    {summarization.summary}
                  </div>
                  
                  {summarization.keyTopics && summarization.keyTopics.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-medium text-gray-800 mb-2">Key Topics:</h5>
                      <div className="flex flex-wrap gap-2">
                        {summarization.keyTopics.map((topic, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-3">
                    <p>Summary length: {summarization.documentInfo?.summaryLength.toLocaleString()} characters</p>
                    <p>Chunks processed: {summarization.documentInfo?.chunksProcessed}</p>
                    <p>Generated: {summarization.timestamp && new Date(summarization.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-red-600">
                <p>❌ Summarization failed: {summarization.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Extracted Text Preview */}
        {processing.success && processing.text && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-2">Extracted Text Preview</h4>
            <div className="p-3 bg-white border rounded max-h-40 overflow-y-auto text-sm text-gray-600">
              {processing.text.substring(0, 1000)}
              {processing.text.length > 1000 && '...'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Document Processor with AI Summarization
        </h2>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Document
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.pptx"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={isProcessing}
          />
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: {getSupportedFileTypes().join(', ').toUpperCase()}
          </p>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="mb-6 p-3 bg-gray-50 rounded">
            <h3 className="font-medium text-gray-700 mb-2">Selected File</h3>
            <p className="text-sm text-gray-600">📄 {selectedFile.name}</p>
            <p className="text-sm text-gray-600">📊 {formatFileSize(selectedFile.size)}</p>
            <p className="text-sm text-gray-600">⏱️ Estimated processing time: {estimateProcessingTime(selectedFile)}</p>
          </div>
        )}

        {/* Summary Options */}
        <div className="mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeSummary}
              onChange={(e) => setIncludeSummary(e.target.checked)}
              disabled={isProcessing}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Generate AI Summary (requires API key)
            </span>
          </label>
        </div>

        {/* API Key Input */}
        {includeSummary && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cohere API Key
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your Cohere API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for AI summarization. Your key is not stored.
            </p>
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={handleProcess}
          disabled={!selectedFile || isProcessing}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            !selectedFile || isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {processingStep || 'Processing...'}
            </span>
          ) : (
            `Process Document${includeSummary ? ' with Summary' : ''}`
          )}
        </button>

        {/* Results */}
        {renderProcessingResult()}
      </div>
    </div>
  );
}
