import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
    }

    // Decode the file path in case it contains URL-encoded characters
    const decodedFilePath = decodeURIComponent(filePath);
    
    // Resolve the absolute path
    const absolutePath = path.resolve(decodedFilePath);
    
    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read the file
    const fileBuffer = await fs.readFile(absolutePath);
    const fileName = path.basename(decodedFilePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
