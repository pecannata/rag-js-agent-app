import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Email Logs Database Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Email logs database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Email logs database query executed successfully');
    console.log('📤 Raw Oracle Output (first 500 chars):', stdout.substring(0, 500));
    
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
      
      if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
        console.log('✅ Treating as empty result set');
        return { success: true, data: [] };
      }
      return { success: true, data: trimmedOutput };
    }
  } catch (error) {
    console.error('❌ Email logs database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// GET /api/email-logs - Check email campaign logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id') || '5'; // Default to campaign 5
    
    const query = `
      SELECT 
        ecl.id,
        ecl.campaign_id,
        ecl.subscriber_id,
        s.email,
        s.name,
        ecl.status,
        TO_CHAR(ecl.sent_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as sent_at,
        ecl.error_message,
        TO_CHAR(ecl.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
      FROM email_campaign_logs ecl
      JOIN subscribers s ON ecl.subscriber_id = s.id
      WHERE ecl.campaign_id = ${campaignId}
      ORDER BY ecl.id
    `;
    
    const result = await executeOracleQuery(query);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch email logs' },
        { status: 500 }
      );
    }
    
    let dataArray = result.data;
    if (!Array.isArray(dataArray)) {
      dataArray = [];
    }
    
    const logs = dataArray.map((log: any) => ({
      ...log,
      sentAt: log.sent_at,
      createdAt: log.created_at
    }));
    
    return NextResponse.json({ 
      success: true, 
      campaignId: parseInt(campaignId),
      logs
    });
    
  } catch (error) {
    console.error('Error in email logs GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
