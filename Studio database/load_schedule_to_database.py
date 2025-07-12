#!/usr/bin/env python3
"""
Script to load extracted Excel schedule data into the database
Creates STUDIO_PRIVATE_LESSONS table and loads JSON data
"""

import json
import subprocess
import sys
from datetime import datetime
import os

def execute_sql_script(sql_content):
    """Execute SQL using SQLScript.sh"""
    try:
        # Save SQL to temporary file
        with open('temp_sql_script.sql', 'w') as f:
            f.write(sql_content)
        
        # Execute using SQLScript.sh
        result = subprocess.run(['./SQLScript.sh', 'temp_sql_script.sql'], 
                              capture_output=True, text=True, cwd='..')
        
        # Clean up temp file
        os.remove('temp_sql_script.sql')
        
        if result.returncode != 0:
            print(f"SQL execution error: {result.stderr}")
            return False
        
        print(f"SQL executed successfully: {result.stdout}")
        return True
        
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return False

def create_studio_private_lessons_table():
    """Create the STUDIO_PRIVATE_LESSONS table"""
    
    sql_create_table = """
-- Create STUDIO_PRIVATE_LESSONS table
DROP TABLE IF EXISTS STUDIO_PRIVATE_LESSONS;

CREATE TABLE STUDIO_PRIVATE_LESSONS (
    id SERIAL PRIMARY KEY,
    week_identifier VARCHAR(50) NOT NULL,
    sheet_name VARCHAR(100) NOT NULL,
    time_slot TIME NOT NULL,
    lesson_data JSONB NOT NULL,
    extracted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_studio_private_lessons_week ON STUDIO_PRIVATE_LESSONS(week_identifier);
CREATE INDEX idx_studio_private_lessons_time ON STUDIO_PRIVATE_LESSONS(time_slot);
CREATE INDEX idx_studio_private_lessons_sheet ON STUDIO_PRIVATE_LESSONS(sheet_name);

-- Add comments
COMMENT ON TABLE STUDIO_PRIVATE_LESSONS IS 'Store private lesson schedules extracted from Excel files';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.week_identifier IS 'Unique identifier for the week (e.g., 2025-06-09)';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.sheet_name IS 'Excel sheet name (e.g., 69-615)';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.time_slot IS 'Time slot for the lessons';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.lesson_data IS 'JSON data containing all lessons for this time slot';
"""
    
    return execute_sql_script(sql_create_table)

def load_schedule_data():
    """Load the extracted schedule JSON into the database"""
    
    # Read the JSON file
    json_file = 'Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json'
    
    try:
        with open(json_file, 'r') as f:
            schedule_data = json.load(f)
    except FileNotFoundError:
        print(f"JSON file {json_file} not found. Please run the extraction first.")
        return False
    except json.JSONDecodeError as e:
        print(f"Error reading JSON file: {e}")
        return False
    
    # Extract week identifier from sheet name and current date
    sheet_name = schedule_data['week_info']['sheet_name']
    week_identifier = f"2025-06-09-{sheet_name}"  # Use the week dates from the schedule
    
    # Clear existing data for this week/sheet
    sql_clear = f"""
DELETE FROM STUDIO_PRIVATE_LESSONS 
WHERE week_identifier = '{week_identifier}' AND sheet_name = '{sheet_name}';
"""
    
    if not execute_sql_script(sql_clear):
        print("Failed to clear existing data")
        return False
    
    # Insert each time slot as a separate record
    for time_slot in schedule_data['schedule']:
        time_value = time_slot['time']
        lesson_data_json = json.dumps(time_slot, ensure_ascii=False)
        
        # Escape single quotes in JSON
        lesson_data_json = lesson_data_json.replace("'", "''")
        
        sql_insert = f"""
INSERT INTO STUDIO_PRIVATE_LESSONS (
    week_identifier,
    sheet_name,
    time_slot,
    lesson_data
) VALUES (
    '{week_identifier}',
    '{sheet_name}',
    '{time_value}',
    '{lesson_data_json}'::jsonb
);
"""
        
        if not execute_sql_script(sql_insert):
            print(f"Failed to insert time slot {time_value}")
            return False
    
    print(f"Successfully loaded {len(schedule_data['schedule'])} time slots into database")
    return True

def verify_data():
    """Verify the loaded data"""
    
    sql_verify = """
-- Check loaded data
SELECT 
    week_identifier,
    sheet_name,
    time_slot,
    jsonb_array_length(lesson_data->'lessons') as lesson_count,
    lesson_data->'lessons'->0->>'teacher' as sample_teacher,
    lesson_data->'lessons'->0->>'student_info' as sample_student
FROM STUDIO_PRIVATE_LESSONS 
ORDER BY time_slot
LIMIT 10;

-- Summary statistics
SELECT 
    week_identifier,
    sheet_name,
    COUNT(*) as time_slots,
    SUM(jsonb_array_length(lesson_data->'lessons')) as total_lessons
FROM STUDIO_PRIVATE_LESSONS 
GROUP BY week_identifier, sheet_name;
"""
    
    return execute_sql_script(sql_verify)

def main():
    """Main function to create table and load data"""
    
    print("=== LOADING SCHEDULE DATA TO DATABASE ===")
    
    # Step 1: Create table
    print("\\n1. Creating STUDIO_PRIVATE_LESSONS table...")
    if not create_studio_private_lessons_table():
        print("Failed to create table")
        sys.exit(1)
    
    # Step 2: Load data
    print("\\n2. Loading schedule data...")
    if not load_schedule_data():
        print("Failed to load data")
        sys.exit(1)
    
    # Step 3: Verify data
    print("\\n3. Verifying loaded data...")
    if not verify_data():
        print("Failed to verify data")
        sys.exit(1)
    
    print("\\n=== SCHEDULE DATA LOADED SUCCESSFULLY ===")
    print("\\nNext steps:")
    print("1. Update the app's studio tab to read from STUDIO_PRIVATE_LESSONS table")
    print("2. Create API endpoints to serve the schedule data")
    print("3. Implement frontend components to display the schedule")

if __name__ == "__main__":
    main()
