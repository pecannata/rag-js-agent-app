import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const HISTORY_FILE_PATH = path.join(process.cwd(), 'data', 'message-history.json');

interface MessageHistoryEntry {
  id: string;
  message: string;
  timestamp: string;
  usageCount: number;
}

// Ensure the data directory and file exist
async function ensureHistoryFile() {
  try {
    await fs.access(HISTORY_FILE_PATH);
  } catch (_error) {
    // File doesn't exist, create it
    const dataDir = path.dirname(HISTORY_FILE_PATH);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify([], null, 2));
  }
}

// Read message history from file
async function readMessageHistory(): Promise<MessageHistoryEntry[]> {
  try {
    await ensureHistoryFile();
    const data = await fs.readFile(HISTORY_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading message history:', error);
    return [];
  }
}

// Write message history to file
async function writeMessageHistory(history: MessageHistoryEntry[]): Promise<void> {
  try {
    await ensureHistoryFile();
    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error writing message history:', error);
    throw error;
  }
}

// GET - Retrieve message history
export async function GET() {
  try {
    const history = await readMessageHistory();
    
    // Sort by timestamp (most recent first) and then by usage count (descending)
    const sortedHistory = history
      .sort((a, b) => {
        // Primary sort: timestamp (most recent first)
        const timestampDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (timestampDiff !== 0) {
          return timestampDiff;
        }
        // Secondary sort: usage count (descending) for same timestamp
        return b.usageCount - a.usageCount;
      })
      .slice(0, 10) // Keep only top 10 messages
      .map(entry => entry.message); // Return only the message strings for simplicity
    
    return NextResponse.json({
      success: true,
      history: sortedHistory
    });
  } catch (error) {
    console.error('Failed to get message history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve message history'
    }, { status: 500 });
  }
}

// POST - Add or update message in history
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      }, { status: 400 });
    }
    
    const cleanMessage = message.trim();
    const history = await readMessageHistory();
    
    // Check if message already exists
    const existingIndex = history.findIndex(entry => entry.message === cleanMessage);
    
    if (existingIndex >= 0) {
      // Update existing message
      const existingEntry = history[existingIndex];
      if (existingEntry) {
        existingEntry.usageCount += 1;
        existingEntry.timestamp = new Date().toISOString();
      }
    } else {
      // Add new message
      const newEntry: MessageHistoryEntry = {
        id: Date.now().toString(),
        message: cleanMessage,
        timestamp: new Date().toISOString(),
        usageCount: 1
      };
      history.push(newEntry);
    }
    
    // Keep only the most recent/used 50 entries to prevent file from growing too large
    const trimmedHistory = history
      .sort((a, b) => {
        // Primary sort: timestamp (most recent first)
        const timestampDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (timestampDiff !== 0) {
          return timestampDiff;
        }
        // Secondary sort: usage count (descending) for same timestamp
        return b.usageCount - a.usageCount;
      })
      .slice(0, 50);
    
    await writeMessageHistory(trimmedHistory);
    
    return NextResponse.json({
      success: true,
      message: 'Message added to history successfully'
    });
  } catch (error) {
    console.error('Failed to save message to history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save message to history'
    }, { status: 500 });
  }
}

// DELETE - Clear message history
export async function DELETE() {
  try {
    await writeMessageHistory([]);
    
    return NextResponse.json({
      success: true,
      message: 'Message history cleared successfully'
    });
  } catch (error) {
    console.error('Failed to clear message history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear message history'
    }, { status: 500 });
  }
}
