#!/bin/bash

# Script to import blog URLs from a file into the database
# Usage: ./run-import.sh [path-to-urls-file]

URL_FILE=${1:-"blog-urls.txt"}

echo "🚀 Starting blog URL import..."
echo "📁 Using URL file: $URL_FILE"

# Check if file exists
if [ ! -f "$URL_FILE" ]; then
    echo "❌ Error: File '$URL_FILE' not found!"
    echo "Please create a file with URLs (one per line) or specify the correct path."
    exit 1
fi

# Run the TypeScript script using npx tsx
echo "🔄 Running import script..."
npx tsx ./scripts/import-blog-urls.ts "$URL_FILE"

echo "✅ Import script completed!"
