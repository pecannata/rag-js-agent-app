import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart') || '2025-06-16';
    
    console.log(`🔍 Debug: Checking detailed data for week ${weekStart}...`);
    
    const query = `
      SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as week_start,
        LESSON_ID as lesson_id,
        FULL_WEEK_JSON as week_data,
        CASE 
          WHEN FULL_WEEK_JSON IS NULL THEN 'NULL'
          WHEN LENGTH(FULL_WEEK_JSON) = 0 THEN 'EMPTY'
          ELSE 'HAS_CONTENT'
        END as json_status,
        LENGTH(FULL_WEEK_JSON) as json_length
      FROM STUDIO_PRIVATE_LESSONS
      WHERE WEEK_START_DATE = TO_DATE(?, 'YYYY-MM-DD')
    `;
    
    const result = await executeQuery(query, [weekStart]);
    
    if (result.length === 0) {
      return NextResponse.json({ 
        message: `No data found for week ${weekStart}`,
        weekStart,
        found: false
      });
    }
    
    const row = result[0];
    
    // Try to parse the JSON data
    let parsedJson = null;
    let parseError = null;
    
    if (row.week_data) {
      try {
        parsedJson = typeof row.week_data === 'string' 
          ? JSON.parse(row.week_data) 
          : row.week_data;
      } catch (error) {
        parseError = (error as Error).message;
      }
    }
    
    return NextResponse.json({
      message: `Found data for week ${weekStart}`,
      weekStart,
      found: true,
      lessonId: row.lesson_id,
      jsonStatus: row.json_status,
      jsonLength: row.json_length,
      hasScheduleData: parsedJson?.schedule ? parsedJson.schedule.length : 0,
      hasTeachers: parsedJson?.teachers ? Object.keys(parsedJson.teachers).length : 0,
      hasStudios: parsedJson?.studios ? parsedJson.studios.length : 0,
      weekInfo: parsedJson?.week_info || null,
      parseError,
      // Only include first few schedule items to avoid huge response
      sampleSchedule: parsedJson?.schedule ? parsedJson.schedule.slice(0, 3) : null,
      rawDataPreview: row.week_data ? String(row.week_data).substring(0, 500) + '...' : null
    });
  } catch (error) {
    console.error('❌ Debug week detail error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve week detail',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
