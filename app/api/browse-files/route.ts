import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userHome = process.env.HOME || '/Users';
    const dirPath = searchParams.get('path') || userHome;
    
    // Security check - only allow browsing within user's home directory or project directories
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

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const directories = [];
    const readmeFiles = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        directories.push({
          name: entry.name,
          path: fullPath,
          type: 'directory'
        });
      } else if (entry.isFile() && entry.name.toLowerCase() === 'readme.md') {
        readmeFiles.push({
          name: entry.name,
          path: fullPath,
          type: 'file'
        });
      }
    }
    
    return NextResponse.json({
      currentPath: dirPath,
      parentPath: path.dirname(dirPath),
      directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
      readmeFiles: readmeFiles.sort((a, b) => a.name.localeCompare(b.name))
    });
    
  } catch (error) {
    console.error('Error browsing directory:', error);
    return NextResponse.json({ error: 'Failed to browse directory' }, { status: 500 });
  }
}
