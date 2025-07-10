import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const NOTES_DIR = path.join(process.cwd(), 'data', 'notes');
const NOTES_FILE = path.join(NOTES_DIR, 'notepad.txt');

// Ensure the notes directory exists
async function ensureNotesDir() {
  if (!existsSync(NOTES_DIR)) {
    await mkdir(NOTES_DIR, { recursive: true });
  }
}

// GET /api/notepad - Get notepad content
export async function GET() {
  try {
    await ensureNotesDir();
    
    let content = '';
    if (existsSync(NOTES_FILE)) {
      content = await readFile(NOTES_FILE, 'utf-8');
    }
    
    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error('Error reading notepad:', error);
    return NextResponse.json(
      { error: 'Failed to read notepad' },
      { status: 500 }
    );
  }
}

// POST /api/notepad - Save notepad content
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }
    
    await ensureNotesDir();
    await writeFile(NOTES_FILE, content, 'utf-8');
    
    return NextResponse.json({ success: true, message: 'Note saved successfully' });
  } catch (error) {
    console.error('Error saving notepad:', error);
    return NextResponse.json(
      { error: 'Failed to save notepad' },
      { status: 500 }
    );
  }
}
