'use client';

import React, { useState, useEffect } from 'react';

interface ScheduledJob {
  id: number;
  job_type: string;
  reference_id: number;
  status: string;
  attempts: number;
  max_attempts: number;
  error_message?: string;
  result_data?: string;
  scheduledFor: string;
  createdAt: string;
  completedAt?: string;
  postTitle?: string;
}

interface JobStats {
  job_type: string;
  status: string;
  count: number;
}

interface Subscriber {
  id: number;
  email: string;
  name?: string;
  status: string;
  subscriptionDate: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SchedulerDashboard() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [stats, setStats] = useState<JobStats[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'subscribers'>('overview');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshRate, setRefreshRate] = useState(30); // seconds
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);
  const [verifyingManually, setVerifyingManually] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load scheduler jobs
      const jobsResponse = await fetch('/api/scheduler');
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setJobs(jobsData.jobs || []);
        setStats(jobsData.stats || []);
      }

      // Load subscribers
      const subscribersResponse = await fetch('/api/subscribers');
      if (subscribersResponse.ok) {
        const subscribersData = await subscribersResponse.json();
        setSubscribers(subscribersData.subscribers || []);
      }
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerScheduler = async (action: 'process_posts' | 'process_emails' | 'process_all') => {
    try {
      setLoading(true);
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Scheduler triggered:', data);
        // Reload data after processing
        setTimeout(loadData, 1000);
      } else {
        setError('Failed to trigger scheduler');
      }
    } catch (error) {
      setError('Failed to trigger scheduler');
      console.error('Scheduler trigger error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (subscriberId: number, email: string) => {
    try {
      setResendingEmail(subscriberId);
      setError(null);

      const response = await fetch('/api/subscribers/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriberId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Verification email resent successfully');
        // You could show a success toast here
        setTimeout(() => {
          setError(`✅ Verification email sent to ${email}`);
          setTimeout(() => setError(null), 3000);
        }, 100);
      } else {
        setError(`❌ Failed to resend email: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setError('❌ Failed to resend verification email');
      console.error('Resend email error:', error);
    } finally {
      setResendingEmail(null);
    }
  };

  const manuallyVerifyEmail = async (subscriberId: number, email: string) => {
    try {
      setVerifyingManually(subscriberId);
      setError(null);

      const response = await fetch('/api/subscribers/manual-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriberId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Email manually verified successfully');
        // Reload subscribers to show updated status
        setTimeout(() => {
          setError(`✅ ${email} manually verified`);
          setTimeout(() => setError(null), 3000);
          loadData(); // Refresh the data
        }, 100);
      } else {
        setError(`❌ Failed to verify manually: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setError('❌ Failed to manually verify email');
      console.error('Manual verify error:', error);
    } finally {
      setVerifyingManually(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Separate effect for auto-refresh
  useEffect(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    if (autoRefresh) {
      const interval = setInterval(loadData, refreshRate * 1000);
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [autoRefresh, refreshRate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'sent':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
      case 'unsubscribed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getJobTypeIcon = (jobType: string) => {
    switch (jobType) {
      case 'publish_post':
        return '📝';
      case 'send_email':
        return '📧';
      case 'cleanup':
        return '🧹';
      default:
        return '⚙️';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const statsCards = [
    {
      title: 'Total Jobs',
      value: jobs.length,
      icon: '⚙️',
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Jobs',
      value: jobs.filter(j => j.status === 'pending').length,
      icon: '⏳',
      color: 'bg-yellow-500'
    },
    {
      title: 'Failed Jobs',
      value: jobs.filter(j => j.status === 'failed').length,
      icon: '❌',
      color: 'bg-red-500'
    },
    {
      title: 'Total Subscribers',
      value: subscribers.length,
      icon: '👥',
      color: 'bg-green-500'
    },
    {
      title: 'Active Subscribers',
      value: subscribers.filter(s => s.status === 'active' && s.emailVerified).length,
      icon: '✅',
      color: 'bg-green-600'
    },
    {
      title: 'Unverified',
      value: subscribers.filter(s => !s.emailVerified).length,
      icon: '⚠️',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Scheduler Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor blog scheduler and email campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh controls */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-md p-1">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                autoRefresh 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {autoRefresh ? '⏸️ Auto' : '▶️ Auto'}
            </button>
            {autoRefresh && (
              <select
                value={refreshRate}
                onChange={(e) => setRefreshRate(Number(e.target.value))}
                className="text-sm border-none bg-transparent focus:outline-none"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
              </select>
            )}
          </div>
          
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            🔄 Refresh
          </button>
          <div className="relative">
            <select
              onChange={(e) => {
                const action = e.target.value as 'process_posts' | 'process_emails' | 'process_all';
                if (action) {
                  triggerScheduler(action);
                  e.target.value = '';
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>🚀 Run Scheduler</option>
              <option value="process_posts">📝 Process Posts</option>
              <option value="process_emails">📧 Process Emails</option>
              <option value="process_all">⚡ Process All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                {card.icon}
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="text-sm text-gray-600">{card.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: '📈 Overview', count: null },
            { id: 'jobs', label: '⚙️ Jobs', count: jobs.length },
            { id: 'subscribers', label: '👥 Subscribers', count: subscribers.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">📈 System Overview</h2>
            
            {/* Job Statistics */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Job Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">{stat.job_type}</div>
                        <div className="text-lg font-semibold">{stat.count}</div>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${getStatusColor(stat.status)}`}>
                        {stat.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-medium mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getJobTypeIcon(job.job_type)}</span>
                      <div>
                        <div className="text-sm font-medium">{job.job_type}</div>
                        <div className="text-xs text-gray-500">{formatDate(job.createdAt)}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled For</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getJobTypeIcon(job.job_type)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{job.job_type}</div>
                          {job.postTitle && (
                            <div className="text-sm text-gray-500">{job.postTitle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.attempts}/{job.max_attempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(job.scheduledFor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {job.error_message && (
                        <div className="text-red-600 text-xs mb-1">
                          Error: {job.error_message.substring(0, 50)}...
                        </div>
                      )}
                      {job.result_data && (
                        <div className="text-green-600 text-xs">
                          {job.result_data.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscribed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subscriber.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscriber.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subscriber.status)}`}>
                        {subscriber.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subscriber.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {subscriber.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(subscriber.subscriptionDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!subscriber.emailVerified ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => resendVerificationEmail(subscriber.id, subscriber.email)}
                            disabled={resendingEmail === subscriber.id || verifyingManually === subscriber.id}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            {resendingEmail === subscriber.id ? (
                              <>
                                <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full mr-1"></span>
                                Sending...
                              </>
                            ) : (
                              '📧 Resend Email'
                            )}
                          </button>
                          <button
                            onClick={() => manuallyVerifyEmail(subscriber.id, subscriber.email)}
                            disabled={resendingEmail === subscriber.id || verifyingManually === subscriber.id}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            {verifyingManually === subscriber.id ? (
                              <>
                                <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full mr-1"></span>
                                Verifying...
                              </>
                            ) : (
                              '✅ Manual Verify'
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-green-600 text-xs">✅ Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
