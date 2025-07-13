import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';

export function GET() {
  try {
    const filePath = path.resolve('app/debug-excel.html');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return new NextResponse(fileContent, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    return new NextResponse('Error loading debug tool', { status: 500 });
  }
}
