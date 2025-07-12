# Excel Schedule Analysis Summary

## Overview
Combined analysis of the "69-615" sheet from Private lesson Calendar.xlsx using both lesson data extraction and teacher color mapping.

## Generated Files

### 1. JSON Output
**`Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json`**
- Complete structured schedule data in JSON format
- Includes teacher assignments, lesson details, and metadata
- Ready for API consumption or database import

### 2. CSV Summary
**`Private_lesson_Calendar_69-615_LESSON_SUMMARY.csv`**
- Flattened lesson data for easy analysis
- 76 individual lesson records
- Each row = one lesson with full details

### 3. Analysis Scripts
**`combined_schedule_analyzer.py`**
- Main script combining both approaches
- Extracts lesson data AND teacher color assignments
- Generates both JSON and CSV outputs

## Data Summary

### Schedule Information
- **Week Dates**: June 9-15, 2025
- **Time Slots**: 15 different time periods (10:00 AM - 7:00 PM)
- **Total Lessons**: 76 individual lessons
- **Studios**: 3 studios (Studio 1, Studio 2, Studio 3)
- **Teachers**: 15 identified (5 named, 10 by color code)

### Identified Teachers
#### Named Teachers:
- PAIGE (Color: FFFFF2CC)
- MEGHAN (Color: FFEAD1DC)
- RYANN (Color: FFC9DAF8)
- GRACIE (Color: FFD9EAD3)
- CARALIN (BALLET TEACHER) (Color: FFD9D2E9)
- HUNTER (Color: FFF6B26B)
- ARDEN (Color: FFE06666)

#### Unassigned/Color-Only Slots:
- Color FFA4C2F4 - Most lessons (teacher = null)
- Color FFFF00FF - Rehearsals (teacher = null)
- Color FF00FF00 - Gabi M lessons (teacher = null)
- Color FFB4A7D6 - Kinley/Harlow lessons (teacher = null)
- Color FFFF9900 - Various lessons (teacher = null)
- And others... (all with teacher = null)

### Student Activities
- Individual lessons (solos)
- Duo lessons (e.g., "Mila & Reese duo")
- Technique sessions
- Rehearsals
- Dance style specific (jazz, tap, ballet)

## Data Structure

### JSON Structure:
```json
{
  "week_info": {
    "sheet_name": "69 -615",
    "week_dates": [...],
    "extracted_date": "..."
  },
  "teachers": {
    "color_code": "teacher_name",
    ...
  },
  "studios": ["STUDIO 1", "STUDIO 2", "STUDIO 3"],
  "schedule": [
    {
      "time": "10:00:00",
      "lessons": [
        {
          "day": "TUESDAY",
          "date": "2025-06-09",
          "studio": "STUDIO 1",
          "student_info": "Reese",
          "teacher_color": "FFFFF2CC",
          "teacher": "PAIGE",
          "column": 5
        },
        ...
      ]
    },
    ...
  ],
  "summary": {
    "total_time_slots": 15,
    "total_lessons": 76,
    "unique_teachers": 15,
    "date_range": "2025-06-02 to 2025-06-15"
  }
}
```

### CSV Structure:
Each row contains: Time, Day, Date, Studio, Student_Info, Teacher, Teacher_Color

## Usage
1. **JSON file**: Import into applications, APIs, or databases
2. **CSV file**: Excel analysis, reporting, or simple database imports
3. **Scripts**: Modify for other Excel sheets or different analysis needs

## Notes
- Colors in Excel cells represent teacher assignments
- Some lessons have "Unknown" teachers (no color assigned)
- Date ranges span multiple days due to Excel formula structure
- All lesson details preserved from original Excel format
