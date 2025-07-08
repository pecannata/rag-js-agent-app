import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ReadmeFile {
  name: string;
  path: string;
  relativePath: string;
  type: 'file';
}

interface DirectoryInfo {
  name: string;
  path: string;
  relativePath: string;
  type: 'directory';
  readmeFiles: ReadmeFile[];
  subdirectories?: DirectoryInfo[];
}

async function findReadmeFiles(dirPath: string, basePath: string, currentDepth: number = 0): Promise<{directories: DirectoryInfo[], readmeFiles: ReadmeFile[]}> {
  try {
    if (currentDepth >= 3) return { directories: [], readmeFiles: [] }; // Limit to 3 levels
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const directories: DirectoryInfo[] = [];
    const readmeFiles: ReadmeFile[] = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subResult = await findReadmeFiles(fullPath, basePath, currentDepth + 1);
        
        // Only include directory if it has README files in its subtree
        const hasReadmesInSubtree = subResult.readmeFiles.length > 0;
        
        if (hasReadmesInSubtree) {
          // Create directory info with its README files and subdirectories
          const dirInfo: DirectoryInfo = {
            name: entry.name,
            path: fullPath,
            relativePath,
            type: 'directory',
            readmeFiles: subResult.readmeFiles.filter(f => path.dirname(f.path) === fullPath),
            subdirectories: subResult.directories
          };
          
          directories.push(dirInfo);
          
          // Add all README files from subdirectories
          readmeFiles.push(...subResult.readmeFiles);
        }
      } else if (entry.isFile() && entry.name.toLowerCase().startsWith('readme') && entry.name.toLowerCase().endsWith('.md')) {
        readmeFiles.push({
          name: entry.name,
          path: fullPath,
          relativePath,
          type: 'file'
        });
      }
    }
    
    return { directories, readmeFiles };
  } catch (error) {
    console.error('Error reading directory:', dirPath, error);
    return { directories: [], readmeFiles: [] };
  }
}

async function findParentReadmeFiles(dirPath: string): Promise<ReadmeFile[]> {
  try {
    const parentPath = path.dirname(dirPath);
    if (parentPath === dirPath) {
      // We've reached the root directory
      return [];
    }
    
    const entries = await fs.readdir(parentPath, { withFileTypes: true });
    const parentReadmeFiles: ReadmeFile[] = [];
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().startsWith('readme') && entry.name.toLowerCase().endsWith('.md')) {
        const fullPath = path.join(parentPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);
        
        parentReadmeFiles.push({
          name: entry.name,
          path: fullPath,
          relativePath,
          type: 'file'
        });
      }
    }
    
    return parentReadmeFiles;
  } catch (error) {
    console.error('Error reading parent directory:', error);
    return [];
  }
}

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

    const result = await findReadmeFiles(dirPath, dirPath);
    const parentReadmeFiles = await findParentReadmeFiles(dirPath);
    
    // Group README files by their containing directory
    const groupedReadmeFiles: { [key: string]: ReadmeFile[] } = {};
    result.readmeFiles.forEach(file => {
      const dir = path.dirname(file.path);
      if (!groupedReadmeFiles[dir]) {
        groupedReadmeFiles[dir] = [];
      }
      groupedReadmeFiles[dir].push(file);
    });
    
    return NextResponse.json({
      currentPath: dirPath,
      parentPath: path.dirname(dirPath),
      directories: result.directories.sort((a, b) => a.name.localeCompare(b.name)),
      readmeFiles: result.readmeFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
      parentReadmeFiles: parentReadmeFiles.sort((a, b) => a.name.localeCompare(b.name)),
      groupedReadmeFiles
    });
    
  } catch (error) {
    console.error('Error browsing README files:', error);
    return NextResponse.json({ error: 'Failed to browse README files' }, { status: 500 });
  }
}
