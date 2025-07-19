'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  scheduledDate?: string;
  isScheduled?: boolean;
}

interface BlogManagerProps {
  apiKey: string;
}

export default function BlogManager({ apiKey: _apiKey }: BlogManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived' | 'scheduled'>('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  
  // Form state for new/editing posts
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: '',
    status: 'draft' as 'draft' | 'published' | 'archived' | 'scheduled',
    scheduledDate: '',
    isScheduled: false
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // HTML remain unchanged
  const processHtmlContent = (html: string): string => {
    return html; // Keep HTML as is without conversion
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when editing
      if (!isEditing) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave(false);
            break;
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault();
              setShowPublishModal(true);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, currentPost]);

  // Load blog posts on component mount
  useEffect(() => {
    loadBlogPosts();
  }, []);

  // Auto-save functionality
  const triggerAutoSave = () => {
    if (!currentPost || !hasUnsavedChanges) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave(); // Auto-save as draft
    }, 3000);
  };

  // Track unsaved changes
  useEffect(() => {
    if (currentPost) {
      const hasChanges = 
        formData.title !== currentPost.title ||
        formData.content !== currentPost.content ||
        formData.excerpt !== currentPost.excerpt ||
        formData.tags !== (currentPost.tags || []).join(', ') ||
        formData.status !== currentPost.status ||
        formData.scheduledDate !== (currentPost.scheduledDate || '') ||
        formData.isScheduled !== (currentPost.isScheduled || false);
      
      setHasUnsavedChanges(hasChanges);
      
      if (hasChanges) {
        triggerAutoSave();
      }
    }
  }, [formData, currentPost]);

  const loadBlogPosts = async () => {
    console.log('📊 Loading blog posts...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/blog', {
        method: 'GET',
      });
      
      console.log('📡 Load response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Load response data:', data);
        setPosts(data.posts || []);
      } else {
        const errorData = await response.json();
        console.error('❌ Load error:', errorData);
        setError(errorData.error || 'Failed to load blog posts');
      }
    } catch (error) {
      console.error('❌ Load exception:', error);
      setError('Error loading blog posts: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPost = () => {
    setCurrentPost(null);
    setFormData({
      title: '',
      content: '# New Blog Post\n\nWrite an engaging introduction that hooks your readers and introduces the main topic.\n\n## Overview\n\nProvide a brief overview of what readers will learn or discover in this post.\n\n## Key Points\n\n- **Point 1**: Explain your first main point with details and examples\n- **Point 2**: Elaborate on your second key point\n- **Point 3**: Share your third insight or finding\n\n## Implementation\n\nIf applicable, provide practical steps or examples here.\n\n## Conclusion\n\nSummarize the key takeaways and encourage reader engagement.\n\n---\n\n*What are your thoughts on this topic? Share your experience in the comments below!*',
      excerpt: '',
      tags: '',
      status: 'draft',
      scheduledDate: '',
      isScheduled: false
    });
    setIsCreating(true);
    setIsEditing(true);
    setIsPreviewMode(false);
    setHasUnsavedChanges(false);
  };

  const handleEditPost = (post: BlogPost) => {
    setCurrentPost(post);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      excerpt: post.excerpt || '',
      tags: (post.tags || []).join(', '),
      status: post.status || 'draft',
      scheduledDate: post.scheduledDate || '',
      isScheduled: post.isScheduled || false
    });
    setIsCreating(false);
    setIsEditing(true);
    setIsPreviewMode(false);
    setHasUnsavedChanges(false);
  };

  const handleViewPost = (post: BlogPost) => {
    setCurrentPost(post);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      excerpt: post.excerpt || '',
      tags: (post.tags || []).join(', '),
      status: post.status || 'draft',
      scheduledDate: post.scheduledDate || '',
      isScheduled: post.isScheduled || false
    });
    setIsCreating(false);
    setIsEditing(false);
    setIsPreviewMode(true);
    setHasUnsavedChanges(false);
  };

  const handleAutoSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      return; // Don't auto-save if required fields are missing
    }

    if (loading) {
      return; // Don't auto-save if manual operation is in progress
    }

    setAutoSaving(true);
    setError(null);

    try {
      const postData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        status: 'draft', // Auto-save always saves as draft
        id: currentPost?.id
      };

      const response = await fetch('/api/blog', {
        method: isCreating ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPost(data.post);
        setIsCreating(false);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        // Don't reload posts list for auto-save to avoid disrupting user
      } else {
        // Don't show auto-save errors to avoid disrupting user experience
        console.warn('Auto-save failed:', response.status);
      }
    } catch (error) {
      console.warn('Auto-save error:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    console.log('🚀 Publishing attempt:', { publish, isCreating, currentPost: currentPost?.id });
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    setLoading(true);
    setError(null);

    try {
      const postData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        status: publish ? 'published' : formData.status,
        id: currentPost?.id
      };

      const response = await fetch('/api/blog', {
        method: isCreating ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPost(data.post);
        setIsCreating(false);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        await loadBlogPosts(); // Refresh the list
        
        if (publish) {
          setShowPublishModal(false);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', response.status, errorData);
        setError(`Failed to save blog post: ${errorData.error || errorData.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      setError('Error saving blog post: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
      return;
    }

    // Find the post title by ID since the API expects title for deletion
    const postToDelete = posts.find(post => post.id === postId);
    if (!postToDelete) {
      setError('Post not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/blog', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: postToDelete.title }),
      });

      if (response.ok) {
        await loadBlogPosts();
        if (currentPost?.id === postId) {
          setCurrentPost(null);
          setIsEditing(false);
          setIsCreating(false);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete blog post');
      }
    } catch (error) {
      setError('Error deleting blog post: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return (title || '')
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const generateExcerpt = (content: string) => {
    // Remove HTML tags and get first 200 characters
    const plainText = (content || '')
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
    
    return plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = (post.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (post.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (post.tags || []).some(tag => (tag || '').toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug and excerpt
      ...(field === 'title' && { slug: generateSlug(value) }),
      ...(field === 'content' && { excerpt: generateExcerpt(value) })
    }));
  };

  // TinyMCE editor change handler
  const handleEditorChange = (content: string) => {
    // Process HTML content directly
    const processedContent = processHtmlContent(content);
    // Update formData if content changed
    if (processedContent !== formData.content) {
      setFormData(prev => ({
        ...prev,
        content: processedContent,
        // Auto-generate excerpt when content changes
        excerpt: generateExcerpt(processedContent)
      }));
    }
  };

  // Function to print the current blog post
  const printCurrentPost = () => {
    if (!currentPost) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${currentPost.title}</title>
  <style>
    @media print {
      body { margin: 0; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; page-break-after: avoid; }
    p { margin-bottom: 1em; }
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em; color: #666; font-style: italic; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto; page-break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; page-break-inside: avoid; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    del { color: #888; }
    hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
    svg { width: 16px; height: 16px; vertical-align: middle; }
    .inline-flex { display: inline-flex; align-items: center; gap: 4px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${currentPost.title}</h1>
  <div>${currentPost.content}</div>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for the content to load, then trigger print dialog
    setTimeout(() => {
      printWindow.print();
      
      // Optional: Close the window after printing (user can cancel if needed)
      printWindow.onafterprint = function() {
        printWindow.close();
      };
    }, 100);
  };


  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📝 Blog Manager
              {currentPost && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  {isCreating ? 'New Post' : currentPost.title}
                  {!isEditing && currentPost && (
                    <button
                      onClick={printCurrentPost}
                      className="ml-2 px-3 py-1 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded"
                    >
                      📄 Print
                    </button>
                  )}
                  {hasUnsavedChanges && (
                    <span className="ml-2 text-orange-600" title="Unsaved changes">•</span>
                  )}
                </span>
              )}
            </h2>
            {lastSaved && (
              <span className="text-sm text-green-600">
                {autoSaving ? 'Auto-saving...' : `Saved ${lastSaved.toLocaleTimeString()}`}
              </span>
            )}
            {autoSaving && !lastSaved && (
              <span className="text-sm text-blue-600">
                Auto-saving...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={handleNewPost}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ✏️ New Post
                </button>
                <button
                  onClick={() => window.open('/demo', '_blank')}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  title="See Phase 2 Demo: Scheduling, Email System & Dashboard"
                >
                  🎉 Phase 2 Demo
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  💾 Save Draft
                </button>
                <button
                  onClick={() => setShowPublishModal(true)}
                  disabled={loading}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  🚀 Publish
                </button>
                <button
                  onClick={() => {
                    if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                      return;
                    }
                    setIsEditing(false);
                    setIsCreating(false);
                    setCurrentPost(null);
                    setHasUnsavedChanges(false);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ❌ Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 px-6 py-3">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Post List Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Posts</option>
                <option value="draft">Drafts</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Post List */}
          <div className="flex-1 overflow-y-auto">
            {loading && posts.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No posts found</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      currentPost?.id === post.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0" onClick={() => handleViewPost(post)}>
                        <h3 className="font-medium text-gray-900 truncate">{post.title || 'Untitled'}</h3>
                        <p className="text-sm text-gray-600 mt-1" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{post.excerpt || 'No excerpt available'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            (post.status || 'draft') === 'published' ? 'bg-green-100 text-green-800' :
                            (post.status || 'draft') === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            (post.status || 'draft') === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {post.status || 'draft'}
                            {post.status === 'scheduled' && post.scheduledDate && (
                              <span className="ml-1 text-xs">
                                📅 {new Date(post.scheduledDate).toLocaleDateString()}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : 'Unknown date'}
                          </span>
                        </div>
                        {(post.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(post.tags || []).slice(0, 3).map((tag, index) => (
                              <span key={`${post.id}-tag-${index}-${tag}`} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {tag || ''}
                              </span>
                            ))}
                            {(post.tags || []).length > 3 && (
                              <span className="text-xs text-gray-500">+{(post.tags || []).length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPost(post);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(post.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor/Preview Area */}
        <div className="flex-1 flex flex-col">
          {currentPost || isCreating ? (
            <>
              {isEditing && (
                <>
                  {/* Post Metadata Form */}
                  <div className="bg-white border-b border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Post title..."
                        value={formData.title}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Tags (comma-separated)..."
                        value={formData.tags}
                        onChange={(e) => handleFormChange('tags', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <textarea
                      placeholder="Post excerpt..."
                      value={formData.excerpt}
                      onChange={(e) => handleFormChange('excerpt', e.target.value)}
                      rows={2}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    
                    {/* Scheduling Controls */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.status === 'scheduled'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleFormChange('status', 'scheduled');
                                // Set default scheduled date to 1 hour from now if not set
                                if (!formData.scheduledDate) {
                                  const tomorrow = new Date();
                                  tomorrow.setHours(tomorrow.getHours() + 1);
                                  const isoString = tomorrow.toISOString().slice(0, 16);
                                  handleFormChange('scheduledDate', isoString);
                                }
                              } else {
                                handleFormChange('status', 'draft');
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          📅 Schedule this post for later
                        </label>
                      </div>
                      
                      {formData.status === 'scheduled' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Scheduled Publication Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              value={formData.scheduledDate}
                              onChange={(e) => handleFormChange('scheduledDate', e.target.value)}
                              min={new Date().toISOString().slice(0, 16)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          
                          {formData.scheduledDate && (
                            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                              📅 <strong>Will be published:</strong> {new Date(formData.scheduledDate).toLocaleString()}
                              {new Date(formData.scheduledDate) <= new Date() && (
                                <span className="text-orange-600 ml-2">
                                  ⚠️ This date is in the past - post will be published immediately
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editor Toolbar */}
                  <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`px-3 py-1 rounded ${isPreviewMode ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                        title="Toggle Preview"
                      >
                        👁️ Preview
                      </button>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <span className="text-xs text-gray-500 px-2 py-1" title="Keyboard Shortcuts">
                        💡 Cmd+S: Save | Cmd+Shift+Enter: Publish
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                {isEditing && !isPreviewMode ? (
                  <TinyMCEEditor
                    apiKey='qagffr3pkuv17a8on1afax661irst1hbr4e6tbv888sz91jc'
                    init={{
                      height: '100%',
                      base_url: '/tinymce',
                      suffix: '.min',
                      menubar: false,
                      plugins: 'lists advlist link image table code codesample media anchor charmap emoticons insertdatetime pagebreak preview fullscreen searchreplace visualblocks visualchars save help wordcount autosave autolink importcss nonbreaking quickbars',
                      toolbar: 'fullscreen | undo redo | save | formatselect fontselect fontsizeselect | bold italic underline strikethrough | subscript superscript | forecolor backcolor | removeformat | alignleft aligncenter alignright | bullist numlist indent outdent | blockquote hr | link unlink anchor | image media | table tableinsertrowbefore tableinsertrowafter tabledeleterow | charmap emoticons insertdatetime pagebreak | preview searchreplace | visualblocks visualchars | code codesample | help',
                      content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 16px; line-height: 1.6; } ' +
                        'blockquote { border-left: 4px solid #e5e7eb; margin: 1.5rem 0; padding-left: 1rem; font-style: italic; color: #6b7280; } ' +
                        'hr { border: none; border-top: 2px solid #e5e7eb; margin: 2rem 0; }',
                      branding: false,
                      resize: false,
                      statusbar: false,
                      convert_urls: false,
                      relative_urls: false,
                      remove_script_host: false,
                      document_base_url: '/',
                      promotion: false,
                      forced_root_block: 'p',
                      forced_root_block_attrs: {},
                      // Prevent content reinitialization
                      // auto_focus: false, // Remove this line as false is not a valid value
                      // Keep undo history
                      custom_undo_redo_levels: 50,
                      // Preserve content formatting
                      keep_styles: true,
                      verify_html: false,
                      // Don't clean up content aggressively
                      cleanup: false,
                      cleanup_on_startup: false,
                      trim_span_elements: false,
                      // Image handling
                      image_dimensions: true,
                      image_class_list: [
                        {title: 'None', value: ''},
                        {title: 'Responsive', value: 'img-responsive'}
                      ],
                      // Code sample configuration
                      codesample_languages: [
                        {text: 'HTML/XML', value: 'markup'},
                        {text: 'JavaScript', value: 'javascript'},
                        {text: 'TypeScript', value: 'typescript'},
                        {text: 'CSS', value: 'css'},
                        {text: 'PHP', value: 'php'},
                        {text: 'Ruby', value: 'ruby'},
                        {text: 'Python', value: 'python'},
                        {text: 'Java', value: 'java'},
                        {text: 'C', value: 'c'},
                        {text: 'C#', value: 'csharp'},
                        {text: 'C++', value: 'cpp'},
                        {text: 'Go', value: 'go'},
                        {text: 'Rust', value: 'rust'},
                        {text: 'SQL', value: 'sql'},
                        {text: 'JSON', value: 'json'},
                        {text: 'YAML', value: 'yaml'},
                        {text: 'Bash', value: 'bash'},
                        {text: 'PowerShell', value: 'powershell'},
                        {text: 'Docker', value: 'dockerfile'},
                        {text: 'Markdown', value: 'markdown'}
                      ],
                      codesample_dialog_height: 400,
                      codesample_dialog_width: 800,
                      // Color palette configuration
                      color_map: [
                        "000000", "Black",
                        "993300", "Burnt orange",
                        "333300", "Dark olive",
                        "003300", "Dark green",
                        "003366", "Dark azure",
                        "000080", "Navy Blue",
                        "333399", "Indigo",
                        "333333", "Very dark gray",
                        "800000", "Maroon",
                        "FF6600", "Orange",
                        "808000", "Olive",
                        "008000", "Green",
                        "008080", "Teal",
                        "0000FF", "Blue",
                        "666699", "Grayish blue",
                        "808080", "Gray",
                        "FF0000", "Red",
                        "FF9900", "Amber",
                        "99CC00", "Yellow green",
                        "339966", "Sea green",
                        "33CCCC", "Turquoise",
                        "3366FF", "Royal blue",
                        "800080", "Purple",
                        "999999", "Medium gray",
                        "FF00FF", "Magenta",
                        "FFCC00", "Gold",
                        "FFFF00", "Yellow",
                        "00FF00", "Lime",
                        "00FFFF", "Aqua",
                        "00CCFF", "Sky blue",
                        "993366", "Red violet",
                        "FFFFFF", "White",
                        "FF99CC", "Pink",
                        "FFCC99", "Peach",
                        "FFFF99", "Light yellow",
                        "CCFFCC", "Pale green",
                        "CCFFFF", "Pale cyan",
                        "99CCFF", "Light sky blue",
                        "CC99FF", "Plum"
                      ],
                      custom_colors: false,
                      // Font family options
                      font_family_formats: 'Arial=arial,helvetica,sans-serif;' +
                        'Helvetica=helvetica,arial,sans-serif;' +
                        'Times New Roman=times new roman,times,serif;' +
                        'Georgia=georgia,serif;' +
                        'Verdana=verdana,geneva,sans-serif;' +
                        'Courier New=courier new,courier,monospace;' +
                        'Apple System=system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;' +
                        'Roboto=roboto,sans-serif;' +
                        'Open Sans=open sans,sans-serif;' +
                        'Lato=lato,sans-serif;' +
                        'Montserrat=montserrat,sans-serif;' +
                        'Playfair Display=playfair display,serif;' +
                        'Source Code Pro=source code pro,monaco,menlo,consolas,monospace',
                      // Font size options
                      fontsize_formats: '8px 9px 10px 11px 12px 14px 16px 18px 20px 22px 24px 26px 28px 32px 36px 48px 72px',
                      // Advanced list configuration
                      advlist_bullet_styles: 'default,circle,disc,square',
                      advlist_number_styles: 'default,lower-alpha,lower-greek,lower-roman,upper-alpha,upper-roman',
                      // Table configuration
                      table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
                      table_appearance_options: false,
                      table_grid: false,
                      table_resize_bars: true,
                      table_default_attributes: {
                        border: '1',
                        style: 'border-collapse: collapse; width: 100%;'
                      },
                      table_default_styles: {
                        'border-collapse': 'collapse',
                        'width': '100%'
                      },
                      // Media plugin configuration
                      media_live_embeds: true,
                      media_url_resolver: function (data: any) {
                        return new Promise((resolve) => {
                          try {
                            console.log('Media URL resolver called with:', data.url);
                            
                            if (!data.url) {
                              resolve({ html: '' });
                              return;
                            }
                            
                            const url = data.url.toString().toLowerCase();
                            
                            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                              // Convert YouTube URLs to embed format
                              let videoId = '';
                              
                              if (url.includes('watch?v=')) {
                                const match = data.url.match(/[?\&]v=([^\&]+)/);
                                videoId = match ? match[1] : '';
                              } else if (url.includes('youtu.be/')) {
                                const match = data.url.match(/youtu\.be\/([^?]+)/);
                                videoId = match ? match[1] : '';
                              } else if (url.includes('embed/')) {
                                const match = data.url.match(/embed\/([^?]+)/);
                                videoId = match ? match[1] : '';
                              }
                              
                              if (videoId) {
                                const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                resolve({
                                  html: `<iframe src="${embedUrl}" width="560" height="315" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
                                });
                              } else {
                                console.warn('Could not extract video ID from YouTube URL:', data.url);
                                resolve({ html: '' });
                              }
                            } else {
                              // Not a YouTube URL, let TinyMCE handle it normally
                              resolve({ html: '' });
                            }
                          } catch (error) {
                            console.error('Media URL resolver error:', error);
                            resolve({ html: '' }); // Don't reject, just resolve with empty HTML
                          }
                        });
                      },
                      // Anchor plugin configuration
                      anchor_top: '#top',
                      anchor_bottom: '#bottom',
                      // Special content configuration
                      // Character map plugin
                      charmap_append: [
                        [0x2605, 'Black star'],
                        [0x2606, 'White star'],
                        [0x2190, 'Left arrow'],
                        [0x2192, 'Right arrow'],
                        [0x2191, 'Up arrow'],
                        [0x2193, 'Down arrow'],
                        [0x2764, 'Heavy black heart'],
                        [0x2713, 'Check mark'],
                        [0x2717, 'Ballot X'],
                        [0x00A9, 'Copyright'],
                        [0x00AE, 'Registered trademark'],
                        [0x2122, 'Trade mark']
                      ],
                      // Emoticons configuration
                      emoticons_database: 'emojiimages',
                      emoticons_append: {
                        custom_mind_exploding: {
                          keywords: ['brain', 'mind', 'explode', 'blown'],
                          char: '🤯'
                        }
                      },
                      // Insert date/time configuration
                      insertdatetime_formats: [
                        '%Y-%m-%d',
                        '%m/%d/%Y',
                        '%I:%M:%S %p',
                        '%D'
                      ],
                      insertdatetime_timeformat: '%H:%M:%S',
                      insertdatetime_dateformat: '%Y-%m-%d',
                      // Page break configuration
                      pagebreak_separator: '<!-- pagebreak -->',
                      // View & Navigation configuration
                      // Preview plugin
                      preview_styles: 'font-family font-size font-weight font-style text-decoration text-transform color background-color border border-radius outline text-shadow',
                      // Fullscreen plugin
                      fullscreen_new_window: false,
                      fullscreen_settings: {
                        theme_advanced_path_location: 'none',
                        theme_advanced_toolbar_location: 'top'
                      },
                      // Search & Replace plugin
                      searchreplace_shortcuts: true,
                      // Visual blocks plugin
                      visualblocks_default_state: false,
                      // Visual chars plugin
                      visualchars_default_state: false,
                      // Productivity configuration
                      // Use browser's built-in spellcheck
                      browser_spellcheck: true,
                      // Template plugin removed (deprecated in TinyMCE 7.0)
                      // Save plugin
                      save_enablewhendirty: true,
                      save_onsavecallback: function() {
                        // This will trigger the existing save functionality
                        console.log('Save triggered from TinyMCE save button');
                      },
                      // Explicitly disable problematic plugins
                      external_plugins: {},
                      // Prevent automatic loading of unwanted plugins
                      plugins_exclude: ['onboarding'],
                      setup: (editor: any) => {
                        let isInitialized = false;
                        
                        editor.on('init', () => {
                          console.log('TinyMCE initialized successfully');
                          isInitialized = true;
                        });
                        
                        // Track content changes
                        editor.on('Change', () => {
                          if (isInitialized) {
                            const content = editor.getContent();
                            if (content !== formData.content) {
                              handleEditorChange(content);
                            }
                          }
                        });
                      },
                    }}
                    value={formData.content}
                    onEditorChange={handleEditorChange}
                  />
                ) : (
                  <div className="h-full overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-6">
                      <article className="prose prose-lg max-w-none">
                        {/* Post Header */}
                        <header className="mb-8 pb-6 border-b border-gray-200">
                          <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            {formData.title || currentPost?.title}
                          </h1>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>By {currentPost?.author || 'Unknown Author'}</span>
                            <span>•</span>
                            <span>
                              {(formData.status || currentPost?.status) === 'scheduled' ? (
                                formData.scheduledDate || currentPost?.scheduledDate ? 
                                  `Scheduled for ${new Date(formData.scheduledDate || currentPost?.scheduledDate || '').toLocaleDateString()}` :
                                  'Scheduled (date not set)'
                              ) : (
                                currentPost?.publishedAt ? new Date(currentPost.publishedAt).toLocaleDateString() : 'Not published'
                              )}
                            </span>
                            <span>•</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              (formData.status || currentPost?.status) === 'published' ? 'bg-green-100 text-green-800' :
                              (formData.status || currentPost?.status) === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              (formData.status || currentPost?.status) === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {formData.status || currentPost?.status}
                              {(formData.status || currentPost?.status) === 'scheduled' && (
                                <span className="ml-1">📅</span>
                              )}
                            </span>
                          </div>
                          {(formData.tags || (currentPost?.tags || []).length > 0) && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {(formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : currentPost?.tags || []).map((tag, index) => (
                                <span key={`preview-tag-${index}-${tag}`} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </header>

                        {/* Post Content */}
                        <div 
                          className="prose-content"
                          style={{
                            lineHeight: '1.6',
                            fontSize: '16px',
                            fontFamily: '-apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: (formData.content || currentPost?.content || '').replace(
                              /<p>/g, '<p style="margin-bottom: 1rem; margin-top: 0;">'
                            ).replace(
                              /<br\s*\/?>/g, '<br style="display: block; margin: 0.5rem 0; content: \'\';" />'
                            ).replace(
                              /<h([1-6])>/g, '<h$1 style="margin-top: 1.5rem; margin-bottom: 1rem;">'
                            ).replace(
                              /<blockquote>/g, '<blockquote style="border-left: 4px solid #e5e7eb; margin: 1.5rem 0; padding-left: 1rem; font-style: italic; color: #6b7280;">'
                            ).replace(
                              /<hr\s*\/?>/g, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 2rem 0;" />'
                            )
                          }}
                        />
                      </article>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Welcome Screen
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Blog Manager</h3>
                <p className="text-gray-600">Select a post from the sidebar to view or edit it, or click "New Post" to create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Publish Blog Post</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to publish "{formData.title}"? It will be visible to all readers.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
