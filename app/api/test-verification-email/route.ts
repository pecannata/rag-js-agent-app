import { NextRequest, NextResponse } from 'next/server'
import { sendEmailVerification } from '../../lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    console.log('🧪 Testing email verification send to:', email)
    
    // Generate a test token
    const testToken = 'test-token-' + Date.now()
    
    // Send verification email
    const emailResult = await sendEmailVerification(email, testToken)
    console.log('📧 Email test result:', emailResult)

    return NextResponse.json({
      message: 'Test verification email sent',
      result: emailResult
    })
  } catch (error) {
    console.error('❌ Test email error:', error)
    return NextResponse.json(
      { message: 'Failed to send test email', error: (error as Error).message },
      { status: 500 }
    )
  }
}
