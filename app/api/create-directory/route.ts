import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { dirPath, dirName } = await request.json();
    
    if (!dirPath || !dirName) {
      return NextResponse.json({ error: 'Directory path and name are required' }, { status: 400 });
    }

    // Security check - only allow creating directories within user's home directory or project directories
    const userHome = process.env.HOME || '/Users';
    const allowedPaths = [
      userHome,
      process.cwd(),
      '/Users'
    ];
    
    const resolvedPath = path.resolve(dirPath);
    const isAllowed = allowedPaths.some(allowedPath => 
      resolvedPath.startsWith(path.resolve(allowedPath))
    );
    
    if (!isAllowed) {
      return NextResponse.json({ error: 'Access denied to: ' + resolvedPath }, { status: 403 });
    }

    // Validate directory name
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(dirName)) {
      return NextResponse.json({ error: 'Directory name contains invalid characters' }, { status: 400 });
    }

    const newDirPath = path.join(dirPath, dirName);
    
    // Check if directory already exists
    try {
      await fs.access(newDirPath);
      return NextResponse.json({ error: 'Directory already exists' }, { status: 409 });
    } catch {
      // Directory doesn't exist, which is what we want
    }

    // Create the directory
    await fs.mkdir(newDirPath, { recursive: true });
    
    return NextResponse.json({ 
      success: true, 
      path: newDirPath,
      message: 'Directory created successfully' 
    });
    
  } catch (error) {
    console.error('Error creating directory:', error);
    return NextResponse.json({ error: 'Failed to create directory' }, { status: 500 });
  }
}
