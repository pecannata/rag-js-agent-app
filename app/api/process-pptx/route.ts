import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('=== PPTX API ROUTE CALLED ===');
  
  try {
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('pptx') as File;
    const slideBySlide = formData.get('slideBySlide') === 'true';
    
    console.log('File received:', file ? file.name : 'NO FILE');
    
    if (!file) {
      console.log('No file provided, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
    }

    console.log('File type:', file.type);
    // Accept multiple MIME types for .pptx files
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/mspowerpoint',
      'application/octet-stream'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pptx')) {
      console.log('Invalid file type, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'File must be a Microsoft PowerPoint presentation (.pptx)' 
      }, { status: 400 });
    }

    console.log('File size:', file.size);
    // Check file size (limit to 500MB for presentations)
    if (file.size > 500 * 1024 * 1024) {
      console.log('File too large, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'File too large. Maximum size is 500MB' 
      }, { status: 400 });
    }

    console.log('All validations passed, starting PowerPoint processing...');

    // Save the PowerPoint file temporarily
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFileName = `temp_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const tempFilePath = path.join(process.cwd(), 'temp', tempFileName);
    
    try {
      // Ensure temp directory exists
      await execAsync('mkdir -p temp');
      
      console.log('Saving PowerPoint to temporary file:', tempFilePath);
      await writeFile(tempFilePath, buffer);
      
      console.log('Executing Python PowerPoint processor...');
      // Execute Python script to extract text using virtual environment
      const slideBySlideFlag = slideBySlide ? ' --slide-by-slide' : '';
      const pythonCommand = `source venv/bin/activate && python3 scripts/pptx_processor.py "${tempFilePath}"${slideBySlideFlag}`;
      console.log('Python command:', pythonCommand);
      const { stdout, stderr } = await execAsync(pythonCommand, { shell: '/bin/bash' });
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
      
      console.log('Python script completed, parsing result...');
      const result = JSON.parse(stdout);
      
      // Clean up temporary file
      await unlink(tempFilePath);
      
      if (!result.success) {
        console.log('PowerPoint processing failed:', result.error);
        return NextResponse.json({
          success: false,
          error: result.error,
          text: `[PowerPoint processing failed for ${file.name}]\n\nError: ${result.error}`,
          filename: file.name,
          size: file.size,
          slideCount: 0
        });
      }
      
      console.log('PowerPoint processing successful!');
      console.log('- Slides:', result.slideCount);
      console.log('- Text length:', result.text.length);
      
      // Add document header
      const textWithHeader = `[Document: ${file.name}]\n[Size: ${(file.size / 1024 / 1024).toFixed(2)} MB]\n[Slides: ${result.slideCount}]\n[Upload Time: ${new Date().toISOString()}]\n\n${result.text}`;
      
      return NextResponse.json({
        success: true,
        text: textWithHeader,
        slideCount: result.slideCount,
        filename: file.name,
        size: file.size,
        uploadTime: new Date().toISOString(),
        hasText: result.hasText,
        slideTexts: result.slideTexts || [],
        extractedLength: result.text.length,
        documentType: 'pptx',
        readyForSummarization: true
      });
      
    } catch (processingError) {
      console.error('PowerPoint processing error:', processingError);
      
      // Try to clean up temp file if it exists
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: `PowerPoint processing failed: ${(processingError as Error).message}`,
        text: `[PowerPoint processing failed for ${file.name}]\n\nError: ${(processingError as Error).message}\n\nThis could be due to:\n- Python/python-pptx not installed\n- Corrupted PowerPoint file\n- Password-protected presentation\n- Unsupported PowerPoint format (.ppt instead of .pptx)`,
        filename: file.name,
        size: file.size,
        slideCount: 0
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
        slideCount: 0
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
