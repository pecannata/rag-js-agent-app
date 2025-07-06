import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  console.log('=== CHUNK TEXT API ROUTE CALLED ===');
  
  try {
    const body = await request.json();
    const { text, chunkSize = 1000, overlap = 200 } = body;

    console.log('Chunk request:', { 
      textLength: text?.length || 0, 
      chunkSize, 
      overlap 
    });

    // Validate inputs
    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Text is required and must be a string'
      }, { status: 400 });
    }

    if (text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Text cannot be empty'
      }, { status: 400 });
    }

    if (typeof chunkSize !== 'number' || chunkSize <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Chunk size must be a positive number'
      }, { status: 400 });
    }

    if (typeof overlap !== 'number' || overlap < 0) {
      return NextResponse.json({
        success: false,
        error: 'Overlap must be a non-negative number'
      }, { status: 400 });
    }

    if (overlap >= chunkSize) {
      return NextResponse.json({
        success: false,
        error: 'Overlap must be less than chunk size'
      }, { status: 400 });
    }

    // Path to the Python chunking script
    const scriptPath = path.join(process.cwd(), 'scripts', 'chunk_text.py');
    console.log('Executing Python chunking script:', scriptPath);

    // Execute the Python script
    const result = await new Promise<string>((resolve, reject) => {
      const pythonProcess = spawn('python', [
        scriptPath,
        text,
        chunkSize.toString(),
        overlap.toString()
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          console.error('Python script stderr:', stderr);
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });

    // Parse the Python script output
    let pythonResult;
    try {
      pythonResult = JSON.parse(result);
    } catch (_parseError) {
      console.error('Failed to parse Python output:', result);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse chunking result'
      }, { status: 500 });
    }

    if (!pythonResult.success) {
      console.error('Python chunking failed:', pythonResult.error);
      return NextResponse.json({
        success: false,
        error: pythonResult.error || 'Chunking failed'
      }, { status: 500 });
    }

    console.log('Chunking successful:', {
      totalChunks: pythonResult.metadata.totalChunks,
      averageChunkSize: pythonResult.metadata.averageChunkSize
    });

    return NextResponse.json({
      success: true,
      chunks: pythonResult.chunks,
      metadata: pythonResult.metadata
    });

  } catch (error) {
    console.error('Chunk text API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
