import pandas as pd

excel_file = 'Private_lesson_Calendar.xlsx'
sheet_name = '99-915'

# Read the full sheet
df = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)

# Extract the meaningful data structure
lesson_data = []

# Get the week start date from row 1, column 2
week_start = df.iloc[1, 2] if pd.notna(df.iloc[1, 2]) else 'Unknown'

# Get the dates from row 2 (columns 2-8)
dates = []
for col in range(2, 9):
    date_val = df.iloc[2, col]
    if pd.notna(date_val):
        dates.append(str(date_val).split()[0])  # Get just the date part
    else:
        dates.append('')

# Get the day names from row 3 (columns 2-8)
days = []
for col in range(2, 9):
    day_val = df.iloc[3, col]
    if pd.notna(day_val):
        days.append(str(day_val))
    else:
        days.append('')

# Process time slots and lessons (rows 4-8)
for row in range(4, 9):
    time_slot = df.iloc[row, 1]
    if pd.notna(time_slot):
        time_str = str(time_slot)
        if ':' in time_str:
            row_data = [time_str]
            
            # Get lesson data for each day (columns 2-8)
            for col in range(2, 9):
                cell_value = df.iloc[row, col]
                if pd.notna(cell_value):
                    lesson_info = str(cell_value).strip()
                    if lesson_info and lesson_info != 'nan':
                        row_data.append(lesson_info)
                    else:
                        row_data.append('')
                else:
                    row_data.append('')
            
            lesson_data.append(row_data)

# Create the CSV structure
headers = ['Time'] + [f'{day} ({date})' for day, date in zip(days, dates)]

# Create dataframe
csv_df = pd.DataFrame(lesson_data, columns=headers)

# Save to CSV
output_file = 'Private_lesson_Calendar_tab2_99-915_cleaned.csv'
csv_df.to_csv(output_file, index=False)

print(f'Created cleaned CSV file: {output_file}')
print(f'Shape: {csv_df.shape}')
print('\nPreview of the data:')
print(csv_df.to_string())
print(f'\nWeek start date: {week_start}')
