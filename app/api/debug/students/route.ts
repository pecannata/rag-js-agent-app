import { NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/database';

export async function GET() {
  try {
    console.log('🔍 Debug: Fetching students without authentication...');
    
    // Query to get students with their class enrollments
    const query = `
      SELECT 
        s.STUDENT_ID,
        s.STUDENT_NAME,
        s.PARENT_FIRST_NAME,
        s.PARENT_LAST_NAME,
        s.CONTACT_EMAIL,
        s.CONTACT_PHONE,
        TO_CHAR(s.BIRTH_DATE, 'YYYY-MM-DD') as BIRTH_DATE_STR,
        FLOOR(MONTHS_BETWEEN(SYSDATE, s.BIRTH_DATE) / 12) as AGE,
        s.AUDITION_STATUS,
        s.NOTES,
        NVL(aud.HAS_AUDITION_PREP, 'N') as AUDITION_PREP,
        NVL(tech.HAS_TECHNIQUE_INTENSIVE, 'N') as TECHNIQUE_INTENSIVE,
        NVL(bal.HAS_BALLET_INTENSIVE, 'N') as BALLET_INTENSIVE,
        NVL(mas.HAS_MASTER_INTENSIVE, 'N') as MASTER_INTENSIVE
      FROM STUDIO_STUDENTS s
      LEFT JOIN (
        SELECT sc.STUDENT_ID, 'Y' as HAS_AUDITION_PREP
        FROM STUDIO_STUDENT_CLASSES sc
        JOIN STUDIO_CLASS_TYPES ct ON sc.CLASS_TYPE_ID = ct.CLASS_TYPE_ID
        WHERE ct.CLASS_TYPE_CODE = 'AUD_PREP' AND sc.STATUS = 'ACTIVE'
      ) aud ON s.STUDENT_ID = aud.STUDENT_ID
      LEFT JOIN (
        SELECT sc.STUDENT_ID, 'Y' as HAS_TECHNIQUE_INTENSIVE
        FROM STUDIO_STUDENT_CLASSES sc
        JOIN STUDIO_CLASS_TYPES ct ON sc.CLASS_TYPE_ID = ct.CLASS_TYPE_ID
        WHERE ct.CLASS_TYPE_CODE = 'TECH_INT' AND sc.STATUS = 'ACTIVE'
      ) tech ON s.STUDENT_ID = tech.STUDENT_ID
      LEFT JOIN (
        SELECT sc.STUDENT_ID, 'Y' as HAS_BALLET_INTENSIVE
        FROM STUDIO_STUDENT_CLASSES sc
        JOIN STUDIO_CLASS_TYPES ct ON sc.CLASS_TYPE_ID = ct.CLASS_TYPE_ID
        WHERE ct.CLASS_TYPE_CODE = 'BALLET_INT' AND sc.STATUS = 'ACTIVE'
      ) bal ON s.STUDENT_ID = bal.STUDENT_ID
      LEFT JOIN (
        SELECT sc.STUDENT_ID, 'Y' as HAS_MASTER_INTENSIVE
        FROM STUDIO_STUDENT_CLASSES sc
        JOIN STUDIO_CLASS_TYPES ct ON sc.CLASS_TYPE_ID = ct.CLASS_TYPE_ID
        WHERE ct.CLASS_TYPE_CODE = 'MASTER_INT' AND sc.STATUS = 'ACTIVE'
      ) mas ON s.STUDENT_ID = mas.STUDENT_ID
      WHERE ROWNUM <= 10
      ORDER BY s.STUDENT_NAME
    `;

    const result = await executeQuery(query);
    
    console.log('✅ Debug: Raw database result:', result);
    
    // Transform the result to match frontend expectations
    const students = result.map((row: any) => ({
      id: row.student_id?.toString(),
      name: row.student_name || '',
      parentFirstName: row.parent_first_name || '',
      parentLastName: row.parent_last_name || '',
      email: row.contact_email || '',
      phone: row.contact_phone || '',
      birthDate: row.birth_date_str || '',
      age: row.age || 0,
      auditionStatus: row.audition_status || 'Both',
      notes: row.notes || '',
      classes: {
        auditionPrep: row.audition_prep === 'Y',
        techniqueIntensive: row.technique_intensive === 'Y',
        balletIntensive: row.ballet_intensive === 'Y',
        masterIntensive: row.master_intensive === 'Y'
      }
    }));

    console.log('✅ Debug: Transformed students:', students);

    return NextResponse.json({ 
      success: true, 
      count: students.length, 
      students: students 
    });
  } catch (error) {
    console.error('❌ Debug: Error fetching students:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch students', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
