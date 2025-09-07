'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../lib/useAdmin';

interface Subscriber {
  id: number;
  email: string;
  name?: string;
  status: 'active' | 'inactive' | 'unsubscribed';
  subscriptionDate: string;
  emailVerified: boolean;
  emailNotificationsEnabled: boolean;
  unsubscribeToken?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function SubscribersManagement() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isAdmin, isLoading, isAuthenticated } = useAdmin();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }
    if (!isAdmin) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  // Load subscribers
  useEffect(() => {
    if (session) {
      fetchSubscribers();
    }
  }, [session]);

  // Filter subscribers
  useEffect(() => {
    let filtered = subscribers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.name && sub.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Verification filter
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(sub => sub.emailVerified);
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(sub => !sub.emailVerified);
    }

    setFilteredSubscribers(filtered);
  }, [subscribers, searchTerm, statusFilter, verificationFilter]);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscribers');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSubscribers(data.subscribers || []);
      } else {
        setError(data.error || 'Failed to fetch subscribers');
      }
    } catch (error) {
      setError('Network error');
      console.error('Fetch subscribers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriberStatus = async (email: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/subscribers/admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, status: newStatus })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(`Subscriber ${email} status updated to ${newStatus}`);
        fetchSubscribers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update subscriber status');
      }
    } catch (error) {
      setError('Failed to update subscriber status');
      console.error('Update status error:', error);
    }
  };

  const deleteSubscriber = async (email: string) => {
    if (!confirm(`Are you sure you want to delete subscriber: ${email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/subscribers/admin?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(`Subscriber ${email} deleted successfully`);
        fetchSubscribers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to delete subscriber');
      }
    } catch (error) {
      setError('Failed to delete subscriber');
      console.error('Delete subscriber error:', error);
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const response = await fetch('/api/subscribers/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(`Verification email sent to ${email}`);
      } else {
        setError(data.error || 'Failed to send verification email');
      }
    } catch (error) {
      setError('Failed to send verification email');
      console.error('Resend verification error:', error);
    }
  };

  const manuallyVerify = async (email: string) => {
    try {
      const response = await fetch('/api/subscribers/manual-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(`Subscriber ${email} manually verified`);
        fetchSubscribers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to manually verify subscriber');
      }
    } catch (error) {
      setError('Failed to manually verify subscriber');
      console.error('Manual verify error:', error);
    }
  };

  // Show loading state
  if (isLoading || !isAuthenticated) {
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
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Blog Subscribers Management</h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
                >
                  <span className="mr-1">🖥️</span>
                  System Info
                </button>
                <button
                  onClick={() => router.push('/admin/users')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
                >
                  <span className="mr-1">👤</span>
                  User Management
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Back to App
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Verification</label>
                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
                <button
                  onClick={fetchSubscribers}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
                <button
                  onClick={() => setError('')}
                  className="float-right text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {success}
                <button
                  onClick={() => setSuccess('')}
                  className="float-right text-green-500 hover:text-green-700"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{subscribers.length}</div>
                <div className="text-sm text-blue-800">Total Subscribers</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {subscribers.filter(s => s.status === 'active').length}
                </div>
                <div className="text-sm text-green-800">Active</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {subscribers.filter(s => !s.emailVerified).length}
                </div>
                <div className="text-sm text-yellow-800">Unverified</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {subscribers.filter(s => s.status === 'unsubscribed').length}
                </div>
                <div className="text-sm text-red-800">Unsubscribed</div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading subscribers...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email Verified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscribed Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSubscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {subscriber.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {subscriber.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            subscriber.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : subscriber.status === 'unsubscribed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            subscriber.emailVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {subscriber.emailVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscriber.subscriptionDate ? new Date(subscriber.subscriptionDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {!subscriber.emailVerified && (
                            <>
                              <button
                                onClick={() => manuallyVerify(subscriber.email)}
                                className="text-green-600 hover:text-green-900 text-xs"
                                title="Manually verify email"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => resendVerification(subscriber.email)}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                                title="Resend verification email"
                              >
                                Resend
                              </button>
                            </>
                          )}
                          {subscriber.status === 'active' && (
                            <button
                              onClick={() => updateSubscriberStatus(subscriber.email, 'inactive')}
                              className="text-yellow-600 hover:text-yellow-900 text-xs"
                            >
                              Deactivate
                            </button>
                          )}
                          {subscriber.status === 'inactive' && (
                            <button
                              onClick={() => updateSubscriberStatus(subscriber.email, 'active')}
                              className="text-green-600 hover:text-green-900 text-xs"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => deleteSubscriber(subscriber.email)}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredSubscribers.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {searchTerm || statusFilter !== 'all' || verificationFilter !== 'all' 
                        ? 'No subscribers match your filters' 
                        : 'No subscribers found'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
