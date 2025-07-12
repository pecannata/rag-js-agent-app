#!/usr/bin/env python3

import json
from collections import Counter

def create_final_teacher_json():
    """Create final JSON with primary teacher names"""
    
    # Load the existing JSON with real teacher names
    with open('Private_lesson_Calendar_REAL_TEACHERS.json', 'r') as f:
        data = json.load(f)
    
    # Create a mapping that uses the most frequent teacher name for each color
    primary_teacher_mapping = {}
    
    for color, teachers in data['teacher_color_details'].items():
        if teachers:
            if len(teachers) == 1:
                primary_teacher_mapping[color] = teachers[0]
            else:
                # Use the most frequent teacher name, or first one if tie
                primary_teacher_mapping[color] = teachers[0]  # For simplicity, use first
    
    # Create enhanced mapping with readable names
    enhanced_mapping = {}
    for color, teacher in primary_teacher_mapping.items():
        if teacher == 'REHEARSAL':
            enhanced_mapping[color] = 'REHEARSAL'
        elif teacher == 'Gabi':
            enhanced_mapping[color] = 'GABI'
        elif teacher in ['Vivian Fincher', 'Vivi Fincher']:
            enhanced_mapping[color] = 'VIVIAN_FINCHER'
        elif teacher == 'Kaylee Kaloustian':
            enhanced_mapping[color] = 'KAYLEE_KALOUSTIAN'
        elif teacher == 'Ava Fransen':
            enhanced_mapping[color] = 'AVA_FRANSEN'
        else:
            enhanced_mapping[color] = teacher.upper().replace(' ', '_')
    
    # Update the data with enhanced mapping
    data['teacher_color_mapping'] = enhanced_mapping
    
    # Update teacher_ids in the schedule data
    for schedule_name, schedule_data in data['schedules'].items():
        for time_slot in schedule_data['time_slots']:
            for lesson in time_slot['lessons']:
                if lesson['teacher_color'] and lesson['teacher_color'] in enhanced_mapping:
                    lesson['teacher_id'] = enhanced_mapping[lesson['teacher_color']]
    
    # Save the final JSON
    output_file = 'Private_lesson_Calendar_FINAL_TEACHERS.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Final JSON with primary teacher names saved to: {output_file}")
    
    # Display the teacher mapping
    print("\n=== FINAL TEACHER MAPPING ===")
    for color, teacher in enhanced_mapping.items():
        details = data['teacher_color_details'][color]
        print(f"{color}: {teacher} (from {details})")
    
    # Display sample with real teacher names
    print("\n=== SAMPLE WITH FINAL TEACHER NAMES ===")
    if data['schedules']['69-615']['time_slots']:
        sample = data['schedules']['69-615']['time_slots'][0]
        print(f"Time: {sample['time']}")
        for lesson in sample['lessons']:
            if lesson['teacher_id']:
                print(f"  {lesson['day']} {lesson['studio']}: {lesson['lesson_details']}")
                print(f"    👨‍🏫 Teacher: {lesson['teacher_id']}")
    
    return data

if __name__ == "__main__":
    create_final_teacher_json()
