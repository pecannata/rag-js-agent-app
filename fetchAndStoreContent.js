import fs from 'fs';
import axios from 'axios';
import { executeOracleQuery } from './app/lib/database';

async function fetchAndStoreContent(urlFilePath: string) {
  try {
    // Read URLs from file
    const urls = fs.readFileSync(urlFilePath, 'utf-8').trim().split('\n');

    for (const url of urls) {
      // Fetch HTML content
      const response = await axios.get(url);
      const htmlContent = response.data;
      
      // Extract title and excerpt as an example (simple regex for demo purposes)
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1] : 'Untitled';

      // Create a simple excerpt
      const excerpt = htmlContent.substring(0, 150).replace(/\s+/g, ' ') + '...';

      // Insert into blog table
      const insertQuery = `
        INSERT INTO blog_posts (title, slug, content, excerpt, author, status, tags)
        VALUES (
          '${title}',
          'imported-slug',
          '${htmlContent.replace(/'/g, "''")}',
          '${excerpt.replace(/'/g, "''")}',
          'Imported Author',
          'published',
          'imported'
        )
      `;

      const result = await executeOracleQuery(insertQuery);
      if (result.success) {
        console.log(`Successfully inserted content for URL: ${url}`);
      } else {
        console.error(`Failed to insert content for URL: ${url}:`, result.error);
      }
    }
  } catch (error) {
    console.error('Error during processing:', error);
  }
}

// Run the function with the path to the file containing URLs
fetchAndStoreContent('blog-urls.txt');

