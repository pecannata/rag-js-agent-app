#!/usr/bin/env python3
"""
Generate SQL INSERT statements from extracted JSON schedule data
"""

import json
import sys
from datetime import datetime

def generate_insert_statements():
    """Generate SQL INSERT statements from the JSON file"""
    
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
    
    # Extract metadata
    sheet_name = schedule_data['week_info']['sheet_name']
    week_start_date = "2025-06-09"  # Extract from schedule data
    week_identifier = f"{week_start_date}-{sheet_name}"
    
    # Prepare full week JSON (escape single quotes)
    full_week_json = json.dumps(schedule_data, ensure_ascii=False)
    full_week_json = full_week_json.replace("'", "''")
    
    # Generate SQL file
    sql_file = 'insert_studio_lessons.sql'
    
    with open(sql_file, 'w') as f:
        f.write("-- Generated INSERT statements for STUDIO_PRIVATE_LESSONS\\n")
        f.write(f"-- Generated on: {datetime.now().isoformat()}\\n")
        f.write(f"-- Source: {json_file}\\n\\n")
        
        # Clear existing data for this week/sheet
        f.write(f"-- Clear existing data for this week/sheet\\n")
        f.write(f"DELETE FROM STUDIO_PRIVATE_LESSONS \\n")
        f.write(f"WHERE week_identifier = '{week_identifier}' AND sheet_name = '{sheet_name}';\\n\\n")
        
        # Insert each time slot as a separate record
        f.write("-- Insert time slot data\\n")
        
        for time_slot in schedule_data['schedule']:
            time_value = time_slot['time']
            lesson_data_json = json.dumps(time_slot, ensure_ascii=False)
            
            # Escape single quotes in JSON for SQL
            lesson_data_json = lesson_data_json.replace("'", "''")
            
            f.write(f"INSERT INTO STUDIO_PRIVATE_LESSONS (\\n")
            f.write(f"    WEEK_START_DATE,\\n")
            f.write(f"    WEEK_IDENTIFIER,\\n")
            f.write(f"    SHEET_NAME,\\n")
            f.write(f"    TIME_SLOT,\\n")
            f.write(f"    LESSON_DATA,\\n")
            f.write(f"    FULL_WEEK_JSON\\n")
            f.write(f") VALUES (\\n")
            f.write(f"    DATE '{week_start_date}',\\n")
            f.write(f"    '{week_identifier}',\\n")
            f.write(f"    '{sheet_name}',\\n")
            f.write(f"    '{time_value}',\\n")
            f.write(f"    '{lesson_data_json}',\\n")
            f.write(f"    '{full_week_json}'\\n")
            f.write(f");\\n\\n")
        
        # Add verification queries (Oracle syntax)
        f.write("-- Verification queries\\n")
        f.write("SELECT \\n")
        f.write("    WEEK_IDENTIFIER,\\n")
        f.write("    SHEET_NAME,\\n")
        f.write("    TIME_SLOT,\\n")
        f.write("    JSON_QUERY(LESSON_DATA, '$.lessons.size()') as lesson_count,\\n")
        f.write("    JSON_VALUE(LESSON_DATA, '$.lessons[0].teacher') as sample_teacher,\\n")
        f.write("    JSON_VALUE(LESSON_DATA, '$.lessons[0].student_info') as sample_student\\n")
        f.write("FROM STUDIO_PRIVATE_LESSONS \\n")
        f.write("ORDER BY TIME_SLOT\\n")
        f.write("FETCH FIRST 10 ROWS ONLY;\\n\\n")
        
        f.write("-- Summary statistics\\n")
        f.write("SELECT \\n")
        f.write("    WEEK_IDENTIFIER,\\n")
        f.write("    SHEET_NAME,\\n")
        f.write("    COUNT(*) as time_slots\\n")
        f.write("FROM STUDIO_PRIVATE_LESSONS \\n")
        f.write("GROUP BY WEEK_IDENTIFIER, SHEET_NAME;\\n")
    
    print(f"SQL INSERT statements generated in: {sql_file}")
    print(f"Time slots to insert: {len(schedule_data['schedule'])}")
    print(f"Week identifier: {week_identifier}")
    print(f"Sheet name: {sheet_name}")
    
    return True

if __name__ == "__main__":
    if generate_insert_statements():
        print("\\nTo load the data into the database:")
        print("1. First run: create_and_load_studio_lessons.sql")
        print("2. Then run: insert_studio_lessons.sql")
        print("\\nUse your database client or SQLScript.sh if available")
    else:
        sys.exit(1)
