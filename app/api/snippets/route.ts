import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Snippet {
  id: string;
  name: string;
  sqlQuery: string;
  userMessage: string;
  createdAt: string;
}

const SNIPPETS_FILE = path.join(process.cwd(), 'data', 'snippets.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(SNIPPETS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Read snippets from file
async function readSnippets(): Promise<Snippet[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(SNIPPETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (_error) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

// Write snippets to file
async function writeSnippets(snippets: Snippet[]): Promise<void> {
  try {
    await ensureDataDirectory();
    await fs.writeFile(SNIPPETS_FILE, JSON.stringify(snippets, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing snippets file:', error);
    throw new Error('Failed to save snippets');
  }
}

// GET - Retrieve all snippets
export async function GET() {
  try {
    const snippets = await readSnippets();
    return NextResponse.json({ success: true, snippets });
  } catch (error) {
    console.error('Error reading snippets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read snippets' },
      { status: 500 }
    );
  }
}

// POST - Create or update snippet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snippet, action } = body;

    if (!snippet || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing snippet data or action' },
        { status: 400 }
      );
    }

    const snippets = await readSnippets();

    switch (action) {
      case 'create':
        // Add new snippet
        snippets.push(snippet);
        break;

      case 'update':
        // Update existing snippet
        const updateIndex = snippets.findIndex(s => s.id === snippet.id);
        if (updateIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Snippet not found' },
            { status: 404 }
          );
        }
        snippets[updateIndex] = snippet;
        break;

      case 'delete':
        // Delete snippet
        const deleteIndex = snippets.findIndex(s => s.id === snippet.id);
        if (deleteIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Snippet not found' },
            { status: 404 }
          );
        }
        snippets.splice(deleteIndex, 1);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    await writeSnippets(snippets);
    return NextResponse.json({ success: true, snippets });
  } catch (error) {
    console.error('Error managing snippets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage snippets' },
      { status: 500 }
    );
  }
}
