'use client';

import React, { useState, useEffect, Suspense, useRef, memo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import RichTextEditor from '../components/RichTextEditor';
import BlogBranchManager from '../components/BlogBranchManager';

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

interface Comment {
  id: number;
  blog_post_id: number;
  blog_post_title: string;
  author_name: string;
  author_email: string;
  author_website?: string;
  comment_content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [openingModal, setOpeningModal] = useState(false);
  const isLoadingFromUrl = useRef(false);
  
  // Load branch count for current post
  const loadBranchCount = async (postId: number) => {
    try {
      const response = await fetch(`/api/blog/branches?postId=${postId}`);
      if (response.ok) {
        const data = await response.json();
        const branches = data.branches || [];
        setBranchCount(branches.length);
        setAvailableBranches(branches);
        // Reset to main if no branches or current branch doesn't exist
        if (branches.length === 0 || !branches.find((b: any) => b.branchId === selectedBranchId)) {
          setSelectedBranchId('main');
          setSelectedBranch(null);
        }
      }
    } catch (error) {
      console.error('Failed to load branch count:', error);
    }
  };
  
  // Load branch counts for all posts in the list
  const loadAllBranchCounts = async (postIds: number[]) => {
    console.log('🔍 Loading branch counts for posts:', postIds);
    try {
      const counts: Record<number, number> = {};
      
      // Load branch counts for all posts in parallel
      const promises = postIds.map(async (postId) => {
        try {
          console.log(`📊 Fetching branches for post ${postId}...`);
          const response = await fetch(`/api/blog/branches?postId=${postId}`);
          if (response.ok) {
            const data = await response.json();
            const branchCount = data.branches?.length || 0;
            counts[postId] = branchCount;
            console.log(`✅ Post ${postId} has ${branchCount} branches`);
          } else {
            console.warn(`❌ Failed to fetch branches for post ${postId}:`, response.status);
            counts[postId] = 0;
          }
        } catch (error) {
          console.error(`❌ Failed to load branch count for post ${postId}:`, error);
          counts[postId] = 0;
        }
      });
      
      await Promise.all(promises);
      console.log('🎯 Final branch counts:', counts);
      setPostBranchCounts(counts);
    } catch (error) {
      console.error('Failed to load branch counts:', error);
    }
  };
  
  // Removed comment caching to reduce upfront cost when opening posts
  
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
  
  // Versioning state
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchCount, setBranchCount] = useState(0);
  const [postBranchCounts, setPostBranchCounts] = useState<Record<number, number>>({});
  const [showBranchSuggestion, setShowBranchSuggestion] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('main');
  
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


  // Removed comment preloading function to reduce upfront cost
  
  // Function to open modal - simplified
  const openPostModal = async (post: BlogPost) => {
    // If post doesn't have full content loaded, fetch it first
    if (!post.hasFullContent && !post.content) {
      try {
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
          setShowModal(true);
        } else {
          setError('Failed to load post content');
          return;
        }
      } catch (error) {
        console.error('Error loading post content:', error);
        setError('Error loading post content');
        return;
      }
    } else {
      setSelectedPost(post);
      setShowModal(true);
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
        // Pass user email for admin access to draft posts
        const userEmailParam = session?.user?.email ? `&userEmail=${encodeURIComponent(session.user.email)}` : '';
        const response = await fetch(`/api/blog?status=${statusParam}&limit=3&includeContent=false${userEmailParam}`);
        
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
            
            // Load branch counts for admin users
            if (isAdmin) {
              const postIds = lazyPosts.map((post: any) => post.id).filter((id: any) => id);
              if (postIds.length > 0) {
                loadAllBranchCounts(postIds);
              }
            }
            
            // Removed comment preloading to reduce upfront cost
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
        // Pass user email for admin access to draft posts
        const userEmailParam = session?.user?.email ? `&userEmail=${encodeURIComponent(session.user.email)}` : '';
        const response = await fetch(`/api/blog?status=${statusParam}&includeContent=false${userEmailParam}`);
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
    
    // Only handle URL changes that aren't from manual clicks
    if (postId && posts.length > 0 && !isLoadingFromUrl.current && !showModal) {
      const post = posts.find(p => p.id === parseInt(postId));
      if (post) {
        console.log('🚀 Opening modal from URL for post:', post.id);
        openPostModal(post);
      }
    } else if (!postId && showModal && !isLoadingFromUrl.current) {
      // Close modal if URL is cleared externally (not from our closeModal)
      setShowModal(false);
      setSelectedPost(null);
    }
  }, [posts, searchParams]);

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
    console.log('👆 Post clicked:', post.id, 'Current modal state:', showModal);
    
    // Show progress immediately
    setOpeningModal(true);
    
    try {
      // If modal is already open, close it first and wait briefly
      if (showModal) {
        setShowModal(false);
        setSelectedPost(null);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Set flag to prevent URL effect from interfering
      isLoadingFromUrl.current = true;
      
      // Update URL and open modal
      router.push(`/blogs?id=${post.id}`, { scroll: false });
      await openPostModal(post);
      
      // Reset flag after a brief delay
      setTimeout(() => {
        isLoadingFromUrl.current = false;
      }, 100);
    } finally {
      // Hide progress bar
      setOpeningModal(false);
    }
  };

  const closeModal = useCallback(() => {
    console.log('❌ Close modal triggered');
    
    // Set flag to prevent URL effect interference
    isLoadingFromUrl.current = true;
    
    // Close modal and clear URL
    setShowModal(false);
    setSelectedPost(null);
    router.replace('/blogs', { scroll: false });
    
    // Reset flag after brief delay
    setTimeout(() => {
      isLoadingFromUrl.current = false;
    }, 50);
  }, [router]);
  
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
    
    // Reset branch selection to main when starting to edit
    setSelectedBranchId('main');
    setSelectedBranch(null);
    
    // Load branches for this post to populate the selector
    await loadBranchCount(post.id);
    
    // Suggest creating a branch for version tracking if this is the first edit
    if (isAdmin && !postBranchCounts[post.id]) {
      setShowBranchSuggestion(true);
    }
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
      console.log('💾 Save started - Branch check:', selectedBranchId, selectedBranch?.branchId);
      
      // If publishing, always use main post API regardless of branch selection
      if (publish) {
        console.log('🚀 Publishing to main post (ignoring branch selection)');
        // Use main post publish logic
      } else if (selectedBranchId !== 'main' && selectedBranch && selectedBranch.branchId && !isCreating) {
        console.log('🌿 Using branch save API for:', selectedBranch.branchName);
        
        const branchData = {
          postId: editingPost?.id,
          branchId: selectedBranch.branchId,
          changes: {
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            status: formData.status
          }
        };
        
        console.log('💾 Sending branch save request:', branchData);
        
        const response = await fetch('/api/blog/branches', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(branchData),
        });
        
        console.log('💾 Branch save response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Branch save failed - Response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Unknown error' };
          }
          setError(`Failed to save branch: ${errorData.error || 'Unknown error'}`);
          return;
        }
        
        const data = await response.json();
        console.log('✅ Branch saved successfully:', data);
        
        // Update the selected branch with new data
        setSelectedBranch(prev => prev ? {
          ...prev,
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          status: formData.status,
          modifiedDate: new Date().toISOString()
        } : null);
        
        // Clear unsaved changes flag
        setHasUnsavedChanges(false);
        
        // Reload branch count to update the branch manager UI
        await loadBranchCount(editingPost.id);
        
        // Show success message
        alert(`Successfully saved to branch "${selectedBranch.branchName}"!`);
        return;
      } else {
        console.log('📄 Using main post save API');
      }
      
      // Normal post save logic
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
      // Pass user email for admin access to draft posts
      const userEmailParam = session?.user?.email ? `&userEmail=${encodeURIComponent(session.user.email)}` : '';
      const response = await fetch(`/api/blog?status=${statusParam}&includeContent=false${userEmailParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.posts) {
          const lazyPosts = (data.posts || []).map((post: BlogPost) => ({
            ...post,
            hasFullContent: false
          }));
          setPosts(lazyPosts);
          
          // Reload branch counts for admin users
          if (isAdmin) {
            const postIds = lazyPosts.map((post: any) => post.id).filter((id: any) => id);
            if (postIds.length > 0) {
              loadAllBranchCounts(postIds);
            }
          }
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
  
  // Handle branch switching via radio buttons
  const handleBranchSelection = async (branchId: string) => {
    try {
      if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Switching branches will lose these changes. Continue?')) {
          return;
        }
      }
      
      console.log('🔄 Branch selection started:', branchId);
      setSelectedBranchId(branchId);
      
      if (branchId === 'main') {
        // Switch back to main post
        setSelectedBranch(null);
        if (editingPost) {
          setFormData({
            title: editingPost.title || '',
            content: editingPost.content || '',
            excerpt: editingPost.excerpt || '',
            tags: (editingPost.tags || []).join(', '),
            status: editingPost.status as any || 'draft',
            scheduledDate: '',
            isScheduled: false
          });
        }
        console.log('🔄 Switched to main post');
      } else {
        // Switch to specific branch
        console.log('🔍 Looking for branch:', branchId, 'in available branches:', availableBranches.map(b => `${b.branchId}:${b.branchName}`));
        
        if (!Array.isArray(availableBranches)) {
          console.error('❌ availableBranches is not an array:', availableBranches);
          setError('Branch data error. Please refresh the page.');
          return;
        }
        
        const branch = availableBranches.find(b => b && b.branchId === branchId);
        if (branch && branch.branchId) {
          setSelectedBranch(branch);
          
          // Load branch content into form - with safe fallbacks
          setFormData({
            title: branch.title || editingPost?.title || '',
            content: branch.content || editingPost?.content || '',
            excerpt: branch.excerpt || editingPost?.excerpt || '',
            tags: branch.tags || (editingPost?.tags || []).join(', ') || '',
            status: branch.status || editingPost?.status || 'draft',
            scheduledDate: branch.scheduledDate || '',
            isScheduled: branch.isScheduled || false
          });
          
          console.log('🔄 Switched to branch:', branch.branchName, 'Type:', branch.branchType);
        } else {
          console.error('❌ Branch not found or invalid:', branchId, 'Available:', availableBranches.map(b => b ? `${b.branchId}:${b.branchName}` : 'null'));
          setError(`Branch "${branchId}" not found. Please refresh and try again.`);
          // Reset to main to prevent broken state
          setSelectedBranchId('main');
          return;
        }
      }
      
      setHasUnsavedChanges(false);
      console.log('✅ Branch selection completed:', branchId);
    } catch (error) {
      console.error('❌ Error in branch selection:', error);
      setError('Error switching branches: ' + error);
    }
  };
  
  // Handle branch switching from modal (keep for compatibility)
  const handleBranchSwitch = (branch: any) => {
    handleBranchSelection(branch.branchId);
    setShowVersionManager(false);
  };
  
  // Track unsaved changes
  useEffect(() => {
    if (editingPost || selectedBranch) {
      const baseData = selectedBranch || editingPost;
      const hasChanges = 
        formData.title !== (baseData?.title || '') ||
        formData.content !== (baseData?.content || '') ||
        formData.excerpt !== (baseData?.excerpt || '') ||
        formData.tags !== (selectedBranch ? (baseData?.tags || '') : ((baseData as any)?.tags || []).join(', ')) ||
        formData.status !== (baseData?.status || 'draft');
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, editingPost, selectedBranch]);

  const Modal = memo(({ post, onClose }: { post: BlogPost; onClose: () => void }) => {
    // Load comments normally without caching
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentFormData, setCommentFormData] = useState({
      authorName: '',
      authorEmail: '',
      authorWebsite: '',
      commentContent: '',
      notifyFollowUp: false,
      notifyNewPosts: false,
      saveInfo: false
    });
    const [submittingComment, setSubmittingComment] = useState(false);
    const [commentMessage, setCommentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Add keyboard event listener for escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    }, [onClose]);

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [handleKeyDown]);

    // Load comments normally without caching
    useEffect(() => {
      const loadComments = async () => {
        try {
          setLoadingComments(true);
          const userEmailParam = isAdmin ? `?includeAll=true&userEmail=${encodeURIComponent(session?.user?.email || '')}` : '';
          const response = await fetch(`/api/blog/${post.id}/comments${userEmailParam}`);
          const result = await response.json();
          
          if (result.success) {
            setComments(result.comments || []);
          } else {
            console.error('Error loading comments:', result.error);
          }
        } catch (error) {
          console.error('Error loading comments:', error);
        } finally {
          setLoadingComments(false);
        }
      };
      
      loadComments();
    }, [post.id, isAdmin, session?.user?.email]);


    const handleCommentSubmit = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!commentFormData.authorName.trim() || !commentFormData.authorEmail.trim() || !commentFormData.commentContent.trim()) {
        setCommentMessage({ type: 'error', text: 'Name, email, and comment are required.' });
        return;
      }

      setSubmittingComment(true);
      setCommentMessage(null);

      try {
        const response = await fetch(`/api/blog/${post.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commentFormData)
        });

        const result = await response.json();
        
        if (result.success) {
          setCommentMessage({ type: 'success', text: result.message });
          setCommentFormData({
            authorName: commentFormData.saveInfo ? commentFormData.authorName : '',
            authorEmail: commentFormData.saveInfo ? commentFormData.authorEmail : '',
            authorWebsite: commentFormData.saveInfo ? commentFormData.authorWebsite : '',
            commentContent: '',
            notifyFollowUp: false,
            notifyNewPosts: false,
            saveInfo: commentFormData.saveInfo
          });
          // Reload comments to show any that might be approved
          setTimeout(async () => {
            try {
              setLoadingComments(true);
              const userEmailParam = isAdmin ? `?includeAll=true&userEmail=${encodeURIComponent(session?.user?.email || '')}` : '';
              const response = await fetch(`/api/blog/${post.id}/comments${userEmailParam}`);
              const result = await response.json();
              
              if (result.success) {
                setComments(result.comments || []);
              } else {
                console.error('Error loading comments:', result.error);
              }
            } catch (error) {
              console.error('Error loading comments:', error);
            } finally {
              setLoadingComments(false);
            }
          }, 100);
        } else {
          setCommentMessage({ type: 'error', text: result.error });
        }
      } catch (error) {
        setCommentMessage({ type: 'error', text: 'Failed to submit comment. Please try again.' });
      } finally {
        setSubmittingComment(false);
      }
    }, [commentFormData, post.id, isAdmin, session?.user?.email]);

    return (
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4"
        onClick={(e) => {
          // Close modal if clicking on backdrop (but not on modal content)
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 italic">Alwayscurious</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Informationals Series</span>
              <span className="text-gray-600">Enigma Book</span>
              <span className="text-gray-600">Podcast</span>
              <span className="text-gray-600">About</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Admin controls for editing/deleting posts */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      handleEditPost(post);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    title="Edit this post"
                  >
                    ✏️ Edit Post
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      handleDelete(post.id);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    title="Delete this post"
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
              
              {/* User authentication controls */}
              {session ? (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onClose();
                        router.push('/');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                      title="Go to Admin Dashboard"
                    >
                      🏠 Admin
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      signOut({ callbackUrl: '/auth/signin' });
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    router.push('/auth/signin');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                >
                  Sign In
                </button>
              )}
              
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Blog Post Content */}
            <div className="p-8">
              <h1 className="text-4xl font-light text-gray-800 mb-8 text-center">
                {post.title}
              </h1>
              <div className="w-24 h-px bg-gray-400 mx-auto mb-12"></div>
              
              <div 
                className="prose prose-lg max-w-none text-gray-700 leading-relaxed mb-16"
                dangerouslySetInnerHTML={{ 
                  __html: (post.content || 'Content not available')
                    // Remove specific WordPress comment sections that interfere with our React components
                    .replace(/<div\s+class=["']wp-block-post-comments["'][^>]*>.*?<\/div>/gs, '')
                    // Remove WordPress comment form with specific class patterns
                    .replace(/<div\s+id=["']respond["'][^>]*class=["'][^"']*comment[^"']*["'][^>]*>.*?<\/div>/gs, '')
                    // Remove WordPress comment form elements specifically
                    .replace(/<form[^>]*id=["']commentform["'][^>]*>.*?<\/form>/gs, '')
                    // Remove WordPress comment list containers
                    .replace(/<div\s+id=["']comments["'][^>]*>.*?<\/div>/gs, '')
                }}
              />
            </div>

            {/* Comments Section */}
            <div className="border-t bg-gray-50">
              {/* Comments Header and Display */}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-8">
                  Comments ({comments.filter(c => c.status === 'approved').length})
                  {isAdmin && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Total: {comments.length}, Pending: {comments.filter(c => c.status === 'pending').length})
                    </span>
                  )}
                </h3>
                
                {/* Display Comments */}
                {loadingComments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading comments...</p>
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-6">
                    {comments.map((comment) => {
                      // Only show approved comments to everyone (admin and non-admin)
                      if (comment.status !== 'approved') {
                        return null;
                      }
                      
                      return (
                        <div key={comment.id} className="bg-white p-6 rounded-lg border">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold text-gray-900">{comment.author_name}</h4>
                              <p className="text-sm text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {isAdmin && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                comment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                comment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                comment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {comment.status}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-700 leading-relaxed">
                            {comment.comment_content.split('\n').map((paragraph: string, index: number) => (
                              <p key={index} className="mb-2">{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
              
              {/* Comment Form Section */}
              <div className="border-t bg-white p-8">
                <h4 className="text-xl font-semibold text-gray-900 mb-6">Leave a Reply</h4>
                <p className="text-gray-600 mb-6">
                  Your email address will not be published. Required fields are marked *
                </p>
                
                {commentMessage && (
                  <div className={`p-4 rounded-md mb-6 ${
                    commentMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {commentMessage.text}
                  </div>
                )}

                <form onSubmit={handleCommentSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment *
                    </label>
                    <textarea
                      value={commentFormData.commentContent}
                      onChange={(e) => setCommentFormData({ ...commentFormData, commentContent: e.target.value })}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="Share your thoughts..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={commentFormData.authorName}
                        onChange={(e) => setCommentFormData({ ...commentFormData, authorName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={commentFormData.authorEmail}
                        onChange={(e) => setCommentFormData({ ...commentFormData, authorEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={commentFormData.authorWebsite}
                      onChange={(e) => setCommentFormData({ ...commentFormData, authorWebsite: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={commentFormData.saveInfo}
                        onChange={(e) => setCommentFormData({ ...commentFormData, saveInfo: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Save my name, email, and website in this browser for the next time I comment.
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={commentFormData.notifyFollowUp}
                        onChange={(e) => setCommentFormData({ ...commentFormData, notifyFollowUp: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Notify me of follow-up comments by email.
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={commentFormData.notifyNewPosts}
                        onChange={(e) => setCommentFormData({ ...commentFormData, notifyNewPosts: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Notify me of new posts by email.
                      </span>
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    {submittingComment ? 'Submitting...' : 'Post Comment'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if the post ID changes
    return prevProps.post.id === nextProps.post.id;
  });

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
            
            {/* Navigation Links and User Controls */}
            <div className="flex items-center gap-8">
              <nav className="flex items-center gap-8">
                <span className="text-gray-600 italic">Alwayscurious</span>
                <a href="#" className="text-gray-600 hover:text-gray-800">Informationals Series</a>
                <a href="#" className="text-gray-600 hover:text-gray-800">Enigma Book</a>
                <a href="#" className="text-gray-600 hover:text-gray-800">Podcast</a>
                <a href="#" className="text-gray-600 hover:text-gray-800">About</a>
              </nav>
              
              {/* User Authentication Controls */}
              <div className="flex items-center gap-4">
                {session ? (
                  <>
                    <span className="text-sm text-gray-600">
                      Welcome, {session.user?.email}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => router.push('/')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                        title="Go to Admin Dashboard"
                      >
                        🏠 Admin Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => router.push('/auth/signin')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => router.push('/auth/signup')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
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
        
        {/* Blog Management Toolbar - Only show for admin users */}
        {isAdmin && (
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
                        disabled={loadingRecent}
                        className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                          loadingRecent ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' : ''
                        }`}
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
                    {/* Branch Indicator */}
                    {selectedBranch && (
                      <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                        <span className="text-green-700 text-sm font-medium">🌿 Working on branch:</span>
                        <span className="text-green-800 text-sm font-semibold">{selectedBranch.branchName}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          selectedBranch.branchType === 'main' ? 'bg-purple-100 text-purple-700' :
                          selectedBranch.branchType === 'feature' ? 'bg-blue-100 text-blue-700' :
                          selectedBranch.branchType === 'hotfix' ? 'bg-red-100 text-red-700' :
                          selectedBranch.branchType === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedBranch.branchType}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedBranch(null);
                            // Reset to main post content if available
                            if (editingPost) {
                              setFormData({
                                title: editingPost.title || '',
                                content: editingPost.content || '',
                                excerpt: editingPost.excerpt || '',
                                tags: (editingPost.tags || []).join(', '),
                                status: editingPost.status as any || 'draft',
                                scheduledDate: '',
                                isScheduled: false
                              });
                            }
                          }}
                          className="text-green-600 hover:text-green-800 text-xs ml-1"
                          title="Switch back to main post"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Branch Switcher for existing posts */}
                    {!isCreating && editingPost && (
                      <button
                        onClick={() => setShowVersionManager(true)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        title="Manage branches and versions"
                      >
                        🌿 Branches
                        {branchCount > 0 && (
                          <span className="bg-green-400 text-green-900 px-2 py-0.5 rounded-full text-xs font-bold">
                            {branchCount}
                          </span>
                        )}
                      </button>
                    )}
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
                      💾 {saving ? 'Saving...' : selectedBranchId !== 'main' ? `Save to ${availableBranches.find(b => b.branchId === selectedBranchId)?.branchName || 'Branch'}` : 'Save Draft'}
                    </button>
                    <button
                      onClick={() => handleSave(true)}
                      disabled={saving}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      🚀 {saving ? 'Publishing...' : 'Publish to Main'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
                
                {/* Simple Branch Selector */}
                {!isCreating && editingPost && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">💾 Save Target:</h4>
                      <button
                        onClick={() => setShowVersionManager(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                      >
                        🌿 Manage Branches ({branchCount})
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Main Post Option */}
                      <label className="flex items-center gap-3 p-2 rounded border hover:bg-white transition-colors cursor-pointer">
                        <input
                          type="radio"
                          name="branchSelection"
                          value="main"
                          checked={selectedBranchId === 'main'}
                          onChange={() => handleBranchSelection('main')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-medium">📄 Main Post</span>
                          <span className="text-sm text-gray-600">Edit the original post content</span>
                        </div>
                      </label>
                      
                      {/* Branch Options */}
                      {availableBranches.map((branch) => (
                        <label key={branch.branchId} className="flex items-center gap-3 p-2 rounded border hover:bg-white transition-colors cursor-pointer">
                          <input
                            type="radio"
                            name="branchSelection"
                            value={branch.branchId}
                            checked={selectedBranchId === branch.branchId}
                            onChange={() => handleBranchSelection(branch.branchId)}
                            className="text-green-600 focus:ring-green-500"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              branch.branchType === 'feature' ? 'bg-blue-100 text-blue-800' :
                              branch.branchType === 'hotfix' ? 'bg-red-100 text-red-800' :
                              branch.branchType === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              branch.branchType === 'review' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              🌿 {branch.branchName}
                            </span>
                            <span className="text-sm text-gray-600">{branch.branchType}</span>
                            {branch.modifiedDate && (
                              <span className="text-xs text-gray-400">• Modified {new Date(branch.modifiedDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </label>
                      ))}
                      
                      {/* No branches message */}
                      {availableBranches.length === 0 && (
                        <div className="text-center py-3 text-gray-500 text-sm">
                          No branches created yet. Use "Manage Branches" to create your first branch.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Post Metadata Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Post title..."
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedBranch ? 'border-green-300 focus:ring-green-500' : ''
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma-separated)..."
                    value={formData.tags}
                    onChange={(e) => handleFormChange('tags', e.target.value)}
                    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedBranch ? 'border-green-300 focus:ring-green-500' : ''
                    }`}
                  />
                </div>
                
                {/* Rich Text Editor */}
                <div className={`border rounded-md overflow-hidden ${
                  selectedBranch ? 'border-green-300 shadow-sm' : 'border-gray-300'
                }`}>
                  {selectedBranch && (
                    <div className="bg-green-50 border-b border-green-200 px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-700 font-medium">🌿 Branch Editor Active</span>
                          <span className="text-green-600">•</span>
                          <span className="text-green-600">Editing "{selectedBranch.branchName}" branch</span>
                        </div>
                        <div className="text-xs text-green-600">
                          Auto-save: {hasUnsavedChanges ? 'Changes pending...' : 'All changes saved to branch'}
                        </div>
                      </div>
                    </div>
                  )}
                  <RichTextEditor
                    value={formData.content}
                    onChange={handleEditorChange}
                    height={isFullScreenEditing ? 'calc(90vh - 250px)' : selectedBranch ? 360 : 400}
                    placeholder={selectedBranch ? `Writing in ${selectedBranch.branchName} branch...` : "Start writing your blog post..."}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Call to Action for Non-Authenticated Users */}
        {!session && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Stay Updated with Latest Posts
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Join our community to get notified when we publish new articles on AI, Computer Science, and General Science.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    👤 Sign In to Follow
                  </button>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    ✨ Create Free Account
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Free account • No spam • Unsubscribe anytime
                </p>
              </div>
            </div>
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
                      {/* Versioning button for admin users */}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPost(post);
                            setShowVersionManager(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600 text-white p-2 rounded-md text-sm relative"
                          title={`Manage Versions${postBranchCounts[post.id] ? ` (${postBranchCounts[post.id]} branches)` : ''}`}
                        >
                          🌿
                          {postBranchCounts[post.id] > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {postBranchCounts[post.id]}
                            </span>
                          )}
                        </button>
                      )}
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

      {/* Loading Progress Bar */}
      {openingModal && (
        <>
          <style jsx>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            @keyframes fadeInUp {
              0% { opacity: 0; transform: translate(-50%, 10px); }
              100% { opacity: 1; transform: translate(-50%, 0); }
            }
            @keyframes progressFill {
              0% { width: 0%; }
              50% { width: 60%; }
              100% { width: 90%; }
            }
          `}</style>
          
          {/* Top progress bar */}
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gray-200 h-1">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 relative overflow-hidden transition-all duration-1000 ease-out"
              style={{ animation: 'progressFill 2s ease-out forwards' }}
            >
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 w-1/4"
                style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
              />
            </div>
          </div>
          
          {/* Floating notification */}
          <div 
            className="fixed top-6 left-1/2 z-[61]"
            style={{ animation: 'fadeInUp 0.3s ease-out forwards', transform: 'translateX(-50%)' }}
          >
            <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-gray-200 backdrop-blur-sm bg-white/95">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm font-medium text-gray-700">Opening post...</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Branch Suggestion Modal */}
      {showBranchSuggestion && editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🌿 Version Tracking Suggestion
            </h3>
            <p className="text-gray-600 mb-6">
              Would you like to create a branch to track your changes to "{editingPost.title}"? 
              This will help you maintain version history and compare different iterations.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBranchSuggestion(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                No, just edit directly
              </button>
              <button
                onClick={() => {
                  setShowBranchSuggestion(false);
                  setShowVersionManager(true);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                🌿 Create Branch
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Version Manager Modal */}
      {showVersionManager && editingPost?.id && (
        <BlogBranchManager
          postId={editingPost.id}
          onBranchSwitch={handleBranchSwitch}
          onClose={() => {
            setShowVersionManager(false);
            // Reload branch counts after closing
            if (editingPost?.id) {
              loadBranchCount(editingPost.id);
              // Also refresh the count for this specific post in the list
              const singlePostCount = async () => {
                try {
                  const response = await fetch(`/api/blog/branches?postId=${editingPost.id}`);
                  if (response.ok) {
                    const data = await response.json();
                    const count = data.branches?.length || 0;
                    setBranchCount(count);
                    setPostBranchCounts(prev => ({
                      ...prev,
                      [editingPost.id]: count
                    }));
                  }
                } catch (error) {
                  console.error('Failed to refresh branch count:', error);
                }
              };
              singlePostCount();
            }
          }}
        />
      )}
      
      {/* Modal */}
      {showModal && selectedPost && (
        <Modal post={selectedPost} onClose={closeModal} />
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
