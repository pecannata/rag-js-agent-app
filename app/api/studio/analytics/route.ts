import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../lib/database';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get basic counts
    const studentsCountQuery = `SELECT COUNT(*) as total FROM STUDIO_STUDENTS`;
    const teachersCountQuery = `SELECT COUNT(*) as total FROM STUDIO_TEACHERS WHERE UPPER(STATUS) = 'ACTIVE'`;
    const classTypesCountQuery = `SELECT COUNT(*) as total FROM STUDIO_CLASS_TYPES WHERE IS_ACTIVE = 'Y'`;
    
    // Age distribution
    const ageDistributionQuery = `
      SELECT 
        CASE 
          WHEN AGE < 10 THEN 'Under 10'
          WHEN AGE BETWEEN 10 AND 15 THEN '10-15'
          WHEN AGE BETWEEN 16 AND 20 THEN '16-20'
          WHEN AGE > 20 THEN 'Over 20'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*) as count
      FROM STUDIO_STUDENTS
      WHERE AGE IS NOT NULL
      GROUP BY CASE 
        WHEN AGE < 10 THEN 'Under 10'
        WHEN AGE BETWEEN 10 AND 15 THEN '10-15'
        WHEN AGE BETWEEN 16 AND 20 THEN '16-20'
        WHEN AGE > 20 THEN 'Over 20'
        ELSE 'Unknown'
      END
      ORDER BY age_group
    `;

    // Class enrollment statistics
    const classEnrollmentQuery = `
      SELECT 
        ct.CLASS_TYPE_NAME,
        ct.CLASS_TYPE_CODE,
        COUNT(sc.STUDENT_ID) as enrolled_count
      FROM STUDIO_CLASS_TYPES ct
      LEFT JOIN STUDIO_STUDENT_CLASSES sc ON ct.CLASS_TYPE_ID = sc.CLASS_TYPE_ID AND sc.STATUS = 'ACTIVE'
      WHERE ct.IS_ACTIVE = 'Y'
      GROUP BY ct.CLASS_TYPE_NAME, ct.CLASS_TYPE_CODE
      ORDER BY enrolled_count DESC
    `;

    // Teacher workload
    const teacherWorkloadQuery = `
      SELECT 
        t.TEACHER_NAME,
        t.SPECIALTIES,
        t.PRICE,
        COUNT(sc.STUDENT_ID) as student_count
      FROM STUDIO_TEACHERS t
      LEFT JOIN STUDIO_STUDENT_CLASSES sc ON t.TEACHER_ID = sc.CLASS_TYPE_ID
      WHERE t.STATUS = 'ACTIVE'
      GROUP BY t.TEACHER_NAME, t.SPECIALTIES, t.PRICE
      ORDER BY student_count DESC
    `;

    // Recent student additions (last 30 days)
    const recentStudentsQuery = `
      SELECT 
        COUNT(*) as recent_students
      FROM STUDIO_STUDENTS 
      WHERE CREATED_DATE >= SYSDATE - 30
    `;

    // Audition status breakdown
    const auditionStatusQuery = `
      SELECT 
        AUDITION_STATUS,
        COUNT(*) as count
      FROM STUDIO_STUDENTS
      GROUP BY AUDITION_STATUS
      ORDER BY count DESC
    `;

    // Execute all queries
    const [
      studentsCountResult,
      teachersCountResult,
      classTypesCountResult,
      ageDistributionResult,
      classEnrollmentResult,
      teacherWorkloadResult,
      recentStudentsResult,
      auditionStatusResult
    ] = await Promise.all([
      executeQuery(studentsCountQuery),
      executeQuery(teachersCountQuery),
      executeQuery(classTypesCountQuery),
      executeQuery(ageDistributionQuery),
      executeQuery(classEnrollmentQuery),
      executeQuery(teacherWorkloadQuery),
      executeQuery(recentStudentsQuery),
      executeQuery(auditionStatusQuery)
    ]);

    // Format response
    const analytics = {
      overview: {
        totalStudents: studentsCountResult[0]?.total || 0,
        activeTeachers: teachersCountResult[0]?.total || 0,
        activeClasses: classTypesCountResult[0]?.total || 0,
        recentStudents: recentStudentsResult[0]?.recent_students || 0
      },
      ageDistribution: ageDistributionResult.map((row: any) => ({
        ageGroup: row.age_group,
        count: row.count
      })),
      classEnrollment: classEnrollmentResult.map((row: any) => ({
        className: row.class_type_name,
        classCode: row.class_type_code,
        enrolledCount: row.enrolled_count
      })),
      teacherWorkload: teacherWorkloadResult.map((row: any) => ({
        teacherName: row.teacher_name,
        specialties: row.specialties,
        price: row.price,
        studentCount: row.student_count
      })),
      auditionStatus: auditionStatusResult.map((row: any) => ({
        status: row.audition_status,
        count: row.count
      }))
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
