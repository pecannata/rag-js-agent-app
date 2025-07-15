// Excel import utilities for Studio Manager
import * as XLSX from 'xlsx';

export interface ExcelStudent {
  'Student Name': string;
  'Parent First Name': string;
  'Parent Last Name': string;
  'Contact Email': string;
  'Contact Phone': string;
  'Student Date of Birth': string;
  'Student Age': number;
  '2025-2024 Auditions': string;
  'Audition Prep Class': boolean;
  'Technique Intensive': boolean;
  'Ballet Intensive': boolean;
  'Master Intensive': boolean;
  'Notes': string;
}

export interface ExcelScheduleSlot {
  day: string;
  time: string;
  studentName: string;
  lessonType: string;
  notes: string;
}

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('No sheets found in the Excel file');
        }
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error('Could not access the worksheet');
        }
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const convertExcelStudentsToAppFormat = (excelData: any[]): any[] => {
  return excelData.map((row, index) => {
    const birthDate = row['Student Date of Birth'] || row['Student Date of Birth '] || '';
    const age = row['Student Age'] || row['Student Age '] || calculateAge(birthDate);
    
    return {
      id: (Date.now() + index).toString(),
      name: row['Student Name'] || '',
      parentFirstName: row['Parent First Name'] || '',
      parentLastName: row['Parent Last Name'] || '',
      email: row['Contact Email'] || '',
      phone: row['Contact Phone'] || row['Contact Phone '] || '',
      birthDate: formatDate(birthDate),
      age: age,
      auditionStatus: row['2025-2024 Auditions'] || 'Both',
      classes: {
        auditionPrep: Boolean(row['Audition Prep Class']),
        techniqueIntensive: Boolean(row['Technique Intensive'] || row['Technique Intensive ']),
        balletIntensive: Boolean(row['Ballet Intensive'] || row['Ballet Intensive ']),
        masterIntensive: Boolean(row['Master Intensive'] || row['Master Intensive '])
      },
      notes: row['Notes'] || row['Notes '] || ''
    };
  });
};

export const parseScheduleSheet = (worksheet: any): ExcelScheduleSlot[] => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
  const slots: ExcelScheduleSlot[] = [];
  
  // Look for time slots in the first column and days in the header row
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v && typeof cell.v === 'string') {
        const value = cell.v.trim();
        
        // Check if this looks like a student lesson entry
        if (value.includes('solo') || value.includes('choreo') || value.includes('lesson')) {
          // Extract student name and lesson type
          const parts = value.split(/[:;]/);
          if (parts.length >= 2) {
            const time = parts[0].trim();
            const studentInfo = parts[1].trim();
            
            // Try to determine the day from column position
            const dayIndex = Math.min(col - 2, days.length - 1); // Assuming first 2 columns are time-related
            const day = days[Math.max(0, dayIndex)] || 'Monday';
            
            slots.push({
              day: day,
              time: time,
              studentName: studentInfo.split(' ')[0] || '', // First word as student name
              lessonType: studentInfo.toLowerCase().includes('solo') ? 'Solo' : 'Choreography',
              notes: studentInfo
            });
          }
        }
      }
    }
  }
  
  return slots;
};

export const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

export const formatDate = (dateValue: any): string => {
  if (!dateValue) return '';
  
  // Handle Excel date serial numbers
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    const datePart = date.toISOString().split('T')[0];
    return datePart || '';
  }
  
  // Handle string dates
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      const datePart = date.toISOString().split('T')[0];
      return datePart || '';
    }
  }
  
  // Handle Date objects
  if (dateValue instanceof Date) {
    const datePart = dateValue.toISOString().split('T')[0];
    return datePart || '';
  }
  
  return '';
};

export const exportToExcel = (students: any[], scheduleSlots: any[] = []): void => {
  const wb = XLSX.utils.book_new();
  
  // Students sheet
  const studentsData = students.map(student => ({
    'Student Name': student.name,
    'Parent First Name': student.parentFirstName,
    'Parent Last Name': student.parentLastName,
    'Contact Email': student.email,
    'Contact Phone': student.phone,
    'Student Date of Birth': student.birthDate,
    'Student Age': student.age,
    '2025-2024 Auditions': student.auditionStatus,
    'Audition Prep Class': student.classes.auditionPrep,
    'Technique Intensive': student.classes.techniqueIntensive,
    'Ballet Intensive': student.classes.balletIntensive,
    'Master Intensive': student.classes.masterIntensive,
    'Notes': student.notes
  }));
  
  const studentsWs = XLSX.utils.json_to_sheet(studentsData);
  XLSX.utils.book_append_sheet(wb, studentsWs, 'Students');
  
  // Schedule sheet (if provided)
  if (scheduleSlots.length > 0) {
    const scheduleData = scheduleSlots.map(slot => ({
      'Day': slot.day,
      'Time': slot.time,
      'Student Name': slot.studentName,
      'Lesson Type': slot.lessonType,
      'Notes': slot.notes
    }));
    
    const scheduleWs = XLSX.utils.json_to_sheet(scheduleData);
    XLSX.utils.book_append_sheet(wb, scheduleWs, 'Schedule');
  }
  
  // Save file
  const datePart = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `studio-data-${datePart || 'unknown'}.xlsx`);
};
