#!/bin/bash

# Migration script to add email_notifications_enabled column to subscribers table
# This script safely adds the column if it doesn't exist

echo "🔄 Adding email_notifications_enabled column to subscribers table..."

# Check if column already exists
echo "📋 Checking if email_notifications_enabled column exists..."
COLUMN_EXISTS=$(bash ./SQLclScript.sh "SELECT COUNT(*) as count FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'SUBSCRIBERS' AND COLUMN_NAME = 'EMAIL_NOTIFICATIONS_ENABLED'" 2>/dev/null | grep -o '"count" : [0-9]*' | grep -o '[0-9]*')

if [ "$COLUMN_EXISTS" = "1" ]; then
    echo "✅ Column email_notifications_enabled already exists in subscribers table"
else
    echo "➕ Adding email_notifications_enabled column to subscribers table..."
    
    # Add the column with default value of 1 (enabled)
    bash ./SQLclScript.sh "ALTER TABLE subscribers ADD (email_notifications_enabled NUMBER(1) DEFAULT 1 NOT NULL)"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added email_notifications_enabled column"
        
        # Add comment to column
        bash ./SQLclScript.sh "COMMENT ON COLUMN subscribers.email_notifications_enabled IS 'Flag to control email notifications per subscriber: 1=enabled, 0=disabled'"
        
        echo "📝 Added comment to email_notifications_enabled column"
    else
        echo "❌ Failed to add email_notifications_enabled column"
        exit 1
    fi
fi

echo "✅ Migration completed successfully!"
