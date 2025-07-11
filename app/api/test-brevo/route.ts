import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Brevo email integration...');
    
    const result = await sendEmail(
      'cannata@utexas.edu', // Send test email to yourself
      'emailVerification',
      {
        verificationUrl: 'http://localhost:3000/verify?token=test123',
        subscriberName: 'Paul Cannata'
      }
    );
    
    if (result.success) {
      console.log('✅ Brevo email test successful!');
      console.log('📧 Message ID:', result.messageId);
      
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully via Brevo!',
        messageId: result.messageId,
        recipient: 'cannata@utexas.edu'
      });
    } else {
      console.error('❌ Email test failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Test error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to test Brevo email integration',
    endpoint: '/api/test-brevo',
    method: 'POST'
  });
}
