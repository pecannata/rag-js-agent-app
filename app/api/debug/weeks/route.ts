import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking all available weeks in database...');
    
    const query = `
      SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as week_start,
        TO_CHAR(WEEK_START_DATE, 'DD-MON-YY') as formatted_date,
        TO_CHAR(WEEK_START_DATE, 'Day') as day_name,
        LESSON_ID as lesson_id,
        CASE 
          WHEN FULL_WEEK_JSON IS NOT NULL THEN 'HAS_DATA'
          ELSE 'NO_DATA'
        END as has_data_status
      FROM STUDIO_PRIVATE_LESSONS
      ORDER BY WEEK_START_DATE
    `;
    
    const result = await executeQuery(query, []);
    
    if (result.length === 0) {
      return NextResponse.json({ 
        message: 'No weeks found in STUDIO_PRIVATE_LESSONS table',
        weeks: [],
        totalCount: 0
      });
    }
    
    // Check specifically for June 2025 weeks
    const juneQuery = `
      SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as week_start,
        TO_CHAR(WEEK_START_DATE, 'DD-MON-YY') as formatted_date,
        TO_CHAR(WEEK_START_DATE, 'Day') as day_name,
        LESSON_ID as lesson_id
      FROM STUDIO_PRIVATE_LESSONS
      WHERE EXTRACT(MONTH FROM WEEK_START_DATE) = 6 
      AND EXTRACT(YEAR FROM WEEK_START_DATE) = 2025
      ORDER BY WEEK_START_DATE
    `;
    
    const juneResult = await executeQuery(juneQuery, []);
    
    return NextResponse.json({
      message: 'Successfully retrieved weeks data',
      weeks: result.map(row => ({
        weekStart: row.week_start,
        formattedDate: row.formatted_date,
        dayName: row.day_name?.trim(),
        lessonId: row.lesson_id,
        hasData: row.has_data_status
      })),
      juneWeeks: juneResult.map(row => ({
        weekStart: row.week_start,
        formattedDate: row.formatted_date,
        dayName: row.day_name?.trim(),
        lessonId: row.lesson_id
      })),
      totalCount: result.length,
      juneCount: juneResult.length
    });
  } catch (error) {
    console.error('❌ Debug weeks error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve weeks data',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
