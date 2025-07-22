'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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
        const response = await fetch(`/api/blog/${post.id}`);
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
    // Function to fetch just the 3 most recent posts immediately
    const fetchRecentPosts = async () => {
      try {
        console.log('🚀 Fetching recent posts (top 3) for immediate display...');
        setLoadingRecent(true);
        setError(null);
        
        // OPTION 1: Single optimized query (CURRENT - MORE EFFICIENT)
        const response = await fetch('/api/blog?status=published&limit=3&includeContent=false');
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.posts) {
            console.log('✅ Recent posts loaded:', data.posts.length);
            // Posts come without content from the server (lazy loaded)
            const lazyPosts = (data.posts || []).map((post: BlogPost) => ({
              ...post,
              hasFullContent: false // No posts have full content initially
            }));
            setPosts(lazyPosts);
          } else {
            setError('No published blogs found');
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
        console.log('🔄 Fetching all blog posts in background...');
        
        const response = await fetch('/api/blog?status=published&includeContent=false');
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.posts) {
            console.log('✅ All blog posts loaded:', data.posts.length);
            // Posts come without content from the server (lazy loaded)
            const lazyPosts = (data.posts || []).map((post: BlogPost) => ({
              ...post,
              hasFullContent: false // No posts have full content initially
            }));
            setPosts(lazyPosts);
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
        console.log('🔄 Fetching categorized posts in background...');
        setLoadingCategories(true);
        
        const response = await fetch('/api/blog/categories');
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
  }, []);

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
      publishedAt: categoryPost.publishedAt
    };
    
    await handlePostClick(tempPost);
  };

  const handlePostClick = async (post: BlogPost) => {
    console.log('🟠 handlePostClick called for post:', post.id, 'Has full content:', !!post.hasFullContent);
    
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
          <button 
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
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
            {/* Latest 3 Posts */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {posts.slice(0, 3).map((post) => (
                <div key={post.id} className="group">
                  <h3 
                    className="text-xl font-light text-blue-600 hover:text-blue-800 cursor-pointer mb-4 leading-relaxed"
                    onClick={() => handlePostClick(post)}
                  >
                    {post.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <p className="text-sm text-gray-500">
                    {post.publishedAt && new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>

            {/* All Posts Section */}
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-900 pb-1 inline-block">
                ALL POSTS
              </h2>
            </div>

            {/* Categorized Posts Section */}
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
