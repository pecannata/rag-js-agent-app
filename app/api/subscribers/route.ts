import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { sendEmailVerification, sendWelcomeEmail } from '../../lib/email';

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

// Utility function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate unique tokens
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Subscribers Database Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Subscribers database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Subscribers database query executed successfully');
    
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
    console.error('❌ Subscribers database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

interface Subscriber {
  id?: number;
  email: string;
  name?: string;
  status?: 'active' | 'inactive' | 'unsubscribed';
  subscriptionDate?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  unsubscribeToken?: string;
  createdAt?: string;
  updatedAt?: string;
}

// GET /api/subscribers - Get all subscribers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const verified = searchParams.get('verified');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    
    let query = `
      SELECT 
        id,
        email,
        name,
        status,
        TO_CHAR(subscription_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as subscription_date,
        email_verified,
        unsubscribe_token,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM subscribers
    `;
    
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(`status = '${status}'`);
    }
    if (verified === 'true') {
      conditions.push('email_verified = 1');
    } else if (verified === 'false') {
      conditions.push('email_verified = 0');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      query += ` FETCH FIRST ${parseInt(limit)} ROWS ONLY`;
      if (offset) {
        query += ` OFFSET ${parseInt(offset)} ROWS`;
      }
    }
    
    const result = await executeOracleQuery(query);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }
    
    let dataArray = result.data;
    if (!Array.isArray(dataArray)) {
      dataArray = [];
    }
    
    const subscribers = dataArray.map((subscriber: any) => ({
      ...subscriber,
      subscriptionDate: subscriber.subscription_date,
      emailVerified: subscriber.email_verified === 1,
      createdAt: subscriber.created_at,
      updatedAt: subscriber.updated_at
    }));
    
    return NextResponse.json({ success: true, subscribers });
    
  } catch (error) {
    console.error('Error in subscribers GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/subscribers - Subscribe new user
export async function POST(request: NextRequest) {
  try {
    const subscriberData: Subscriber = await request.json();
    
    // Validate required fields
    if (!subscriberData.email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!isValidEmail(subscriberData.email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const checkQuery = `SELECT COUNT(*) as count FROM subscribers WHERE email = '${escapeSqlString(subscriberData.email)}'`;
    const checkResult = await executeOracleQuery(checkQuery);
    
    if (checkResult.success && checkResult.data[0]?.count > 0) {
      return NextResponse.json(
        { error: 'Email address is already subscribed' },
        { status: 400 }
      );
    }
    
    // Generate tokens
    const unsubscribeToken = generateToken();
    const verificationToken = generateToken();
    
    // Insert new subscriber
    const insertQuery = `
      INSERT INTO subscribers (
        email, 
        name, 
        status, 
        unsubscribe_token, 
        email_verified, 
        verification_token,
        verification_sent_at
      ) VALUES (
        '${escapeSqlString(subscriberData.email)}',
        ${subscriberData.name ? `'${escapeSqlString(subscriberData.name)}'` : 'NULL'},
        'active',
        '${unsubscribeToken}',
        0,
        '${verificationToken}',
        CURRENT_TIMESTAMP
      )
    `;
    
    const result = await executeOracleQuery(insertQuery);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create subscription' },
        { status: 500 }
      );
    }
    
    // Get the created subscriber
    const getQuery = `
      SELECT 
        id,
        email,
        name,
        status,
        TO_CHAR(subscription_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as subscription_date,
        email_verified,
        verification_token,
        unsubscribe_token,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
      FROM subscribers 
      WHERE email = '${escapeSqlString(subscriberData.email)}'
    `;
    
    const getResult = await executeOracleQuery(getQuery);
    
    if (getResult.success && getResult.data && getResult.data.length > 0) {
      const subscriber = getResult.data[0];
      const formattedSubscriber = {
        ...subscriber,
        subscriptionDate: subscriber.subscription_date,
        emailVerified: subscriber.email_verified === 1,
        createdAt: subscriber.created_at
      };
      
      // Send verification email
      console.log('📧 Sending verification email to:', subscriber.email);
      const emailResult = await sendEmailVerification(
        subscriber.email,
        subscriber.verification_token,
        subscriber.name
      );
      
      if (!emailResult.success) {
        console.error('⚠️ Failed to send verification email:', emailResult.error);
        // Don't fail the subscription, just log the error
      } else {
        console.log('✅ Verification email sent successfully');
      }
      
      return NextResponse.json({ 
        success: true, 
        subscriber: formattedSubscriber,
        message: 'Subscription created successfully. Please check your email for verification.' 
      });
    }
    
    return NextResponse.json({ success: true, message: 'Subscription created successfully' });
    
  } catch (error) {
    console.error('Error in subscribers POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/subscribers - Update subscriber (verify email, unsubscribe, etc.)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const token = searchParams.get('token');
    
    if (!action || !token) {
      return NextResponse.json(
        { error: 'Action and token are required' },
        { status: 400 }
      );
    }
    
    let updateQuery = '';
    let successMessage = '';
    
    switch (action) {
      case 'verify':
        updateQuery = `
          UPDATE subscribers 
          SET email_verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE verification_token = '${escapeSqlString(token)}' AND email_verified = 0
        `;
        successMessage = 'Email verified successfully';
        break;
        
      case 'unsubscribe':
        updateQuery = `
          UPDATE subscribers 
          SET status = 'unsubscribed', updated_at = CURRENT_TIMESTAMP
          WHERE unsubscribe_token = '${escapeSqlString(token)}' AND status != 'unsubscribed'
        `;
        successMessage = 'Successfully unsubscribed';
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "verify" or "unsubscribe"' },
          { status: 400 }
        );
    }
    
    const result = await executeOracleQuery(updateQuery);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update subscription' },
        { status: 500 }
      );
    }
    
    // If this was an email verification, send welcome email
    if (action === 'verify') {
      try {
        // Get subscriber details for welcome email
        const getSubscriberQuery = `
          SELECT email, name FROM subscribers 
          WHERE verification_token = '${escapeSqlString(token)}' OR 
                (verification_token IS NULL AND email_verified = 1)
          ORDER BY updated_at DESC
          FETCH FIRST 1 ROWS ONLY
        `;
        
        const subscriberResult = await executeOracleQuery(getSubscriberQuery);
        
        if (subscriberResult.success && subscriberResult.data && subscriberResult.data.length > 0) {
          const subscriber = subscriberResult.data[0];
          console.log('📧 Sending welcome email to:', subscriber.email);
          
          const welcomeResult = await sendWelcomeEmail(subscriber.email, subscriber.name);
          
          if (!welcomeResult.success) {
            console.error('⚠️ Failed to send welcome email:', welcomeResult.error);
          } else {
            console.log('✅ Welcome email sent successfully');
          }
        }
      } catch (error) {
        console.error('⚠️ Error sending welcome email:', error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: successMessage 
    });
    
  } catch (error) {
    console.error('Error in subscribers PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
