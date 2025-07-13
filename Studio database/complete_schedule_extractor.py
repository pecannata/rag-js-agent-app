#!/usr/bin/env python3
"""
Complete Schedule Extractor
Converts the comprehensive CSV data into proper JSON format and loads into database
"""

import pandas as pd
import json
import subprocess
import os
from datetime import datetime
from collections import defaultdict

def load_comprehensive_csv():
    """Load the comprehensive lesson summary CSV"""
    df = pd.read_csv('Private_lesson_Calendar_69-615_LESSON_SUMMARY.csv')
    print(f"Loaded {len(df)} lessons from CSV")
    return df

def convert_to_comprehensive_json(df):
    """Convert CSV data to comprehensive JSON format"""
    
    # Group lessons by time slot
    schedule_by_time = defaultdict(list)
    
    # Process each lesson
    for _, row in df.iterrows():
        time_slot = row['Time']
        
        lesson_data = {
            'day': row['Day'],
            'date': row['Date'],
            'studio': row['Studio'],
            'student_name': row['Student_Info'],
            'teacher_color': row['Teacher_Color'] if pd.notna(row['Teacher_Color']) else None,
            'teacher': row['Teacher'] if pd.notna(row['Teacher']) else 'Unknown',
            'lesson_type': 'Private',  # Default, can be enhanced later
            'status': 'Scheduled',
            'column': 0  # Placeholder for column reference
        }
        
        schedule_by_time[time_slot].append(lesson_data)
    
    # Build teacher color mapping
    teacher_colors = {}
    teachers_data = df[df['Teacher_Color'].notna()][['Teacher_Color', 'Teacher']].drop_duplicates()
    for _, row in teachers_data.iterrows():
        teacher_colors[row['Teacher_Color']] = row['Teacher']
    
    # Add some known mappings that might be missing
    teacher_colors.update({
        'FF4A86E8': 'N/A',
        'FFEFEFEF': 'N/A',
        'FFF3F3F3': 'N/A',
        'FFFFF2CC': 'PAIGE',
        'FFA4C2F4': 'Larkin',
        'FFFF00FF': 'TBD',
        'FFEAD1DC': 'MEGHAN',
        'FF00FF00': 'Gabi',
        'FFB4A7D6': 'Kinley',
        'FFFF9900': 'Ava Fransen',
        'FFC9DAF8': 'RYANN',
        'FFD9EAD3': 'GRACIE',
        'FFD9D2E9': 'CARALIN ( BALLET TEACHER)',
        'FFF6B26B': 'HUNTER',
        'FFE06666': 'ARDEN'
    })
    
    # Build studios list
    studios = list(df['Studio'].unique())
    studios = [studio for studio in studios if pd.notna(studio)]
    
    # Build schedule array
    schedule = []
    for time_slot in sorted(schedule_by_time.keys()):
        schedule.append({
            'time_slot': time_slot,
            'lessons': schedule_by_time[time_slot]
        })
    
    # Create comprehensive JSON structure
    comprehensive_data = {
        'week_info': {
            'sheet_name': '69 -615',
            'week_identifier': '2025-06-09-69 -615',
            'week_dates': [],
            'extracted_date': datetime.now().isoformat()
        },
        'teachers': teacher_colors,
        'studios': studios,
        'schedule': schedule,
        'summary': {
            'total_time_slots': len(schedule),
            'total_lessons': len(df),
            'unique_teachers': len(teacher_colors),
            'date_range': '2025-06-09 to 2025-06-14'
        }
    }
    
    return comprehensive_data

def save_complete_json(data, filename):
    """Save the comprehensive data to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Saved comprehensive schedule to: {filename}")
    print(f"Total time slots: {data['summary']['total_time_slots']}")
    print(f"Total lessons: {data['summary']['total_lessons']}")

def execute_sql_script(sql_content):
    """Execute SQL using SQLclScript.sh"""
    try:
        # Save SQL to temporary file
        with open('temp_sql_script.sql', 'w') as f:
            f.write(sql_content)
        
        # Execute using SQLclScript.sh
        result = subprocess.run(['../SQLclScript.sh', 'temp_sql_script.sql'], 
                              capture_output=True, text=True)
        
        # Clean up temp file
        os.remove('temp_sql_script.sql')
        
        if result.returncode != 0:
            print(f"SQL execution error: {result.stderr}")
            return False
        
        print(f"SQL executed successfully")
        return True
        
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return False

def update_database_with_complete_data(json_data):
    """Update the database with the complete schedule data"""
    
    # First, clear existing data
    sql_clear = """
    DELETE FROM STUDIO_PRIVATE_LESSONS WHERE WEEK_START_DATE = DATE '2025-06-09';
    """
    
    if not execute_sql_script(sql_clear):
        print("Failed to clear existing data")
        return False
    
    # Convert the comprehensive JSON to the format expected by the database
    week_start_date = '2025-06-09'
    lesson_id = '69-615-COMPLETE'
    full_week_json = json.dumps(json_data, ensure_ascii=False).replace("'", "''")
    
    # Insert the complete week data
    sql_insert = f"""
    INSERT INTO STUDIO_PRIVATE_LESSONS (
        WEEK_START_DATE,
        LESSON_ID,
        FULL_WEEK_JSON
    ) VALUES (
        DATE '{week_start_date}',
        '{lesson_id}',
        '{full_week_json}'
    );
    """
    
    if not execute_sql_script(sql_insert):
        print("Failed to insert complete schedule data")
        return False
    
    print("Successfully updated database with complete schedule!")
    return True

def verify_database_data():
    """Verify the updated database data"""
    sql_verify = """
    SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as week_start,
        LESSON_ID,
        LENGTH(FULL_WEEK_JSON) as json_length,
        SUBSTR(FULL_WEEK_JSON, 1, 200) as json_sample
    FROM STUDIO_PRIVATE_LESSONS 
    WHERE WEEK_START_DATE = DATE '2025-06-09';
    """
    
    return execute_sql_script(sql_verify)

def main():
    """Main function to extract complete schedule and update database"""
    
    print("=== COMPLETE SCHEDULE EXTRACTION ===")
    
    # Step 1: Load comprehensive CSV data
    print("\n1. Loading comprehensive CSV data...")
    df = load_comprehensive_csv()
    
    # Step 2: Convert to JSON format
    print("\n2. Converting to comprehensive JSON format...")
    json_data = convert_to_comprehensive_json(df)
    
    # Step 3: Save JSON file
    print("\n3. Saving complete JSON file...")
    json_filename = 'Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE_FULL.json'
    save_complete_json(json_data, json_filename)
    
    # Step 4: Update database
    print("\n4. Updating database with complete schedule...")
    if not update_database_with_complete_data(json_data):
        print("Failed to update database")
        return False
    
    # Step 5: Verify data
    print("\n5. Verifying database data...")
    if not verify_database_data():
        print("Failed to verify data")
        return False
    
    print("\n=== COMPLETE SCHEDULE EXTRACTION SUCCESSFUL ===")
    print("\nNext steps:")
    print("1. Refresh the studio calendar to see all lessons")
    print("2. The calendar should now show the complete schedule with all time slots")
    print(f"3. Total lessons loaded: {json_data['summary']['total_lessons']}")
    
    return True

if __name__ == "__main__":
    main()
