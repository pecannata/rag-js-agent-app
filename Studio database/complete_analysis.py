import pandas as pd
import re

# Read the original Excel to see ALL data
excel_file = 'Private_lesson_Calendar.xlsx'
sheet_name = '99-915'
df = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)

print('=== COMPLETE EXCEL DATA ANALYSIS ===')
print(f'Full sheet dimensions: {df.shape}')
print()

# Let's examine EVERY row to see what I might be missing
for i in range(len(df)):
    row_data = []
    for j in range(len(df.columns)):
        cell = df.iloc[i, j]
        if pd.notna(cell):
            cell_str = str(cell).strip()
            if cell_str and cell_str != 'nan':
                row_data.append(f'Col{j}: {cell_str[:100]}')
    
    if row_data:  # Only show rows with data
        print(f'Row {i}: {row_data}')

print()
print('=== CHECKING FOR ALL TIME SLOTS AND STUDENTS ===')

# Look for ANY cells that might contain times beyond what I captured
all_times = set()
all_students = set()

for i in range(len(df)):
    for j in range(len(df.columns)):
        cell = df.iloc[i, j]
        if pd.notna(cell):
            cell_str = str(cell)
            
            # Look for any time patterns
            time_matches = re.findall(r'\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?', cell_str, re.IGNORECASE)
            for time_match in time_matches:
                all_times.add(time_match)
            
            # Look for potential student names (capitalized words)
            student_matches = re.findall(r'\b[A-Z][a-z]+\b', cell_str)
            for student in student_matches:
                exclude_words = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 
                               'DAILY', 'SCHEDULE', 'Week', 'NOTES', 'TO', 'DO', 'VENMO', 'DANCERS', 'TIME', 
                               'LESSON', 'TRIO', 'CHOREOGRAPHY', 'Set', 'Rows', 'This', 'Braden', 'Solo']
                if student not in exclude_words:
                    all_students.add(student)

print(f'All times found: {sorted(all_times)}')
print(f'All potential students: {sorted(all_students)}')

print()
print('=== WHAT DID MY IMPROVED CSV CAPTURE? ===')

# Read my improved CSV
improved_df = pd.read_csv('Private_lesson_Calendar_tab2_99-915_IMPROVED.csv')
print(f'Improved CSV shape: {improved_df.shape}')
print('Improved CSV content:')
print(improved_df.to_string())

print()
print('=== WHAT AM I MISSING? ===')

# Compare original vs improved
original_df = pd.read_csv('Private_lesson_Calendar_tab2_99-915.csv')
print(f'Original CSV shape: {original_df.shape}')

print()
print('=== SPECIFIC MISSING DATA ANALYSIS ===')

# Let's check if there are more time slots in the original
print('Time slots in original CSV:')
for i, row in original_df.iterrows():
    if pd.notna(row.iloc[1]) and ':' in str(row.iloc[1]):
        print(f'  {row.iloc[1]} -> {[str(cell)[:50] for cell in row.iloc[2:] if pd.notna(cell) and str(cell).strip()]}')

print()
print('Time slots in improved CSV:')
for i, row in improved_df.iterrows():
    print(f'  {row.iloc[0]} -> {[str(cell)[:50] for cell in row.iloc[1:] if pd.notna(cell) and str(cell).strip()]}')
