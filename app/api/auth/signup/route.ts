import { NextRequest, NextResponse } from 'next/server'
import { createUser, findUserByEmail } from '../../../../lib/users'
import { sendAuthEmailVerification } from '../../../lib/email'

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
    
    // Send verification email
    if (newUser.emailVerificationToken) {
      try {
        console.log('📧 Sending verification email to:', email)
        const emailResult = await sendAuthEmailVerification(email, newUser.emailVerificationToken)
        console.log('📧 Email result:', emailResult)
        
        return NextResponse.json(
          { message: 'User created. Please check your email to verify your account.' },
          { status: 201 }
        )
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError)
        return NextResponse.json(
          { message: 'User created but failed to send verification email. Please try logging in or contact support.' },
          { status: 201 }
        )
      }
    }
    
    return NextResponse.json(
      { message: 'User created successfully' },
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
