import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }
    
    // Security check - only allow reading within user's home directory or project directories
    const allowedPaths = [
      process.env.HOME || '/Users',
      process.cwd(),
      '/Users'
    ];
    
    const isAllowed = allowedPaths.some(allowedPath => 
      path.resolve(filePath).startsWith(path.resolve(allowedPath))
    );
    
    if (!isAllowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only allow reading .md files
    if (!filePath.toLowerCase().endsWith('.md')) {
      return NextResponse.json({ error: 'Only markdown files are allowed' }, { status: 403 });
    }

    const content = await fs.readFile(filePath, 'utf8');
    
    return NextResponse.json({
      content,
      path: filePath,
      name: path.basename(filePath)
    });
    
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
