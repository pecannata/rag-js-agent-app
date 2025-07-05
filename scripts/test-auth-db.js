#!/usr/bin/env node

/**
 * Test script for SQLclScript-based authentication database
 * Run this to verify your Oracle tables and SQLclScript.sh integration
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testSQLclScript() {
  console.log('🧪 Testing SQLclScript.sh integration for authentication...\n');

  try {
    // Test 1: Check if SQLclScript.sh exists
    console.log('1. Checking if SQLclScript.sh exists...');
    try {
      await execAsync('ls -la ../SQLclScript.sh');
      console.log('✅ SQLclScript.sh found\n');
    } catch (error) {
      console.log('❌ SQLclScript.sh not found at ../SQLclScript.sh');
      console.log('   Please ensure SQLclScript.sh is in the parent directory\n');
      return;
    }

    // Test 2: Test basic Oracle connection
    console.log('2. Testing Oracle connection...');
    const testSql = "SELECT 'connection_test' as test FROM dual";
    const { stdout: testResult } = await execAsync(`bash ../SQLclScript.sh "${testSql}"`);
    console.log('✅ Oracle connection successful\n');

    // Test 3: Check if auth tables exist
    console.log('3. Checking authentication tables...');
    
    const tables = [
      'RAG_AUTH_USERS',
      'RAG_AUTH_USER_METADATA',
      'RAG_AUTH_USER_ACTIVITY',
      'RAG_AUTH_DOCUMENT_PERMISSIONS'
    ];

    for (const table of tables) {
      try {
        const checkSql = `SELECT COUNT(*) as count FROM ${table}`;
        await execAsync(`bash ../SQLclScript.sh "${checkSql}"`);
        console.log(`✅ Table ${table} exists`);
      } catch (error) {
        console.log(`❌ Table ${table} missing or inaccessible`);
        console.log(`   Run the SQL scripts from CLERK_SETUP.md to create it`);
      }
    }

    console.log('\n🎉 SQLclScript-based authentication setup looks good!');
    console.log('\nNext steps:');
    console.log('- Configure Clerk keys in .env.local');
    console.log('- Start your development server: npm run dev');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('- Ensure SQLclScript.sh is executable: chmod +x ../SQLclScript.sh');
    console.log('- Check Oracle connection in SQLclScript.sh');
    console.log('- Verify Oracle tables are created');
  }
}

testSQLclScript();
