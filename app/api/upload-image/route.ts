import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const currentPath = formData.get('currentPath') as string;
    
    if (!image || !currentPath) {
      return NextResponse.json({ error: 'Missing image or current path' }, { status: 400 });
    }

    // Create README_images directory in the current path
    const imagesDir = path.join(currentPath, 'README_images');
    
    try {
      await fs.mkdir(imagesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = image.type.split('/')[1] || 'png';
    const filename = `image_${timestamp}.${extension}`;
    const filepath = path.join(imagesDir, filename);

    // Convert file to buffer and save
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await fs.writeFile(filepath, buffer);

    // Return relative path for markdown
    const relativePath = `./README_images/${filename}`;
    
    return NextResponse.json({ 
      path: relativePath,
      filename: filename,
      size: buffer.length
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
