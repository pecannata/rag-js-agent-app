import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('=== PDF API ROUTE CALLED ===');
  
  try {
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    
    console.log('File received:', file ? file.name : 'NO FILE');
    
    if (!file) {
      console.log('No file provided, returning error');
      const response = NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
      console.log('Returning response for no file');
      return response;
    }

    console.log('File type:', file.type);
    if (file.type !== 'application/pdf') {
      console.log('Invalid file type, returning error');
      const response = NextResponse.json({ 
        success: false,
        error: 'File must be a PDF' 
      }, { status: 400 });
      console.log('Returning response for invalid file type');
      return response;
    }

    console.log('File size:', file.size);
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log('File too large, returning error');
      const response = NextResponse.json({ 
        success: false,
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 });
      console.log('Returning response for file too large');
      return response;
    }

    console.log('All validations passed, processing PDF...');

    // For now, let's just return a simple success response to test the pipeline
    console.log('Returning test success response');
    const response = NextResponse.json({
      success: true,
      text: `Test processing of ${file.name}\n\nFile received successfully!\nName: ${file.name}\nSize: ${(file.size / 1024 / 1024).toFixed(2)} MB\nType: ${file.type}\n\n[Actual PDF parsing will be implemented once the JSON response pipeline is working]`,
      pageCount: 1,
      filename: file.name,
      size: file.size
    });
    
    console.log('Response created, returning...');
    return response;

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
