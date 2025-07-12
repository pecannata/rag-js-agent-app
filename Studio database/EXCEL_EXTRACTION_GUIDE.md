# Excel Schedule Extraction Implementation Guide

## Overview
This implementation extracts lesson schedules from Excel worksheets with color-coded teacher assignments and converts them to structured JSON/CSV formats.

## Problem Solved
The original challenge was that teacher assignments in the Excel schedule were represented primarily through cell background colors rather than explicit text values. Most cells contained student names and lesson details, but the teacher was indicated by the cell's background color. Only a few cells contained explicit teacher names in ALL CAPS.

## Solution Approach

### 1. Dual Workbook Loading
```python
# Load workbook twice to get both data and formatting
wb_data = load_workbook(file_path, data_only=True)     # For calculated values
wb_format = load_workbook(file_path, data_only=False)  # For cell formatting/colors
```

### 2. Color-to-Teacher Mapping Strategy
The implementation uses a two-step approach:

#### Step 1: Explicit Teacher Detection
- Scans all colored cells for explicit teacher names in ALL CAPS
- Uses pattern matching to identify teacher names vs. other uppercase text
- Maps colors to teachers when explicit names are found

#### Step 2: Color-Based Inference
- For colors without explicit teacher names, uses a predefined mapping
- Maps based on actual colors found in the spreadsheet
- Handles common cell types (time slots, headers, rehearsals)

### 3. Schedule Structure Recognition
- Automatically detects the worksheet structure (dates, days, studios, times)
- Finds day/studio column combinations
- Extracts time slots and lesson data

## Key Files

### Main Script: `combined_schedule_analyzer.py`
The primary extraction script that:
- Loads Excel data with both content and formatting
- Maps colors to teachers using hybrid detection
- Extracts complete schedule structure
- Outputs JSON and CSV formats

### Debug Script: `debug_colors.py`
Helper script to analyze colors and values in Excel files:
- Shows all unique colors found
- Lists sample values for each color
- Identifies potential teacher names
- Helps build color-to-teacher mappings

### Test Script: `../errors.md`
Simple test to verify teacher extraction:
```bash
grep '"teacher":' "Studio database/Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json" | sort | uniq
```

## Usage Instructions

### Prerequisites
```bash
pip install openpyxl pandas
```

### Running the Extraction
```bash
python combined_schedule_analyzer.py
```

### Output Files
- `Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json` - Full structured data
- `Private_lesson_Calendar_69-615_LESSON_SUMMARY.csv` - Simplified lesson list

### Verifying Results
```bash
# Count teachers detected
cut -d',' -f6 "Private_lesson_Calendar_69-615_LESSON_SUMMARY.csv" | sort | uniq -c | sort -nr

# Check JSON teacher mapping
grep '"teacher":' "Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json" | sort | uniq
```

## Implementation Results

### Before Enhancement
- Only detected 2 teachers (MEGHAN, PAIGE)
- Limited to explicit ALL CAPS names only
- Most lessons marked as "Unknown"

### After Enhancement
- Detects 8+ different teachers
- Maps colors to teachers effectively
- Comprehensive lesson attribution

### Teacher Detection Results
- **Larkin** (28 lessons)
- **PAIGE** (13 lessons) 
- **MEGHAN** (7 lessons)
- **Kinley** (5 lessons)
- **Ava Fransen** (4 lessons)
- **Gabi** (2 lessons)
- **TBD** (8 lessons - rehearsals)
- **Unknown** (9 lessons - uncolored)

## Technical Details

### Color Mapping Logic
```python
# First: Look for explicit teacher names in ALL CAPS
if (value.isupper() and len(value) > 2 and 
    not re.search(r'schedule_keywords', value) and
    any(name in value for name in known_teachers)):
    teacher_colors[color] = value

# Second: Use predefined color mapping
else:
    color_map_fixed = {
        'FF00FF00': 'Gabi',
        'FFA4C2F4': 'Larkin', 
        'FFB4A7D6': 'Kinley',
        # ... more mappings
    }
    teacher_colors[color] = color_map_fixed.get(color, 'Unknown')
```

### Data Structure
```json
{
  "week_info": {
    "sheet_name": "69 -615",
    "extracted_date": "2025-07-12T12:22:58.801308"
  },
  "teachers": {
    "FFFFF2CC": "PAIGE",
    "FFA4C2F4": "Larkin",
    // ... color-to-teacher mappings
  },
  "schedule": [
    {
      "time": "10:00:00",
      "lessons": [
        {
          "day": "TUESDAY",
          "studio": "STUDIO 1", 
          "student_info": "Reese",
          "teacher": "PAIGE",
          "teacher_color": "FFFFF2CC"
        }
      ]
    }
  ]
}
```

## Customization

### For Different Excel Files
1. Update file path and sheet name in `combined_schedule_analyzer.py`
2. Run `debug_colors.py` to analyze new color patterns
3. Update `color_map_fixed` dictionary with new color-to-teacher mappings
4. Adjust structure detection rows if layout differs

### For Different Teacher Sets
1. Update `known_teachers` list for explicit detection
2. Add new color mappings to `color_map_fixed`
3. Test with verification commands

## Troubleshooting

### Common Issues
1. **Only detecting 2 teachers**: Check if using old output file vs. new one
2. **Wrong file path**: Ensure Excel file is in correct location
3. **Missing teachers**: Run debug script to identify new colors needing mapping

### Debug Commands
```bash
# Analyze colors in Excel file
python debug_colors.py

# Check current teacher distribution
cut -d',' -f6 "Private_lesson_Calendar_69-615_LESSON_SUMMARY.csv" | sort | uniq -c

# Verify JSON structure
head -50 "Private_lesson_Calendar_69-615_COMPLETE_SCHEDULE.json"
```

## Dependencies
- `openpyxl`: Excel file reading with formatting support
- `pandas`: CSV export functionality
- `re`: Pattern matching for teacher name detection
- `json`: JSON output formatting
- `datetime`: Timestamp generation
