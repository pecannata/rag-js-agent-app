import { NextRequest, NextResponse } from 'next/server'
import { verifyUserEmail, findUserByVerificationToken } from '../../../../lib/users'
import { sendWelcomeEmail } from '../../../lib/email'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { message: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find user by token before verification (to get email for welcome email)
    const user = findUserByVerificationToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Verify the email
    const isVerified = verifyUserEmail(token)
    
    if (!isVerified) {
      return NextResponse.json(
        { message: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.email.split('@')[0])
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the verification if welcome email fails
    }

    return NextResponse.json(
      { message: 'Email verified successfully! You can now sign in.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
