import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getUsers, deleteUser, updateUserPassword, approveUser, unapproveUser, findUserByEmail } from '../../../../lib/users'
import { sendUserApprovalNotification } from '../../../lib/email'

// Check if user is admin
async function isAdmin(_request: NextRequest) {
  const session = await getServerSession()
  return session?.user?.email === 'phil.cannata@yahoo.com'
}

// GET - List all users
export async function GET(_request: NextRequest) {
  try {
    if (!(await isAdmin(_request))) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const users = getUsers()
    
    // Remove passwords from response for security
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      approved: user.approved
    }))
    
    return NextResponse.json(safeUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json(
        { message: 'Email parameter is required' },
        { status: 400 }
      )
    }
    
    const success = deleteUser(email)
    
    if (success) {
      return NextResponse.json({ message: 'User deleted successfully' })
    } else {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user password
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const { email, newPassword } = await request.json()
    
    if (!email || !newPassword) {
      return NextResponse.json(
        { message: 'Email and new password are required' },
        { status: 400 }
      )
    }
    
    const success = await updateUserPassword(email, newPassword)
    
    if (success) {
      return NextResponse.json({ message: 'Password updated successfully' })
    } else {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Approve or unapprove user
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const { email, action } = await request.json()
    
    if (!email || !action) {
      return NextResponse.json(
        { message: 'Email and action are required' },
        { status: 400 }
      )
    }
    
    if (action !== 'approve' && action !== 'unapprove') {
      return NextResponse.json(
        { message: 'Action must be either "approve" or "unapprove"' },
        { status: 400 }
      )
    }
    
    const success = action === 'approve' ? approveUser(email) : unapproveUser(email)
    
    if (success) {
      // Send approval notification email when user is approved
      if (action === 'approve') {
        try {
          const user = findUserByEmail(email)
          const userName = user?.email.split('@')[0]
          await sendUserApprovalNotification(email, userName)
        } catch (emailError) {
          console.error('Failed to send approval notification:', emailError)
          // Don't fail the approval if email fails
        }
      }
      
      return NextResponse.json({ 
        message: `User ${action === 'approve' ? 'approved' : 'unapproved'} successfully` 
      })
    } else {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error updating user approval:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
