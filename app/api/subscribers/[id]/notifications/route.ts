import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);


// Utility function to validate numeric IDs
function validateId(id: any): number | null {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    return null;
  }
  return numId;
}

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Notifications Database Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Notifications database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Notifications database query executed successfully');
    
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
    console.error('❌ Notifications database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// GET /api/subscribers/[id]/notifications - Get subscriber notification preferences
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const subscriberId = validateId(resolvedParams.id);
    if (!subscriberId) {
      return NextResponse.json(
        { error: 'Valid subscriber ID is required' },
        { status: 400 }
      );
    }

    // Get subscriber notification preferences
    const query = `
      SELECT 
        id,
        email,
        email_notifications_enabled,
        status,
        email_verified
      FROM subscribers 
      WHERE id = ${subscriberId}
    `;
    
    const result = await executeOracleQuery(query);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch subscriber notifications' },
        { status: 500 }
      );
    }
    
    let dataArray = result.data;
    if (!Array.isArray(dataArray)) {
      dataArray = [];
    }
    
    if (dataArray.length === 0) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    const subscriber = dataArray[0];
    const notifications = {
      subscriberId: subscriber.id,
      email: subscriber.email,
      emailNotificationsEnabled: subscriber.email_notifications_enabled === 1,
      status: subscriber.status,
      emailVerified: subscriber.email_verified === 1
    };
    
    return NextResponse.json({ success: true, notifications });
    
  } catch (error) {
    console.error('Error in subscriber notifications GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/subscribers/[id]/notifications - Update subscriber notification preferences
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const subscriberId = validateId(resolvedParams.id);
    if (!subscriberId) {
      return NextResponse.json(
        { error: 'Valid subscriber ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { emailNotificationsEnabled } = body;
    
    if (typeof emailNotificationsEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'emailNotificationsEnabled must be a boolean value' },
        { status: 400 }
      );
    }

    // Check if subscriber exists
    const checkQuery = `SELECT id, email FROM subscribers WHERE id = ${subscriberId}`;
    const checkResult = await executeOracleQuery(checkQuery);
    
    if (!checkResult.success) {
      return NextResponse.json(
        { error: checkResult.error || 'Failed to check subscriber' },
        { status: 500 }
      );
    }
    
    let checkData = checkResult.data;
    if (!Array.isArray(checkData)) {
      checkData = [];
    }
    
    if (checkData.length === 0) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Update email notifications preference
    const updateQuery = `
      UPDATE subscribers 
      SET 
        email_notifications_enabled = ${emailNotificationsEnabled ? 1 : 0},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${subscriberId}
    `;
    
    const result = await executeOracleQuery(updateQuery);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    // Get updated subscriber data
    const getUpdatedQuery = `
      SELECT 
        id,
        email,
        email_notifications_enabled,
        status,
        email_verified,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM subscribers 
      WHERE id = ${subscriberId}
    `;
    
    const updatedResult = await executeOracleQuery(getUpdatedQuery);
    
    if (updatedResult.success && Array.isArray(updatedResult.data) && updatedResult.data.length > 0) {
      const subscriber = updatedResult.data[0];
      const notifications = {
        subscriberId: subscriber.id,
        email: subscriber.email,
        emailNotificationsEnabled: subscriber.email_notifications_enabled === 1,
        status: subscriber.status,
        emailVerified: subscriber.email_verified === 1,
        updatedAt: subscriber.updated_at
      };
      
      console.log(`✅ Email notifications ${emailNotificationsEnabled ? 'enabled' : 'disabled'} for subscriber ${subscriber.email}`);
      
      return NextResponse.json({ 
        success: true, 
        notifications,
        message: `Email notifications ${emailNotificationsEnabled ? 'enabled' : 'disabled'} successfully`
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Email notifications ${emailNotificationsEnabled ? 'enabled' : 'disabled'} successfully`
    });
    
  } catch (error) {
    console.error('Error in subscriber notifications PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
