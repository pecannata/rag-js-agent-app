import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const currentPath = formData.get('currentPath') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!currentPath) {
      return NextResponse.json({ error: 'No current path provided' }, { status: 400 });
    }

    // Create README_files directory if it doesn't exist
    const filesDir = path.join(currentPath, 'README_files');
    if (!existsSync(filesDir)) {
      await mkdir(filesDir, { recursive: true });
    }

    // Generate unique filename to prevent conflicts
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const fileName = `${baseName}_${timestamp}${extension}`;
    const filePath = path.join(filesDir, fileName);

    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return relative path for markdown
    const relativePath = `./README_files/${fileName}`;

    console.log('File uploaded successfully:', {
      originalName,
      fileName,
      filePath,
      relativePath,
      size: file.size,
      type: file.type
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      path: relativePath,
      originalName,
      fileName,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
