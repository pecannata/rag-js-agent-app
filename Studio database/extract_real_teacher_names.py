#!/usr/bin/env python3

import json
import pandas as pd
import re
from datetime import datetime
from collections import defaultdict

def extract_teacher_names_from_lessons():
    """Extract actual teacher names from lesson data"""
    
    # Load the lesson data
    df_lessons = pd.read_csv('Private_lesson_Calendar_69-615_LESSONS_WITH_COLORS.csv')
    df_teachers = pd.read_csv('Private_lesson_Calendar_69-615_TEACHERS_BY_COLOR.csv')
    
    # Create a mapping from color to actual teacher names found in lessons
    color_to_teachers = defaultdict(set)
    
    print("=== EXTRACTING REAL TEACHER NAMES ===")
    
    # Process each row to find teacher names
    for idx, (lesson_row, teacher_row) in enumerate(zip(df_lessons.iterrows(), df_teachers.iterrows())):
        _, lesson_data = lesson_row
        _, teacher_data = teacher_row
        
        # Skip header row
        if lesson_data['Time'] == 'Time':
            continue
            
        # Process each column (day-studio combination)
        for col in df_lessons.columns[1:]:  # Skip 'Time' column
            lesson_value = lesson_data[col]
            teacher_color = teacher_data[col] if col in teacher_data else None
            
            if pd.notna(lesson_value) and pd.notna(teacher_color) and str(lesson_value).strip():
                lesson_text = str(lesson_value).strip()
                
                # Extract teacher names from lesson text
                teacher_names = extract_teacher_name_from_text(lesson_text)
                
                if teacher_names:
                    for teacher_name in teacher_names:
                        color_to_teachers[teacher_color].add(teacher_name)
                        print(f"Color {teacher_color}: {teacher_name} (from '{lesson_text}')")
    
    # Convert sets to lists for JSON serialization
    color_to_teachers_final = {color: list(teachers) for color, teachers in color_to_teachers.items()}
    
    return color_to_teachers_final

def extract_teacher_name_from_text(lesson_text):
    """Extract teacher names from lesson text"""
    
    # Skip obvious non-teacher entries
    skip_patterns = [
        r'^\d{1,2}:\d{2}',  # Time patterns
        r'rehearsal',        # Rehearsal
        r'technique',        # Technique classes
        r'solo$',           # Solo classes
        r'duo$',            # Duo classes
        r'choreography',    # Choreography
        r'jazz$',           # Jazz
        r'tap$',            # Tap
    ]
    
    lesson_lower = lesson_text.lower()
    for pattern in skip_patterns:
        if re.search(pattern, lesson_lower):
            if 'rehearsal' in lesson_lower:
                return ['REHEARSAL']
            return []
    
    # Extract names - these are likely teacher names
    teacher_names = []
    
    # Common teacher name patterns
    teacher_patterns = [
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',  # Capitalized names
        r'\b([A-Z]+)\b',  # All caps names
    ]
    
    # Split by common separators
    parts = re.split(r'[,/&-]', lesson_text)
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
            
        # Remove common non-name suffixes
        part = re.sub(r'\s*-\s*(solo|technique|solos|paid.*)', '', part, flags=re.IGNORECASE)
        part = part.strip()
        
        # Look for teacher names
        for pattern in teacher_patterns:
            matches = re.findall(pattern, part)
            for match in matches:
                if len(match) > 1 and not match.lower() in ['pm', 'am', 'the', 'and', 'or', 'is', 'at']:
                    teacher_names.append(match)
    
    return teacher_names

def create_enhanced_json():
    """Create enhanced JSON with real teacher names"""
    
    print("Extracting real teacher names from lesson data...")
    color_to_real_teachers = extract_teacher_names_from_lessons()
    
    # Load existing CSV data
    df_99_915 = pd.read_csv('Private_lesson_Calendar_tab2_99-915_AI_COMPLETE.csv')
    df_69_615_lessons = pd.read_csv('Private_lesson_Calendar_69-615_LESSONS_WITH_COLORS.csv')
    df_69_615_teachers = pd.read_csv('Private_lesson_Calendar_69-615_TEACHERS_BY_COLOR.csv')
    
    # Create simplified teacher mapping - use first teacher name found for each color
    simplified_teacher_mapping = {}
    for color, teachers in color_to_real_teachers.items():
        if teachers:
            if len(teachers) == 1:
                simplified_teacher_mapping[color] = teachers[0]
            else:
                # For multiple teachers, create a descriptive name
                if 'REHEARSAL' in teachers:
                    simplified_teacher_mapping[color] = 'REHEARSAL'
                else:
                    simplified_teacher_mapping[color] = f"MULTIPLE_TEACHERS_{len(teachers)}"
        else:
            simplified_teacher_mapping[color] = 'UNKNOWN'
    
    print(f"\n=== FINAL TEACHER MAPPING ===")
    for color, teacher in simplified_teacher_mapping.items():
        detailed_teachers = color_to_real_teachers.get(color, [])
        print(f"{color}: {teacher} (Details: {detailed_teachers})")
    
    # Process schedule data with real teacher names
    schedule_99_915 = process_99_915_data(df_99_915)
    schedule_69_615 = process_69_615_data_with_real_names(df_69_615_lessons, df_69_615_teachers, simplified_teacher_mapping)
    
    # Create comprehensive data structure
    comprehensive_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'source_file': 'Private lesson Calendar.xlsx',
            'analysis_tools': [
                'excel_ai_analyzer.py',
                'extract_teachers_by_color_fixed.py',
                'extract_real_teacher_names.py'
            ],
            'sheets_analyzed': ['99-915', '69-615']
        },
        'teacher_color_mapping': simplified_teacher_mapping,
        'teacher_color_details': color_to_real_teachers,
        'schedules': {
            '99-915': {
                'description': 'Weekly schedule for 99-915 sheet',
                'week_starting': '2024-09-09',
                'time_slots': schedule_99_915
            },
            '69-615': {
                'description': 'Weekly schedule for 69-615 sheet with real teacher names',
                'week_starting': '2025-06-09',
                'time_slots': schedule_69_615
            }
        },
        'statistics': {
            'total_time_slots': len(schedule_99_915) + len(schedule_69_615),
            'total_lessons_99_915': sum(len(slot['lessons']) for slot in schedule_99_915),
            'total_lessons_69_615': sum(len(slot['lessons']) for slot in schedule_69_615),
            'unique_teachers_identified': len(simplified_teacher_mapping),
            'studios_used': list(set(
                lesson['studio'] for slot in schedule_69_615 
                for lesson in slot['lessons'] if lesson['studio'] != 'Unknown'
            ))
        }
    }
    
    # Save to JSON file
    output_file = 'Private_lesson_Calendar_REAL_TEACHERS.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(comprehensive_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Enhanced JSON with real teacher names saved to: {output_file}")
    
    # Display sample
    print("\n=== SAMPLE WITH REAL TEACHER NAMES ===")
    if schedule_69_615:
        sample = schedule_69_615[0]
        print(f"Time: {sample['time']}")
        for lesson in sample['lessons']:
            print(f"  {lesson['day']} {lesson['studio']}: {lesson['lesson_details']}")
            if lesson['teacher_id']:
                print(f"    👨‍🏫 Teacher: {lesson['teacher_id']}")
    
    return comprehensive_data

def process_99_915_data(df_99_915):
    """Process the 99-915 sheet data"""
    
    schedule_data = []
    
    for _, row in df_99_915.iterrows():
        time_slot = row['Time']
        
        # Skip header rows and empty time slots
        if time_slot == 'Time' or pd.isna(time_slot) or time_slot == '00:00:00':
            continue
            
        slot_data = {
            'time': time_slot,
            'sheet': '99-915',
            'week_starting': '2024-09-09',
            'lessons': []
        }
        
        # Process each day
        for col in df_99_915.columns[1:]:  # Skip 'Time' column
            if pd.notna(row[col]) and str(row[col]).strip():
                # Extract day and date from column name
                day_match = re.search(r'(\w+)\s+\(([^)]+)\)', col)
                if day_match:
                    day = day_match.group(1)
                    date = day_match.group(2)
                    
                    lesson_data = {
                        'day': day,
                        'date': date,
                        'lesson_details': str(row[col]).strip(),
                        'studio': 'Unknown',
                        'teacher_color': None,
                        'teacher_id': None
                    }
                    
                    slot_data['lessons'].append(lesson_data)
        
        if slot_data['lessons']:  # Only add if there are lessons
            schedule_data.append(slot_data)
    
    return schedule_data

def process_69_615_data_with_real_names(df_lessons, df_teachers, teacher_mapping):
    """Process the 69-615 sheet data with real teacher names"""
    
    schedule_data = []
    
    for idx, (lesson_row, teacher_row) in enumerate(zip(df_lessons.iterrows(), df_teachers.iterrows())):
        _, lesson_data = lesson_row
        _, teacher_data = teacher_row
        
        time_slot = lesson_data['Time']
        
        # Skip header rows and empty time slots
        if time_slot == 'Time' or pd.isna(time_slot):
            continue
            
        slot_data = {
            'time': time_slot,
            'sheet': '69-615',
            'week_starting': '2025-06-09',
            'lessons': []
        }
        
        # Process each day-studio combination
        for col in df_lessons.columns[1:]:  # Skip 'Time' column
            lesson_value = lesson_data[col]
            teacher_color = teacher_data[col] if col in teacher_data else None
            
            if pd.notna(lesson_value) and str(lesson_value).strip():
                # Extract day, studio, and date from column name
                col_match = re.search(r'(\w+)\s+(\w+\s+\d+)\s+\(([^)]+)\)', col)
                if col_match:
                    day = col_match.group(1)
                    studio = col_match.group(2)
                    date = col_match.group(3)
                    
                    teacher_id = teacher_mapping.get(teacher_color, 'Unknown') if teacher_color and pd.notna(teacher_color) else None
                    
                    lesson_info = {
                        'day': day,
                        'date': date,
                        'studio': studio,
                        'lesson_details': str(lesson_value).strip(),
                        'teacher_color': teacher_color if pd.notna(teacher_color) else None,
                        'teacher_id': teacher_id
                    }
                    
                    slot_data['lessons'].append(lesson_info)
        
        if slot_data['lessons']:  # Only add if there are lessons
            schedule_data.append(slot_data)
    
    return schedule_data

if __name__ == "__main__":
    comprehensive_data = create_enhanced_json()
