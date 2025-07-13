import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../lib/database';

interface Lesson {
  day: string;
  date: string;
  studio: string;
  student_name: string;
  teacher_color: string;
  teacher: string;
  lesson_type: string;
  status: string;
}

interface TimeSlot {
  time_slot: string;
  lessons: Lesson[];
}

interface WeekData {
  week_info: {
    sheet_name: string;
    week_identifier: string;
  };
  teachers: Record<string, string>;
  studios: string[];
  schedule: TimeSlot[];
}

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
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as weekOf,
        LESSON_ID as lessonId,
        FULL_WEEK_JSON as weekData
      FROM STUDIO_PRIVATE_LESSONS
    `;

    const params: any[] = [];
    if (weekStart) {
      query += ` WHERE WEEK_START_DATE = TO_DATE(?, 'YYYY-MM-DD')`;
      params.push(weekStart);
    } else {
      // Default to most recent week
      query += ` ORDER BY WEEK_START_DATE DESC`;
    }

    const result = await executeQuery(query, params);
    
    if (result.length === 0) {
      // If no schedule exists for the requested week, return empty schedule
      return NextResponse.json({
        weekOf: weekStart || new Date().toISOString().split('T')[0],
        slots: [],
        teachers: {},
        studios: []
      });
    }

    // Get the first result (should only be one per week)
    const row = result[0];
    const weekData: WeekData = typeof row.weekdata === 'string' 
      ? JSON.parse(row.weekdata) 
      : row.weekdata;

    // Transform the JSON data to the expected schedule format
    const slots: any[] = [];
    
    weekData.schedule?.forEach((timeSlot: any) => {
      timeSlot.lessons?.forEach((lesson: any, index: number) => {
        slots.push({
          id: `${row.lessonid}_${timeSlot.time}_${lesson.student_info}_${index}`,
          day: timeSlot.day,
          time: timeSlot.time,
          studentName: lesson.student_info,
          lessonType: lesson.lesson_type || 'Solo',
          teacher: lesson.teacher || '',
          teacherColor: lesson.teacher_color || '#6B7280',
          studio: lesson.studio || 'Studio 1',
          status: lesson.status || 'Scheduled',
          notes: lesson.notes || '',
          color: lesson.color || ''
        });
      });
    });

    const schedule = {
      weekOf: row.weekof,
      lessonId: row.lessonid,
      slots: slots,
      teachers: weekData.teachers || {},
      studios: weekData.studios || [],
      weekInfo: weekData.week_info || {}
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
