import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = `
      SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as week_start,
        TO_CHAR(WEEK_START_DATE, 'DD-MON-YY') as formatted_date,
        LESSON_ID as lesson_id
      FROM STUDIO_PRIVATE_LESSONS
      ORDER BY WEEK_START_DATE DESC
    `;

    const result = await executeQuery(query, []);
    
    const availableWeeks = result.map(row => ({
      weekStart: row.week_start,
      formattedDate: row.formatted_date,
      lessonId: row.lesson_id
    }));

    return NextResponse.json(availableWeeks);
  } catch (error) {
    console.error('Error fetching available weeks:', error);
    return NextResponse.json({ error: 'Failed to fetch available weeks' }, { status: 500 });
  }
}
