import { NextRequest, NextResponse } from 'next/server';
import { testEmailConfig } from '../../lib/email';

// Test endpoint to verify email configuration
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Test the email configuration
    const testResult = await testEmailConfig();
    
    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Email configuration is working!',
        config: {
          service: process.env.EMAIL_SERVICE || 'not set',
          host: process.env.EMAIL_HOST || 'not set',
          port: process.env.EMAIL_PORT || 'not set',
          from: process.env.EMAIL_FROM || 'not set',
          user: process.env.EMAIL_USER ? 'configured' : 'not set'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error,
        message: 'Email configuration has issues',
        config: {
          service: process.env.EMAIL_SERVICE || 'not set',
          host: process.env.EMAIL_HOST || 'not set',
          port: process.env.EMAIL_PORT || 'not set',
          from: process.env.EMAIL_FROM || 'not set',
          user: process.env.EMAIL_USER ? 'configured' : 'not set'
        }
      });
    }
  } catch (error) {
    console.error('❌ Email test error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      message: 'Failed to test email configuration'
    }, { status: 500 });
  }
}

// Test sending an actual email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email address is required'
      }, { status: 400 });
    }

    // Import the email functions
    const { sendEmailVerification } = await import('../../lib/email');
    
    console.log('📧 Sending test verification email to:', email);
    
    // Send a test verification email
    const result = await sendEmailVerification(email, 'test-token-12345', 'Test User');
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test verification email sent to ${email}!`,
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to send test email'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Test email send error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      message: 'Failed to send test email'
    }, { status: 500 });
  }
}
