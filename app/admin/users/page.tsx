'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  createdAt: string
  emailVerified: boolean
  approved: boolean
}

export default function UserManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user?.email !== 'phil.cannata@yahoo.com') {
      router.push('/') // Redirect non-admin users to home
      return
    }
  }, [session, status, router])

  // Load users
  useEffect(() => {
    if (session) {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data)
      } else {
        setError(data.message || 'Failed to fetch users')
      }
    } catch (_error) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete user: ${email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(`User ${email} deleted successfully`)
        fetchUsers() // Refresh the list
      } else {
        setError(data.message || 'Failed to delete user')
      }
    } catch (_error) {
      setError('Failed to delete user')
    }
  }

  const resetPassword = async (email: string) => {
    const newPassword = prompt(`Enter new password for ${email}:`)
    if (!newPassword) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, newPassword })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(`Password reset for ${email}`)
      } else {
        setError(data.message || 'Failed to reset password')
      }
    } catch (_error) {
      setError('Failed to reset password')
    }
  }

  const approveUser = async (email: string) => {
    if (!confirm(`Are you sure you want to approve user: ${email}?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, action: 'approve' })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(`User ${email} approved successfully`)
        fetchUsers() // Refresh the list
      } else {
        setError(data.message || 'Failed to approve user')
      }
    } catch (_error) {
      setError('Failed to approve user')
    }
  }

  const unapproveUser = async (email: string) => {
    if (!confirm(`Are you sure you want to revoke approval for user: ${email}?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, action: 'unapprove' })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(`User ${email} approval revoked`)
        fetchUsers() // Refresh the list
      } else {
        setError(data.message || 'Failed to revoke approval')
      }
    } catch (_error) {
      setError('Failed to revoke approval')
    }
  }

  // Show loading state
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
                >
                  <span className="mr-1">🖥️</span>
                  System Info
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Back to App
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Verified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approved
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.emailVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.emailVerified ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.approved 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {!user.approved && (
                            <button
                              onClick={() => approveUser(user.email)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                          )}
                          {user.approved && user.email !== 'phil.cannata@yahoo.com' && (
                            <button
                              onClick={() => unapproveUser(user.email)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => resetPassword(user.email)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => deleteUser(user.email)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {users.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">User File Location:</h3>
              <p className="text-xs text-gray-600 font-mono">./data/users.json</p>
              <p className="text-xs text-gray-500 mt-1">
                Users are stored in a JSON file. Changes persist between server restarts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
