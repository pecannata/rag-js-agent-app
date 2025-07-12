import pandas as pd
import re

# Read the Excel file
excel_file = 'Private_lesson_Calendar.xlsx'
sheet_name = '99-915'
df = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)

print('=== ANALYZING EXCEL DATA FOR BETTER CSV EXTRACTION ===')
print(f'Sheet shape: {df.shape}\n')

# Find the actual data structure
print('=== IDENTIFYING KEY ROWS ===')
dates_row = None
days_row = None
time_rows = []

for i in range(len(df)):
    row_values = [str(v) for v in df.iloc[i].values if pd.notna(v)]
    
    # Check if this row contains dates
    has_dates = sum(1 for val in row_values if re.search(r'2024-\d{2}-\d{2}', val)) >= 3
    
    # Check if this row contains day names
    has_days = sum(1 for val in row_values if val.upper() in ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']) >= 3
    
    # Check if this row has time slots
    has_times = any(':' in val and any(c.isdigit() for c in val) for val in row_values)
    
    # Check if this row has student names
    student_names = ['GEMMA', 'EVERLY', 'REMI', 'LARKIN', 'MILA', 'REESE']
    has_students = any(any(name in val.upper() for name in student_names) for val in row_values)
    
    if has_dates:
        dates_row = i
        print(f'Row {i}: DATES - {row_values}')
    elif has_days:
        days_row = i
        print(f'Row {i}: DAYS - {row_values}')
    elif has_times or has_students:
        time_rows.append(i)
        print(f'Row {i}: LESSON DATA - Times: {has_times}, Students: {has_students} - {row_values}')

print(f'\nDates row: {dates_row}')
print(f'Days row: {days_row}')
print(f'Lesson data rows: {time_rows}')

# Now let's extract the data properly
print('\n=== EXTRACTING STRUCTURED DATA ===')

# Get dates from the dates row
dates = []
if dates_row is not None:
    for col in range(len(df.columns)):
        cell_val = df.iloc[dates_row, col]
        if pd.notna(cell_val) and '2024' in str(cell_val):
            dates.append(str(cell_val).split()[0])

# Get day names from the days row
days = []
if days_row is not None:
    for col in range(len(df.columns)):
        cell_val = df.iloc[days_row, col]
        if pd.notna(cell_val) and str(cell_val).upper() in ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']:
            days.append(str(cell_val))

print(f'Extracted dates: {dates}')
print(f'Extracted days: {days}')

# Extract lesson data with better parsing
print('\n=== LESSON DATA ANALYSIS ===')
lesson_data = []

for row_idx in time_rows:
    row_data = {}
    time_slot = None
    
    # Look for time in the row
    for col in range(len(df.columns)):
        cell_val = df.iloc[row_idx, col]
        if pd.notna(cell_val):
            cell_str = str(cell_val)
            if ':' in cell_str and any(c.isdigit() for c in cell_str):
                # This might be a time slot
                if not time_slot:  # Take the first time we find
                    time_slot = cell_str
                    row_data['time'] = time_slot
    
    # Get lesson data for each day column
    lessons_by_day = {}
    for i, day in enumerate(days):
        if i + 2 < len(df.columns):  # Assuming day columns start at index 2
            cell_val = df.iloc[row_idx, i + 2]
            if pd.notna(cell_val):
                cell_str = str(cell_val).strip()
                if cell_str and cell_str != 'nan':
                    lessons_by_day[day] = cell_str
    
    if time_slot:
        row_data['lessons'] = lessons_by_day
        lesson_data.append(row_data)
        print(f'Time {time_slot}: {lessons_by_day}')

print(f'\nFound {len(lesson_data)} time slots with lesson data')
