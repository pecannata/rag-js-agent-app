#!/bin/bash

# Oracle Studio Lessons Database Setup Script
# This script creates the STUDIO_PRIVATE_LESSONS table and loads the schedule data
# Uses Oracle SQLcl for database connection

set -e  # Exit on any error

echo "==================================="
echo "Studio Lessons Database Setup"
echo "==================================="

# Check if SQL files exist
if [ ! -f "create_and_load_studio_lessons.sql" ]; then
    echo "ERROR: create_and_load_studio_lessons.sql not found!"
    exit 1
fi

if [ ! -f "insert_studio_lessons.sql" ]; then
    echo "ERROR: insert_studio_lessons.sql not found!"
    exit 1
fi

echo "Found required SQL files ✓"

# Check SQLcl availability
if ! command -v sql &> /dev/null; then
    echo "ERROR: SQLcl (sql command) not found in PATH!"
    echo "Please ensure Oracle SQLcl is installed and in your PATH."
    exit 1
fi

echo "SQLcl found ✓"

# Prompt for database connection details
echo ""
echo "Please provide your Oracle database connection details:"
read -p "Username: " DB_USER
read -s -p "Password: " DB_PASSWORD
echo ""
read -p "Connection string (host:port/service_name or TNS alias): " DB_CONNECTION

echo ""
echo "Connecting to Oracle database using SQLcl..."

# Create SQLcl execution script
cat > studio_setup.sql << 'EOF'
-- SQLcl Studio Lessons Setup Script
-- Set up SQLcl environment for better output
SET ECHO ON
SET FEEDBACK ON
SET TIMING ON
SET PAGESIZE 50
SET LINESIZE 120
SET SERVEROUTPUT ON

-- Show connection info
PROMPT ===================================
PROMPT Connected to Oracle Database
PROMPT ===================================
SELECT USER as CONNECTED_USER, 
       SYS_CONTEXT('USERENV', 'DB_NAME') as DATABASE_NAME,
       SYS_CONTEXT('USERENV', 'SERVER_HOST') as HOST
FROM DUAL;

PROMPT
PROMPT ===================================
PROMPT Step 1: Creating STUDIO_PRIVATE_LESSONS table
PROMPT ===================================

-- Execute table creation script
@create_and_load_studio_lessons.sql

PROMPT
PROMPT ===================================
PROMPT Step 2: Loading schedule data
PROMPT ===================================

-- Execute data loading script
@insert_studio_lessons.sql

PROMPT
PROMPT ===================================
PROMPT Step 3: Verifying data load
PROMPT ===================================

-- Verify data was loaded
SELECT COUNT(*) as TOTAL_RECORDS 
FROM STUDIO_PRIVATE_LESSONS;

SELECT COUNT(DISTINCT TIME_SLOT) as UNIQUE_TIME_SLOTS,
       COUNT(DISTINCT WEEK_IDENTIFIER) as UNIQUE_WEEKS,
       COUNT(DISTINCT SHEET_NAME) as UNIQUE_SHEETS
FROM STUDIO_PRIVATE_LESSONS;

PROMPT
PROMPT Sample data:
SELECT WEEK_IDENTIFIER, SHEET_NAME, TIME_SLOT, 
       SUBSTR(LESSON_DATA, 1, 100) || '...' as LESSON_SAMPLE
FROM STUDIO_PRIVATE_LESSONS 
WHERE ROWNUM <= 3
ORDER BY TIME_SLOT;

PROMPT
PROMPT ===================================
PROMPT Setup completed successfully!
PROMPT ===================================

-- Exit SQLcl
EXIT
EOF

# Execute SQLcl with the script
echo "Executing SQLcl script..."
sql "$DB_USER/$DB_PASSWORD@$DB_CONNECTION" @studio_setup.sql

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SUCCESS: Studio Lessons database setup completed!"
    echo "✓ Table STUDIO_PRIVATE_LESSONS created"
    echo "✓ Schedule data loaded"
    echo ""
    echo "Next steps:"
    echo "1. Verify the data by querying the table"
    echo "2. Create API endpoints to access the data"
    echo "3. Build frontend components for the studio tab"
else
    echo ""
    echo "✗ ERROR: Setup failed. Please check the output above for details."
    exit 1
fi

# Clean up temporary file
rm -f temp_execute_all.sql

echo "Setup script completed."
