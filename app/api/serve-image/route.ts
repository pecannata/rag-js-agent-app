import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Generate a simple placeholder image as SVG
function generatePlaceholderImage() {
  const svgContent = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect x="10" y="10" width="280" height="180" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="150" y="90" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">Image Not Found</text>
      <text x="150" y="110" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">📷</text>
      <text x="150" y="130" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af" text-anchor="middle">File may have been moved or deleted</text>
    </svg>
  `;
  
  return new NextResponse(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');
    
    if (!imagePath) {
      return NextResponse.json({ error: 'Missing image path' }, { status: 400 });
    }

    // Resolve the absolute path
    const absolutePath = path.resolve(imagePath);
    
    // Security check - ensure the path is safe
    if (!absolutePath || absolutePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    // Check if file exists first
    try {
      await fs.access(absolutePath);
    } catch {
      console.log(`Image not found: ${absolutePath}`);
      // Return a placeholder image or 404
      return generatePlaceholderImage();
    }
    
    // Read the image file
    const imageBuffer = await fs.readFile(absolutePath);
    
    // Determine content type based on file extension
    const ext = path.extname(absolutePath).toLowerCase();
    let contentType = 'image/png'; // default
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
