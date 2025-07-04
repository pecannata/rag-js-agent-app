import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('=== DOCX API ROUTE CALLED ===');
  
  try {
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('docx') as File;
    
    console.log('File received:', file ? file.name : 'NO FILE');
    
    if (!file) {
      console.log('No file provided, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
    }

    console.log('File type:', file.type);
    // Accept multiple MIME types for .docx files
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.docx')) {
      console.log('Invalid file type, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'File must be a Microsoft Word document (.docx)' 
      }, { status: 400 });
    }

    console.log('File size:', file.size);
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log('File too large, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 });
    }

    console.log('All validations passed, starting Word document processing...');

    // Save the Word document file temporarily
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFileName = `temp_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const tempFilePath = path.join(process.cwd(), 'temp', tempFileName);
    
    try {
      // Ensure temp directory exists
      await execAsync('mkdir -p temp');
      
      console.log('Saving Word document to temporary file:', tempFilePath);
      await writeFile(tempFilePath, buffer);
      
      console.log('Executing Python Word document processor...');
      // Execute Python script to extract text
      const pythonCommand = `python3 scripts/docx_processor.py "${tempFilePath}" --max-paragraphs 1000`;
      const { stdout, stderr } = await execAsync(pythonCommand);
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
      
      console.log('Python script completed, parsing result...');
      const result = JSON.parse(stdout);
      
      // Clean up temporary file
      await unlink(tempFilePath);
      
      if (!result.success) {
        console.log('Word document processing failed:', result.error);
        return NextResponse.json({
          success: false,
          error: result.error,
          text: `[Word document processing failed for ${file.name}]\n\nError: ${result.error}`,
          filename: file.name,
          size: file.size,
          paragraphCount: 0
        });
      }
      
      console.log('Word document processing successful!');
      console.log('- Paragraphs:', result.paragraphCount);
      console.log('- Processed paragraphs:', result.processedParagraphs);
      console.log('- Tables:', result.tableCount);
      console.log('- Text length:', result.text.length);
      
      // Add document header
      const textWithHeader = `[Document: ${file.name}]\n[Size: ${(file.size / 1024 / 1024).toFixed(2)} MB]\n[Paragraphs: ${result.paragraphCount}]\n[Tables: ${result.tableCount}]\n[Processed: ${result.processedParagraphs} paragraphs]\n[Upload Time: ${new Date().toISOString()}]\n\n${result.text}`;
      
      return NextResponse.json({
        success: true,
        text: textWithHeader,
        paragraphCount: result.paragraphCount,
        processedParagraphs: result.processedParagraphs,
        tableCount: result.tableCount,
        filename: file.name,
        size: file.size,
        uploadTime: new Date().toISOString(),
        hasText: result.hasText,
        paragraphTexts: result.paragraphTexts || [],
        extractedLength: result.text.length
      });
      
    } catch (processingError) {
      console.error('Word document processing error:', processingError);
      
      // Try to clean up temp file if it exists
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: `Word document processing failed: ${(processingError as Error).message}`,
        text: `[Word document processing failed for ${file.name}]\n\nError: ${(processingError as Error).message}\n\nThis could be due to:\n- Python/python-docx not installed\n- Corrupted Word document\n- Password-protected document\n- Unsupported Word format (.doc instead of .docx)`,
        filename: file.name,
        size: file.size,
        paragraphCount: 0
      });
    }

  } catch (error) {
    console.error('Request processing error:', error);
    
    // Ensure we always return valid JSON
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    console.log('Returning error response');
    const response = NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request: ' + errorMessage,
        text: '',
        filename: '',
        size: 0,
        paragraphCount: 0
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Error response created, returning...');
    return response;
  }
}
