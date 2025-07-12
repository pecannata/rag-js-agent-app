# Studio Private Lessons Database Integration

## Overview
This document describes the complete process for extracting schedule data from Excel files and integrating it with the application database.

## Process Flow

### 1. Excel Data Extraction
```bash
python combined_schedule_analyzer.py
```
- Extracts schedule data from `Private lesson Calendar.xlsx`
- Maps color-coded cells to teacher assignments
- Outputs structured JSON and CSV files
- Detects 8+ different teachers vs. original 2

### 2. Database Table Creation
```sql
-- Run: create_and_load_studio_lessons.sql
CREATE TABLE STUDIO_PRIVATE_LESSONS (
    id SERIAL PRIMARY KEY,
    week_start_date DATE NOT NULL,
    week_identifier VARCHAR(50) NOT NULL, 
    sheet_name VARCHAR(100) NOT NULL,
    time_slot TIME NOT NULL,
    lesson_data JSONB NOT NULL,
    full_week_json JSONB NOT NULL,
    extracted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Data Loading
```bash
python generate_insert_statements.py
```
- Generates SQL INSERT statements from extracted JSON
- Creates `insert_studio_lessons.sql` with 15 time slots
- Includes both individual time slot data and complete week JSON

### 4. Database Integration
```sql
-- Run: insert_studio_lessons.sql
-- Loads 15 time slots with 76 total lessons
-- Week identifier: 2025-06-09-69-615
-- Complete teacher mapping included
```

## Files Generated

### Python Scripts
- `combined_schedule_analyzer.py` - Main extraction script
- `generate_insert_statements.py` - SQL generation script
- `debug_colors.py` - Color analysis helper

### SQL Files
- `create_and_load_studio_lessons.sql` - Table creation
- `insert_studio_lessons.sql` - Data insertion

### Data Files
- `Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json` - Full schedule JSON
- `Private_lesson_Calendar_69-615_LESSON_SUMMARY.csv` - Simplified CSV export

## Database Schema

### Table: STUDIO_PRIVATE_LESSONS

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| week_start_date | DATE | Start date of the week (2025-06-09) |
| week_identifier | VARCHAR(50) | Unique week ID (2025-06-09-69-615) |
| sheet_name | VARCHAR(100) | Excel sheet name (69-615) |
| time_slot | TIME | Lesson time slot |
| lesson_data | JSONB | Individual time slot lessons |
| full_week_json | JSONB | Complete week schedule JSON |
| extracted_date | TIMESTAMP | When data was extracted |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

## Data Structure

### Individual Lesson Data
```json
{
  "day": "TUESDAY",
  "date": "2025-06-09", 
  "studio": "STUDIO 1",
  "student_info": "Reese",
  "teacher_color": "FFFFF2CC",
  "teacher": "PAIGE",
  "column": 5
}
```

### Complete Week JSON Structure
```json
{
  "week_info": {
    "sheet_name": "69 -615",
    "week_dates": [],
    "extracted_date": "2025-07-12T12:53:10.738446"
  },
  "teachers": {
    "FFFFF2CC": "PAIGE",
    "FFA4C2F4": "Larkin",
    "FFEAD1DC": "MEGHAN",
    // ... more teacher mappings
  },
  "studios": ["STUDIO 1", "STUDIO 2", "STUDIO 3"],
  "schedule": [
    {
      "time": "10:00:00",
      "lessons": [/* lesson objects */]
    }
    // ... more time slots
  ],
  "summary": {
    "total_time_slots": 15,
    "total_lessons": 76,
    "unique_teachers": 13,
    "date_range": "Unknown"
  }
}
```

## Teacher Detection Results

The enhanced extraction now detects:
- **Larkin** (28 lessons)
- **PAIGE** (13 lessons)
- **MEGHAN** (7 lessons) 
- **Kinley** (5 lessons)
- **Ava Fransen** (4 lessons)
- **Gabi** (2 lessons)
- **TBD** (8 lessons - rehearsals)
- **Unknown** (9 lessons - uncolored)

## Usage Examples

### Query Individual Time Slots
```sql
SELECT time_slot, lesson_data 
FROM STUDIO_PRIVATE_LESSONS 
WHERE week_identifier = '2025-06-09-69-615'
ORDER BY time_slot;
```

### Query Complete Week Schedule
```sql
SELECT full_week_json 
FROM STUDIO_PRIVATE_LESSONS 
WHERE week_identifier = '2025-06-09-69-615'
LIMIT 1;
```

### Query Lessons by Teacher
```sql
SELECT time_slot, lesson_data
FROM STUDIO_PRIVATE_LESSONS
WHERE week_identifier = '2025-06-09-69-615'
  AND lesson_data::text LIKE '%"teacher": "Larkin"%';
```

### Query Lessons by Studio and Day
```sql
SELECT time_slot, lesson_data
FROM STUDIO_PRIVATE_LESSONS
WHERE week_identifier = '2025-06-09-69-615'
  AND lesson_data::text LIKE '%"studio": "STUDIO 1"%'
  AND lesson_data::text LIKE '%"day": "TUESDAY"%';
```

## App Integration

### Frontend Calendar Component
The app's studio tab can now:
1. Fetch complete week data from `full_week_json` column
2. Query specific time slots from `lesson_data` column
3. Filter by teacher, studio, day, or date
4. Display comprehensive schedule with proper teacher assignments

### API Endpoints Needed
```javascript
// Get complete week schedule
GET /api/studio/schedule/{week_identifier}

// Get lessons for specific time slot
GET /api/studio/lessons/{week_identifier}/{time_slot}

// Get lessons by teacher
GET /api/studio/teacher/{teacher_name}/{week_identifier}

// Get lessons by studio
GET /api/studio/studio/{studio_name}/{week_identifier}
```

## Execution Steps

1. **Extract Excel Data**
   ```bash
   cd "Studio database"
   python combined_schedule_analyzer.py
   ```

2. **Generate SQL Scripts**
   ```bash
   python generate_insert_statements.py
   ```

3. **Create Database Table**
   ```sql
   -- Run create_and_load_studio_lessons.sql in your database
   ```

4. **Load Schedule Data**
   ```sql
   -- Run insert_studio_lessons.sql in your database
   ```

5. **Verify Data Loading**
   ```sql
   SELECT COUNT(*) FROM STUDIO_PRIVATE_LESSONS;
   -- Should return 15 (one record per time slot)
   ```

## Next Steps

1. Create API endpoints to serve schedule data from the database
2. Update the app's studio tab to read from STUDIO_PRIVATE_LESSONS table
3. Implement frontend components to display the enhanced schedule
4. Add functionality to handle multiple weeks/sheets
5. Create admin interface for manual schedule updates

## Maintenance

To add new weeks:
1. Update Excel file with new sheet
2. Run extraction scripts with new sheet name
3. Generate and execute new INSERT statements
4. Update app to handle multiple week identifiers
