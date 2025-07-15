import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/database';

export async function GET(_request: NextRequest) {
  console.log('🧪 Testing database operations...');
  
  try {
    // Test 1: Simple select
    console.log('Test 1: Simple SELECT');
    const selectResult = await executeQuery('SELECT COUNT(*) as count FROM STUDIO_PRIVATE_LESSONS');
    console.log('✅ SELECT result:', selectResult);
    
    // Test 2: Insert with small JSON
    console.log('Test 2: INSERT with small JSON');
    const testDate = '2025-07-13';
    const testJson = JSON.stringify({ test: 'small data', timestamp: new Date().toISOString() });
    
    const insertQuery = `
      INSERT INTO STUDIO_PRIVATE_LESSONS 
      (WEEK_START_DATE, FULL_WEEK_JSON)
      VALUES (TO_DATE(?, 'YYYY-MM-DD'), ?)
    `;
    
    console.log('🔄 Executing insert...');
    const insertResult = await executeQuery(insertQuery, [testDate, testJson]);
    console.log('✅ INSERT result:', insertResult);
    
    // Test 3: Explicit commit
    console.log('Test 3: Explicit COMMIT');
    const commitResult = await executeQuery('COMMIT');
    console.log('✅ COMMIT result:', commitResult);
    
    // Test 4: Verify insert
    console.log('Test 4: Verify INSERT');
    const verifyResult = await executeQuery(
      'SELECT COUNT(*) as count FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = TO_DATE(?, \'YYYY-MM-DD\')',
      [testDate]
    );
    console.log('✅ VERIFY result:', verifyResult);
    
    // Test 5: Clean up
    console.log('Test 5: Cleanup');
    await executeQuery('DELETE FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = TO_DATE(?, \'YYYY-MM-DD\')', [testDate]);
    await executeQuery('COMMIT');
    
    return NextResponse.json({ 
      success: true, 
      tests: {
        select: selectResult,
        insert: insertResult,
        commit: commitResult,
        verify: verifyResult
      }
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({ 
      error: 'Database test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
