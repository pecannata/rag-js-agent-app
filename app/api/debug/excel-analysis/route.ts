import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const analysis: any = {
      fileName: file.name,
      fileSize: file.size,
      sheetNames: workbook.SheetNames,
      sheets: {}
    };

    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Get sheet range
      const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
      
      const sheetAnalysis = {
        rowCount: jsonData.length,
        range: range ? `${range.s.c},${range.s.r} to ${range.e.c},${range.e.r}` : 'Unknown',
        firstFewRows: jsonData.slice(0, 15), // Show first 15 rows
        headerAnalysis: analyzeHeaders(jsonData),
        contentAnalysis: analyzeContent(jsonData),
        potentialScheduleData: findPotentialScheduleData(jsonData)
      };
      
      analysis.sheets[sheetName] = sheetAnalysis;
    }
    
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze Excel file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function analyzeHeaders(jsonData: any[][]): any {
  const headerAnalysis: any = {
    possibleHeaderRows: [],
    dayColumnMappings: {},
    timeColumnIndices: []
  };
  
  // Look for rows that might contain headers
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    const rowAnalysis = {
      rowIndex: i,
      content: row,
      hasTimeKeyword: false,
      dayKeywords: [] as string[],
      totalCells: row.length,
      nonEmptyCells: row.filter(cell => cell !== null && cell !== undefined && cell !== '').length
    };
    
    // Check for time-related keywords
    row.forEach((cell, colIndex) => {
      if (cell && typeof cell === 'string') {
        const cellStr = cell.toString().toLowerCase();
        if (cellStr.includes('time')) {
          rowAnalysis.hasTimeKeyword = true;
          headerAnalysis.timeColumnIndices.push(colIndex);
        }
        
        // Check for day names
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
          if (cellStr.includes(day)) {
            rowAnalysis.dayKeywords.push(day);
            if (!headerAnalysis.dayColumnMappings[day]) {
              headerAnalysis.dayColumnMappings[day] = [];
            }
            headerAnalysis.dayColumnMappings[day].push({ row: i, col: colIndex });
          }
        });
      }
    });
    
    headerAnalysis.possibleHeaderRows.push(rowAnalysis);
  }
  
  return headerAnalysis;
}

function analyzeContent(jsonData: any[][]): any {
  const contentAnalysis = {
    totalRows: jsonData.length,
    totalNonEmptyRows: 0,
    potentialTimeSlots: [] as any[],
    studentNamePatterns: [] as any[],
    lessonTypePatterns: [] as any[],
    teacherNamePatterns: [] as any[]
  };
  
  const timePattern = /\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i;
  const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
  const lessonTypeWords = ['solo', 'choreo', 'choreography', 'private', 'group', 'lesson'];
  
  jsonData.forEach((row, rowIndex) => {
    if (!row || row.length === 0) return;
    
    const nonEmptyCell = row.some(cell => cell !== null && cell !== undefined && cell !== '');
    if (nonEmptyCell) {
      contentAnalysis.totalNonEmptyRows++;
    }
    
    row.forEach((cell, colIndex) => {
      if (!cell) return;
      
      const cellStr = cell.toString();
      
      // Check for time patterns
      const timeMatch = cellStr.match(timePattern);
      if (timeMatch) {
        contentAnalysis.potentialTimeSlots.push({
          row: rowIndex,
          col: colIndex,
          time: timeMatch[0],
          content: cellStr
        });
      }
      
      // Check for potential student names
      const nameMatches = cellStr.match(namePattern);
      if (nameMatches) {
        nameMatches.forEach((name: string) => {
          contentAnalysis.studentNamePatterns.push({
            row: rowIndex,
            col: colIndex,
            name: name,
            context: cellStr
          });
        });
      }
      
      // Check for lesson type keywords
      lessonTypeWords.forEach((keyword: string) => {
        if (cellStr.toLowerCase().includes(keyword)) {
          contentAnalysis.lessonTypePatterns.push({
            row: rowIndex,
            col: colIndex,
            keyword: keyword,
            context: cellStr
          });
        }
      });
    });
  });
  
  return contentAnalysis;
}

function findPotentialScheduleData(jsonData: any[][]): any {
  const scheduleData = {
    likelyScheduleRows: [] as any[],
    patterns: {
      timeInFirstColumn: false,
      studentsInDayColumns: false,
      multipleEntriesPerCell: false
    }
  };
  
  // Look for rows that start with time and have content in other columns
  jsonData.forEach((row, rowIndex) => {
    if (!row || row.length === 0) return;
    
    const firstCell = row[0];
    if (!firstCell) return;
    
    const firstCellStr = firstCell.toString();
    const timePattern = /\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i;
    
    if (timePattern.test(firstCellStr)) {
      scheduleData.patterns.timeInFirstColumn = true;
      
      // Check if other columns have content
      const hasOtherContent = row.slice(1).some(cell => 
        cell && cell.toString().trim() !== ''
      );
      
      if (hasOtherContent) {
        scheduleData.likelyScheduleRows.push({
          rowIndex: rowIndex,
          time: firstCellStr,
          content: row.slice(1, 8) // Next 7 columns (for days)
        });
      }
    }
  });
  
  // Check for multiple entries per cell (separated by newlines)
  jsonData.forEach((row, _rowIndex) => {
    row.forEach((cell, _colIndex) => {
      if (cell && typeof cell === 'string' && cell.includes('\n')) {
        scheduleData.patterns.multipleEntriesPerCell = true;
      }
    });
  });
  
  return scheduleData;
}
