import { NextRequest, NextResponse } from 'next/server';
import { getPoolStats, healthCheck, executeQuery } from '../../../lib/oracle-pool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await getPoolStats();
        return NextResponse.json({
          success: true,
          stats: stats || 'Pool not initialized'
        });

      case 'health':
        const health = await healthCheck();
        return NextResponse.json({
          success: true,
          health
        });

      case 'test':
        const testResult = await executeQuery('SELECT SYSDATE as current_time FROM DUAL');
        return NextResponse.json({
          success: true,
          test: testResult
        });

      default:
        // Default: return pool stats
        const poolStats = await getPoolStats();
        const poolHealth = await healthCheck();
        
        return NextResponse.json({
          success: true,
          data: {
            stats: poolStats,
            health: poolHealth,
            timestamp: new Date().toISOString()
          }
        });
    }
  } catch (error) {
    console.error('Error in Oracle pool API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
