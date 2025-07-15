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
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = `
      SELECT 
        TEACHER_ID,
        TEACHER_NAME,
        EMAIL,
        PHONE,
        SPECIALTIES,
        STATUS,
        NOTES,
        PRICE,
        TO_CHAR(CREATED_DATE, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as CREATED_DATE,
        TO_CHAR(MODIFIED_DATE, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as MODIFIED_DATE
      FROM STUDIO_TEACHERS
    `;

    const params: any[] = [];
    const conditions: string[] = [];
    
    // Add search conditions
    if (search) {
      conditions.push(`(
        UPPER(TEACHER_NAME) LIKE UPPER(?) 
        OR UPPER(EMAIL) LIKE UPPER(?)
        OR UPPER(SPECIALTIES) LIKE UPPER(?)
      )`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Add status filter unless explicitly including inactive
    if (!includeInactive) {
      conditions.push('UPPER(STATUS) = ?');
      params.push('ACTIVE');
    }
    
    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY UPPER(TEACHER_NAME)`;

    console.log('🔍 Teachers query:', query);
    console.log('🔍 Query params:', params);

    const result = await executeQuery(query, params);
    
    // Transform the result to match frontend expectations
    const teachers = result.map((row: any) => ({
      id: row.teacher_id?.toString(),
      name: row.teacher_name || '',
      firstName: '', // No longer in database
      lastName: '',  // No longer in database
      email: row.email || '',
      phone: row.phone || '',
      specialties: row.specialties || '',
      status: row.status || 'Active',
      notes: row.notes || '',
      price: parseFloat(row.price) || 0,
      createdDate: row.created_date,
      modifiedDate: row.modified_date
    }));

    console.log(`✅ Fetched ${teachers.length} teachers from Oracle database`);
    return NextResponse.json(teachers);
  } catch (error) {
    console.error('❌ Error fetching teachers:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch teachers', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
      email,
      phone,
      specialties,
      status,
      notes,
      price
    } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Teacher name is required' }, { status: 400 });
    }

    // Insert teacher
    const insertQuery = `
      INSERT INTO STUDIO_TEACHERS 
      (TEACHER_NAME, EMAIL, PHONE, SPECIALTIES, STATUS, NOTES, PRICE)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const teacherParams = [
      name.trim(),
      email?.trim() || '',
      phone?.trim() || '',
      specialties?.trim() || '',
      (status || 'Active').toUpperCase(),
      notes?.trim() || '',
      parseFloat(price) || 0
    ];

    console.log('🔍 Creating teacher with params:', teacherParams);

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
