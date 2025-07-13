import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../lib/database';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

// Debug logging function
function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp}: ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`;
  console.log(message, data || '');
  try {
    appendFileSync(join(process.cwd(), 'upload-debug.log'), logEntry);
  } catch (err) {
    console.error('Failed to write debug log:', err);
  }
}

interface LessonData {
  student_info: string;
  teacher: string;
  lesson_type: string;
  studio: string;
  notes: string;
  color?: string | null; // Excel cell color
}

interface ScheduleSlot {
  time: string;
  day: string;
  lessons: LessonData[];
}

interface WeekInfo {
  sheet_name: string;
  week_identifier: string;
  source_file?: string;
}

interface UploadData {
  week_info: WeekInfo;
  schedule: ScheduleSlot[];
  teacher_colors?: { [key: string]: string };
}

export async function POST(request: NextRequest) {
  debugLog('🚀 POST /api/studio/upload-schedule - Starting request processing');
  
  try {
    debugLog('🔑 Checking session...');
    const session = await getServerSession();
    if (!session) {
      debugLog('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    debugLog('✅ Session validated');

    debugLog('📥 Reading request body...');
    const data: UploadData = await request.json();
    debugLog('📋 Request data received:', {
      hasWeekInfo: !!data.week_info,
      hasSchedule: !!data.schedule,
      scheduleLength: data.schedule?.length || 0,
      weekInfo: data.week_info
    });
    
    const { week_info, schedule, teacher_colors } = data;
    
    // Log the teacher colors received from frontend
    if (teacher_colors) {
      debugLog('🎨 Teacher colors received from frontend:', teacher_colors);
    } else {
      debugLog('❌ No teacher colors received from frontend');
    }
    
    if (!week_info || !schedule) {
      debugLog('❌ Missing required data:', { week_info, schedule });
      return NextResponse.json(
        { 
          error: 'Missing week_info or schedule data', 
          details: { hasWeekInfo: !!week_info, hasSchedule: !!schedule } 
        },
        { status: 400 }
      );
    }

    debugLog('✅ Data validation passed, processing upload...');
    
    // Parse week identifier to extract dates from sheet name
    const weekIdentifier = week_info.week_identifier;
    const sheetName = week_info.sheet_name;
    console.log('📅 Processing week identifier:', weekIdentifier);
    console.log('📅 Processing sheet name:', sheetName);
    
    let weekStartDate: string;
    try {
      // Extract date from sheet name like "92-98", "99-915", "1118-1124", etc.
      weekStartDate = parseWeekStartFromSheetName(sheetName);
      console.log('📅 Parsed week start date:', weekStartDate);
    } catch (dateError) {
      console.warn('⚠️ Could not parse date from sheet name, using current date:', dateError);
      weekStartDate = new Date().toISOString().split('T')[0];
    }
    
    console.log('📅 Using week start date:', weekStartDate);

    // Create the full week data structure
    const fullWeekData = {
      week_info,
      schedule,
      teachers: extractTeachers(schedule, teacher_colors),
      studios: extractStudios(schedule)
    };

    console.log('💾 Inserting lesson data into database...');
    
    // Insert or update the lesson in the database - simple INSERT for CLOB
    const insertLessonQuery = `
      INSERT INTO STUDIO_PRIVATE_LESSONS 
      (WEEK_START_DATE, FULL_WEEK_JSON)
      VALUES (TO_DATE(?, 'YYYY-MM-DD'), ?)
    `;
    
    console.log('💾 Attempting to insert data with:', {
      weekStartDate,
      jsonLength: JSON.stringify(fullWeekData).length,
      scheduleLength: schedule.length
    });
    
    try {
      debugLog('🚀 Executing insert query...');
      const jsonString = JSON.stringify(fullWeekData);
      debugLog('📊 JSON string length:', jsonString.length);
      debugLog('🔍 JSON contains $ signs:', jsonString.includes('$'));
      debugLog('🔍 JSON first 200 chars:', jsonString.substring(0, 200));
      
      // For large JSON strings, use TO_CLOB() concatenation approach from errors.md
      if (jsonString.length > 4000) {
        debugLog('⚠️ JSON string is too long, using TO_CLOB() concatenation approach...');
        
        // Split the JSON into manageable chunks for Oracle (less than 4000 chars each)
        const chunkSize = 3900; // Safe size under 4000 char limit
        const chunks: string[] = [];
        
        for (let i = 0; i < jsonString.length; i += chunkSize) {
          chunks.push(jsonString.substring(i, i + chunkSize));
        }
        
        debugLog(`📊 Split into ${chunks.length} chunks for TO_CLOB() concatenation`);
        
        // Build INSERT statement with TO_CLOB() concatenation
        let insertQuery = `INSERT INTO STUDIO_PRIVATE_LESSONS (WEEK_START_DATE, FULL_WEEK_JSON) VALUES (TO_DATE('${weekStartDate}', 'YYYY-MM-DD'), `;
        
        // Add each chunk as TO_CLOB('chunk') concatenated with ||
        const clobParts = chunks.map(chunk => {
          // Escape single quotes in the chunk for SQL
          const escapedChunk = chunk.replace(/'/g, "''");
          return `TO_CLOB('${escapedChunk}')`;
        });
        
        insertQuery += clobParts.join(' || ') + ')';
        
        debugLog('📊 Executing TO_CLOB concatenation insert');
        debugLog('📊 Total JSON length:', jsonString.length);
        debugLog('📊 Query length:', insertQuery.length);
        
        const insertResult = await executeQuery(insertQuery, []);
        debugLog('✅ TO_CLOB Insert result (ALL data stored):', insertResult);
      } else {
        const insertResult = await executeQuery(insertLessonQuery, [
          weekStartDate,
          jsonString
        ]);
        
        debugLog('✅ Insert result:', insertResult);
      }
      
      // Explicit commit
      debugLog('💾 Executing COMMIT...');
      await executeQuery('COMMIT');
      debugLog('✅ Successfully inserted and committed lesson data');
      
      // Verify the insert
      debugLog('🔍 Verifying insert...');
      const verifyResult = await executeQuery(
        'SELECT COUNT(*) as count FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = TO_DATE(?, \'YYYY-MM-DD\')',
        [weekStartDate]
      );
      debugLog('🔍 Verification count:', verifyResult);
      
    } catch (dbError) {
      console.error('❌ Database insertion failed:', {
        error: dbError,
        errorMessage: dbError instanceof Error ? dbError.message : 'Unknown database error',
        weekStartDate,
        sheetName: week_info.sheet_name,
        errorStack: dbError instanceof Error ? dbError.stack : undefined
      });
      
      // If insertion fails, try to update existing record
      console.log('🔄 Attempting to update existing record...');
      const updateLessonQuery = `
        UPDATE STUDIO_PRIVATE_LESSONS 
        SET FULL_WEEK_JSON = ?
        WHERE WEEK_START_DATE = TO_DATE(?, 'YYYY-MM-DD')
      `;
      
      try {
        const updateResult = await executeQuery(updateLessonQuery, [
          JSON.stringify(fullWeekData),
          weekStartDate
        ]);
        console.log('✅ Update result:', updateResult);
        
        // Explicit commit
        await executeQuery('COMMIT');
        console.log('✅ Successfully updated and committed lesson data');
        
        // Verify the update
        const verifyResult = await executeQuery(
          'SELECT COUNT(*) as count FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = TO_DATE(?, \'YYYY-MM-DD\')',
          [weekStartDate]
        );
        console.log('🔍 Verification count after update:', verifyResult);
        
      } catch (updateError) {
        console.error('❌ Database update also failed:', {
          error: updateError,
          errorMessage: updateError instanceof Error ? updateError.message : 'Unknown error',
          errorStack: updateError instanceof Error ? updateError.stack : undefined
        });
        await executeQuery('ROLLBACK').catch(rollbackError => 
          console.error('❌ Rollback failed:', rollbackError)
        );
        
        // Try one more time with a simpler approach - just store a summary
        console.log('🔄 Attempting simplified insert with summary data...');
        try {
          const summaryData = {
            week_info,
            schedule_summary: {
              total_slots: schedule.length,
              total_lessons: schedule.reduce((sum, slot) => sum + (slot.lessons?.length || 0), 0),
              studios: extractStudios(schedule),
              teachers: Object.keys(extractTeachers(schedule))
            }
          };
          
          const summaryInsertQuery = `
            INSERT INTO STUDIO_PRIVATE_LESSONS 
            (WEEK_START_DATE, FULL_WEEK_JSON)
            VALUES (TO_DATE(?, 'YYYY-MM-DD'), ?)
          `;
          
          const summaryResult = await executeQuery(summaryInsertQuery, [
            weekStartDate,
            JSON.stringify(summaryData)
          ]);
          
          await executeQuery('COMMIT');
          console.log('✅ Successfully inserted simplified summary data');
        } catch (summaryError) {
          console.error('❌ Even summary insert failed:', summaryError);
          await executeQuery('ROLLBACK').catch(rollbackError => 
            console.error('❌ Final rollback failed:', rollbackError)
          );
          throw summaryError;
        }
      }
    }

    console.log('🔄 Processing schedule slots (no database lookups)...');
    let totalSlotsProcessed = 0;
    let totalLessonsProcessed = 0;
    
    // Count processed items without database queries
    for (const slot of schedule) {
      totalSlotsProcessed++;
      if (slot.lessons && Array.isArray(slot.lessons)) {
        totalLessonsProcessed += slot.lessons.length;
      }
    }
    
    console.log(`✅ Processed ${totalSlotsProcessed} schedule slots with ${totalLessonsProcessed} total lessons`);
    console.log('⚡ Skipped database lookups for faster processing');

    console.log('🎉 Successfully processed schedule:', {
      sheetName: week_info.sheet_name,
      weekStartDate,
      totalSlotsProcessed,
      totalLessonsProcessed
    });

    return NextResponse.json({ 
      success: true, 
      sheet_name: week_info.sheet_name,
      week_start_date: weekStartDate,
      slots_processed: totalSlotsProcessed,
      lessons_processed: totalLessonsProcessed
    });
    
  } catch (error) {
    console.error('❌ Critical error in upload-schedule API:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : 'Unknown'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to upload schedule',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper function to extract teachers from schedule data
function extractTeachers(schedule: ScheduleSlot[], teacherColors?: { [key: string]: string }): Record<string, string> {
  const teachers: Record<string, string> = {};
  
  debugLog('🎨 Processing teacher extraction with colors:', teacherColors);
  
  // First, add all teacher colors from the frontend legend extraction
  if (teacherColors) {
    Object.entries(teacherColors).forEach(([teacherName, color]) => {
      teachers[teacherName] = color;
      debugLog(`✅ Added teacher from legend: ${teacherName} -> ${color}`);
    });
  }
  
  // Then, add any teachers found in the schedule lessons that aren't already mapped
  schedule.forEach(slot => {
    slot.lessons?.forEach(lesson => {
      if (lesson.teacher && lesson.teacher.trim()) {
        const teacherName = lesson.teacher.trim();
        if (!teachers[teacherName]) {
          teachers[teacherName] = '#3B82F6'; // Default blue color for unmapped teachers
          debugLog(`✅ Added teacher from lessons: ${teacherName} -> #3B82F6`);
        }
      }
    });
  });
  
  // Also process any instructor names that appear in the student_info field
  // This handles cases where the legend area is included in the schedule
  const knownInstructors = ['MEGHAN', 'RYANN', 'PAIGE', 'GRACIE', 'CARALIN', 'HUNTER', 'EMERY', 'ARDEN'];
  
  schedule.forEach(slot => {
    slot.lessons?.forEach(lesson => {
      if (lesson.student_info && typeof lesson.student_info === 'string') {
        const studentInfo = lesson.student_info.toUpperCase();
        
        // Check if this lesson contains a known instructor name (legend entry)
        knownInstructors.forEach(instructor => {
          if (studentInfo.includes(instructor)) {
            const instructorName = instructor;
            if (!teachers[instructorName] && lesson.color) {
              teachers[instructorName] = lesson.color;
              debugLog(`✅ Added instructor from legend area: ${instructorName} -> ${lesson.color}`);
            }
          }
        });
      }
    });
  });
  
  debugLog('📊 Final teacher mappings:', teachers);
  return teachers;
}

// Helper function to extract studios from schedule data
function extractStudios(schedule: ScheduleSlot[]): string[] {
  const studios = new Set<string>();
  
  schedule.forEach(slot => {
    slot.lessons?.forEach(lesson => {
      if (lesson.studio && lesson.studio.trim()) {
        studios.add(lesson.studio);
      }
    });
  });
  
  return Array.from(studios);
}

// Helper function to parse week start date from sheet name
function parseWeekStartFromSheetName(sheetName: string): string {
  console.log(`🔍 Parsing sheet name: "${sheetName}"`);
  
  // Handle special cases
  if (sheetName.toLowerCase().includes('spring break')) {
    // For "Spring Break 317-323", parse the date range
    const match = sheetName.match(/(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})/);
    if (match) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      return `2025-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  
  // Clean the sheet name - remove extra spaces and normalize
  const cleanedSheetName = sheetName.trim().replace(/\s+/g, '');
  console.log(`🧹 Cleaned sheet name: "${cleanedSheetName}"`);
  
  // Parse date ranges like "69-615", "60-615", "92-98", "99-915", "1118-1124", etc.
  // This handles cases with or without spaces: "60 -615" becomes "60-615"
  const dateRangeMatch = cleanedSheetName.match(/^(\d+)-(\d+)$/);
  if (dateRangeMatch) {
    const startStr = dateRangeMatch[1];
    console.log(`📅 Parsing start date from: "${startStr}"`);
    
    // Parse the start date
    let month: number, day: number;
    
    if (startStr.length === 2) {
      // Format: "69" = June 9th, "92" = September 2nd
      month = parseInt(startStr[0]);
      day = parseInt(startStr[1]);
      console.log(`📅 Two-digit format: month=${month}, day=${day}`);
    } else if (startStr.length === 3) {
      // Format: "915" = September 15th or "112" = January 12th
      if (startStr[0] === '1' && parseInt(startStr.slice(1)) <= 31) {
        // Likely January ("112" = January 12th)
        month = 1;
        day = parseInt(startStr.slice(1));
        console.log(`📅 Three-digit January format: month=${month}, day=${day}`);
      } else {
        // Likely September ("915" = September 15th)
        month = parseInt(startStr[0]);
        day = parseInt(startStr.slice(1));
        console.log(`📅 Three-digit format: month=${month}, day=${day}`);
      }
    } else if (startStr.length === 4) {
      // Format: "1118" = November 18th, "1216" = December 16th
      month = parseInt(startStr.slice(0, 2));
      day = parseInt(startStr.slice(2));
      console.log(`📅 Four-digit format: month=${month}, day=${day}`);
    } else {
      throw new Error(`Cannot parse date from: ${startStr}`);
    }
    
    // Validate month and day
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month} in ${sheetName}`);
    }
    if (day < 1 || day > 31) {
      throw new Error(`Invalid day: ${day} in ${sheetName}`);
    }
    
    const result = `2025-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    console.log(`✅ Parsed date: ${result}`);
    return result;
  }
  
  // If we can't parse the sheet name, throw an error
  throw new Error(`Cannot parse week start date from sheet name: ${sheetName}`);
}
