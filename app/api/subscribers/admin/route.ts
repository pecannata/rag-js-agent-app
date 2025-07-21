import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

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
    console.log('🔍 Admin Subscribers Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Admin subscribers database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Admin subscribers database query executed successfully');
    
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Admin modification query completed:', queryType, '- Output:', trimmedOutput || '(empty - success)');
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
    console.error('❌ Admin subscribers database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Check if user is admin
async function isAdminUser(request: NextRequest): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.email === 'phil.cannata@yahoo.com';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// PATCH /api/subscribers/admin - Update subscriber status
export async function PATCH(request: NextRequest) {
  try {
    // Check admin authorization
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { email, status } = await request.json();
    
    // Validate required fields
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!status || !['active', 'inactive', 'unsubscribed'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (active, inactive, unsubscribed)' },
        { status: 400 }
      );
    }
    
    // Update subscriber status
    const updateQuery = `
      UPDATE subscribers 
      SET status = '${escapeSqlString(status)}', updated_at = CURRENT_TIMESTAMP
      WHERE email = '${escapeSqlString(email)}'
    `;
    
    const result = await executeOracleQuery(updateQuery);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update subscriber status' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Subscriber status updated to ${status}` 
    });
    
  } catch (error) {
    console.error('Error in admin subscribers PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/subscribers/admin - Delete subscriber
export async function DELETE(request: NextRequest) {
  try {
    // Check admin authorization
    const isAdmin = await isAdminUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Delete subscriber
    const deleteQuery = `
      DELETE FROM subscribers 
      WHERE email = '${escapeSqlString(email)}'
    `;
    
    const result = await executeOracleQuery(deleteQuery);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete subscriber' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Subscriber ${email} deleted successfully` 
    });
    
  } catch (error) {
    console.error('Error in admin subscribers DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
