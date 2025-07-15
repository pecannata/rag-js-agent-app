import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../../lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const updateQuery = `
      UPDATE STUDIO_TEACHERS 
      SET TEACHER_NAME = ?, 
          EMAIL = ?, 
          PHONE = ?, 
          SPECIALTIES = ?, 
          STATUS = ?, 
          NOTES = ?,
          PRICE = ?,
          MODIFIED_DATE = SYSDATE
      WHERE TEACHER_ID = ?
    `;

    const updateParams = [
      name.trim(),
      email?.trim() || '',
      phone?.trim() || '',
      specialties?.trim() || '',
      (status || 'Active').toUpperCase(),
      notes?.trim() || '',
      parseFloat(price) || 0,
      parseInt(id)
    ];

    console.log('🔍 Updating teacher with params:', updateParams);

    await executeQuery(updateQuery, updateParams);

    return NextResponse.json({ 
      success: true, 
      message: 'Teacher updated successfully' 
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if teacher has any scheduled lessons
    const checkQuery = `
      SELECT COUNT(*) as lesson_count 
      FROM STUDIO_SCHEDULE_SLOTS 
      WHERE TEACHER_ID = ? AND STATUS = 'ACTIVE'
    `;

    const checkResult = await executeQuery(checkQuery, [parseInt(id)]);
    const lessonCount = checkResult[0]?.lesson_count || 0;

    if (lessonCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete teacher. They have ${lessonCount} active lessons scheduled.` 
      }, { status: 400 });
    }

    // Delete the teacher
    const deleteQuery = `DELETE FROM STUDIO_TEACHERS WHERE TEACHER_ID = ?`;
    await executeQuery(deleteQuery, [parseInt(id)]);

    return NextResponse.json({ 
      success: true, 
      message: 'Teacher deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
  }
}
