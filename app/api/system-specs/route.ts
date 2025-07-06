import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get hardware specifications
    const hardwareOutput = await execAsync('system_profiler SPHardwareDataType');
    const displayOutput = await execAsync('system_profiler SPDisplaysDataType');
    
    // Parse hardware info
    const hardwareLines = hardwareOutput.stdout.split('\n');
    const displayLines = displayOutput.stdout.split('\n');
    
    // Extract key information
    const specs = {
      modelName: extractValue(hardwareLines, 'Model Name'),
      chip: extractValue(hardwareLines, 'Chip'),
      totalCores: extractValue(hardwareLines, 'Total Number of Cores'),
      memory: extractValue(hardwareLines, 'Memory'),
      gpuCores: extractValue(displayLines, 'Total Number of Cores'),
      metalSupport: extractValue(displayLines, 'Metal Support'),
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      specs
    });
    
  } catch (error) {
    console.error('Error fetching system specs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch system specifications'
    }, { status: 500 });
  }
}

function extractValue(lines: string[], key: string): string {
  const line = lines.find(line => line.trim().startsWith(key));
  if (!line) return 'Unknown';
  
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return 'Unknown';
  
  return line.substring(colonIndex + 1).trim();
}
