'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RichTextEditor from '../components/RichTextEditor';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  hasFullContent?: boolean; // Track if content is fully loaded
}

interface CategoryPost {
  id: number;
  title: string;
  author: string;
  publishedAt: string;
}

interface CategorizedPosts {
  ai: CategoryPost[];
  cs: CategoryPost[];
  science: CategoryPost[];
}

const BlogsContent: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categorizedPosts, setCategorizedPosts] = useState<CategorizedPosts | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingModalContent, setLoadingModalContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const isLoadingFromUrl = useRef(false);
  
  // Admin filter state
  const [statusFilter, setStatusFilter] = useState<'published' | 'draft' | 'all'>('published');
  const isAdmin = session?.user?.email === 'phil.cannata@yahoo.com';
  
  // Blog editing states
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullScreenEditing, setIsFullScreenEditing] = useState(false);
  
  // Form data for editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: '',
    status: 'draft' as 'draft' | 'published' | 'archived' | 'scheduled',
    scheduledDate: '',
    isScheduled: false
  });


  // Function to open modal - simplified like BlogManager
  const openPostModal = async (post: BlogPost) => {
    console.log('🔵 openPostModal called for post:', post.id, 'Has full content:', !!post.hasFullContent);
    setSelectedPost(post);
    setShowModal(true);
    
    // If post doesn't have full content loaded, fetch it first
    if (!post.hasFullContent && !post.content) {
      setLoadingModalContent(true);
      try {
        console.log('🔄 Lazy loading content for post:', post.id);
        // Pass user email for admin access to draft posts
        const userEmailParam = session?.user?.email ? `?userEmail=${encodeURIComponent(session.user.email)}` : '';
        const response = await fetch(`/api/blog/${post.id}${userEmailParam}`);
        if (response.ok) {
          const fullPost = await response.json();
          // Update the post in our local state with the full content
          const updatedPosts = posts.map(p => 
            p.id === post.id ? { ...p, content: fullPost.content, hasFullContent: true } : p
          );
          setPosts(updatedPosts);
          const updatedPost = { ...post, content: fullPost.content, hasFullContent: true };
          setSelectedPost(updatedPost);
          console.log('✅ Content loaded for post:', post.id, 'Length:', fullPost.content?.length || 0);
        } else {
          setError('Failed to load post content');
          return;
        }
      } catch (error) {
        console.error('Error loading post content:', error);
        setError('Error loading post content');
        return;
      } finally {
        setLoadingModalContent(false);
      }
    } else {
      setLoadingModalContent(false);
    }
  };

  useEffect(() => {
    // Clear existing posts when filter changes to prevent showing stale data
    setPosts([]);
    setCategorizedPosts(null);
    
    // Function to fetch just the 3 most recent posts immediately
    const fetchRecentPosts = async () => {
      try {
        console.log(`🚀 Fetching recent posts (top 3) for immediate display... Status: ${statusFilter}`);
        setLoadingRecent(true);
        setError(null);
        
        // Use status filter for admin, default to published for non-admin
        const statusParam = isAdmin ? statusFilter : 'published';
        const response = await fetch(`/api/blog?status=${statusParam}&limit=3&includeContent=false`);
        
        // Log cache status from response headers
        const cacheStatus = response.headers.get('X-Cache-Status');
        console.log('📋 Recent posts API cache status:', cacheStatus);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.posts) {
            console.log(`✅ Recent posts loaded for ${statusParam}:`, data.posts.length, '- Cache:', cacheStatus);
            console.log('📋 First post status:', data.posts[0]?.status, 'Title:', data.posts[0]?.title);
            // Posts come without content from the server (lazy loaded)
            const lazyPosts = (data.posts || []).map((post: BlogPost) => ({
              ...post,
              hasFullContent: false // No posts have full content initially
            }));
            setPosts(lazyPosts);
          } else {
            const message = statusFilter === 'draft' ? 'No draft blogs found' : 
                           statusFilter === 'all' ? 'No blogs found' : 'No published blogs found';
            setError(message);
          }
        } else {
          setError(`Failed to load blog posts (HTTP ${response.status})`);
        }
        
        /* OPTION 2: Parallel individual queries (LESS EFFICIENT)
        // First get list of recent post IDs
        const listResponse = await fetch('/api/blog?status=published&limit=3&includeContent=false');
        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.success && listData.posts) {
            console.log('🔄 Fetching individual posts in parallel...');
            
            // Fetch each post individually in parallel
            const postPromises = listData.posts.slice(0, 3).map(post => 
              fetch(`/api/blog/${post.id}`).then(res => res.json())
            );
            
            const postResults = await Promise.all(postPromises);
            const fullPosts = postResults.filter(result => result.success).map(result => result.post);
            
            console.log('✅ Parallel posts loaded:', fullPosts.length);
            setPosts(fullPosts);
          }
        }
        */
      } catch (error) {
        setError('Error loading recent blog posts');
        console.error('Error loading recent blog posts:', error);
      } finally {
        setLoadingRecent(false);
      }
    };

    // Function to fetch all blog posts (runs in background after recent posts)
    const fetchAllBlogs = async () => {
      try {
        console.log(`🔄 Fetching all blog posts in background... Status: ${statusFilter}`);
        
        // Use status filter for admin, default to published for non-admin
        const statusParam = isAdmin ? statusFilter : 'published';
        const response = await fetch(`/api/blog?status=${statusParam}&includeContent=false`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.posts) {
            console.log(`✅ All blog posts loaded for ${statusParam}:`, data.posts.length);
            console.log('📋 Sample posts status:', data.posts.slice(0, 3).map((p: any) => `${p.title} - ${p.status}`));
            // Posts come without content from the server (lazy loaded)
            const lazyPosts = (data.posts || []).map((post: BlogPost) => ({
              ...post,
              hasFullContent: false // No posts have full content initially
            }));
            
            // For different status filters, always update the posts since the content type has changed
            // Only skip update if we're fetching the same status with the same or fewer results
            setPosts(currentPosts => {
              // Check if current posts match the expected status filter
              const currentPostsMatchFilter = currentPosts.length === 0 || 
                (currentPosts.every(p => statusParam === 'all' || p.status === statusParam));
              
              if (!currentPostsMatchFilter || lazyPosts.length > currentPosts.length) {
                console.log(`🔄 Updating posts for ${statusParam}: had`, currentPosts.length, `posts, now have`, lazyPosts.length);
                return lazyPosts;
              } else {
                console.log(`📋 Keeping existing posts for ${statusParam}: same or fewer posts returned`);
                return currentPosts;
              }
            });
          }
        }
      } catch (error) {
        console.error('Error loading all blog posts:', error);
        // Don't set error here since recent posts already loaded
      }
    };

    // Function to fetch categorized posts (runs in parallel with all posts)
    const fetchCategorizedPosts = async () => {
      try {
        console.log(`🔄 Fetching categorized posts in background... Status: ${statusFilter}`);
        setLoadingCategories(true);
        
        // For admin users, pass the status filter to categorized posts as well
        const statusParam = isAdmin && statusFilter !== 'published' ? `?status=${statusFilter}` : '';
        const response = await fetch(`/api/blog/categories${statusParam}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.categories) {
            console.log('✅ Categorized posts loaded');
            setCategorizedPosts(data.categories);
          }
        }
      } catch (error) {
        console.error('Error fetching categorized posts:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    // Execute in optimal order for performance:
    // 1. Fetch recent posts immediately (shows content fast)
    // 2. Fetch full posts and categorized posts in parallel (background)
    const loadContent = async () => {
      // Step 1: Get recent posts immediately
      await fetchRecentPosts();
      
      // Step 2: Load everything else in parallel
      Promise.all([
        fetchAllBlogs(),
        fetchCategorizedPosts()
      ]);
    };

    loadContent();
  }, [statusFilter, isAdmin]); // Re-fetch when status filter changes

  // Check for URL parameter on page load to open specific post
  useEffect(() => {
    const postId = searchParams.get('id');
    console.log('🔍 URL Effect triggered:', { 
      postId, 
      postsLength: posts.length, 
      isLoadingFromUrl: isLoadingFromUrl.current,
      showModal,
      selectedPostId: selectedPost?.id
    });
    
    if (postId && posts.length > 0 && !isLoadingFromUrl.current && !showModal) {
      const post = posts.find(p => p.id === parseInt(postId));
      if (post && (!selectedPost || selectedPost.id !== post.id)) {
        console.log('🟢 Opening post from URL:', post.id);
        isLoadingFromUrl.current = true;
        // Open modal directly without updating URL (it's already set)
        openPostModal(post);
      }
    } else if (!postId && showModal) {
      // If URL has no ID but modal is still open, close it
      console.log('🟡 No post ID in URL but modal is open, closing modal');
      setShowModal(false);
      setSelectedPost(null);
      isLoadingFromUrl.current = false;
    } else if (!postId) {
      // Reset the ref when there's no ID parameter
      console.log('🟡 No post ID in URL, resetting ref');
      isLoadingFromUrl.current = false;
    }
  }, [posts, searchParams, showModal, selectedPost]);

  const handleCategoryPostClick = async (categoryPost: CategoryPost) => {
    // First, try to find the full post in our cached posts array
    const cachedPost = posts.find(p => p.id === categoryPost.id);
    
    if (cachedPost) {
      console.log('📋 Found cached post for category click:', cachedPost.id, 'Has full content:', !!cachedPost.hasFullContent);
      // Use the cached post which might already have content loaded
      await handlePostClick(cachedPost);
    } else {
      console.log('📋 No cached post found, creating temporary post for category click:', categoryPost.id);
      // Convert CategoryPost to BlogPost structure and fetch full content
      const tempPost: BlogPost = {
        id: categoryPost.id,
        title: categoryPost.title,
        slug: '',
        content: '',
        excerpt: '',
        author: categoryPost.author,
        status: 'published',
        tags: [],
        createdAt: categoryPost.publishedAt,
        updatedAt: categoryPost.publishedAt,
        publishedAt: categoryPost.publishedAt,
        hasFullContent: false // Explicitly set to false for non-cached posts
      };
      
      await handlePostClick(tempPost);
    }
  };

  const handlePostClick = async (post: BlogPost) => {
    console.log('🟠 handlePostClick called for post:', post.id, 'Has full content:', !!post.hasFullContent);
    
    // Check if post already has full content (cached) - if so, open immediately
    if (post.hasFullContent && post.content) {
      console.log('✅ Post is cached, opening immediately:', post.id);
      // Set flag to prevent URL effect from triggering duplicate logic
      isLoadingFromUrl.current = true;
      
      // Update URL with post ID
      router.push(`/blogs?id=${post.id}`, { scroll: false });
      
      // Use the simplified modal opening logic
      await openPostModal(post);
      
      // Reset flag after opening
      setTimeout(() => {
        isLoadingFromUrl.current = false;
      }, 100);
      return;
    }
    
    // For non-cached posts, use the existing flow
    console.log('🔄 Post not cached, using normal flow:', post.id);
    
    // Set flag to prevent URL effect from triggering duplicate logic
    isLoadingFromUrl.current = true;
    
    // Update URL with post ID
    router.push(`/blogs?id=${post.id}`, { scroll: false });
    
    // Use the simplified modal opening logic
    await openPostModal(post);
    
    // Reset flag after opening
    setTimeout(() => {
      isLoadingFromUrl.current = false;
    }, 100);
  };

  const closeModal = () => {
    // First, reset states to prevent re-opening
    setShowModal(false);
    setSelectedPost(null);
    isLoadingFromUrl.current = false;
    
    // Use replace instead of push to clear URL parameter without adding to history
    router.replace('/blogs', { scroll: false });
  };
  
  // Blog editing functions
  const handleNewPost = () => {
    setEditingPost(null);
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
    setHasUnsavedChanges(false);
  };
  
  const handleEditPost = async (post: BlogPost) => {
    // If post doesn't have full content, fetch it first
    if (!post.hasFullContent && !post.content) {
      try {
        // Pass user email for admin access to draft posts
        const userEmailParam = session?.user?.email ? `?userEmail=${encodeURIComponent(session.user.email)}` : '';
        const response = await fetch(`/api/blog/${post.id}${userEmailParam}`);
        if (response.ok) {
          const fullPost = await response.json();
          post = { ...post, content: fullPost.content, hasFullContent: true };
        }
      } catch (error) {
        console.error('Error loading post content for editing:', error);
        setError('Error loading post content for editing');
        return;
      }
    }
    
    setEditingPost(post);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      excerpt: post.excerpt || '',
      tags: (post.tags || []).join(', '),
      status: post.status as any || 'draft',
      scheduledDate: (post as any).scheduledDate || '',
      isScheduled: (post as any).isScheduled || false
    });
    setIsCreating(false);
    setIsEditing(true);
    setHasUnsavedChanges(false);
  };
  
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate excerpt when content changes
      ...(field === 'content' && { excerpt: generateExcerpt(value) })
    }));
  };
  
  const handleEditorChange = (content: string) => {
    if (content !== formData.content) {
      setFormData(prev => ({
        ...prev,
        content,
        excerpt: generateExcerpt(content)
      }));
    }
  };
  
  const generateExcerpt = (content: string) => {
    const plainText = (content || '')
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
    
    return plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
  };
  
  const handleSave = async (publish: boolean = false) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const postData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        status: publish ? 'published' : formData.status,
        id: editingPost?.id,
        // Include originalTitle for updates to help API identify the existing post
        originalTitle: editingPost?.title
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
        const savedPost = data.post;
        
        // Update the editing post reference
        setEditingPost(savedPost);
        setIsCreating(false);
        
        // Update form data to match the saved post to prevent "unsaved changes" detection
        if (savedPost) {
          setFormData({
            title: savedPost.title || '',
            content: savedPost.content || '',
            excerpt: savedPost.excerpt || '',
            tags: (savedPost.tags || []).join(', '),
            status: savedPost.status || 'draft',
            scheduledDate: (savedPost as any).scheduledDate || '',
            isScheduled: (savedPost as any).isScheduled || false
          });
        }
        
        // Clear unsaved changes flag
        setHasUnsavedChanges(false);
        
        // Refresh posts list
        await refreshPosts();
        
        if (publish) {
          setIsEditing(false);
        }
      } else {
        const errorData = await response.json();
        setError(`Failed to save blog post: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setError('Error saving blog post: ' + error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
      return;
    }
    
    const postToDelete = posts.find(post => post.id === postId);
    if (!postToDelete) {
      setError('Post not found');
      return;
    }
    
    setSaving(true);
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
        await refreshPosts();
        if (editingPost?.id === postId) {
          setEditingPost(null);
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
      setSaving(false);
    }
  };
  
  const refreshPosts = async () => {
    try {
      // Use current filter when refreshing
      const statusParam = isAdmin ? statusFilter : 'published';
      const response = await fetch(`/api/blog?status=${statusParam}&includeContent=false`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.posts) {
          const lazyPosts = (data.posts || []).map((post: BlogPost) => ({
            ...post,
            hasFullContent: false
          }));
          setPosts(lazyPosts);
        }
      }
    } catch (error) {
      console.error('Error refreshing posts:', error);
    }
  };
  
  const cancelEditing = () => {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      return;
    }
    setIsEditing(false);
    setIsCreating(false);
    setEditingPost(null);
    setHasUnsavedChanges(false);
  };
  
  // Track unsaved changes
  useEffect(() => {
    if (editingPost) {
      const hasChanges = 
        formData.title !== editingPost.title ||
        formData.content !== editingPost.content ||
        formData.excerpt !== editingPost.excerpt ||
        formData.tags !== (editingPost.tags || []).join(', ') ||
        formData.status !== editingPost.status;
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, editingPost]);

  const Modal = ({ post }: { post: BlogPost }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 italic">Alwayscurious</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">Informationals Series</span>
            <span className="text-gray-600">Enigma Book</span>
            <span className="text-gray-600">Podcast</span>
            <span className="text-gray-600">About</span>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <>
                <button
                  onClick={() => {
                    closeModal();
                    handleEditPost(post);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  title="Edit this post"
                >
                  ✏️ Edit Post
                </button>
                <button
                  onClick={() => {
                    closeModal();
                    handleDelete(post.id);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  title="Delete this post"
                >
                  🗑️ Delete
                </button>
              </>
            )}
            <button 
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <h1 className="text-4xl font-light text-gray-800 mb-8 text-center">
            {post.title}
          </h1>
          <div className="w-24 h-px bg-gray-400 mx-auto mb-12"></div>
          
          {loadingModalContent ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading blog content...</p>
              </div>
            </div>
          ) : (
            <div 
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content || 'Content not available' }}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Images Section */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-purple-200 rounded-lg"></div>
            </div>
            
            {/* Navigation Links */}
            <nav className="flex items-center gap-8">
              <span className="text-gray-600 italic">Alwayscurious</span>
              <a href="#" className="text-gray-600 hover:text-gray-800">Informationals Series</a>
              <a href="#" className="text-gray-600 hover:text-gray-800">Enigma Book</a>
              <a href="#" className="text-gray-600 hover:text-gray-800">Podcast</a>
              <a href="#" className="text-gray-600 hover:text-gray-800">About</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div 
        className="relative h-64 bg-cover bg-center"
        style={{
          backgroundImage: 'linear-gradient(135deg, #374151 0%, #4B5563 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="border-2 border-white px-8 py-4 inline-block">
              <h1 className="text-2xl font-light">
                Life is a Privilege. Always be Curious about Its Mysteries.
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 tracking-wide">
            LATEST POSTS ON ARTIFICIAL INTELLIGENCE, COMPUTER SCIENCE, AND GENERAL SCIENCE
          </h2>
        </div>
        
        {/* Blog Management Toolbar - Only show for authenticated users */}
        {session && (
          <div className="mb-8">
            {!isEditing ? (
              <div className="space-y-4">
                {/* Admin Status Filter */}
                {isAdmin && (
                  <div className="flex justify-center">
                    <div className="bg-white rounded-lg shadow-sm border p-4 inline-flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">View:</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          const newFilter = e.target.value as 'published' | 'draft' | 'all';
                          console.log(`🔄 Status filter changed from ${statusFilter} to ${newFilter}`);
                          setStatusFilter(newFilter);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="published">Published Posts</option>
                        <option value="draft">Draft Posts</option>
                        <option value="all">All Posts</option>
                      </select>
                      <span className="text-xs text-gray-500">
                        {loadingRecent ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : (
                          `(${posts.length} ${statusFilter === 'all' ? 'total' : statusFilter} post${posts.length !== 1 ? 's' : ''})`
                        )}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleNewPost}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    ✏️ Create New Post
                  </button>
                  <div className="text-sm text-gray-600">
                    Click on any post title to view, or use the edit button to modify posts
                  </div>
                </div>
              </div>
            ) : (
              <div className={`bg-white rounded-lg shadow-sm border p-6 mb-8 ${isFullScreenEditing ? 'fixed inset-0 z-50 overflow-y-auto max-w-none m-0 rounded-none' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isCreating ? '✏️ Create New Blog Post' : `📝 Edit: ${editingPost?.title}`}
                    </h3>
                    {hasUnsavedChanges && (
                      <span className="text-orange-600 text-sm">• Unsaved changes</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsFullScreenEditing(!isFullScreenEditing)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                      title={isFullScreenEditing ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullScreenEditing ? '🔲' : '📺'} {isFullScreenEditing ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                    <button
                      onClick={() => handleSave(false)}
                      disabled={saving}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      💾 {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      onClick={() => handleSave(true)}
                      disabled={saving}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      🚀 {saving ? 'Publishing...' : 'Publish'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
                
                {/* Post Metadata Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                
                {/* Rich Text Editor */}
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <RichTextEditor
                    value={formData.content}
                    onChange={handleEditorChange}
                    height={isFullScreenEditing ? 'calc(90vh - 200px)' : 400}
                    placeholder="Start writing your blog post..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {loadingRecent ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading latest posts...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">
            <p>❌ {error}</p>
          </div>
        ) : (
          <>
            {/* Latest Posts Header */}
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-900 pb-1 inline-block">
                {isAdmin && statusFilter !== 'published' 
                  ? `LATEST ${statusFilter.toUpperCase()} POSTS` 
                  : 'LATEST POSTS'
                }
              </h2>
            </div>
            
            {/* Latest 3 Posts */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {posts.slice(0, 3).map((post) => (
                <div key={post.id} className="group relative bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  {session && (
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPost(post);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md text-sm"
                        title="Edit Post"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(post.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-2 rounded-md text-sm"
                        title="Delete Post"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  <h3 
                    className="text-xl font-light text-blue-600 hover:text-blue-800 cursor-pointer mb-4 leading-relaxed pr-16"
                    onClick={() => handlePostClick(post)}
                  >
                    {post.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                    <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {post.publishedAt && new Date(post.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric'
                      })}
                      {!post.publishedAt && post.updatedAt && new Date(post.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric'
                      })}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      post.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : post.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {post.status}
                      {post.status === 'draft' && ' 📋'}
                      {post.status === 'published' && ' ✓'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* All Posts Section */}
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-900 pb-1 inline-block">
                {isAdmin && statusFilter !== 'published' 
                  ? `ALL ${statusFilter.toUpperCase()} POSTS` 
                  : 'ALL POSTS'
                }
              </h2>
            </div>

            {/* Categorized Posts Section - Only show for published posts or when admin viewing all */}
            {(statusFilter === 'published' || (isAdmin && statusFilter === 'all')) && (
              <div className="mt-8">
                  {loadingCategories ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading categorized posts...</p>
                      </div>
                    </div>
                  ) : categorizedPosts ? (
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* AI Posts Column */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center border-b pb-3">
                        AI Posts ({categorizedPosts.ai.length})
                      </h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {categorizedPosts.ai.map((post) => (
                          <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                            <h4 
                              className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer text-sm leading-tight mb-1"
                              onClick={() => handleCategoryPostClick(post)}
                            >
                              {post.title}
                            </h4>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>{post.author}</span>
                              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Computer Science Posts Column */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center border-b pb-3">
                        Computer Science ({categorizedPosts.cs.length})
                      </h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {categorizedPosts.cs.map((post) => (
                          <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                            <h4 
                              className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer text-sm leading-tight mb-1"
                              onClick={() => handleCategoryPostClick(post)}
                            >
                              {post.title}
                            </h4>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>{post.author}</span>
                              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Science Posts Column */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center border-b pb-3">
                        Science Posts ({categorizedPosts.science.length})
                      </h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {categorizedPosts.science.map((post) => (
                          <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                            <h4 
                              className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer text-sm leading-tight mb-1"
                              onClick={() => handleCategoryPostClick(post)}
                            >
                              {post.title}
                            </h4>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>{post.author}</span>
                              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  ) : (
                    <div className="text-center text-gray-600 py-8">
                      <p>Unable to load categorized posts</p>
                    </div>
                  )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedPost && (
        <Modal post={selectedPost} />
      )}
    </div>
  );
};

const BlogsPage: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BlogsContent />
    </Suspense>
  );
};

export default BlogsPage;
