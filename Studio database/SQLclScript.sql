-- SQLcl Script for Studio Lessons Database Setup
-- Run this script with: sql username/password@connection @SQLclScript.sql

-- Set up SQLcl environment
SET ECHO ON
SET FEEDBACK ON
SET TIMING ON
SET PAGESIZE 50
SET LINESIZE 120
SET SERVEROUTPUT ON

-- Show connection information
PROMPT ===============================================
PROMPT Oracle Database Connection Information
PROMPT ===============================================
SELECT USER as CONNECTED_USER, 
       SYS_CONTEXT('USERENV', 'DB_NAME') as DATABASE_NAME,
       SYS_CONTEXT('USERENV', 'SERVER_HOST') as HOST,
       TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') as CURRENT_TIME
FROM DUAL;

PROMPT
PROMPT ===============================================
PROMPT Step 1: Creating STUDIO_PRIVATE_LESSONS Table
PROMPT ===============================================

-- Check if table already exists
SELECT COUNT(*) as TABLE_EXISTS 
FROM USER_TABLES 
WHERE TABLE_NAME = 'STUDIO_PRIVATE_LESSONS';

-- Execute table creation script
@create_and_load_studio_lessons.sql

PROMPT
PROMPT ===============================================
PROMPT Step 2: Loading Studio Schedule Data
PROMPT ===============================================

-- Execute data loading script
@insert_studio_lessons.sql

PROMPT
PROMPT ===============================================
PROMPT Step 3: Data Verification and Summary
PROMPT ===============================================

-- Count total records
SELECT COUNT(*) as TOTAL_RECORDS 
FROM STUDIO_PRIVATE_LESSONS;

-- Show data summary
SELECT COUNT(DISTINCT TIME_SLOT) as UNIQUE_TIME_SLOTS,
       COUNT(DISTINCT WEEK_IDENTIFIER) as UNIQUE_WEEKS,
       COUNT(DISTINCT SHEET_NAME) as UNIQUE_SHEETS,
       MIN(WEEK_START_DATE) as EARLIEST_DATE,
       MAX(WEEK_START_DATE) as LATEST_DATE
FROM STUDIO_PRIVATE_LESSONS;

-- Show sample data
PROMPT
PROMPT Sample Records:
SELECT WEEK_IDENTIFIER, 
       SHEET_NAME, 
       TIME_SLOT,
       SUBSTR(LESSON_DATA, 1, 80) || '...' as LESSON_SAMPLE
FROM STUDIO_PRIVATE_LESSONS 
WHERE ROWNUM <= 5
ORDER BY WEEK_START_DATE, TIME_SLOT;

-- Show unique weeks and sheets
PROMPT
PROMPT Available Week Identifiers and Sheet Names:
SELECT DISTINCT WEEK_IDENTIFIER, SHEET_NAME 
FROM STUDIO_PRIVATE_LESSONS 
ORDER BY WEEK_IDENTIFIER, SHEET_NAME;

-- Show time slots available
PROMPT
PROMPT Available Time Slots:
SELECT DISTINCT TIME_SLOT 
FROM STUDIO_PRIVATE_LESSONS 
ORDER BY TIME_SLOT;

PROMPT
PROMPT ===============================================
PROMPT Studio Lessons Database Setup Complete!
PROMPT ===============================================
PROMPT
PROMPT The STUDIO_PRIVATE_LESSONS table has been created and populated.
PROMPT You can now:
PROMPT 1. Query the data using standard SQL
PROMPT 2. Create API endpoints to serve this data
PROMPT 3. Build frontend components for the studio schedule
PROMPT
PROMPT Example queries:
PROMPT - SELECT * FROM STUDIO_PRIVATE_LESSONS WHERE TIME_SLOT = '10:00:00';
PROMPT - SELECT JSON_VALUE(LESSON_DATA, '$.lessons[0].student_info') FROM STUDIO_PRIVATE_LESSONS;
PROMPT
PROMPT ===============================================
