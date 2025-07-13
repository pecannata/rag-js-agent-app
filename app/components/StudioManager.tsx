'use client';

import { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  name: string;
  parentFirstName: string;
  parentLastName: string;
  email: string;
  phone: string;
  birthDate: string;
  age: number;
  auditionStatus: string;
  classes: {
    auditionPrep: boolean;
    techniqueIntensive: boolean;
    balletIntensive: boolean;
    masterIntensive: boolean;
  };
  notes: string;
}

interface ScheduleSlot {
  id: string;
  day: string;
  time: string;
  studentName: string;
  lessonType: string;
  teacher?: string;
  teacherColor?: string;
  studio?: string;
  status?: string;
  notes: string;
}

interface WeekSchedule {
  weekOf: string;
  lessonId?: string;
  slots: ScheduleSlot[];
  teachers?: Record<string, string>;
  studios?: string[];
  weekInfo?: {
    sheet_name: string;
    week_identifier: string;
  };
}

interface Teacher {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialties: string;
  status: string;
  notes: string;
}

interface StudioManagerProps {
  apiKey: string;
}

export default function StudioManager({ apiKey }: StudioManagerProps) {
  const [activeView, setActiveView] = useState<'students' | 'teachers' | 'staff' | 'schedule' | 'analytics'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekSchedule>({
    weekOf: '2025-06-09', // Default to the available week
    slots: []
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<{ weekStart: string; formattedDate: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // File input ref for Excel upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper function to convert 24-hour time to 12-hour format
  const formatTime = (time24: string) => {
    if (!time24) return time24;
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to convert 12-hour time to 24-hour format
  const formatTime24 = (time12: string) => {
    if (!time12) return time12;
    const [time, period] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
  };

  // Time slots for scheduling
  const timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
    '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Helper function to group weeks by month
  const getWeeksByMonth = () => {
    const weeksByMonth: { [key: string]: { weekStart: string; formattedDate: string }[] } = {};
    
    availableWeeks.forEach(week => {
      const weekDate = new Date(week.weekStart);
      const monthYear = weekDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!weeksByMonth[monthYear]) {
        weeksByMonth[monthYear] = [];
      }
      weeksByMonth[monthYear].push(week);
    });
    
    // Sort months chronologically
    const sortedMonths = Object.keys(weeksByMonth).sort((a, b) => {
      const dateA = new Date(a + ' 1');
      const dateB = new Date(b + ' 1');
      return dateA.getTime() - dateB.getTime();
    });
    
    const result: { [key: string]: { weekStart: string; formattedDate: string }[] } = {};
    sortedMonths.forEach(month => {
      result[month] = weeksByMonth[month].sort((a, b) => 
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );
    });
    
    return result;
  };

  // Helper function to get the month of the current selected week
  const getCurrentWeekMonth = () => {
    if (!currentWeek.weekOf) return '';
    const weekDate = new Date(currentWeek.weekOf);
    return weekDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Get filtered weeks for the selected month
  const getWeeksForSelectedMonth = () => {
    if (!selectedMonth) return [];
    const weeksByMonth = getWeeksByMonth();
    return weeksByMonth[selectedMonth] || [];
  };

  // Update selected month when available weeks change or on initial load
  useEffect(() => {
    if (availableWeeks.length > 0 && currentWeek.weekOf) {
      const currentMonth = getCurrentWeekMonth();
      if (currentMonth && !selectedMonth) {
        setSelectedMonth(currentMonth);
      }
    }
  }, [availableWeeks, currentWeek.weekOf]);

  // Handle month selection change
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    const weeksByMonth = getWeeksByMonth();
    const weeksInMonth = weeksByMonth[month];
    if (weeksInMonth && weeksInMonth.length > 0) {
      // Set to first week in the selected month
      setCurrentWeek(prev => ({ ...prev, weekOf: weeksInMonth[0].weekStart }));
    }
  };

  // Load data from database
  useEffect(() => {
    loadStudents();
    loadSchedule();
    loadTeachers();
    loadAvailableWeeks();
  }, []);

  const loadStudents = async () => {
    try {
      const url = new URL('/api/studio/students', window.location.origin);
      if (searchTerm) {
        url.searchParams.set('search', searchTerm);
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const studentsData = await response.json();
        setStudents(studentsData);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const url = new URL('/api/studio/teachers', window.location.origin);
      const response = await fetch(url.toString());
      if (response.ok) {
        const teachersData = await response.json();
        setTeachers(teachersData);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadSchedule = async () => {
    try {
      const url = new URL('/api/studio/schedule', window.location.origin);
      url.searchParams.set('weekStart', currentWeek.weekOf);
      const response = await fetch(url.toString());
      if (response.ok) {
        const scheduleData = await response.json();
        // Preserve the user's selected week, only update the schedule data
        setCurrentWeek(prev => ({
          ...scheduleData,
          weekOf: prev.weekOf // Keep the user's selected week
        }));
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const loadAvailableWeeks = async () => {
    try {
      const response = await fetch('/api/studio/available-weeks');
      if (response.ok) {
        const weeksData = await response.json();
        setAvailableWeeks(weeksData);
        // Only set the first available week as default during initial load
        // or if the current week is not in the available weeks list
        if (isInitialLoad && weeksData.length > 0) {
          setCurrentWeek(prev => ({ ...prev, weekOf: weeksData[0].weekStart }));
          setIsInitialLoad(false);
        }
      }
    } catch (error) {
      console.error('Error loading available weeks:', error);
    }
  };



  // Reload students when search term changes
  useEffect(() => {
    loadStudents();
  }, [searchTerm]);

  // Reload schedule when week changes
  useEffect(() => {
    loadSchedule();
  }, [currentWeek.weekOf]);

  const handleAddStudent = () => {
    const newStudent: Student = {
      id: Date.now().toString(),
      name: '',
      parentFirstName: '',
      parentLastName: '',
      email: '',
      phone: '',
      birthDate: '',
      age: 0,
      auditionStatus: 'Both',
      classes: {
        auditionPrep: false,
        techniqueIntensive: false,
        balletIntensive: false,
        masterIntensive: false
      },
      notes: ''
    };
    setSelectedStudent(newStudent);
    setIsAddingStudent(true);
  };

  const handleSaveStudent = async (student: Student) => {
    try {
      const method = isAddingStudent ? 'POST' : 'PUT';
      const url = isAddingStudent 
        ? '/api/studio/students' 
        : `/api/studio/students/${student.id}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(student),
      });

      if (response.ok) {
        await loadStudents(); // Reload students from database
        setSelectedStudent(null);
        setIsAddingStudent(false);
      } else {
        console.error('Failed to save student');
      }
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };

  const handleAddTeacher = () => {
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialties: '',
      status: 'Active',
      notes: ''
    };
    setSelectedTeacher(newTeacher);
    setIsAddingTeacher(true);
  };

  const handleSaveTeacher = async (teacher: Teacher) => {
    try {
      const method = isAddingTeacher ? 'POST' : 'PUT';
      const url = isAddingTeacher 
        ? '/api/studio/teachers' 
        : `/api/studio/teachers/${teacher.id}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teacher),
      });

      if (response.ok) {
        await loadTeachers(); // Reload teachers from database
        setSelectedTeacher(null);
        setIsAddingTeacher(false);
      } else {
        console.error('Failed to save teacher');
      }
    } catch (error) {
      console.error('Error saving teacher:', error);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!confirm('Are you sure you want to delete this teacher? This will also remove all their assigned lessons.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/teachers/${teacherId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTeachers(); // Reload teachers from database
        await loadSchedule(); // Reload schedule in case teacher had lessons
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete teacher');
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student? This will also remove all their schedule slots and attendance records.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/students/${studentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadStudents(); // Reload students from database
        await loadSchedule(); // Reload schedule in case student had lessons
      } else {
        console.error('Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleAddScheduleSlot = async (day: string, time: string) => {
    const studentName = prompt('Student name (optional):') || '';
    const lessonType = prompt('Lesson type (Solo/Choreography):') || 'Solo';
    
    try {
      const response = await fetch('/api/studio/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekOf: currentWeek.weekOf,
          day,
          time,
          studentName,
          lessonType,
          notes: ''
        }),
      });

      if (response.ok) {
        await loadSchedule(); // Reload schedule from database
      } else {
        console.error('Failed to add schedule slot');
      }
    } catch (error) {
      console.error('Error adding schedule slot:', error);
    }
  };

  const handleUpdateScheduleSlot = (slotId: string, updates: Partial<ScheduleSlot>) => {
    setCurrentWeek(prev => ({
      ...prev,
      slots: prev.slots.map(slot => slot.id === slotId ? { ...slot, ...updates } : slot)
    }));
  };

  const handleDeleteScheduleSlot = (slotId: string) => {
    setCurrentWeek(prev => ({
      ...prev,
      slots: prev.slots.filter(slot => slot.id !== slotId)
    }));
  };

  const exportToExcel = () => {
    // Simple CSV export functionality
    const csvData = students.map(student => ({
      'Student Name': student.name,
      'Parent First Name': student.parentFirstName,
      'Parent Last Name': student.parentLastName,
      'Contact Email': student.email,
      'Contact Phone': student.phone,
      'Birth Date': student.birthDate,
      'Age': student.age,
      'Audition Status': student.auditionStatus,
      'Audition Prep': student.classes.auditionPrep,
      'Technique Intensive': student.classes.techniqueIntensive,
      'Ballet Intensive': student.classes.balletIntensive,
      'Master Intensive': student.classes.masterIntensive,
      'Notes': student.notes
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'studio-students.csv');
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.parentFirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.parentLastName.toLowerCase().includes(searchTerm.toLowerCase())
  );




  // Excel upload and processing functionality
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    console.log('📁 Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);
    setIsUploading(true);
    setUploadStatus('Reading Excel file...');
    
    try {
      const data = await file.arrayBuffer();
      console.log('📖 File read successfully, size:', data.byteLength);
      await processExcelFile(data, file.name);
    } catch (error) {
      console.error('❌ Error processing Excel file:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processExcelFile = async (data: ArrayBuffer, fileName: string) => {
    setUploadStatus('Parsing Excel sheets...');
    
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetNames = workbook.SheetNames;
    
    setUploadStatus(`Found ${sheetNames.length} sheets. Processing...`);
    
    for (let i = 0; i < sheetNames.length; i++) {
      const sheetName = sheetNames[i];
      setUploadStatus(`Processing sheet ${i + 1}/${sheetNames.length}: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Skip empty sheets
      if (jsonData.length === 0) continue;
      
      // Process the sheet data
      await processSheetData(sheetName, jsonData, fileName);
    }
    
    setUploadStatus('Upload completed! Refreshing data...');
    
    // Refresh all data
    await Promise.all([
      loadStudents(),
      loadTeachers(),
      loadSchedule(),
      loadAvailableWeeks()
    ]);
    
    setUploadStatus('Excel file processed successfully!');
    
    // Clear status after a delay
    setTimeout(() => {
      setUploadStatus('');
    }, 3000);
  };

  const processSheetData = async (sheetName: string, jsonData: any[][], fileName: string) => {
    try {
      console.log(`📊 Processing sheet "${sheetName}" with ${jsonData.length} rows`);
      
      // Create the schedule data structure
      const scheduleData = {
        week_info: {
          sheet_name: sheetName,
          week_identifier: `${new Date().toISOString().split('T')[0]}-${sheetName}`,
          source_file: fileName
        },
        schedule: extractScheduleFromSheet(jsonData)
      };
      
      console.log(`📤 Sending ${scheduleData.schedule.length} schedule slots to server for sheet "${sheetName}"`);
      
      // Send to backend API to process and store
      const response = await fetch('/api/studio/upload-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });
      
      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || `HTTP ${response.status}`;
          console.error(`❌ Server error for sheet "${sheetName}":`, errorData);
        } catch (parseError) {
          console.error(`❌ Could not parse error response for sheet "${sheetName}":`, parseError);
          errorDetails = `HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(`Failed to upload sheet "${sheetName}": ${errorDetails}`);
      }
      
      const result = await response.json();
      console.log(`✅ Successfully uploaded sheet "${sheetName}":`, result);
      
    } catch (error) {
      console.error(`❌ Error processing sheet "${sheetName}":`, error);
      throw error;
    }
  };

  const extractScheduleFromSheet = (jsonData: any[][]) => {
    const schedule: any[] = [];
    
    console.log('🔍 Extracting schedule from sheet with', jsonData.length, 'rows');
    
    // Find the day header row (typically row 3 based on the analysis)
    let dayHeaderRowIndex = -1;
    let studioHeaderRowIndex = -1;
    
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row) {
        // Look for day names in the row
        const hasdays = row.some(cell => 
          cell && typeof cell === 'string' && 
          ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
            .some(day => cell.toString().toUpperCase().includes(day))
        );
        if (hasdays && dayHeaderRowIndex === -1) {
          dayHeaderRowIndex = i;
          console.log('📅 Found day header row at index:', i);
        }
        
        // Look for studio information
        const hasStudios = row.some(cell => 
          cell && typeof cell === 'string' && 
          cell.toString().toUpperCase().includes('STUDIO')
        );
        if (hasStudios && studioHeaderRowIndex === -1) {
          studioHeaderRowIndex = i;
          console.log('🏢 Found studio header row at index:', i);
        }
      }
    }
    
    if (dayHeaderRowIndex === -1) {
      console.warn('⚠️ Could not find day header row in sheet');
      return schedule;
    }
    
    // Build column mapping for days and studios
    const dayRow = jsonData[dayHeaderRowIndex];
    const studioRow = studioHeaderRowIndex !== -1 ? jsonData[studioHeaderRowIndex] : [];
    
    const columnMapping: { day: string; studio: string; colIndex: number }[] = [];
    
    for (let col = 0; col < dayRow.length; col++) {
      const dayCell = dayRow[col];
      const studioCell = studioRow[col];
      
      if (dayCell && typeof dayCell === 'string') {
        const dayName = dayCell.toString().toUpperCase();
        const studioName = studioCell && typeof studioCell === 'string' 
          ? studioCell.toString().trim() 
          : 'Studio A';
        
        if (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].includes(dayName)) {
          columnMapping.push({
            day: dayName.charAt(0) + dayName.slice(1).toLowerCase(),
            studio: studioName,
            colIndex: col
          });
        }
      }
    }
    
    console.log('🗺️ Column mapping:', columnMapping);
    
    // Process data rows starting after headers
    const startRow = Math.max(dayHeaderRowIndex, studioHeaderRowIndex) + 1;
    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[1]) continue; // Time is in column 1 (B)
      
      const timeValue = row[1]; // Time is in column B (index 1)
      if (timeValue === null || timeValue === undefined) continue;
      
      // Convert Excel time decimal to time string
      const timeString = convertExcelTimeToString(timeValue);
      if (!timeString) continue;
      
      console.log(`⏰ Processing time slot: ${timeString} (row ${i})`);
      
      // Check each mapped column for lessons
      columnMapping.forEach(({ day, studio, colIndex }) => {
        const cellValue = row[colIndex];
        if (cellValue && cellValue.toString().trim() !== '') {
          const lessons = parseCellValue(cellValue.toString(), studio);
          
          if (lessons.length > 0) {
            schedule.push({
              time: timeString,
              day: day,
              lessons: lessons
            });
            console.log(`✅ Added ${lessons.length} lessons for ${day} ${timeString}`);
          }
        }
      });
    }
    
    console.log(`📊 Extracted ${schedule.length} total schedule slots`);
    return schedule;
  };

  const parseCellValue = (cellValue: string, studioName?: string): any[] => {
    // Split by common delimiters to handle multiple lessons in one cell
    const parts = cellValue.split(/[\n\r]+/).filter(part => part.trim() !== '');
    const lessons: any[] = [];
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'rehearsal') return;
      
      // Try to extract lesson information
      const lesson = {
        student_info: trimmed,
        teacher: extractTeacher(trimmed),
        lesson_type: extractLessonType(trimmed),
        studio: studioName || extractStudio(trimmed),
        notes: ''
      };
      
      lessons.push(lesson);
    });
    
    return lessons;
  };

  // Convert Excel decimal time to HH:MM:SS format
  const convertExcelTimeToString = (excelTime: any): string | null => {
    // Handle different input types
    let timeDecimal: number;
    
    if (typeof excelTime === 'number') {
      timeDecimal = excelTime;
    } else if (typeof excelTime === 'string') {
      // Try to parse as number first
      const parsed = parseFloat(excelTime);
      if (isNaN(parsed)) {
        // If not a number, might already be a time string
        return formatTimeToHourMinute(excelTime);
      }
      timeDecimal = parsed;
    } else {
      return null;
    }
    
    // Excel stores time as fraction of a day
    // 0.5 = 12:00 PM, 0.25 = 6:00 AM, etc.
    const totalMinutes = Math.round(timeDecimal * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const extractTeacher = (text: string): string => {
    // Look for common teacher name patterns
    const teacherMatch = text.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
    return teacherMatch ? teacherMatch[1] : '';
  };

  const extractLessonType = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('solo')) return 'Solo';
    if (lowerText.includes('choreo')) return 'Choreography';
    if (lowerText.includes('private')) return 'Private';
    if (lowerText.includes('group')) return 'Group';
    return 'Solo'; // Default
  };

  const extractStudio = (text: string): string => {
    const studioMatch = text.match(/studio\s*(\d+|[a-z])/i);
    return studioMatch ? `Studio ${studioMatch[1].toUpperCase()}` : 'Studio A';
  };

  const formatTimeToHourMinute = (timeStr: string): string => {
    // Handle various time formats
    const cleanTime = timeStr.trim();
    
    // If already in HH:MM:SS format, return as is
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(cleanTime)) {
      return cleanTime;
    }
    
    // If in HH:MM format, add :00
    if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
      return `${cleanTime}:00`;
    }
    
    // Try to parse 12-hour format
    const match = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = match[3]?.toUpperCase();
      
      if (ampm === 'PM' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
    }
    
    // Default fallback
    return '09:00:00';
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Studio Manager</h2>
          <p className="text-sm text-gray-600">Manage students & schedules</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveView('students')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'students'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">👥</span>
            Students
          </button>
          
          <button
            onClick={() => setActiveView('teachers')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'teachers'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">👨‍🏫</span>
            Teachers
          </button>
          
          <button
            onClick={() => setActiveView('staff')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'staff'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">👔</span>
            Staff
          </button>
          
          <button
            onClick={() => setActiveView('schedule')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'schedule'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">📅</span>
            Schedule
          </button>
          
          <button
            onClick={() => setActiveView('analytics')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'analytics'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">📊</span>
            Analytics
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* File upload input (hidden) */}
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          
          {/* Upload Excel button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              <>📤 Upload Excel</>
            )}
          </button>
          
          {/* Upload status */}
          {uploadStatus && (
            <div className="text-xs text-center p-2 bg-blue-50 text-blue-700 rounded">
              {uploadStatus}
            </div>
          )}
          
          {/* Export CSV button */}
          <button
            onClick={exportToExcel}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            📁 Export to CSV
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {activeView === 'students' && 'Student Management'}
              {activeView === 'teachers' && 'Teacher Management'}
              {activeView === 'staff' && 'Staff Management'}
              {activeView === 'schedule' && 'Weekly Schedule'}
              {activeView === 'analytics' && 'Studio Analytics'}
            </h1>
            
            {activeView === 'students' && (
              <button
                onClick={handleAddStudent}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Student
              </button>
            )}
            
            {activeView === 'teachers' && (
              <button
                onClick={handleAddTeacher}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Add Teacher
              </button>
            )}
            
            {activeView === 'staff' && (
              <button
                onClick={() => alert('Add Staff functionality coming soon!')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Add Staff
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Students View */}
          {activeView === 'students' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute right-3 top-2.5 text-gray-400">
                  🔍
                </div>
              </div>
              
              {/* Student List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Parent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Classes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.auditionStatus}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {student.parentFirstName} {student.parentLastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.email}</div>
                            <div className="text-sm text-gray-500">{student.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.age}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {student.classes.auditionPrep && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Audition Prep
                                </span>
                              )}
                              {student.classes.techniqueIntensive && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Technique
                                </span>
                              )}
                              {student.classes.balletIntensive && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Ballet
                                </span>
                              )}
                              {student.classes.masterIntensive && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Master
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Teachers View */}
          {activeView === 'teachers' && (
            <div className="space-y-6">
              {/* Teacher List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teacher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Specialties
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{teacher.name}</div>
                            <div className="text-sm text-gray-500">{teacher.firstName} {teacher.lastName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{teacher.email}</div>
                            <div className="text-sm text-gray-500">{teacher.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{teacher.specialties}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              teacher.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {teacher.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedTeacher(teacher)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(teacher.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Empty State */}
              {teachers.length === 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👨‍🏫</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No Teachers Yet</h3>
                    <p className="text-gray-600 mb-6">Start by adding your first teacher to manage your studio staff</p>
                    <button
                      onClick={handleAddTeacher}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Add Your First Teacher
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Staff View */}
          {activeView === 'staff' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👔</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Staff Management</h3>
                  <p className="text-gray-600 mb-6">Manage your studio administrative staff</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>• Track staff roles and responsibilities</p>
                    <p>• Manage work schedules and shifts</p>
                    <p>• Monitor attendance and performance</p>
                    <p>• Handle payroll and benefits</p>
                  </div>
                  <div className="mt-6">
                    <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                      Coming Soon - Staff Features
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule View */}
          {activeView === 'schedule' && (
            <div className="space-y-6">
              {/* Month and Week Selector */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Month Selector */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="month-selector" className="text-sm font-medium text-gray-700">
                        Month:
                      </label>
                      <select
                        id="month-selector"
                        value={selectedMonth}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px]"
                      >
                        <option value="">Select Month</option>
                        {Object.keys(getWeeksByMonth()).map(month => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Week Selector */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="week-selector" className="text-sm font-medium text-gray-700">
                        Week:
                      </label>
                      <select
                        id="week-selector"
                        value={currentWeek.weekOf}
                        onChange={(e) => setCurrentWeek(prev => ({ ...prev, weekOf: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
                        disabled={!selectedMonth}
                      >
                        <option value="">Select Week</option>
                        {getWeeksForSelectedMonth().map(week => (
                          <option key={week.weekStart} value={week.weekStart}>
                            Week of {week.formattedDate}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    {currentWeek.weekInfo && (
                      <div className="text-right">
                        <h3 className="text-lg font-medium text-gray-900">
                          {currentWeek.weekInfo.sheet_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {currentWeek.slots.length} lessons scheduled
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Schedule Grid */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        {days.map(day => (
                          <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {timeSlots.map(time => (
                        <tr key={time}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {time}
                          </td>
                          {days.map(day => {
                            // Convert time to 24-hour format for comparison
                            const time24 = formatTime24(time);
                            const slot = currentWeek.slots.find(s => {
                              const dayMatch = s.day.toUpperCase() === day.toUpperCase();
                              const timeMatch = s.time === time24 || formatTime(s.time) === time;
                              return dayMatch && timeMatch;
                            });
                            
                            return (
                              <td key={`${day}-${time}`} className="px-6 py-4 whitespace-nowrap">
                                {slot ? (
                                  <div 
                                    className="border rounded-lg p-2 text-white" 
                                    style={{
                                      backgroundColor: slot.teacherColor ? `#${slot.teacherColor}` : '#3B82F6',
                                      borderColor: slot.teacherColor ? `#${slot.teacherColor}` : '#2563EB'
                                    }}
                                  >
                                    <div className="text-sm font-medium">{slot.studentName}</div>
                                    <div className="text-xs opacity-90">{slot.teacher}</div>
                                    <div className="text-xs opacity-75">{slot.studio}</div>
                                    <div className="text-xs opacity-75">{slot.lessonType}</div>
                                    <div className="flex gap-1 mt-1">
                                      <button
                                        onClick={() => alert(`Student: ${slot.studentName}\nTeacher: ${slot.teacher}\nStudio: ${slot.studio}\nType: ${slot.lessonType}\nStatus: ${slot.status}`)}
                                        className="text-xs text-white hover:opacity-80"
                                      >
                                        Details
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleAddScheduleSlot(day, time)}
                                    className="w-full h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-500 hover:text-blue-600"
                                  >
                                    + Add Lesson
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-600 mb-6">Studio analytics and reporting features</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>• Student enrollment trends</p>
                    <p>• Class attendance analytics</p>
                    <p>• Revenue and billing reports</p>
                    <p>• Teacher performance metrics</p>
                  </div>
                  <div className="mt-6">
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Coming Soon - Analytics Features
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isAddingStudent ? 'Add Student' : 'Edit Student'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setIsAddingStudent(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={selectedStudent.name}
                    onChange={(e) => setSelectedStudent(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent First Name
                    </label>
                    <input
                      type="text"
                      value={selectedStudent.parentFirstName}
                      onChange={(e) => setSelectedStudent(prev => prev ? { ...prev, parentFirstName: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Last Name
                    </label>
                    <input
                      type="text"
                      value={selectedStudent.parentLastName}
                      onChange={(e) => setSelectedStudent(prev => prev ? { ...prev, parentLastName: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={selectedStudent.email}
                    onChange={(e) => setSelectedStudent(prev => prev ? { ...prev, email: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={selectedStudent.phone}
                      onChange={(e) => setSelectedStudent(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={selectedStudent.birthDate}
                      onChange={(e) => {
                        const birthDate = e.target.value;
                        const age = Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                        setSelectedStudent(prev => prev ? { ...prev, birthDate, age } : null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classes
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedStudent.classes).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setSelectedStudent(prev => prev ? {
                            ...prev,
                            classes: { ...prev.classes, [key]: e.target.checked }
                          } : null)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={selectedStudent.notes}
                    onChange={(e) => setSelectedStudent(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setIsAddingStudent(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveStudent(selectedStudent)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isAddingTeacher ? 'Add Teacher' : 'Edit Teacher'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedTeacher(null);
                    setIsAddingTeacher(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={selectedTeacher.name}
                    onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="How the teacher should be displayed"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={selectedTeacher.firstName}
                      onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={selectedTeacher.lastName}
                      onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={selectedTeacher.email}
                    onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, email: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={selectedTeacher.phone}
                      onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={selectedTeacher.status}
                      onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, status: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialties
                  </label>
                  <input
                    type="text"
                    value={selectedTeacher.specialties}
                    onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, specialties: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Ballet, Jazz, Contemporary, Hip Hop"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={selectedTeacher.notes}
                    onChange={(e) => setSelectedTeacher(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes about the teacher..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedTeacher(null);
                    setIsAddingTeacher(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveTeacher(selectedTeacher)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
