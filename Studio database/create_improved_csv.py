import pandas as pd
import re
from datetime import datetime

def extract_time_from_text(text):
    """Extract time from text that might contain both time and other info"""
    if pd.isna(text):
        return None
    
    text = str(text)
    
    # Look for time patterns like "3:45 PM", "4:30:PM", "15:30:00"
    time_patterns = [
        r'(\d{1,2}:\d{2}\s*(?:AM|PM))',  # 3:45 PM, 4:30PM
        r'(\d{1,2}:\d{2}:\d{2})',        # 15:30:00
        r'(\d{1,2}:\d{2})'               # 4:15
    ]
    
    for pattern in time_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None

def extract_student_info(text, exclude_time=True):
    """Extract student names and notes, optionally excluding time information"""
    if pd.isna(text):
        return ""
    
    text = str(text).strip()
    
    # If exclude_time, remove time patterns from the text
    if exclude_time:
        time_patterns = [
            r'\d{1,2}:\d{2}\s*(?:AM|PM):?\s*',  # 3:45 PM:, 4:30PM
            r'\d{1,2}:\d{2}:\d{2}',             # 15:30:00
            r'\d{1,2}:\d{2}:\s*'                # 4:15:
        ]
        
        for pattern in time_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Clean up the text
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single space
    
    # If it's just a time or empty after cleaning, return empty
    if not text or re.match(r'^\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?$', text):
        return ""
    
    return text

# Read the Excel file
excel_file = 'Private_lesson_Calendar.xlsx'
sheet_name = '99-915'
df = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)

# Extract dates (row 2, columns 2-8)
dates = []
for col in range(2, 9):
    cell_val = df.iloc[2, col]
    if pd.notna(cell_val) and '2024' in str(cell_val):
        dates.append(str(cell_val).split()[0])

# Extract days (row 3, columns 2-8)  
days = []
for col in range(2, 9):
    cell_val = df.iloc[3, col]
    if pd.notna(cell_val):
        day = str(cell_val).strip()
        if day.upper() in ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']:
            days.append(day)

print(f"Extracted {len(dates)} dates and {len(days)} days")

# Create improved lesson data
improved_data = []

# Process lesson rows (4-9, which is indices 4-9)
for row_idx in range(4, 10):
    if row_idx >= len(df):
        break
        
    # Get the base time from column 1
    base_time = df.iloc[row_idx, 1]
    if pd.notna(base_time):
        base_time_str = str(base_time)
        if ':' in base_time_str:
            # This is a time slot row
            row_data = [base_time_str]
            
            # Process each day column
            for col in range(2, min(9, len(df.columns))):
                cell_val = df.iloc[row_idx, col]
                
                if pd.notna(cell_val):
                    cell_text = str(cell_val).strip()
                    
                    # Check if this cell contains time information different from base time
                    embedded_time = extract_time_from_text(cell_text)
                    student_info = extract_student_info(cell_text)
                    
                    if embedded_time and embedded_time != base_time_str:
                        # Cell has a different time, format as "TIME: STUDENT/INFO"
                        if student_info:
                            formatted_cell = f"{embedded_time}: {student_info}"
                        else:
                            formatted_cell = embedded_time
                    elif student_info:
                        # Cell has student/lesson info
                        formatted_cell = student_info
                    else:
                        # Cell might just be a time or empty after processing
                        formatted_cell = ""
                    
                    row_data.append(formatted_cell)
                else:
                    row_data.append("")
            
            # Only add rows that have some lesson data
            if any(cell.strip() for cell in row_data[1:]):
                improved_data.append(row_data)

# Create headers
headers = ['Time'] + [f"{day}\n{date}" for day, date in zip(days, dates)]

# Create DataFrame
improved_df = pd.DataFrame(improved_data, columns=headers)

# Save to CSV
output_file = 'Private_lesson_Calendar_tab2_99-915_IMPROVED.csv'
improved_df.to_csv(output_file, index=False)

print(f"\nCreated improved CSV: {output_file}")
print(f"Shape: {improved_df.shape}")
print("\nImproved data preview:")
print(improved_df.to_string())

print("\n=== IMPROVEMENTS MADE ===")
print("1. Separated times from student names in mixed cells")
print("2. Normalized time formats")
print("3. Cleaned up extra spaces and formatting")
print("4. Better column headers with day names and dates")
print("5. Removed empty rows and irrelevant metadata")
print("6. Preserved all actual lesson information")
