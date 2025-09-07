'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../lib/useAdmin';

interface Comment {
  id: number;
  blog_post_id: number;
  blog_post_title: string;
  author_name: string;
  author_email: string;
  author_website?: string;
  comment_content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  notify_follow_up: 'Y' | 'N';
  notify_new_posts: 'Y' | 'N';
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface CommentSummary {
  status: string;
  count: number;
}

const CommentsAdminPage: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { isAdmin, isLoading, isAuthenticated } = useAdmin();
  const [comments, setComments] = useState<Comment[]>([]);
  const [summary, setSummary] = useState<CommentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComments, setSelectedComments] = useState<number[]>([]);
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated || !isAdmin) {
      router.push('/auth/signin');
      return;
    }

    loadComments();
  }, [isAuthenticated, isAdmin, isLoading, router, currentFilter]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userEmail: session?.user?.email || '',
        status: currentFilter,
        limit: '100'
      });

      const response = await fetch(`/api/admin/comments?${params}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setComments(result.comments || []);
        setSummary(result.summary || []);
      } else {
        setError(result.error || 'Failed to load comments');
      }
    } catch (err) {
      setError('Network error loading comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAction = async (action: 'approve' | 'reject' | 'spam' | 'delete', commentIds: number[]) => {
    if (commentIds.length === 0) {
      alert('Please select comments to moderate');
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${commentIds.length} comment(s)?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': session?.user?.email || ''
        },
        body: JSON.stringify({
          commentIds,
          action
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(result.message);
        setSelectedComments([]);
        loadComments(); // Reload to reflect changes
      } else {
        alert(result.error || `Failed to ${action} comments`);
      }
    } catch (err) {
      alert('Network error processing comments');
      console.error('Error processing comments:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectComment = (commentId: number) => {
    setSelectedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.map(c => c.id));
    }
  };

  const getSummaryCount = (status: string): number => {
    return summary.find(s => s.status === status)?.count || 0;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'spam': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Comment Management</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              ← Back to Admin
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-900">{getSummaryCount('pending')}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-900">{getSummaryCount('approved')}</div>
              <div className="text-sm text-green-600">Approved</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-900">{getSummaryCount('rejected')}</div>
              <div className="text-sm text-red-600">Rejected</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-900">{getSummaryCount('spam')}</div>
              <div className="text-sm text-gray-600">Spam</div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-6 rounded-lg border mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'rejected', 'spam'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCurrentFilter(filter)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  {filter !== 'all' && (
                    <span className="ml-1 text-xs">({getSummaryCount(filter)})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedComments.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleCommentAction('approve', selectedComments)}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                >
                  ✓ Approve ({selectedComments.length})
                </button>
                <button
                  onClick={() => handleCommentAction('reject', selectedComments)}
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                >
                  ✗ Reject ({selectedComments.length})
                </button>
                <button
                  onClick={() => handleCommentAction('spam', selectedComments)}
                  disabled={processing}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                >
                  🚫 Spam ({selectedComments.length})
                </button>
                <button
                  onClick={() => handleCommentAction('delete', selectedComments)}
                  disabled={processing}
                  className="bg-red-800 hover:bg-red-900 text-white px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                >
                  🗑️ Delete ({selectedComments.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comments...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">No comments found for the current filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            {/* Select All Header */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedComments.length === comments.length && comments.length > 0}
                  onChange={handleSelectAll}
                  className="mr-3"
                />
                <span className="font-medium text-gray-700">
                  Select All ({comments.length} comments)
                </span>
              </label>
            </div>

            {/* Comments */}
            <div className="divide-y divide-gray-200">
              {comments.map((comment) => (
                <div key={comment.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedComments.includes(comment.id)}
                      onChange={() => handleSelectComment(comment.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      {/* Comment Header */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {comment.author_name}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(comment.status)}`}>
                              {comment.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>{comment.author_email}</div>
                            {comment.author_website && (
                              <div>Website: {comment.author_website}</div>
                            )}
                            <div>Blog Post: <strong>{comment.blog_post_title}</strong></div>
                            <div>Posted: {formatDate(comment.created_at)}</div>
                            {comment.approved_at && (
                              <div>Approved: {formatDate(comment.approved_at)} by {comment.approved_by}</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Individual Actions */}
                        <div className="flex gap-2 mt-4 md:mt-0">
                          {comment.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleCommentAction('approve', [comment.id])}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleCommentAction('reject', [comment.id])}
                                disabled={processing}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleCommentAction('spam', [comment.id])}
                            disabled={processing}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            🚫 Spam
                          </button>
                          <button
                            onClick={() => handleCommentAction('delete', [comment.id])}
                            disabled={processing}
                            className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {/* Comment Content */}
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="text-gray-800 leading-relaxed">
                          {comment.comment_content.split('\\n').map((paragraph, index) => (
                            <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
                          ))}
                        </div>
                      </div>

                      {/* Technical Details */}
                      {comment.ip_address && (
                        <div className="mt-3 text-xs text-gray-500">
                          IP: {comment.ip_address} | User Agent: {comment.user_agent?.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsAdminPage;
