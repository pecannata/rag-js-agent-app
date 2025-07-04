import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('=== PDF API ROUTE CALLED ===');
  
  try {
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    
    console.log('File received:', file ? file.name : 'NO FILE');
    
    if (!file) {
      console.log('No file provided, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
    }

    console.log('File type:', file.type);
    if (file.type !== 'application/pdf') {
      console.log('Invalid file type, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'File must be a PDF' 
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

    console.log('All validations passed, starting PDF processing...');

    // Save the PDF file temporarily
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFileName = `temp_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const tempFilePath = path.join(process.cwd(), 'temp', tempFileName);
    
    try {
      // Ensure temp directory exists
      await execAsync('mkdir -p temp');
      
      console.log('Saving PDF to temporary file:', tempFilePath);
      await writeFile(tempFilePath, buffer);
      
      console.log('Executing Python PDF processor...');
      // Execute Python script to extract text
      const pythonCommand = `python3 scripts/pdf_processor.py "${tempFilePath}" --max-pages 50`;
      const { stdout, stderr } = await execAsync(pythonCommand);
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
      
      console.log('Python script completed, parsing result...');
      const result = JSON.parse(stdout);
      
      // Clean up temporary file
      await unlink(tempFilePath);
      
      if (!result.success) {
        console.log('PDF processing failed:', result.error);
        return NextResponse.json({
          success: false,
          error: result.error,
          text: `[PDF processing failed for ${file.name}]\n\nError: ${result.error}`,
          filename: file.name,
          size: file.size,
          pageCount: 0
        });
      }
      
      console.log('PDF processing successful!');
      console.log('- Pages:', result.pageCount);
      console.log('- Processed pages:', result.processedPages);
      console.log('- Text length:', result.text.length);
      
      // Add document header
      const textWithHeader = `[Document: ${file.name}]\n[Size: ${(file.size / 1024 / 1024).toFixed(2)} MB]\n[Pages: ${result.pageCount}]\n[Processed: ${result.processedPages} pages]\n[Upload Time: ${new Date().toISOString()}]\n\n${result.text}`;
      
      return NextResponse.json({
        success: true,
        text: textWithHeader,
        pageCount: result.pageCount,
        processedPages: result.processedPages,
        filename: file.name,
        size: file.size,
        uploadTime: new Date().toISOString(),
        hasText: result.hasText,
        pageTexts: result.pageTexts || [],
        extractedLength: result.text.length
      });
      
    } catch (processingError) {
      console.error('PDF processing error:', processingError);
      
      // Try to clean up temp file if it exists
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: `PDF processing failed: ${(processingError as Error).message}`,
        text: `[PDF processing failed for ${file.name}]\n\nError: ${(processingError as Error).message}\n\nThis could be due to:\n- Python/PyPDF2 not installed\n- Corrupted PDF file\n- Password-protected PDF\n- Complex PDF format`,
        filename: file.name,
        size: file.size,
        pageCount: 0
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
        pageCount: 0
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
