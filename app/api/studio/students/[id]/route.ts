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

    const studentId = params.id;
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

    // Update student
    const updateStudentQuery = `
      UPDATE STUDIO_STUDENTS 
      SET STUDENT_NAME = ?,
          PARENT_FIRST_NAME = ?,
          PARENT_LAST_NAME = ?,
          CONTACT_EMAIL = ?,
          CONTACT_PHONE = ?,
          BIRTH_DATE = TO_DATE(?, 'YYYY-MM-DD'),
          AUDITION_STATUS = ?,
          NOTES = ?,
          MODIFIED_BY = ?
      WHERE STUDENT_ID = ?
    `;

    const studentParams = [
      name,
      parentFirstName,
      parentLastName,
      email,
      phone,
      birthDate,
      auditionStatus,
      notes,
      session.user?.email || 'SYSTEM',
      studentId
    ];

    await executeQuery(updateStudentQuery, studentParams);

    // Update class enrollments - first delete existing enrollments
    await executeQuery(
      'DELETE FROM STUDIO_STUDENT_CLASSES WHERE STUDENT_ID = ?',
      [studentId]
    );

    // Get class type mappings
    const classTypeQuery = `SELECT CLASS_TYPE_ID, CLASS_TYPE_CODE FROM STUDIO_CLASS_TYPES`;
    const classTypes = await executeQuery(classTypeQuery, []);
    
    const classCodeMap: { [key: string]: number } = {};
    classTypes.forEach((ct: any) => {
      classCodeMap[ct.class_type_code] = ct.class_type_id;
    });

    // Insert new enrollments
    const enrollmentPromises = [];
    
    if (classes.auditionPrep && classCodeMap['AUD_PREP']) {
      enrollmentPromises.push(
        executeQuery(
          'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID) VALUES (?, ?)',
          [studentId, classCodeMap['AUD_PREP']]
        )
      );
    }
    
    if (classes.techniqueIntensive && classCodeMap['TECH_INT']) {
      enrollmentPromises.push(
        executeQuery(
          'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID) VALUES (?, ?)',
          [studentId, classCodeMap['TECH_INT']]
        )
      );
    }
    
    if (classes.balletIntensive && classCodeMap['BALLET_INT']) {
      enrollmentPromises.push(
        executeQuery(
          'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID) VALUES (?, ?)',
          [studentId, classCodeMap['BALLET_INT']]
        )
      );
    }
    
    if (classes.masterIntensive && classCodeMap['MASTER_INT']) {
      enrollmentPromises.push(
        executeQuery(
          'INSERT INTO STUDIO_STUDENT_CLASSES (STUDENT_ID, CLASS_TYPE_ID) VALUES (?, ?)',
          [studentId, classCodeMap['MASTER_INT']]
        )
      );
    }

    await Promise.all(enrollmentPromises);

    return NextResponse.json({ 
      success: true, 
      message: 'Student updated successfully' 
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
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

    const studentId = params.id;

    // Delete in correct order due to foreign key constraints
    // 1. Delete attendance records
    await executeQuery(
      'DELETE FROM STUDIO_ATTENDANCE WHERE STUDENT_ID = ?',
      [studentId]
    );

    // 2. Delete schedule slots
    await executeQuery(
      'DELETE FROM STUDIO_SCHEDULE_SLOTS WHERE STUDENT_ID = ?',
      [studentId]
    );

    // 3. Delete class enrollments
    await executeQuery(
      'DELETE FROM STUDIO_STUDENT_CLASSES WHERE STUDENT_ID = ?',
      [studentId]
    );

    // 4. Delete student
    await executeQuery(
      'DELETE FROM STUDIO_STUDENTS WHERE STUDENT_ID = ?',
      [studentId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Student deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
