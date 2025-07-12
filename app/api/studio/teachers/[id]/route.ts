import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../../lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      notes
    } = body;

    const updateQuery = `
      UPDATE STUDIO_TEACHERS 
      SET TEACHER_NAME = ?, 
          FIRST_NAME = ?, 
          LAST_NAME = ?, 
          EMAIL = ?, 
          PHONE = ?, 
          SPECIALTIES = ?, 
          STATUS = ?, 
          NOTES = ?,
          MODIFIED_DATE = SYSDATE
      WHERE TEACHER_ID = ?
    `;

    const updateParams = [
      name,
      firstName,
      lastName,
      email,
      phone,
      specialties,
      status,
      notes,
      parseInt(params.id)
    ];

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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const checkResult = await executeQuery(checkQuery, [parseInt(params.id)]);
    const lessonCount = checkResult[0]?.lesson_count || 0;

    if (lessonCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete teacher. They have ${lessonCount} active lessons scheduled.` 
      }, { status: 400 });
    }

    // Delete the teacher
    const deleteQuery = `DELETE FROM STUDIO_TEACHERS WHERE TEACHER_ID = ?`;
    await executeQuery(deleteQuery, [parseInt(params.id)]);

    return NextResponse.json({ 
      success: true, 
      message: 'Teacher deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
  }
}
