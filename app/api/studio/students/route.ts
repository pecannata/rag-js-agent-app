import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug');
    
    // Skip authentication for debug mode
    if (debug !== 'true') {
      const session = await getServerSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const search = searchParams.get('search');

    // Simple query to get students from STUDIO_STUDENTS table
    let query = `
      SELECT 
        STUDENT_ID,
        STUDENT_NAME,
        PARENT_FIRST_NAME,
        PARENT_LAST_NAME,
        CONTACT_EMAIL,
        CONTACT_PHONE,
        TO_CHAR(BIRTH_DATE, 'YYYY-MM-DD') as BIRTH_DATE_STR,
        AGE,
        AUDITION_STATUS,
        NOTES
      FROM STUDIO_STUDENTS
    `;

    const params: any[] = [];
    if (search) {
      query += ` WHERE UPPER(STUDENT_NAME) LIKE UPPER(?) 
                 OR UPPER(CONTACT_EMAIL) LIKE UPPER(?) 
                 OR UPPER(PARENT_FIRST_NAME) LIKE UPPER(?) 
                 OR UPPER(PARENT_LAST_NAME) LIKE UPPER(?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY STUDENT_NAME`;

    let result;
    try {
      result = await executeQuery(query, params);
    } catch (dbError) {
      console.error('Database query error:', dbError instanceof Error ? dbError.message : 'Unknown error');
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
    
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
        auditionPrep: false,
        techniqueIntensive: false,
        balletIntensive: false,
        masterIntensive: false
      }
    }));
    
    // TODO: Add class enrollment query to populate the classes object
    // For now, we'll just return students with default class flags

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

    // Handle class enrollments
    try {
      // Get class type mappings
      const classTypeQuery = `SELECT CLASS_TYPE_ID, CLASS_TYPE_CODE FROM STUDIO_CLASS_TYPES WHERE IS_ACTIVE = 'Y'`;
      const classTypes = await executeQuery(classTypeQuery, []);
      
      const classCodeMap: { [key: string]: number } = {};
      classTypes.forEach((ct: any) => {
        classCodeMap[ct.class_type_code] = ct.class_type_id;
      });

      // Insert class enrollments
      const enrollmentPromises = [];
      
      if (classes.auditionPrep && classCodeMap['AUD_PREP']) {
        enrollmentPromises.push(
          executeQuery(
            'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID, STATUS) VALUES (?, ?, \'ACTIVE\')',
            [studentId, classCodeMap['AUD_PREP']]
          )
        );
      }
      
      if (classes.techniqueIntensive && classCodeMap['TECH_INT']) {
        enrollmentPromises.push(
          executeQuery(
            'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID, STATUS) VALUES (?, ?, \'ACTIVE\')',
            [studentId, classCodeMap['TECH_INT']]
          )
        );
      }
      
      if (classes.balletIntensive && classCodeMap['BALLET_INT']) {
        enrollmentPromises.push(
          executeQuery(
            'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID, STATUS) VALUES (?, ?, \'ACTIVE\')',
            [studentId, classCodeMap['BALLET_INT']]
          )
        );
      }
      
      if (classes.masterIntensive && classCodeMap['MASTER_INT']) {
        enrollmentPromises.push(
          executeQuery(
            'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID, STATUS) VALUES (?, ?, \'ACTIVE\')',
            [studentId, classCodeMap['MASTER_INT']]
          )
        );
      }

      await Promise.all(enrollmentPromises);
      console.log('✅ Class enrollments created successfully');
    } catch (classError) {
      console.error('⚠️ Error creating class enrollments:', classError);
      // Don't fail the entire request if class enrollments fail
    }

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
