import { NextRequest, NextResponse } from 'next/server'
import { createUser, findUserByEmail } from '../../../../lib/users'
import { sendAuthEmailVerification } from '../../../lib/email'
import { exec } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

const execAsync = promisify(exec)

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

// Generate unique tokens
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Oracle database execution function for blog subscriptions
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Blog Subscription Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Blog subscription query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Blog subscription query executed successfully');
    
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Blog subscription modification query completed:', queryType, '- Output:', trimmedOutput || '(empty - success)');
      return { success: true, data: trimmedOutput || 'Operation completed successfully' };
    }
    
    if (isDataQuery) {
      console.log('📤 Blog subscription raw Oracle output (first 500 chars):', stdout.substring(0, 500));
    }
    
    try {
      const jsonData = JSON.parse(stdout);
      console.log('✅ Blog subscription successfully parsed as JSON');
      
      if (jsonData.results && Array.isArray(jsonData.results) && jsonData.results.length > 0) {
        const items = jsonData.results[0].items || [];
        console.log('✅ Blog subscription extracted Oracle items:', items.length, 'rows');
        return { success: true, data: items };
      }
      
      if (Array.isArray(jsonData)) {
        console.log('✅ Blog subscription direct array format');
        return { success: true, data: jsonData };
      }
      
      console.log('ℹ️ Blog subscription single object, wrapping in array');
      return { success: true, data: [jsonData] };
      
    } catch (_parseError) {
      const trimmedOutput = stdout.trim();
      
      if (isDataQuery) {
        console.log('⚠️ Blog subscription SELECT query could not parse as JSON. Output:', trimmedOutput.substring(0, 200));
        if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
          console.log('✅ Blog subscription treating as empty result set');
          return { success: true, data: [] };
        }
        return { success: true, data: trimmedOutput };
      } else {
        console.log('✅ Blog subscription non-SELECT query completed successfully');
        return { success: true, data: trimmedOutput || 'Operation completed successfully' };
      }
    }
  } catch (error) {
    console.error('❌ Blog subscription database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Function to automatically subscribe user to blog notifications
async function createBlogSubscription(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Creating blog subscription for:', email);
    
    // Check if email already exists in subscribers
    const checkQuery = `SELECT COUNT(*) as count FROM subscribers WHERE email = '${escapeSqlString(email)}'`;
    const checkResult = await executeOracleQuery(checkQuery);
    
    if (checkResult.success && checkResult.data[0]?.count > 0) {
      console.log('ℹ️ User already has blog subscription:', email);
      return { success: true }; // Already subscribed, that's fine
    }
    
    // Generate tokens
    const unsubscribeToken = generateToken();
    const verificationToken = generateToken();
    
    // Insert new blog subscriber (auto-verified since they verified their user account)
    const insertQuery = `
      INSERT INTO subscribers (
        email, 
        status, 
        unsubscribe_token, 
        email_verified,
        verification_token,
        verification_sent_at,
        email_notifications_enabled
      ) VALUES (
        '${escapeSqlString(email)}',
        'active',
        '${unsubscribeToken}',
        1,
        '${verificationToken}',
        CURRENT_TIMESTAMP,
        1
      )
    `;
    
    const result = await executeOracleQuery(insertQuery);
    
    if (!result.success) {
      console.error('❌ Failed to create blog subscription for:', email, result.error);
      return { success: false, error: result.error || 'Failed to create blog subscription' };
    }
    
    console.log('✅ Blog subscription created successfully for:', email);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error creating blog subscription:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      )
    }

    // Create new user
    const newUser = await createUser(email, password)
    
    if (!newUser) {
      return NextResponse.json(
        { message: 'Failed to create user' },
        { status: 500 }
      )
    }
    
    console.log('🔧 New user created:', { email, hasToken: !!newUser.emailVerificationToken })
    
    // Automatically subscribe user to blog notifications
    console.log('📧 Auto-subscribing user to blog notifications:', email)
    const blogSubscriptionResult = await createBlogSubscription(email)
    
    if (blogSubscriptionResult.success) {
      console.log('✅ User auto-subscribed to blog notifications:', email)
    } else {
      console.warn('⚠️ Failed to auto-subscribe user to blog notifications:', email, blogSubscriptionResult.error)
      // Don't fail the signup, just log the warning
    }
    
    // Send verification email
    if (newUser.emailVerificationToken) {
      try {
        console.log('📧 Sending verification email to:', email)
        const emailResult = await sendAuthEmailVerification(email, newUser.emailVerificationToken)
        console.log('📧 Email result:', emailResult)
        
        const successMessage = blogSubscriptionResult.success 
          ? 'Account created! Please check your email to verify your account. You\'ve also been subscribed to blog notifications - you can unsubscribe anytime from any email we send.'
          : 'Account created! Please check your email to verify your account.'
        
        return NextResponse.json(
          { message: successMessage },
          { status: 201 }
        )
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError)
        const errorMessage = blogSubscriptionResult.success
          ? 'Account created and subscribed to blog notifications, but failed to send verification email. Please try logging in or contact support.'
          : 'User created but failed to send verification email. Please try logging in or contact support.'
        
        return NextResponse.json(
          { message: errorMessage },
          { status: 201 }
        )
      }
    }
    
    const finalMessage = blogSubscriptionResult.success
      ? 'User created successfully and subscribed to blog notifications. You can unsubscribe anytime from any email we send.'
      : 'User created successfully'
      
    return NextResponse.json(
      { message: finalMessage },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
