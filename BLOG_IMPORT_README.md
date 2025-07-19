# Blog URL Import System

This system allows you to import blog posts from external URLs into your database by fetching HTML content, parsing it intelligently, and saving it via your existing blog API.

## Features

✅ **Smart Content Extraction**: Extracts title, content, excerpt, and author from HTML  
✅ **Intelligent Slug Generation**: Creates SEO-friendly slugs from URLs or titles  
✅ **CLOB Support**: Handles large content using your existing blog API  
✅ **Duplicate Prevention**: Checks for existing posts before importing  
✅ **Error Handling**: Comprehensive error detection and reporting  
✅ **Batch Processing**: Processes multiple URLs from a simple text file  

## Quick Start

### 1. Prepare URL File
Create a text file with URLs (one per line):
```bash
# Create blog-urls.txt
echo "https://example.com/post-1" > blog-urls.txt
echo "https://example.com/post-2" >> blog-urls.txt
```

### 2. Start Your Development Server
```bash
npm run dev
```

### 3. Run the Import
```bash
# Import from blog-urls.txt (default)
./run-import.sh

# Or specify a custom file
./run-import.sh my-custom-urls.txt
```

## File Structure

```
├── blog-urls.txt                    # URL list (one per line)
├── run-import.sh                    # Shell runner script
├── scripts/import-blog-urls.ts      # Main import logic
└── BLOG_IMPORT_README.md           # This documentation
```

## How It Works

1. **Fetch HTML**: Downloads content with proper User-Agent headers
2. **Parse Content**: Uses JSDOM to extract:
   - Title (from `<h1>`, `<title>`, or meta tags)
   - Main content (removes nav, footer, scripts)
   - Excerpt (from meta description or first paragraph)
   - Author (from various HTML patterns)
3. **Generate Slug**: Creates URL-friendly slug from URL or title
4. **Check Duplicates**: Queries database for existing posts
5. **Save via API**: Uses your `/api/blog` endpoint for proper CLOB handling
6. **Commit**: Ensures data is persisted to database

## Error Handling

- **Connection Issues**: Clear messages if API server isn't running
- **Duplicate Posts**: Skips posts that already exist
- **Character Encoding**: Uses API to handle special characters properly
- **Large Content**: Automatic CLOB chunking via existing blog API
- **Network Failures**: Continues with next URL if one fails

## Troubleshooting

### "API server not running"
```bash
# Start your Next.js development server first
npm run dev
```

### "Post already exists"
The system automatically skips posts with duplicate slugs.

### "Failed to fetch URL"
- Check URL is accessible
- Check your internet connection
- Some sites may block automated requests

### Check Import Results
```bash
# Verify posts were created
bash ./SQLclScript.sh "SELECT id, title, slug FROM blog_posts ORDER BY id DESC FETCH FIRST 5 ROWS ONLY"
```

## Customization

### Modify Content Extraction
Edit `cleanHtmlContent()` in `scripts/import-blog-urls.ts` to customize which HTML elements are included/excluded.

### Change API Endpoint
Update the API URL in the script if running on a different port or host.

### Add More URLs
Simply add more URLs to your text file, one per line.

## Example URL File

```
https://alwayscurious.wpengine.com/?p=145
https://example.com/blog/quantum-physics
https://anotherblog.com/posts/2024/interesting-topic
```

The system will process each URL sequentially with a 1-second delay between requests to be respectful to the source servers.
