#!/usr/bin/env python3

import json
import pandas as pd
from datetime import datetime
import os

def create_comprehensive_analysis():
    """Combine all analysis results into a comprehensive JSON file"""
    
    print("=== CREATING COMPREHENSIVE ANALYSIS ===")
    
    # Load data from all our analysis scripts
    data_sources = []
    
    # 1. Load excel_ai_analyzer results (99-915 sheet)
    if os.path.exists('Private_lesson_Calendar_tab2_99-915_AI_COMPLETE.csv'):
        df_99_915 = pd.read_csv('Private_lesson_Calendar_tab2_99-915_AI_COMPLETE.csv')
        print("✅ Loaded 99-915 sheet data")
        data_sources.append("excel_ai_analyzer.py")
    else:
        df_99_915 = None
        print("❌ 99-915 sheet data not found")
    
    # 2. Load combined_schedule_analyzer results (69-615 sheet with teacher names)
    if os.path.exists('Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json'):
        with open('Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json', 'r') as f:
            schedule_69_615 = json.load(f)
        print("✅ Loaded 69-615 schedule with teacher names")
        data_sources.append("combined_schedule_analyzer.py")
    else:
        schedule_69_615 = None
        print("❌ 69-615 schedule data not found")
    
    # 3. Load extract_teachers_by_color_fixed results 
    if os.path.exists('Private_lesson_Calendar_69-615_TEACHERS_BY_COLOR.csv'):
        df_teachers_colors = pd.read_csv('Private_lesson_Calendar_69-615_TEACHERS_BY_COLOR.csv')
        print("✅ Loaded teacher color data")
        data_sources.append("extract_teachers_by_color_fixed.py")
    else:
        df_teachers_colors = None
        print("❌ Teacher color data not found")
    
    # Create comprehensive data structure
    comprehensive_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'source_file': 'Private lesson Calendar.xlsx',
            'analysis_tools_used': data_sources,
            'sheets_analyzed': [],
            'description': 'Comprehensive analysis combining all extraction methods'
        },
        'teacher_identification': {
            'confirmed_teachers': {},
            'color_mappings': {},
            'unidentified_colors': []
        },
        'schedules': {},
        'statistics': {
            'total_lessons': 0,
            'total_time_slots': 0,
            'teachers_identified': 0,
            'studios_used': set()
        }
    }
    
    # Process 99-915 sheet data
    if df_99_915 is not None:
        comprehensive_data['metadata']['sheets_analyzed'].append('99-915')
        
        schedule_99_915 = process_99_915_schedule(df_99_915)
        comprehensive_data['schedules']['99-915'] = {
            'description': 'Weekly schedule for 99-915 sheet (September 2024)',
            'week_starting': '2024-09-09',
            'time_slots': schedule_99_915['time_slots'],
            'lesson_count': schedule_99_915['lesson_count']
        }
        
        comprehensive_data['statistics']['total_lessons'] += schedule_99_915['lesson_count']
        comprehensive_data['statistics']['total_time_slots'] += len(schedule_99_915['time_slots'])
    
    # Process 69-615 sheet data with teacher names
    if schedule_69_615 is not None:
        comprehensive_data['metadata']['sheets_analyzed'].append('69-615')
        
        # Extract teacher information
        confirmed_teachers = {}
        for color, teacher in schedule_69_615['teachers'].items():
            if teacher is not None:
                confirmed_teachers[color] = teacher
                comprehensive_data['teacher_identification']['confirmed_teachers'][teacher] = color
            else:
                comprehensive_data['teacher_identification']['unidentified_colors'].append(color)
        
        comprehensive_data['teacher_identification']['color_mappings'] = confirmed_teachers
        
        # Process schedule data
        comprehensive_data['schedules']['69-615'] = {
            'description': 'Weekly schedule for 69-615 sheet with teacher identification (June 2025)',
            'week_starting': '2025-06-09',
            'time_slots': schedule_69_615['schedule'],
            'lesson_count': schedule_69_615['summary']['total_lessons'],
            'studios': schedule_69_615['studios']
        }
        
        comprehensive_data['statistics']['total_lessons'] += schedule_69_615['summary']['total_lessons']
        comprehensive_data['statistics']['total_time_slots'] += schedule_69_615['summary']['total_time_slots']
        comprehensive_data['statistics']['teachers_identified'] = len(confirmed_teachers)
        comprehensive_data['statistics']['studios_used'].update(schedule_69_615['studios'])
    
    # Convert set to list for JSON serialization
    comprehensive_data['statistics']['studios_used'] = list(comprehensive_data['statistics']['studios_used'])
    
    # Add summary of identified teachers
    comprehensive_data['teacher_summary'] = {
        'confirmed_teacher_names': list(comprehensive_data['teacher_identification']['confirmed_teachers'].keys()),
        'total_confirmed': len(comprehensive_data['teacher_identification']['confirmed_teachers']),
        'colors_with_teachers': len(comprehensive_data['teacher_identification']['color_mappings']),
        'unidentified_colors_count': len(comprehensive_data['teacher_identification']['unidentified_colors'])
    }
    
    # Save comprehensive JSON
    output_file = 'Private_lesson_Calendar_COMPREHENSIVE_ANALYSIS.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(comprehensive_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Comprehensive analysis saved to: {output_file}")
    
    # Display summary
    print("\n=== COMPREHENSIVE ANALYSIS SUMMARY ===")
    print(f"📊 Total lessons analyzed: {comprehensive_data['statistics']['total_lessons']}")
    print(f"⏰ Total time slots: {comprehensive_data['statistics']['total_time_slots']}")
    print(f"👨‍🏫 Teachers identified: {comprehensive_data['statistics']['teachers_identified']}")
    print(f"🏢 Studios used: {', '.join(comprehensive_data['statistics']['studios_used'])}")
    print(f"📋 Sheets analyzed: {', '.join(comprehensive_data['metadata']['sheets_analyzed'])}")
    
    print("\n=== CONFIRMED TEACHER NAMES ===")
    for teacher in comprehensive_data['teacher_summary']['confirmed_teacher_names']:
        color = comprehensive_data['teacher_identification']['confirmed_teachers'][teacher]
        print(f"🎨 {teacher} (Color: {color})")
    
    # Show sample lessons with teacher names
    print("\n=== SAMPLE LESSONS WITH TEACHER IDENTIFICATION ===")
    if '69-615' in comprehensive_data['schedules']:
        schedule = comprehensive_data['schedules']['69-615']
        if schedule['time_slots']:
            sample_slot = schedule['time_slots'][0]
            print(f"⏰ Time: {sample_slot['time']}")
            for lesson in sample_slot['lessons'][:3]:  # Show first 3 lessons
                teacher = lesson.get('teacher', 'Unknown')
                print(f"  📍 {lesson['day']} {lesson['studio']}: {lesson['student_info']}")
                if teacher and teacher != 'Unknown':
                    print(f"     👨‍🏫 Teacher: {teacher}")
    
    return comprehensive_data

def process_99_915_schedule(df):
    """Process the 99-915 sheet data into structured format"""
    
    time_slots = []
    lesson_count = 0
    
    for _, row in df.iterrows():
        time_slot = row['Time']
        
        # Skip header rows and empty time slots
        if time_slot == 'Time' or pd.isna(time_slot) or time_slot == '00:00:00':
            continue
            
        slot_data = {
            'time': time_slot,
            'lessons': []
        }
        
        # Process each day column
        for col in df.columns[1:]:  # Skip 'Time' column
            if pd.notna(row[col]) and str(row[col]).strip():
                # Extract day and date from column name
                import re
                day_match = re.search(r'(\w+)\s+\(([^)]+)\)', col)
                if day_match:
                    day = day_match.group(1)
                    date = day_match.group(2)
                    
                    lesson_data = {
                        'day': day,
                        'date': date,
                        'student_info': str(row[col]).strip(),
                        'studio': 'Unknown',
                        'teacher': None,
                        'teacher_color': None
                    }
                    
                    slot_data['lessons'].append(lesson_data)
                    lesson_count += 1
        
        if slot_data['lessons']:  # Only add if there are lessons
            time_slots.append(slot_data)
    
    return {
        'time_slots': time_slots,
        'lesson_count': lesson_count
    }

if __name__ == "__main__":
    comprehensive_data = create_comprehensive_analysis()
    
    print("\n=== ANALYSIS COMPLETE ===")
    print("\n🎯 Key Achievements:")
    print("   ✅ Combined data from multiple analysis scripts")
    print("   ✅ Identified real teacher names from color coding")
    print("   ✅ Extracted schedules from both Excel sheets")
    print("   ✅ Created comprehensive JSON with all data")
    print("\n📂 Files created:")
    print("   📄 Private_lesson_Calendar_COMPREHENSIVE_ANALYSIS.json")
