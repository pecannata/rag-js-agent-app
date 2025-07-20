import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Utility function to escape strings for SQL and shell (from blog API)
function escapeSqlString(str: string): string {
  if (typeof str !== 'string') {
    return String(str);
  }
  // Comprehensive SQL string escaping
  return str
    .replace(/\\/g, '\\\\')         // Escape backslashes first
    .replace(/'/g, "''")           // Escape single quotes for SQL
    .replace(/\0/g, '')           // Remove null bytes
    .replace(/\x1a/g, '')         // Remove substitute character
    .replace(/\r\n/g, '\n')       // Normalize line endings
    .replace(/\r/g, '\n');        // Convert CR to LF
}

// Oracle database execution function (from blog API)
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Blog Database Query Execution:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    // Determine query type for better handling
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'COMMIT'].includes(queryType);
    
    // Execute the SQLclScript.sh with the SQL query
    // Simple escaping - just escape double quotes for the shell command
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Blog database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Blog database query executed successfully');
    
    // Handle modification queries (UPDATE, INSERT, DELETE) that typically return empty or status messages
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Modification query completed', queryType, '- Output:', trimmedOutput || '(empty - success)');
      
      // Check for SQL errors in the output
      if (trimmedOutput.includes('Error starting at line') || 
          trimmedOutput.includes('SQL Error:') || 
          trimmedOutput.includes('ORA-') ||
          trimmedOutput.includes('quoted string not properly terminated')) {
        console.error('❌ SQL Error detected in output:', trimmedOutput.substring(0, 500));
        return { success: false, error: 'SQL execution error: ' + trimmedOutput.substring(0, 500) };
      }
      
      return { success: true, data: trimmedOutput || 'Operation completed successfully' };
    }
    
    // For data queries (SELECT), expect JSON output
    if (isDataQuery) {
      console.log('📤 Raw Oracle Output (first 500 chars):', stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''));
    }
    
    // Parse JSON response for SELECT queries
    try {
      const jsonData = JSON.parse(stdout);
      console.log('✅ Successfully parsed as JSON. Structure:', JSON.stringify(jsonData, null, 2).substring(0, 500));
      
      // Handle Oracle's specific JSON format: {results: [{items: [...]}]}
      if (jsonData.results && Array.isArray(jsonData.results) && jsonData.results.length > 0) {
        const items = jsonData.results[0].items || [];
        console.log('✅ Extracted Oracle items:', items.length, 'rows');
        return { success: true, data: items };
      }
      
      // Handle direct array format (fallback)
      if (Array.isArray(jsonData)) {
        console.log('✅ Direct array format');
        return { success: true, data: jsonData };
      }
      
      // Handle single object (wrap in array)
      console.log('ℹ️ Single object, wrapping in array');
      return { success: true, data: [jsonData] };
      
    } catch (_parseError) {
      // If not JSON, handle appropriately based on query type
      const trimmedOutput = stdout.trim();
      
      if (isDataQuery) {
        console.log('⚠️ SELECT query could not parse as JSON. Trimmed output:', trimmedOutput.substring(0, 200));
        if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
          console.log('✅ Treating as empty result set');
          return { success: true, data: [] };
        }
        // For other non-JSON output from SELECT, return as-is
        console.log('ℹ️ Returning raw output as string');
        return { success: true, data: trimmedOutput };
      } else {
        // For non-SELECT queries, empty or non-JSON output is typically success
        console.log('✅ Non-SELECT query completed successfully');
        return { success: true, data: trimmedOutput || 'Operation completed successfully' };
      }
    }
  } catch (error) {
    console.error('❌ Blog database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper function to clean HTML content for blog formatting
function cleanHtmlContent(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Remove script tags, style tags, and other unwanted elements
  const unwantedElements = document.querySelectorAll('script, style, nav, header, footer, .sidebar, .nav, .navigation');
  unwantedElements.forEach(el => el.remove());
  
  // Try to find the main content area
  let mainContent = document.querySelector('main, article, .content, .post-content, .entry-content, #content, #main');
  
  if (!mainContent) {
    // Fallback to body if no main content area found
    mainContent = document.body;
  }
  
  return mainContent ? mainContent.innerHTML.trim() : html;
}

// Helper function to extract title from HTML
function extractTitle(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Try different methods to get the title
  const titleElement = document.querySelector('h1, .post-title, .entry-title, title');
  if (titleElement) {
    return titleElement.textContent?.trim() || 'Untitled';
  }
  
  const metaTitle = document.querySelector('meta[property="og:title"]');
  if (metaTitle) {
    return metaTitle.getAttribute('content') || 'Untitled';
  }
  
  const pageTitle = document.querySelector('title');
  return pageTitle ? pageTitle.textContent?.trim() || 'Untitled' : 'Untitled';
}

// Helper function to extract excerpt from HTML
function extractExcerpt(html: string, maxLength: number = 500): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Try to get meta description first
  const metaDesc = document.querySelector('meta[name="description"], meta[property="og:description"]');
  if (metaDesc) {
    const content = metaDesc.getAttribute('content');
    if (content && content.length > 0) {
      return content.substring(0, maxLength);
    }
  }
  
  // Fallback to first paragraph text
  const firstParagraph = document.querySelector('p, .excerpt, .summary');
  if (firstParagraph) {
    const text = firstParagraph.textContent?.trim();
    if (text && text.length > 0) {
      return text.substring(0, maxLength);
    }
  }
  
  // Final fallback to body text
  const bodyText = document.body.textContent?.trim() || '';
  return bodyText.substring(0, maxLength).replace(/\s+/g, ' ') + '...';
}

// Helper function to generate a URL-friendly slug
function generateSlug(title: string, url: string): string {
  // Always prioritize generating from title for meaningful, SEO-friendly slugs
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  
  // If we got a good slug from the title, use it
  if (titleSlug.length > 0) {
    return titleSlug;
  }
  
  // Fallback: try to extract from URL path
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    if (pathname && pathname !== '/' && pathname !== '') {
      let slug = pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
      if (slug.length > 0) {
        return slug;
      }
    }
    
    // Last resort: use query parameters
    const params = urlObj.searchParams;
    const pParam = params.get('p');
    if (pParam) {
      return `post-${pParam}`;
    }
  } catch (e) {
    // URL parsing failed
  }
  
  // Final fallback
  return 'imported-post';
}

// Helper function to extract author from HTML
function extractAuthor(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Try different methods to get the author
  const authorElement = document.querySelector('.author, .byline, [rel="author"], meta[name="author"]');
  if (authorElement) {
    if (authorElement.tagName === 'META') {
      return authorElement.getAttribute('content') || 'Unknown Author';
    }
    return authorElement.textContent?.trim() || 'Unknown Author';
  }
  
  // Try JSON-LD structured data
  const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of jsonLdElements) {
    try {
      const data = JSON.parse(element.textContent || '');
      if (data.author) {
        if (typeof data.author === 'string') {
          return data.author;
        } else if (data.author.name) {
          return data.author.name;
        }
      }
    } catch (e) {
      // JSON parsing failed, continue
    }
  }
  
  return 'Imported Author';
}

// Main function to process URLs from file
async function importBlogUrls(urlFilePath: string) {
  try {
    console.log(`📖 Reading URLs from: ${urlFilePath}`);
    
    if (!fs.existsSync(urlFilePath)) {
      throw new Error(`File not found: ${urlFilePath}`);
    }
    
    const fileContent = fs.readFileSync(urlFilePath, 'utf-8');
    const urls = fileContent.trim().split('\n').filter(url => url.trim().length > 0);
    
    console.log(`🔗 Found ${urls.length} URLs to process`);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]?.trim();
      if (!url) continue;
      console.log(`\n🌐 Processing URL ${i + 1}/${urls.length}: ${url}`);
      
      try {
        // Fetch HTML content with timeout and headers
        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const htmlContent = response.data;
        console.log(`📄 Fetched HTML content (${htmlContent.length} characters)`);
        
        // Extract metadata
        const title = extractTitle(htmlContent);
        const cleanContent = cleanHtmlContent(htmlContent);
        const excerpt = extractExcerpt(htmlContent);
        const author = extractAuthor(htmlContent);
        const slug = generateSlug(title, url);
        
        console.log(`📝 Title: ${title}`);
        console.log(`🏷️  Slug: ${slug}`);
        console.log(`👤 Author: ${author}`);
        console.log(`📋 Excerpt: ${excerpt.substring(0, 100)}...`);
        console.log(`📊 Content length: ${cleanContent.length} characters`);
        
        // Check if slug already exists
        const existingPost = await executeOracleQuery(
          `SELECT id FROM blog_posts WHERE slug = '${escapeSqlString(slug)}'`
        );
        
        if (existingPost && existingPost.success && existingPost.data && existingPost.data.length > 0) {
          console.log(`⚠️  Post with slug '${slug}' already exists. Skipping...`);
          continue;
        }
        
        // Insert using the existing blog API endpoint to avoid SQL character issues
        const blogPostData = {
          title: title,
          slug: slug,
          content: cleanContent,
          excerpt: excerpt,
          author: author,
          status: 'published',
          tags: ['imported', 'url-import'],
          publishedAt: new Date().toISOString()
        };

        console.log('📝 Creating blog post via API...');
        
        try {
          console.log('📝 Sending request to API with data:', {
            title: blogPostData.title.substring(0, 50) + '...',
            slug: blogPostData.slug,
            contentLength: blogPostData.content.length,
            excerptLength: blogPostData.excerpt.length,
            author: blogPostData.author,
            status: blogPostData.status,
            tags: blogPostData.tags
          });
          
          const response = await axios.post('http://localhost:3000/api/blog', blogPostData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout for large content
          });
          
          console.log('📬 API Response Status:', response.status);
          console.log('📬 API Response Data:', JSON.stringify(response.data, null, 2));
          
          if (response.status === 200 && response.data?.success) {
            // Check if we got the actual post data back
            if (response.data.post) {
              console.log('✅ Blog post created successfully via API');
              console.log('🎯 Created post ID:', response.data.post.id);
              console.log('🎯 Created post slug:', response.data.post.slug);
            } else {
              // API returned success but no post data - this indicates a silent failure
              console.error('❌ API reported success but no post data returned - insertion may have failed');
              throw new Error('API returned success but post insertion verification failed');
            }
          } else {
            console.error('❌ API Response indicates failure');
            throw new Error(`API returned status ${response.status}: ${response.statusText}. Data: ${JSON.stringify(response.data)}`);
          }
        } catch (apiError: any) {
          if (apiError.code === 'ECONNREFUSED') {
            console.error('❌ Cannot connect to API server. Make sure your Next.js server is running with `npm run dev`');
            throw new Error('API server not running. Start it with `npm run dev`');
          }
          
          console.error('❌ API call failed:');
          console.error('  Status:', apiError.response?.status);
          console.error('  Data:', JSON.stringify(apiError.response?.data, null, 2));
          console.error('  Message:', apiError.message);
          
          throw new Error(`API creation failed: ${apiError.response?.data?.error || apiError.response?.data?.message || apiError.message}`);
        }
        
        console.log(`✅ Successfully imported and committed: ${title}`);
        
        // Add a small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to process URL ${url}:`, error instanceof Error ? error.message : error);
        // Continue with next URL
      }
    }
    
    console.log(`\n🎉 Import process completed!`);
    
  } catch (error) {
    console.error('❌ Import process failed:', error);
  }
}

// Run the script
if (require.main === module) {
  const urlFile = process.argv[2] || path.join(process.cwd(), 'blog-urls.txt');
  importBlogUrls(urlFile);
}

export { importBlogUrls };
