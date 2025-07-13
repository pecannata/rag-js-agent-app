import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return default analytics data since STUDIO_ANALYTICS_V is not available
    const analytics = {
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
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
