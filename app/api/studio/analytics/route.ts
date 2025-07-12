import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get analytics data from the view
    const analyticsQuery = `SELECT * FROM STUDIO_ANALYTICS_V`;
    const result = await executeQuery(analyticsQuery, []);
    
    if (result.length === 0) {
      return NextResponse.json({
        totalStudents: 0,
        classEnrollment: {
          auditionPrep: 0,
          techniqueIntensive: 0,
          balletIntensive: 0,
          masterIntensive: 0
        },
        ageGroups: {
          minis: 0,
          juniors: 0,
          teens: 0,
          seniors: 0
        },
        totalLessons: 0
      });
    }

    const row = result[0];
    
    const analytics = {
      totalStudents: row.total_students || 0,
      classEnrollment: {
        auditionPrep: row.audition_prep_count || 0,
        techniqueIntensive: row.technique_intensive_count || 0,
        balletIntensive: row.ballet_intensive_count || 0,
        masterIntensive: row.master_intensive_count || 0
      },
      ageGroups: {
        minis: row.minis_count || 0,
        juniors: row.juniors_count || 0,
        teens: row.teens_count || 0,
        seniors: row.seniors_count || 0
      },
      totalLessons: row.current_week_lessons || 0
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
