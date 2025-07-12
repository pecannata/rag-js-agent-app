import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');

    let query = `
      SELECT 
        ws.SCHEDULE_ID as scheduleId,
        TO_CHAR(ws.WEEK_START_DATE, 'YYYY-MM-DD') as weekOf,
        ss.SLOT_ID as id,
        ss.DAY_OF_WEEK as day,
        ss.TIME_SLOT as time,
        ss.LESSON_TYPE as lessonType,
        ss.NOTES as notes,
        ss.STUDENT_ID as studentId,
        s.STUDENT_NAME as studentName
      FROM STUDIO_WEEKLY_SCHEDULES ws
      LEFT JOIN STUDIO_SCHEDULE_SLOTS ss ON ws.SCHEDULE_ID = ss.SCHEDULE_ID AND ss.STATUS = 'ACTIVE'
      LEFT JOIN STUDIO_STUDENTS s ON ss.STUDENT_ID = s.STUDENT_ID
      WHERE ws.STATUS = 'ACTIVE'
    `;

    const params: any[] = [];
    if (weekStart) {
      query += ` AND ws.WEEK_START_DATE = TO_DATE(?, 'YYYY-MM-DD')`;
      params.push(weekStart);
    } else {
      // Default to current week
      query += ` AND ws.WEEK_START_DATE = TRUNC(SYSDATE, 'IW')`;
    }

    query += ` ORDER BY ws.WEEK_START_DATE, ss.DAY_OF_WEEK, ss.TIME_SLOT`;

    const result = await executeQuery(query, params);
    
    // Group by week and transform to expected format
    const scheduleMap = new Map();
    
    result.forEach((row: any) => {
      const weekKey = row.weekof || weekStart;
      if (!scheduleMap.has(weekKey)) {
        scheduleMap.set(weekKey, {
          weekOf: weekKey,
          slots: []
        });
      }
      
      if (row.id) {
        scheduleMap.get(weekKey).slots.push({
          id: row.id?.toString(),
          day: row.day,
          time: row.time,
          studentName: row.studentname || '',
          lessonType: row.lessontype || 'Solo',
          notes: row.notes || ''
        });
      }
    });

    // If no schedule exists for the requested week, create an empty one
    if (scheduleMap.size === 0 && weekStart) {
      return NextResponse.json({
        weekOf: weekStart,
        slots: []
      });
    }

    // Return the first (and typically only) schedule
    const schedule = Array.from(scheduleMap.values())[0] || {
      weekOf: weekStart || new Date().toISOString().split('T')[0],
      slots: []
    };

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weekOf, day, time, studentName, lessonType, notes } = body;

    // Ensure we have a weekly schedule for this week
    const weekStartDate = new Date(weekOf);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Monday
    const weekStartStr = weekStartDate.toISOString().split('T')[0];

    // Check if weekly schedule exists
    let scheduleResult = await executeQuery(
      'SELECT SCHEDULE_ID FROM STUDIO_WEEKLY_SCHEDULES WHERE WEEK_START_DATE = TO_DATE(?, \'YYYY-MM-DD\')',
      [weekStartStr]
    );

    let scheduleId;
    if (scheduleResult.length === 0) {
      // Create new weekly schedule
      await executeQuery(
        'INSERT INTO STUDIO_WEEKLY_SCHEDULES (WEEK_START_DATE) VALUES (TO_DATE(?, \'YYYY-MM-DD\'))',
        [weekStartStr]
      );
      
      scheduleResult = await executeQuery(
        'SELECT SCHEDULE_ID FROM STUDIO_WEEKLY_SCHEDULES WHERE WEEK_START_DATE = TO_DATE(?, \'YYYY-MM-DD\')',
        [weekStartStr]
      );
    }
    
    scheduleId = scheduleResult[0]?.schedule_id;

    // Find student ID if studentName is provided
    let studentId = null;
    if (studentName && studentName.trim()) {
      const studentResult = await executeQuery(
        'SELECT STUDENT_ID FROM STUDIO_STUDENTS WHERE UPPER(STUDENT_NAME) LIKE UPPER(?)',
        [`%${studentName.trim()}%`]
      );
      if (studentResult.length > 0) {
        studentId = studentResult[0].student_id;
      }
    }

    // Insert schedule slot
    const insertSlotQuery = `
      INSERT INTO STUDIO_SCHEDULE_SLOTS 
      (SCHEDULE_ID, STUDENT_ID, DAY_OF_WEEK, TIME_SLOT, LESSON_TYPE, NOTES)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(insertSlotQuery, [
      scheduleId,
      studentId,
      day,
      time,
      lessonType || 'Solo',
      notes || ''
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Schedule slot created successfully' 
    });
  } catch (error) {
    console.error('Error creating schedule slot:', error);
    return NextResponse.json({ error: 'Failed to create schedule slot' }, { status: 500 });
  }
}
