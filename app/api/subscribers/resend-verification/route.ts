import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { sendEmailVerification } from '../../../lib/email';

const execAsync = promisify(exec);

// Utility function to escape strings for SQL
function escapeSqlString(str: string): string {
  if (typeof str !== 'string') {
    return String(str);
  }
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\0/g, '')
    .replace(/\x1a/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Resend Verification Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Resend verification query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Resend verification query executed successfully');
    
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Verification update completed:', queryType, '- Output:', trimmedOutput || '(empty - success)');
      return { success: true, data: trimmedOutput || 'Operation completed successfully' };
    }
    
    if (isDataQuery) {
      console.log('📤 Raw Oracle Output (first 500 chars):', stdout.substring(0, 500));
    }
    
    try {
      const jsonData = JSON.parse(stdout);
      console.log('✅ Successfully parsed as JSON');
      
      if (jsonData.results && Array.isArray(jsonData.results) && jsonData.results.length > 0) {
        const items = jsonData.results[0].items || [];
        console.log('✅ Extracted Oracle items:', items.length, 'rows');
        return { success: true, data: items };
      }
      
      if (Array.isArray(jsonData)) {
        console.log('✅ Direct array format');
        return { success: true, data: jsonData };
      }
      
      console.log('ℹ️ Single object, wrapping in array');
      return { success: true, data: [jsonData] };
      
    } catch (_parseError) {
      const trimmedOutput = stdout.trim();
      
      if (isDataQuery) {
        console.log('⚠️ SELECT query could not parse as JSON. Output:', trimmedOutput.substring(0, 200));
        if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
          console.log('✅ Treating as empty result set');
          return { success: true, data: [] };
        }
        return { success: true, data: trimmedOutput };
      } else {
        console.log('✅ Non-SELECT query completed successfully');
        return { success: true, data: trimmedOutput || 'Operation completed successfully' };
      }
    }
  } catch (error) {
    console.error('❌ Resend verification execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Generate unique tokens
function generateToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/subscribers/resend-verification - Resend verification email
export async function POST(request: NextRequest) {
  try {
    const { subscriberId, email } = await request.json();
    
    if (!subscriberId && !email) {
      return NextResponse.json({
        success: false,
        error: 'Either subscriber ID or email is required'
      }, { status: 400 });
    }
    
    // Find the subscriber
    let findQuery = '';
    if (subscriberId) {
      findQuery = `
        SELECT id, email, name, email_verified, verification_token
        FROM subscribers 
        WHERE id = ${parseInt(subscriberId)}
      `;
    } else {
      findQuery = `
        SELECT id, email, name, email_verified, verification_token
        FROM subscribers 
        WHERE email = '${escapeSqlString(email)}'
      `;
    }
    
    const findResult = await executeOracleQuery(findQuery);
    
    if (!findResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to find subscriber'
      }, { status: 500 });
    }
    
    if (!findResult.data || findResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Subscriber not found'
      }, { status: 404 });
    }
    
    const subscriber = findResult.data[0];
    
    // Check if already verified
    if (subscriber.email_verified === 1) {
      return NextResponse.json({
        success: false,
        error: 'Email is already verified'
      }, { status: 400 });
    }
    
    // Generate new verification token if needed
    let verificationToken = subscriber.verification_token;
    if (!verificationToken) {
      verificationToken = generateToken();
      
      // Update with new token
      const updateQuery = `
        UPDATE subscribers 
        SET verification_token = '${verificationToken}',
            verification_sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${subscriber.id}
      `;
      
      const updateResult = await executeOracleQuery(updateQuery);
      
      if (!updateResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to update verification token'
        }, { status: 500 });
      }
    } else {
      // Just update the sent timestamp
      const updateSentQuery = `
        UPDATE subscribers 
        SET verification_sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${subscriber.id}
      `;
      
      await executeOracleQuery(updateSentQuery);
    }
    
    // Send verification email
    console.log('📧 Resending verification email to:', subscriber.email);
    const emailResult = await sendEmailVerification(
      subscriber.email,
      verificationToken,
      subscriber.name
    );
    
    if (!emailResult.success) {
      console.error('❌ Failed to resend verification email:', emailResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to send verification email: ' + emailResult.error
      }, { status: 500 });
    }
    
    console.log('✅ Verification email resent successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name
      }
    });
    
  } catch (error) {
    console.error('❌ Error in resend verification API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}
