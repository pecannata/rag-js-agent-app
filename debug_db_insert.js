#!/usr/bin/env node

// Simple test script to debug database insertion
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testDatabaseInsert() {
  console.log('🧪 Testing database insertion...');
  
  try {
    // Test data
    const weekStartDate = '2025-07-13';
    const testData = {
      week_info: {
        sheet_name: 'test-sheet',
        week_identifier: 'test-week'
      },
      schedule: [
        {
          time: '10:00:00',
          day: 'Monday',
          lessons: [
            {
              student_info: 'Test Student',
              teacher: 'Test Teacher',
              lesson_type: 'Piano',
              studio: 'Studio A',
              notes: 'Test lesson'
            }
          ]
        }
      ],
      teachers: {
        'Test Teacher': '#3B82F6'
      },
      studios: ['Studio A']
    };
    
    const jsonData = JSON.stringify(testData);
    console.log('📊 JSON data length:', jsonData.length);
    
    // Prepare the SQL query
    const escapedJson = jsonData.replace(/'/g, "''");
    const insertQuery = `
      INSERT INTO STUDIO_PRIVATE_LESSONS 
      (WEEK_START_DATE, FULL_WEEK_JSON)
      VALUES (TO_DATE('${weekStartDate}', 'YYYY-MM-DD'), '${escapedJson}')
    `;
    
    console.log('🔍 Executing insert query...');
    console.log('Query (first 200 chars):', insertQuery.substring(0, 200));
    
    // Execute the insert
    const { stdout: insertStdout, stderr: insertStderr } = await execAsync(`bash ./SQLclScript.sh "${insertQuery.replace(/"/g, '\\"')}"`);
    
    if (insertStderr) {
      console.error('❌ Insert stderr:', insertStderr);
    } else {
      console.log('✅ Insert stdout:', insertStdout);
    }
    
    // Verify the insert
    console.log('🔍 Verifying insert...');
    const verifyQuery = `SELECT COUNT(*) as count FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = TO_DATE('${weekStartDate}', 'YYYY-MM-DD')`;
    const { stdout: verifyStdout, stderr: verifyStderr } = await execAsync(`bash ./SQLclScript.sh "${verifyQuery}"`);
    
    if (verifyStderr) {
      console.error('❌ Verify stderr:', verifyStderr);
    } else {
      console.log('✅ Verify result:', verifyStdout);
    }
    
    // Check the actual data
    console.log('🔍 Checking actual data...');
    const selectQuery = `SELECT WEEK_START_DATE, SUBSTR(FULL_WEEK_JSON, 1, 100) as json_snippet FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = TO_DATE('${weekStartDate}', 'YYYY-MM-DD')`;
    const { stdout: selectStdout, stderr: selectStderr } = await execAsync(`bash ./SQLclScript.sh "${selectQuery}"`);
    
    if (selectStderr) {
      console.error('❌ Select stderr:', selectStderr);
    } else {
      console.log('✅ Select result:', selectStdout);
    }
    
    // Cleanup
    console.log('🧹 Cleaning up...');
    const deleteQuery = `DELETE FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = TO_DATE('${weekStartDate}', 'YYYY-MM-DD')`;
    await execAsync(`bash ./SQLclScript.sh "${deleteQuery}"`);
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseInsert();
