import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { sendWelcomeEmail } from '../../../lib/email';

const execAsync = promisify(exec);

// Oracle database execution function (copied from route.ts)
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Manual Verify Database Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Manual Verify database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Manual Verify database query executed successfully');
    
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Modification query completed:', queryType, '- Output:', trimmedOutput || '(empty - success)');
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
    console.error('❌ Manual Verify database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subscriberId } = await request.json();

    if (!subscriberId) {
      return NextResponse.json({
        success: false,
        error: 'Subscriber ID is required'
      }, { status: 400 });
    }

    // Get subscriber details first
    const getQuery = `
      SELECT 
        id,
        email,
        name,
        status,
        email_verified
      FROM subscribers 
      WHERE id = ${parseInt(subscriberId)}
    `;
    
    const getResult = await executeOracleQuery(getQuery);
    
    if (!getResult.success) {
      return NextResponse.json({
        success: false,
        error: getResult.error || 'Failed to fetch subscriber'
      }, { status: 500 });
    }
    
    if (!getResult.data || getResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Subscriber not found'
      }, { status: 404 });
    }

    const subscriber = getResult.data[0];

    if (subscriber.email_verified === 1) {
      return NextResponse.json({
        success: false,
        error: 'Email is already verified'
      }, { status: 400 });
    }

    // Update subscriber to mark as verified
    const updateQuery = `
      UPDATE subscribers 
      SET email_verified = 1, 
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(subscriberId)}
    `;
    
    const updateResult = await executeOracleQuery(updateQuery);
    
    if (!updateResult.success) {
      return NextResponse.json({
        success: false,
        error: updateResult.error || 'Failed to update subscriber'
      }, { status: 500 });
    }

    console.log(`✅ Manually verified subscriber: ${subscriber.email}`);

    // Send welcome email
    try {
      const emailResult = await sendWelcomeEmail(subscriber.email, subscriber.name);
      if (emailResult.success) {
        console.log(`✅ Welcome email sent to ${subscriber.email}`);
      } else {
        console.log(`⚠️ Failed to send welcome email: ${emailResult.error}`);
      }
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
      // Don't fail the verification if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified manually and welcome email sent',
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        emailVerified: true,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('❌ Manual verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
