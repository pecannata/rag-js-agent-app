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
    const search = searchParams.get('search');

    // Simplified query that doesn't depend on STUDIO_CLASS_TYPES table
    let query = `
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
        'N' as AUDITION_PREP,
        'N' as TECHNIQUE_INTENSIVE,
        'N' as BALLET_INTENSIVE,
        'N' as MASTER_INTENSIVE
      FROM STUDIO_STUDENTS s
    `;

    const params: any[] = [];
    if (search) {
      query += ` WHERE UPPER(s.STUDENT_NAME) LIKE UPPER(?) 
                 OR UPPER(s.CONTACT_EMAIL) LIKE UPPER(?) 
                 OR UPPER(s.PARENT_FIRST_NAME) LIKE UPPER(?) 
                 OR UPPER(s.PARENT_LAST_NAME) LIKE UPPER(?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY s.STUDENT_NAME`;

    const result = await executeQuery(query, params);
    
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

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      parentFirstName,
      parentLastName,
      email,
      phone,
      birthDate,
      auditionStatus,
      notes,
      classes
    } = body;

    // Insert student
    const studentParams = [
      name,
      parentFirstName,
      parentLastName,
      email,
      phone,
      birthDate,
      auditionStatus,
      notes,
      session.user?.email || 'SYSTEM'
    ];

    // For Oracle, we need to handle the RETURNING clause differently
    const insertQuery = `
      INSERT INTO STUDIO_STUDENTS 
      (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, CONTACT_EMAIL, CONTACT_PHONE, 
       BIRTH_DATE, AUDITION_STATUS, NOTES, CREATED_BY)
      VALUES (?, ?, ?, ?, ?, TO_DATE(?, 'YYYY-MM-DD'), ?, ?, ?)
    `;

    await executeQuery(insertQuery, studentParams);

    // Get the newly inserted student ID
    const getIdQuery = `
      SELECT STUDENT_ID FROM STUDIO_STUDENTS 
      WHERE STUDENT_NAME = ? AND CONTACT_EMAIL = ? 
      ORDER BY CREATED_DATE DESC 
      FETCH FIRST 1 ROW ONLY
    `;
    
    const idResult = await executeQuery(getIdQuery, [name, email]);
    const studentId = idResult[0]?.student_id;

    if (!studentId) {
      throw new Error('Failed to get student ID');
    }

    // Skip class enrollments for now since STUDIO_CLASS_TYPES table doesn't exist
    // TODO: Implement class enrollment functionality when the tables are created
    console.log('⚠️ Skipping class enrollments - STUDIO_CLASS_TYPES table not available');
    console.log('📋 Classes requested:', classes);

    return NextResponse.json({ 
      success: true, 
      studentId: studentId.toString(),
      message: 'Student created successfully' 
    });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
