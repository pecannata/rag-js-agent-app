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

    let query = `
      SELECT 
        TEACHER_ID,
        TEACHER_NAME,
        FIRST_NAME,
        LAST_NAME,
        EMAIL,
        PHONE,
        SPECIALTIES,
        STATUS,
        NOTES,
        PRICE,
        CREATED_DATE,
        MODIFIED_DATE
      FROM STUDIO_TEACHERS
    `;

    const params: any[] = [];
    if (search) {
      query += ` WHERE UPPER(TEACHER_NAME) LIKE UPPER(?) 
                 OR UPPER(FIRST_NAME) LIKE UPPER(?) 
                 OR UPPER(LAST_NAME) LIKE UPPER(?)
                 OR UPPER(EMAIL) LIKE UPPER(?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY TEACHER_NAME`;

    const result = await executeQuery(query, params);
    
    // Transform the result to match frontend expectations
    const teachers = result.map((row: any) => ({
      id: row.teacher_id?.toString(),
      name: row.teacher_name || '',
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      email: row.email || '',
      phone: row.phone || '',
      specialties: row.specialties || '',
      status: row.status || 'Active',
      notes: row.notes || '',
      price: row.price || 0,
      createdDate: row.created_date,
      modifiedDate: row.modified_date
    }));

    return NextResponse.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
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
      firstName,
      lastName,
      email,
      phone,
      specialties,
      status,
      notes,
      price
    } = body;

    // Insert teacher
    const insertQuery = `
      INSERT INTO STUDIO_TEACHERS 
      (TEACHER_NAME, FIRST_NAME, LAST_NAME, EMAIL, PHONE, SPECIALTIES, STATUS, NOTES, PRICE)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const teacherParams = [
      name,
      firstName,
      lastName,
      email,
      phone,
      specialties,
      status || 'Active',
      notes,
      price || 0
    ];

    await executeQuery(insertQuery, teacherParams);

    return NextResponse.json({ 
      success: true, 
      message: 'Teacher created successfully' 
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}
