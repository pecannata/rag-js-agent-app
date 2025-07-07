// Utility functions for document processing and summarization

export interface DocumentProcessingResult {
  success: boolean;
  text?: string;
  filename?: string;
  size?: number;
  documentType?: string;
  readyForSummarization?: boolean;
  uploadTime?: string;
  extractedLength?: number;
  error?: string;
  // Type-specific properties
  pageCount?: number; // PDF
  slideCount?: number; // PPTX
  paragraphCount?: number; // DOCX
  tableCount?: number; // DOCX
}

export interface SummarizationResult {
  success: boolean;
  summary?: string;
  keyTopics?: string[];
  documentInfo?: {
    filename: string;
    documentType: string;
    originalLength: number;
    summaryLength: number;
    chunksProcessed: number;
    metadata?: any;
  };
  timestamp?: string;
  error?: string;
}

export interface DocumentWorkflowResult {
  processing: DocumentProcessingResult;
  summarization?: SummarizationResult;
  error?: string;
}

/**
 * Process a document (PDF, DOCX, or PPTX) and optionally summarize it
 */
export async function processDocument(
  file: File,
  options: {
    apiKey?: string;
    includeSummary?: boolean;
    baseUrl?: string;
  } = {}
): Promise<DocumentWorkflowResult> {
  const { apiKey, includeSummary = false, baseUrl = '' } = options;
  
  try {
    // Determine document type and API endpoint
    const fileExtension = file.name.toLowerCase().split('.').pop();
    let endpoint = '';
    let formFieldName = '';
    
    switch (fileExtension) {
      case 'pdf':
        endpoint = `${baseUrl}/api/process-pdf`;
        formFieldName = 'pdf';
        break;
      case 'docx':
        endpoint = `${baseUrl}/api/process-docx`;
        formFieldName = 'docx';
        break;
      case 'pptx':
        endpoint = `${baseUrl}/api/process-pptx`;
        formFieldName = 'pptx';
        break;
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    // Step 1: Process the document
    console.log(`Processing ${fileExtension.toUpperCase()} document:`, file.name);
    
    const formData = new FormData();
    formData.append(formFieldName, file);
    
    const processingResponse = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
    
    if (!processingResponse.ok) {
      throw new Error(`Document processing failed: ${processingResponse.statusText}`);
    }
    
    const processingResult: DocumentProcessingResult = await processingResponse.json();
    
    const result: DocumentWorkflowResult = {
      processing: processingResult
    };
    
    // Step 2: Summarize if requested and processing was successful
    if (includeSummary && processingResult.success && processingResult.readyForSummarization && apiKey) {
      console.log('Generating document summary...');
      
      try {
        const summarizationResult = await summarizeDocument(
          processingResult.text!,
          processingResult.filename!,
          processingResult.documentType!,
          apiKey,
          {
            pageCount: processingResult.pageCount,
            slideCount: processingResult.slideCount,
            paragraphCount: processingResult.paragraphCount,
            tableCount: processingResult.tableCount,
            uploadTime: processingResult.uploadTime,
            extractedLength: processingResult.extractedLength
          },
          baseUrl
        );
        
        result.summarization = summarizationResult;
      } catch (summarizationError) {
        console.error('Summarization failed:', summarizationError);
        result.summarization = {
          success: false,
          error: summarizationError instanceof Error ? summarizationError.message : 'Unknown summarization error'
        };
      }
    } else if (includeSummary && !apiKey) {
      result.summarization = {
        success: false,
        error: 'API key required for summarization'
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('Document processing workflow failed:', error);
    return {
      processing: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      },
      error: error instanceof Error ? error.message : 'Unknown workflow error'
    };
  }
}

/**
 * Summarize extracted document text using LLM
 */
export async function summarizeDocument(
  text: string,
  filename: string,
  documentType: string,
  apiKey: string,
  metadata?: any,
  baseUrl: string = '',
  userMessage?: string
): Promise<SummarizationResult> {
  try {
    console.log('Calling summarization API...');
    
    const response = await fetch(`${baseUrl}/api/summarize-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        filename,
        documentType,
        apiKey,
        metadata,
        userMessage
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Summarization API failed: ${response.statusText}`);
    }
    
    const result: SummarizationResult = await response.json();
    console.log('Summarization completed successfully');
    
    return result;
    
  } catch (error) {
    console.error('Summarization failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown summarization error'
    };
  }
}

/**
 * Get supported file types
 */
export function getSupportedFileTypes(): string[] {
  return ['pdf', 'docx', 'pptx'];
}

/**
 * Validate file type
 */
export function isFileTypeSupported(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return getSupportedFileTypes().includes(extension || '');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estimate processing time based on file size and type
 */
export function estimateProcessingTime(file: File): string {
  const sizeInMB = file.size / (1024 * 1024);
  const extension = file.name.toLowerCase().split('.').pop();
  
  let baseTime = 0; // seconds
  
  switch (extension) {
    case 'pdf':
      baseTime = Math.max(5, sizeInMB * 2); // 2 seconds per MB, minimum 5 seconds
      break;
    case 'docx':
      baseTime = Math.max(3, sizeInMB * 1.5); // 1.5 seconds per MB, minimum 3 seconds
      break;
    case 'pptx':
      baseTime = Math.max(4, sizeInMB * 3); // 3 seconds per MB, minimum 4 seconds
      break;
    default:
      baseTime = 10;
  }
  
  if (baseTime < 60) {
    return `~${Math.round(baseTime)} seconds`;
  } else {
    const minutes = Math.round(baseTime / 60);
    return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}
