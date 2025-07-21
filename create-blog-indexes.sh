#!/bin/bash

echo "🔍 Creating database indexes for blog performance optimization..."

# Create index on id column
echo "Creating index on id column..."
bash ./SQLclScript.sh "CREATE INDEX blog_posts_id_idx ON blog_posts(id)"

# Create index on status column  
echo "Creating index on status column..."
bash ./SQLclScript.sh "CREATE INDEX blog_posts_status_idx ON blog_posts(status)"

# Create index on updated_at column
echo "Creating index on updated_at column..."
bash ./SQLclScript.sh "CREATE INDEX blog_posts_updated_at_idx ON blog_posts(updated_at)"

# Create composite index for status + updated_at (common query pattern)
echo "Creating composite index on status + updated_at..."
bash ./SQLclScript.sh "CREATE INDEX blog_posts_status_updated_idx ON blog_posts(status, updated_at DESC)"

# Update table statistics
echo "Updating table statistics..."
bash ./SQLclScript.sh "ANALYZE TABLE blog_posts COMPUTE STATISTICS"

echo "✅ Database indexes created successfully!"

# Verify indexes were created
echo "📋 Current indexes on blog_posts table:"
bash ./SQLclScript.sh "SELECT index_name, table_name, column_name FROM user_ind_columns WHERE table_name = 'BLOG_POSTS' ORDER BY index_name, column_position"
