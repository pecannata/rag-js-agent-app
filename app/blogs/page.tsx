'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
}

const BlogsContent: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingPostSelection, setLoadingPostSelection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const blogId = searchParams.get('id');

  // Process HTML content for preview (similar to BlogManager)
  const processHtmlContent = (html: string): string => {
    return html; // Keep HTML as is
  };

  useEffect(() => {
    // Fetch all blog posts with full content
    const fetchAllBlogs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/blog?status=published');
        if (response.ok) {
          const data = await response.json();
          
            console.log('📊 API Response:', { 
            success: data.success, 
            postsCount: data.posts?.length, 
            preloadedPosts: data.posts?.slice(0, 5).length || 0,
            firstPost: data.posts?.[0] ? {
              id: data.posts[0].id,
              title: data.posts[0].title,
              hasContent: !!data.posts[0].content,
              contentLength: data.posts[0].content?.length || 0
            } : null
          });
          
          if (data.success && data.posts) {
            // Create display list with basic info for sidebar
            const displayPosts = data.posts.map((post: BlogPost, index: number) => ({
              id: post.id,
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              author: post.author,
              publishedAt: post.publishedAt,
              content: index < 5 ? post.content : '', // Preload first 5 posts' content
              status: post.status,
              tags: post.tags,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt
            }));
            setPosts(displayPosts);
            
            // If a specific blog ID is requested, show it immediately
            if (blogId) {
              const requestedPost = data.posts.find((p: BlogPost) => p.id === parseInt(blogId));
              if (requestedPost) {
                setCurrentPost(requestedPost);
              } else {
                setError(`Blog post with ID ${blogId} not found`);
              }
            }
          } else {
            setError('No published blogs found');
          }
        } else {
          setError(`Failed to load blog posts (HTTP ${response.status})`);
        }
      } catch (error) {
        setError('Error loading blog posts');
        console.error('Error loading blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllBlogs();
  }, [blogId]);


  const handleDownload = () => {
    if (!currentPost) return;
    
    // Create HTML content for download
    const htmlStart = '<!DOCTYPE html><html><head><title>' + currentPost.title + '</title><meta charset="UTF-8">';
    const styles = '<style>body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }h1, h2, h3, h4, h5, h6 { color: #333; }code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin-left: 0; }</style>';
    const bodyStart = '</head><body><h1>' + currentPost.title + '</h1>';
    const meta = '<p><em>By ' + currentPost.author + ' • Published ' + new Date(currentPost.publishedAt || '').toLocaleDateString() + '</em></p>';
    const htmlEnd = '</body></html>';
    const htmlTemplate = htmlStart + styles + bodyStart + meta + currentPost.content + htmlEnd;
    
    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPost.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!currentPost) return;
    
    // Create a new window with the blog content for printing
    const printWindow = window.open('', '_blank');
    const printStart = '<!DOCTYPE html><html><head><title>' + currentPost.title + '</title>';
    const printStyles = '<style>body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }h1, h2, h3, h4, h5, h6 { color: #333; }code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; }blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin-left: 0; }@media print { body { padding: 0; }.no-print { display: none; }}</style>';
    const printBodyStart = '</head><body><h1>' + currentPost.title + '</h1>';
    const printMeta = '<p><em>By ' + currentPost.author + ' • Published ' + new Date(currentPost.publishedAt || '').toLocaleDateString() + '</em></p>';
    const printScript = '<script>window.onload = function() { window.print(); };</script>';
    const printEnd = '</body></html>';
    const printTemplate = printStart + printStyles + printBodyStart + printMeta + currentPost.content + printScript + printEnd;
    
    printWindow?.document.write(printTemplate);
    printWindow?.document.close();
  };

  const handleSelectPost = async (postId: number) => {
    // Find the post from already loaded posts
    const selectedPost = posts.find(p => p.id === postId);
    if (selectedPost) {
      // Show loading immediately
      setLoadingPostSelection(true);
      setError(null);
      
      // Add a small delay to show the spinner even for preloaded content
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!selectedPost.content) {
        setLoadingContent(true);
        try {
          console.log('🔄 Lazy loading content for post:', postId);
          const response = await fetch(`/api/blog/${postId}`);
          if (response.ok) {
            const post = await response.json();
            selectedPost.content = post.content;
            console.log('✅ Content loaded for post:', postId, 'Length:', post.content?.length || 0);
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.error('Error loading blog post content:', error);
          setError('Error fetching blog post content');
          setLoadingPostSelection(false);
          return;
        } finally {
          setLoadingContent(false);
        }
      }
      
      console.log('📖 Selected post:', {
        id: selectedPost.id,
        title: selectedPost.title,
        hasContent: !!selectedPost.content,
        contentLength: selectedPost.content?.length || 0,
        contentPreview: selectedPost.content?.substring(0, 100) || 'No content'
      });
      
      // Set the post and hide loading
      setCurrentPost(selectedPost);
      setLoadingPostSelection(false);
    } else {
      console.error('❌ Post not found in cached posts:', postId);
      setError(`Blog post with ID ${postId} not found`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">📚 Blogs</h1>
            <a 
              href="/" 
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Main App
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Blog List */}
          <aside className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-lg shadow-sm border border-gray-200 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">📝 Published Blogs</h2>
              <p className="text-sm text-gray-600 mt-1">Click any blog to view it</p>
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-red-600 text-center py-8">
                  <p>❌ {error}</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <p>📭 No published blogs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post, index) => (
                    <div 
                      key={post.id} 
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                        currentPost?.id === post.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectPost(post.id)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1">
                          {post.title}
                        </h3>
                        {index < 5 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2 flex-shrink-0" title="Content preloaded">
                            ⚡
                          </span>
                        )}
                      </div>
                      {post.excerpt && (
                        <p className="text-xs text-gray-600 mt-1 overflow-hidden" style={{ 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical' 
                        }}>
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{post.author}</span>
                        {post.publishedAt && (
                          <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {loadingPostSelection ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                  <span className="text-lg text-gray-600">Loading blog post...</span>
                </div>
              </div>
            ) : currentPost ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Blog Header */}
                <div className="p-6 border-b border-gray-200">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">{currentPost.title}</h1>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        👤 {currentPost.author}
                      </span>
                      {currentPost.publishedAt && (
                        <span className="flex items-center gap-1">
                          📅 {new Date(currentPost.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                      {currentPost.tags && currentPost.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          🏷️ 
                          <div className="flex gap-1">
                            {currentPost.tags.map((tag, index) => (
                              <span 
                                key={index} 
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button 
                        onClick={handlePrint} 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        title="Print this blog"
                      >
                        🖨️ Print
                      </button>
                      <button 
                        onClick={handleDownload} 
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        title="Download as HTML file"
                      >
                        📥 Download
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Blog Content */}
                <div className="p-6">
                  {loadingContent ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading content...</span>
                    </div>
                  ) : (
                    <div 
                      className="text-gray-800 leading-relaxed"
                      style={{
                        fontSize: '16px',
                        lineHeight: '1.7'
                      }}
                      dangerouslySetInnerHTML={{ __html: processHtmlContent(currentPost.content) }} 
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <div className="text-6xl mb-4">📖</div>
                </div>
                <h2 className="text-xl font-medium text-gray-700 mb-2">Welcome to the Blog Portal</h2>
                <p className="text-gray-500">
                  {blogId ? 
                    'Loading blog content...' : 
                    'Select a blog from the sidebar to start reading'
                  }
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
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
