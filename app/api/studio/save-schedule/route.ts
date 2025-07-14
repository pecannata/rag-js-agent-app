import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery, truncateJSON } from '../../../lib/database';

interface ScheduleSlot {
  id: string;
  day: string;
  time: string;
  studentName: string;
  lessonType: string;
  teacher?: string;
  teacherColor?: string;
  studio?: string;
  status?: string;
  notes: string;
  color?: string;
}

interface WeekSchedule {
  weekOf: string;
  lessonId?: string;
  slots: ScheduleSlot[];
  teachers?: Record<string, string>;
  studios?: string[];
  weekInfo?: {
    sheet_name: string;
    week_identifier: string;
    source_file?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('💾 SAVE-SCHEDULE: Received request body:', truncateJSON(body));
    
    const { week_start, schedule_data }: { week_start: string; schedule_data: WeekSchedule } = body;

    if (!week_start || !schedule_data) {
      return NextResponse.json({ error: 'Missing required fields: week_start and schedule_data' }, { status: 400 });
    }

    console.log('💾 SAVE-SCHEDULE: Saving schedule for week:', week_start);
    console.log('📝 SAVE-SCHEDULE: Schedule data:', truncateJSON(schedule_data));

    // Transform slots back to the exact Excel upload format
    // Group slots by time+day combinations to match the original Excel upload format
    const scheduleSlotMap = new Map<string, any>();

    // Group slots by time+day (each time+day gets its own schedule entry)
    schedule_data.slots.forEach(slot => {
      const key = `${slot.time}-${slot.day}`; // Unique key for each time+day combination
      
      if (!scheduleSlotMap.has(key)) {
        scheduleSlotMap.set(key, {
          time: slot.time,
          day: slot.day,
          lessons: []
        });
      }
      
      const scheduleSlot = scheduleSlotMap.get(key);
      
      // Add lesson data in the exact format expected by the schedule reader
      scheduleSlot.lessons.push({
        student_info: slot.studentName || '',
        teacher: slot.teacher || '',
        lesson_type: slot.lessonType || 'Solo',
        studio: slot.studio || 'Studio 1',
        notes: slot.notes || '',
        color: slot.color || slot.teacherColor || null
      });
    });

    // Convert map to array and sort by time, then by day
    const scheduleData = Array.from(scheduleSlotMap.values()).sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      const timeComparison = timeA[0] - timeB[0] || timeA[1] - timeB[1];
      if (timeComparison !== 0) return timeComparison;
      
      // If times are equal, sort by day
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });

    // Create the full week JSON structure
    const fullWeekJson = {
      week_info: schedule_data.weekInfo || {
        sheet_name: `Week of ${week_start}`,
        week_identifier: week_start,
        source_file: 'Manual Save'
      },
      teachers: schedule_data.teachers || {},
      studios: schedule_data.studios || ['Studio 1', 'Studio 2', 'Studio 3'],
      schedule: scheduleData
    };

    console.log('🔄 SAVE-SCHEDULE: Transformed JSON:', truncateJSON(fullWeekJson));

    const jsonString = JSON.stringify(fullWeekJson);
    console.log('📊 SAVE-SCHEDULE: JSON string length:', jsonString.length);

    // First check if record exists
    const checkQuery = `
      SELECT COUNT(*) as record_count
      FROM STUDIO_PRIVATE_LESSONS 
      WHERE WEEK_START_DATE = TO_DATE(?, 'YYYY-MM-DD')
    `;
    
    console.log('🔍 SAVE-SCHEDULE: Checking for existing record for week:', week_start);
    const checkResult = await executeQuery(checkQuery, [week_start]);
    const recordExists = checkResult[0]?.record_count > 0;
    console.log('📊 SAVE-SCHEDULE: Record exists:', recordExists);

    if (recordExists) {
      // Delete existing record
      const deleteQuery = `
        DELETE FROM STUDIO_PRIVATE_LESSONS 
        WHERE WEEK_START_DATE = TO_DATE(?, 'YYYY-MM-DD')
      `;
      
      console.log('🗑️ SAVE-SCHEDULE: Deleting existing record for week:', week_start);
      await executeQuery(deleteQuery, [week_start]);
      console.log('✅ SAVE-SCHEDULE: Deleted existing record');
    }

    // Insert new record with CLOB chunking for large JSON
    if (jsonString.length > 4000) {
      console.log('⚠️ SAVE-SCHEDULE: JSON string is too long, using TO_CLOB() concatenation approach for INSERT...');
      
      // Split the JSON into manageable chunks for Oracle (less than 4000 chars each)
      const chunkSize = 3900; // Safe size under 4000 char limit
      const chunks: string[] = [];
      
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        chunks.push(jsonString.substring(i, i + chunkSize));
      }
      
      console.log(`📊 SAVE-SCHEDULE: Split into ${chunks.length} chunks for TO_CLOB() concatenation`);
      
      // Build INSERT statement with TO_CLOB() concatenation
      let insertQuery = `INSERT INTO STUDIO_PRIVATE_LESSONS (WEEK_START_DATE, FULL_WEEK_JSON, CREATED_DATE, MODIFIED_DATE) VALUES (TO_DATE('${week_start}', 'YYYY-MM-DD'), `;
      
      // Add each chunk as TO_CLOB('chunk') concatenated with ||
      const clobParts = chunks.map(chunk => {
        // Escape single quotes in the chunk for SQL
        const escapedChunk = chunk.replace(/'/g, "''");
        return `TO_CLOB('${escapedChunk}')`;
      });
      
      insertQuery += clobParts.join(' || ');
      insertQuery += ', SYSTIMESTAMP, SYSTIMESTAMP)';
      
      console.log('📊 SAVE-SCHEDULE: Executing TO_CLOB concatenation insert');
      console.log('📊 SAVE-SCHEDULE: Total JSON length:', jsonString.length);
      console.log('📊 SAVE-SCHEDULE: Query length:', insertQuery.length);
      console.log('📊 SAVE-SCHEDULE: Query preview:', truncateJSON(insertQuery, 200));
      
      await executeQuery(insertQuery, []);
      console.log('✅ SAVE-SCHEDULE: Created new schedule record with TO_CLOB');
    } else {
      // Normal insert for smaller JSON
      const insertQuery = `
        INSERT INTO STUDIO_PRIVATE_LESSONS 
        (WEEK_START_DATE, FULL_WEEK_JSON, CREATED_DATE, MODIFIED_DATE)
        VALUES (TO_DATE(?, 'YYYY-MM-DD'), ?, SYSTIMESTAMP, SYSTIMESTAMP)
      `;
      
      await executeQuery(insertQuery, [week_start, jsonString]);
      console.log('✅ SAVE-SCHEDULE: Created new schedule record');
    }

    // Commit the transaction
    await executeQuery('COMMIT');
    console.log('✅ SAVE-SCHEDULE: Successfully committed schedule save');

    return NextResponse.json({ 
      success: true, 
      message: 'Schedule saved successfully',
      weekStart: week_start,
      slotsCount: schedule_data.slots.length
    });

  } catch (error) {
    console.error('❌ Error saving schedule:', error);
    
    // Rollback on error
    try {
      await executeQuery('ROLLBACK');
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    
    return NextResponse.json({ 
      error: 'Failed to save schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
