import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { path: filePath, content } = await request.json();
    
    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
    }
    
    // Security check - only allow saving within user's home directory or project directories
    const userHome = process.env.HOME || '/Users';
    const allowedPaths = [
      userHome,
      process.cwd(),
      '/Users'
    ];
    
    const resolvedPath = path.resolve(filePath);
    const isAllowed = allowedPaths.some(allowedPath => 
      resolvedPath.startsWith(path.resolve(allowedPath))
    );
    
    if (!isAllowed) {
      return NextResponse.json({ error: 'Access denied to: ' + resolvedPath }, { status: 403 });
    }
    
    // Ensure the file is a .md file
    const fileName = path.basename(filePath).toLowerCase();
    if (!fileName.endsWith('.md')) {
      return NextResponse.json({ error: 'Can only save .md files' }, { status: 400 });
    }
    
    // Save the file
    await fs.writeFile(filePath, content, 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'File saved successfully',
      path: filePath 
    });
    
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}
