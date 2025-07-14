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
  color?: string; // Excel cell color
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
  const [activeView, setActiveView] = useState<'students' | 'teachers' | 'staff' | 'private-lessons' | 'invoicing' | 'analytics'>('students');
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
  const [selectedRole, setSelectedRole] = useState('student');
  const [isPrivateLessonsSaving, setIsPrivateLessonsSaving] = useState(false);
  const [privateLessonsSaveStatus, setPrivateLessonsSaveStatus] = useState<string>('');  
  const [invoicingStatus, setInvoicingStatus] = useState<string>('');  
  const [isProcessingInvoices, setIsProcessingInvoices] = useState(false);  
  const [invoiceResults, setInvoiceResults] = useState<any[]>([]);
  const [isResetMode, setIsResetMode] = useState(false);
  
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
        // Preserve the user's selected week and any local slots that haven't been saved
        setCurrentWeek(prev => {
          // Merge server slots with local slots, prioritizing local changes
          const serverSlots = scheduleData.slots || [];
          const localSlots = prev.slots || [];
          
          // Create a map of server slots by their ID
          const serverSlotMap = new Map(serverSlots.map(slot => [slot.id, slot]));
          
          // Keep all local slots and add server slots that don't exist locally
          const mergedSlots = [...localSlots];
          serverSlots.forEach(serverSlot => {
            const localSlotExists = localSlots.some(localSlot => localSlot.id === serverSlot.id);
            if (!localSlotExists) {
              mergedSlots.push(serverSlot);
            }
          });
          
          return {
            ...scheduleData,
            weekOf: prev.weekOf, // Keep the user's selected week
            slots: mergedSlots // Preserve local slots
          };
        });
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

  // Utility function to truncate JSON for logging
  const truncateJSON = (obj: any, maxLength: number = 1000): string => {
    const jsonStr = JSON.stringify(obj, null, 2);
    if (jsonStr.length <= maxLength) {
      return jsonStr;
    }
    return jsonStr.substring(0, maxLength) + '...[TRUNCATED]';
  };

  // Save private lessons data to database in Excel format
  const handleSavePrivateLessons = async () => {
    if (!currentWeek.weekOf) {
      setPrivateLessonsSaveStatus('Please select a week first.');
      return;
    }

    setIsPrivateLessonsSaving(true);
    setPrivateLessonsSaveStatus('Saving private lessons schedule...');

    try {
      // Convert current schedule to Excel-compatible format
      const scheduleData = {
        week_start: currentWeek.weekOf,
        schedule_data: {
          slots: currentWeek.slots,
          teachers: currentWeek.teachers || {},
          studios: currentWeek.studios || ['Studio 1', 'Studio 2', 'Studio 3'],
          weekInfo: currentWeek.weekInfo || {
            sheet_name: `Week of ${currentWeek.weekOf}`,
            week_identifier: `manual-${currentWeek.weekOf}`
          }
        }
      };

      console.log('💾 Saving private lessons data:', truncateJSON(scheduleData));

      const response = await fetch('/api/studio/save-schedule', {
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
          console.error('❌ Server error saving private lessons:', errorData);
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorDetails = `HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(`Failed to save private lessons: ${errorDetails}`);
      }

      const result = await response.json();
      console.log('✅ Successfully saved private lessons:', truncateJSON(result));
      
      setPrivateLessonsSaveStatus('Private lessons saved successfully!');
      
      // Refresh the schedule data
      await loadSchedule();
      
    } catch (error) {
      console.error('❌ Error saving private lessons:', error);
      setPrivateLessonsSaveStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPrivateLessonsSaving(false);
      
      // Clear status after a delay
      setTimeout(() => {
        setPrivateLessonsSaveStatus('');
      }, 3000);
    }
  };

  // Legacy function - replaced by handleCellClick
  const handleAddScheduleSlot = async (day: string, time: string, studio?: string) => {
    // This function is no longer used - all cell interactions go through handleCellClick
    console.log('Legacy handleAddScheduleSlot called - use handleCellClick instead');
  };

  // Helper function to get fallback color for slots without Excel colors
  const getFallbackColor = (teacherName: string): string => {
    if (!teacherName || teacherName.trim() === '') {
      return '#6B7280'; // Light gray for empty/null teacher
    }
    
    // Check for blocked slots (common blocked slot indicators)
    const blockedIndicators = ['blocked', 'block', 'unavailable', 'closed', 'x', 'xxx'];
    if (blockedIndicators.some(indicator => teacherName.toLowerCase().includes(indicator))) {
      return '#374151'; // Dark gray for blocked slots
    }
    
    // Return a neutral color for slots without Excel colors
    return '#9CA3AF'; // Default gray color
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

  // Handle cell click based on selected role
  const handleCellClick = (day: string, time: string, studio: string) => {
    // If reset mode is active, clear the cell completely
    if (isResetMode) {
      const time24 = formatTime24(time);
      
      // Remove ALL slots that match this day/time/studio combination
      setCurrentWeek(prev => ({
        ...prev,
        slots: prev.slots.filter(slot => {
          const dayMatch = slot.day.toUpperCase() === day.toUpperCase();
          const timeMatch = slot.time === time24;
          const studioMatch = slot.studio === studio;
          // Keep slots that DON'T match (remove all that do match)
          return !(dayMatch && timeMatch && studioMatch);
        })
      }));
      
      // Optionally turn off reset mode after clearing a cell
      // setIsResetMode(false);
      
      return;
    }
    
    if (selectedRole === 'student') {
      // For students, show a popup to input student name and lesson type
      const studentName = prompt('Enter your name:');
      if (!studentName) return; // User cancelled
      
      const lessonType = prompt('Enter lesson type (Solo/Choreography/Private/Group):') || 'Solo';
      
      // Create or update the schedule slot in memory
      const time24 = formatTime24(time);
      const slotId = `${day}-${time24}-${studio}`;
      
      // Check if slot already exists
      const existingSlotIndex = currentWeek.slots.findIndex(s => {
        const dayMatch = s.day.toUpperCase() === day.toUpperCase();
        const timeMatch = s.time === time24;
        const studioMatch = s.studio === studio;
        return dayMatch && timeMatch && studioMatch;
      });
      
      const newSlot: ScheduleSlot = {
        id: slotId,
        day: day,
        time: time24,
        studentName: studentName,
        lessonType: lessonType,
        studio: studio,
        notes: '',
        teacher: '', // Will be determined by teacher click later
        color: '#6B7280' // Default gray color
      };
      
      setCurrentWeek(prev => {
        if (existingSlotIndex >= 0) {
          // Update existing slot - preserve existing color and teacher if they exist
          const updatedSlots = [...prev.slots];
          const existingSlot = updatedSlots[existingSlotIndex];
          updatedSlots[existingSlotIndex] = { 
            ...existingSlot, 
            studentName, 
            lessonType,
            // Keep existing teacher and color if they exist
            teacher: existingSlot.teacher || '',
            color: existingSlot.color || 'transparent' // Default white/transparent for student-only slots
          };
          return { ...prev, slots: updatedSlots };
        } else {
          // Add new slot with neutral student color
          const studentSlot = { ...newSlot, color: 'transparent' }; // Default white/transparent for student-only slots
          return { ...prev, slots: [...prev.slots, studentSlot] };
        }
      });
    } else {
      // For teachers, color the cell with the teacher's color from legend
      const teacherName = teachers.find(t => t.name.toLowerCase() === selectedRole)?.name;
      if (!teacherName) return;
      
      // Find teacher color from legend
      const teacherColor = currentWeek.teachers?.[teacherName] || 
                          Object.entries(currentWeek.teachers || {}).find(([name]) => 
                            name.toLowerCase() === teacherName.toLowerCase()
                          )?.[1] || '#9CA3AF'; // Default color if not found
      
      const time24 = formatTime24(time);
      const slotId = `${day}-${time24}-${studio}`;
      
      // Check if slot already exists
      const existingSlotIndex = currentWeek.slots.findIndex(s => {
        const dayMatch = s.day.toUpperCase() === day.toUpperCase();
        const timeMatch = s.time === time24;
        const studioMatch = s.studio === studio;
        return dayMatch && timeMatch && studioMatch;
      });
      
      setCurrentWeek(prev => {
        if (existingSlotIndex >= 0) {
          // Update existing slot with teacher info
          const updatedSlots = [...prev.slots];
          updatedSlots[existingSlotIndex] = { 
            ...updatedSlots[existingSlotIndex], 
            teacher: teacherName,
            color: teacherColor
          };
          return { ...prev, slots: updatedSlots };
        } else {
          // Create new slot with teacher color (no student info yet)
          const newSlot: ScheduleSlot = {
            id: slotId,
            day: day,
            time: time24,
            studentName: '', // Empty until student fills it
            lessonType: '', // No default lesson type
            studio: studio,
            notes: '',
            teacher: teacherName,
            color: teacherColor
          };
          return { ...prev, slots: [...prev.slots, newSlot] };
        }
      });
    }
  };

  // Handle invoice processing
  const handleProcessInvoices = async () => {
    if (!currentWeek.weekOf) {
      setInvoicingStatus('Please select a week first.');
      return;
    }

    setIsProcessingInvoices(true);
    setInvoicingStatus('Processing invoices...');
    setInvoiceResults([]);

    try {
      const response = await fetch('/api/studio/invoicing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStartDate: currentWeek.weekOf
        }),
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || `HTTP ${response.status}`;
        } catch (parseError) {
          errorDetails = `HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(`Failed to process invoices: ${errorDetails}`);
      }

      const result = await response.json();
      setInvoiceResults(result.invoices || []);
      setInvoicingStatus(`Successfully processed ${result.processedInvoices} invoices!`);
      
    } catch (error) {
      console.error('Error processing invoices:', error);
      setInvoicingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingInvoices(false);
      
      // Clear status after a delay
      setTimeout(() => {
        setInvoicingStatus('');
      }, 5000);
    }
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
    
    const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
    const sheetNames = workbook.SheetNames;
    
    setUploadStatus(`Found ${sheetNames.length} sheets. Processing...`);
    
    for (let i = 0; i < sheetNames.length; i++) {
      const sheetName = sheetNames[i];
      setUploadStatus(`Processing sheet ${i + 1}/${sheetNames.length}: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Skip empty sheets
      if (jsonData.length === 0) continue;
      
      // Process the sheet data with color information
      await processSheetData(sheetName, jsonData, fileName, worksheet);
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

  const processSheetData = async (sheetName: string, jsonData: any[][], fileName: string, worksheet: any) => {
    try {
      console.log(`📊 Processing sheet "${sheetName}" with ${jsonData.length} rows`);
      
      // Create the schedule data structure with color information
      const extractedData = extractScheduleFromSheet(jsonData, worksheet);
      const scheduleData = {
        week_info: {
          sheet_name: sheetName,
          week_identifier: `${new Date().toISOString().split('T')[0]}-${sheetName}`,
          source_file: fileName
        },
        schedule: extractedData.schedule,
        teacher_colors: extractedData.teacherColorMap
      };
      
      console.log(`📤 Sending ${scheduleData.schedule.length} schedule slots to server for sheet "${sheetName}"`);
      console.log(`🎨 Teacher color mappings to send:`, extractedData.teacherColorMap);
      
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
  const extractTeacherColorMapping = (jsonData: any[][], worksheet: any, teacherColorMap: { [key: string]: string }) => {
    console.log('🔍 Extracting teacher-color mappings from notes...');
    
    // Strategy 1: Look for legend area (typically bottom-right section)
    console.log('🔍 Looking for legend area in bottom-right section...');
    const legendArea = findLegendArea(jsonData, worksheet);
    if (legendArea) {
      extractFromLegendArea(jsonData, worksheet, teacherColorMap, legendArea);
    }
    
    // Strategy 2: Access the notes/comments from the worksheet object
    const notes = worksheet['!comments'] || [];
    
    notes.forEach(comment => {
      const text = comment.t;
      if (text && typeof text === 'string') {
        // Extract teacher-color pairs from the comment text
        const pattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:-]\s*#([0-9A-Fa-f]{6})/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const teacherName = match[1].trim();
          const colorCode = `#${match[2].trim()}`;
          teacherColorMap[teacherName] = colorCode;
          console.log(`🎨 Mapped from notes: ${teacherName} -> ${colorCode}`);
        }
      }
    });
    
    // Strategy 3: Look for cells with colors that contain teacher names
    for (let row = 0; row < jsonData.length; row++) {
      const rowData = jsonData[row];
      if (!rowData) continue;
      
      for (let col = 0; col < rowData.length; col++) {
        const cellValue = rowData[col];
        if (!cellValue || typeof cellValue !== 'string') continue;
        
        // Get cell color
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cellStyle = worksheet[cellAddress]?.s;
        let cellColor = null;
        
        if (cellStyle) {
          console.log(`🔍 Cell ${cellAddress} style:`, cellStyle);
          if (cellStyle.fgColor?.rgb) {
            cellColor = `#${cellStyle.fgColor.rgb}`;
            console.log(`🎨 Found foreground color: ${cellColor}`);
          } else if (cellStyle.bgColor?.rgb) {
            cellColor = `#${cellStyle.bgColor.rgb}`;
            console.log(`🎨 Found background color: ${cellColor}`);
          } else {
            console.log(`❌ No RGB color found in style for ${cellAddress}`);
          }
        } else {
          console.log(`❌ No style found for cell ${cellAddress}`);
        }
        
        // If cell has color and looks like a teacher name
        if (cellColor && isLikelyTeacherName(cellValue)) {
          const teacherName = cellValue.trim();
          if (teacherName && !teacherColorMap[teacherName]) {
            teacherColorMap[teacherName] = cellColor;
            console.log(`🎨 Found teacher-color mapping from colored cell: ${teacherName} -> ${cellColor}`);
          }
        }
      }
    }
    
    // Strategy 4: Look for patterns like "Teacher Name: #HEXCODE" or "Teacher Name = Color"
    for (let row = 0; row < jsonData.length; row++) {
      const rowData = jsonData[row];
      if (!rowData) continue;
      
      for (let col = 0; col < rowData.length; col++) {
        const cellValue = rowData[col];
        if (!cellValue || typeof cellValue !== 'string') continue;
        
        // Look for patterns with color codes
        const colorPatterns = [
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:-]\s*#([0-9A-Fa-f]{6})/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*=\s*([a-zA-Z]+)/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\(([^)]+)\)/i
        ];
        
        for (const pattern of colorPatterns) {
          const match = cellValue.match(pattern);
          if (match) {
            const teacherName = match[1].trim();
            const colorInfo = match[2].trim();
            
            let finalColor = null;
            if (colorInfo.startsWith('#')) {
              finalColor = colorInfo;
            } else {
              // Try to convert color name to hex
              finalColor = convertColorNameToHex(colorInfo);
            }
            
            if (finalColor && teacherName && !teacherColorMap[teacherName]) {
              teacherColorMap[teacherName] = finalColor;
              console.log(`🎨 Found teacher-color mapping from pattern: ${teacherName} -> ${finalColor}`);
            }
          }
        }
      }
    }
    
    console.log('📊 Teacher color mappings found:', teacherColorMap);
  };
  
  const findLegendArea = (jsonData: any[][], worksheet: any) => {
    console.log('🔍 Searching for legend area...');
    
    // Look for common legend indicators in the bottom portion of the sheet
    const startRow = Math.max(0, jsonData.length - 20); // Start from bottom 20 rows
    const endRow = jsonData.length;
    
    for (let row = startRow; row < endRow; row++) {
      const rowData = jsonData[row];
      if (!rowData) continue;
      
      for (let col = 0; col < rowData.length; col++) {
        const cellValue = rowData[col];
        if (cellValue && typeof cellValue === 'string') {
          const cellText = cellValue.toString().toUpperCase();
          
          // Look for legend indicators
          if (cellText.includes('MEGHAN') || cellText.includes('RYANN') || 
              cellText.includes('PAIGE') || cellText.includes('GRACIE') ||
              cellText.includes('CARALIN') || cellText.includes('HUNTER') ||
              cellText.includes('EMERY')) {
            console.log(`🎯 Found potential legend area at row ${row}, col ${col}:`, cellValue);
            return {
              startRow: Math.max(0, row - 2),
              endRow: Math.min(jsonData.length, row + 10),
              startCol: Math.max(0, col - 2),
              endCol: Math.min(rowData.length, col + 5)
            };
          }
        }
      }
    }
    
    // If no specific legend found, search the entire right portion
    console.log('🔍 No specific legend found, searching right portion of sheet...');
    return {
      startRow: Math.max(0, jsonData.length - 30),
      endRow: jsonData.length,
      startCol: Math.max(0, (jsonData[0]?.length || 0) - 10),
      endCol: jsonData[0]?.length || 0
    };
  };
  
  const extractFromLegendArea = (jsonData: any[][], worksheet: any, teacherColorMap: { [key: string]: string }, legendArea: any) => {
    console.log('🎨 Extracting from legend area:', legendArea);
    
    for (let row = legendArea.startRow; row < legendArea.endRow; row++) {
      const rowData = jsonData[row];
      if (!rowData) continue;
      
      for (let col = legendArea.startCol; col < legendArea.endCol; col++) {
        const cellValue = rowData[col];
        if (!cellValue || typeof cellValue !== 'string') continue;
        
        const cellText = cellValue.toString().trim();
        
        // Check if this looks like a teacher name OR if it contains known instructor names
        const knownInstructors = ['MEGHAN', 'RYANN', 'PAIGE', 'GRACIE', 'CARALIN', 'HUNTER', 'EMERY'];
        const isInstructorName = knownInstructors.some(name => cellText.toUpperCase().includes(name));
        
        if (isLikelyTeacherName(cellText) || isInstructorName) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cellStyle = worksheet[cellAddress]?.s;
          let cellColor = null;
          
          if (cellStyle) {
            console.log(`🔍 Legend cell ${cellAddress} (${cellText}) style:`, cellStyle);
            
            // Try different color properties
            if (cellStyle.fgColor?.rgb) {
              cellColor = `#${cellStyle.fgColor.rgb}`;
              console.log(`🎨 Found foreground color in legend: ${cellText} -> ${cellColor}`);
            } else if (cellStyle.bgColor?.rgb) {
              cellColor = `#${cellStyle.bgColor.rgb}`;
              console.log(`🎨 Found background color in legend: ${cellText} -> ${cellColor}`);
            } else if (cellStyle.fgColor?.indexed !== undefined) {
              // Handle indexed colors - convert to RGB if possible
              const indexedColor = convertIndexedColorToRgb(cellStyle.fgColor.indexed);
              if (indexedColor) {
                cellColor = indexedColor;
                console.log(`🎨 Found indexed foreground color in legend: ${cellText} -> ${cellColor}`);
              }
            } else if (cellStyle.bgColor?.indexed !== undefined) {
              // Handle indexed colors - convert to RGB if possible
              const indexedColor = convertIndexedColorToRgb(cellStyle.bgColor.indexed);
              if (indexedColor) {
                cellColor = indexedColor;
                console.log(`🎨 Found indexed background color in legend: ${cellText} -> ${cellColor}`);
              }
            } else {
              console.log(`❌ No color found in legend cell ${cellAddress} for ${cellText}`);
            }
          } else {
            console.log(`❌ No style found for legend cell ${cellAddress} (${cellText})`);
          }
          
          // Store the mapping if we found a color
          if (cellColor && !teacherColorMap[cellText]) {
            teacherColorMap[cellText] = cellColor;
            console.log(`✅ Added teacher-color mapping from legend: ${cellText} -> ${cellColor}`);
          }
        }
      }
    }
  };
  
  const convertIndexedColorToRgb = (colorIndex: number): string | null => {
    // Basic Excel color palette mapping (simplified)
    const colorPalette: { [key: number]: string } = {
      0: '#000000', // Black
      1: '#FFFFFF', // White
      2: '#FF0000', // Red
      3: '#00FF00', // Green
      4: '#0000FF', // Blue
      5: '#FFFF00', // Yellow
      6: '#FF00FF', // Magenta
      7: '#00FFFF', // Cyan
      8: '#800000', // Dark Red
      9: '#008000', // Dark Green
      10: '#000080', // Dark Blue
      11: '#808000', // Dark Yellow
      12: '#800080', // Dark Magenta
      13: '#008080', // Dark Cyan
      14: '#C0C0C0', // Light Gray
      15: '#808080', // Gray
      16: '#9999FF', // Light Blue
      17: '#993366', // Dark Pink
      18: '#FFFFCC', // Light Yellow
      19: '#CCFFFF', // Light Cyan
      20: '#660066', // Dark Purple
      21: '#FF8080', // Light Red
      22: '#0066CC', // Medium Blue
      23: '#CCCCFF', // Very Light Blue
      // Add more colors as needed
    };
    
    const color = colorPalette[colorIndex];
    if (color) {
      console.log(`🎨 Converted indexed color ${colorIndex} to ${color}`);
      return color;
    }
    
    console.log(`❌ Unknown indexed color: ${colorIndex}`);
    return null;
  };
  
  const extractTeacherNamesFromLegendArea = (jsonData: any[][], worksheet: any, startRow: number, startCol: number, teacherColorMap: { [key: string]: string }) => {
    // Look in a small area around the legend cell for teacher names with colors
    const searchRadius = 10;
    
    for (let row = Math.max(0, startRow - searchRadius); row < Math.min(jsonData.length, startRow + searchRadius); row++) {
      const rowData = jsonData[row];
      if (!rowData) continue;
      
      for (let col = Math.max(0, startCol - searchRadius); col < Math.min(rowData.length, startCol + searchRadius); col++) {
        const cellValue = rowData[col];
        if (!cellValue || typeof cellValue !== 'string') continue;
        
        // Check if this looks like a teacher name
        if (isLikelyTeacherName(cellValue)) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cellStyle = worksheet[cellAddress]?.s;
          let cellColor = null;
          
          if (cellStyle) {
            if (cellStyle.fgColor?.rgb) {
              cellColor = `#${cellStyle.fgColor.rgb}`;
            } else if (cellStyle.bgColor?.rgb) {
              cellColor = `#${cellStyle.bgColor.rgb}`;
            }
          }
          
          if (cellColor) {
            const teacherName = cellValue.trim();
            if (!teacherColorMap[teacherName]) {
              teacherColorMap[teacherName] = cellColor;
              console.log(`🎨 Found teacher-color mapping from legend area: ${teacherName} -> ${cellColor}`);
            }
          }
        }
      }
    }
  };
  
  const isLikelyTeacherName = (text: string): boolean => {
    // Check if text looks like a teacher name
    const trimmed = text.trim();
    
    // Must be 2-50 characters
    if (trimmed.length < 2 || trimmed.length > 50) return false;
    
    // Should contain letters
    if (!/[a-zA-Z]/.test(trimmed)) return false;
    
    // Should not contain numbers or special characters (except spaces, hyphens, apostrophes)
    if (/[0-9!@#$%^&*()+=\[\]{};:"\\|,.<>?]/.test(trimmed)) return false;
    
    // Should not be common non-name words
    const nonNameWords = ['studio', 'time', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'lesson', 'solo', 'group', 'private', 'rehearsal', 'blocked', 'closed', 'available'];
    if (nonNameWords.includes(trimmed.toLowerCase())) return false;
    
    // Should look like a name (Title Case or similar)
    const words = trimmed.split(/\s+/);
    const hasProperCase = words.some(word => /^[A-Z][a-z]/.test(word));
    
    return hasProperCase;
  };
  
  const convertColorNameToHex = (colorName: string): string | null => {
    // Basic color name to hex conversion
    const colorMap: { [key: string]: string } = {
      'red': '#FF0000',
      'green': '#00FF00',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'orange': '#FFA500',
      'purple': '#800080',
      'pink': '#FFC0CB',
      'cyan': '#00FFFF',
      'magenta': '#FF00FF',
      'lime': '#00FF00',
      'navy': '#000080',
      'teal': '#008080',
      'silver': '#C0C0C0',
      'gray': '#808080',
      'grey': '#808080',
      'black': '#000000',
      'white': '#FFFFFF'
    };
    
    return colorMap[colorName.toLowerCase()] || null;
  };

  const extractScheduleFromSheet = (jsonData: any[][], worksheet: any) => {
    const schedule: any[] = [];
    const teacherColorMap: { [key: string]: string } = {};
    
    console.log('🔍 Extracting schedule from sheet with', jsonData.length, 'rows');
    
    // First pass: Look for teacher-color mappings in the sheet
    // This might be in a legend, notes section, or separate area
    extractTeacherColorMapping(jsonData, worksheet, teacherColorMap);
    
    // Find the day header row (typically row 3 based on the analysis)
    let dayHeaderRowIndex = -1;
    let studioHeaderRowIndex = -1;
    
    // Known instructors to filter out from regular schedule
    const knownInstructors = ['MEGHAN', 'RYANN', 'PAIGE', 'GRACIE', 'CARALIN', 'HUNTER', 'EMERY', 'ARDEN'];
    
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
      return {
        schedule,
        teacherColorMap
      };
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
          // Extract cell color information
          const cellAddress = XLSX.utils.encode_cell({ r: i, c: colIndex });
          const cellStyle = worksheet[cellAddress]?.s;
          let cellColor = null;
          
          // Try to extract background color
          if (cellStyle) {
            // Check for background color in various formats
            if (cellStyle.fgColor?.rgb) {
              cellColor = `#${cellStyle.fgColor.rgb}`;
            } else if (cellStyle.bgColor?.rgb) {
              cellColor = `#${cellStyle.bgColor.rgb}`;
            } else if (cellStyle.fgColor?.indexed) {
              // Handle indexed colors - this is a simplified approach
              // You might need to implement a proper color palette lookup
              const colorIndex = cellStyle.fgColor.indexed;
              if (colorIndex !== undefined) {
                console.log(`🎨 Found indexed color: ${colorIndex} for cell ${cellAddress}`);
              }
            }
          }
          
          const lessons = parseCellValue(cellValue.toString(), studio, cellColor);
          
          if (lessons.length > 0) {
            schedule.push({
              time: timeString,
              day: day,
              lessons: lessons
            });
            console.log(`✅ Added ${lessons.length} lessons for ${day} ${timeString}${cellColor ? ` (color: ${cellColor})` : ''}`);
          }
        }
      });
    }
    
    console.log(`📊 Extracted ${schedule.length} total schedule slots`);
    return {
      schedule,
      teacherColorMap
    };
  };

  const parseCellValue = (cellValue: string, studioName?: string, cellColor?: string | null): any[] => {
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
        notes: '',
        color: cellColor || null // Add the extracted color to the lesson
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
    // The teacher info should be extracted from the cell content
    // Common patterns:
    // 1. "StudentName - TeacherName" 
    // 2. "StudentName (TeacherName)"
    // 3. "TeacherName: StudentName"
    // 4. If no pattern found, return empty string (teacher should be determined by color/location)
    
    // Pattern 1: Student - Teacher
    let teacherMatch = text.match(/-.+?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (teacherMatch) {
      return teacherMatch[1].trim();
    }
    
    // Pattern 2: Student (Teacher)
    teacherMatch = text.match(/\(([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\)/i);
    if (teacherMatch) {
      return teacherMatch[1].trim();
    }
    
    // Pattern 3: Teacher: Student
    teacherMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*:/i);
    if (teacherMatch) {
      return teacherMatch[1].trim();
    }
    
    // Pattern 4: Look for "with [Teacher]" or "w/ [Teacher]"
    teacherMatch = text.match(/(?:with|w\/|w\s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (teacherMatch) {
      return teacherMatch[1].trim();
    }
    
    // If no explicit teacher pattern found, return empty string
    // The teacher should be determined by the cell color or studio mapping
    return '';
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
            onClick={() => setActiveView('private-lessons')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'private-lessons'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">📅</span>
            Private lessons
          </button>
          
          <button
            onClick={() => setActiveView('invoicing')}
            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'invoicing'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3">💰</span>
            Invoicing
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
              {activeView === 'private-lessons' && 'Private Lessons'}
              {activeView === 'invoicing' && 'Invoicing'}
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
                          Price
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${teacher.price || [30, 40, 50][Math.floor(Math.random() * 3)]}</td>
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

          {/* Private Lessons View */}
          {activeView === 'private-lessons' && (
            <div className="space-y-6">
              {/* Month and Week Selector */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Dropdown Selector for Role */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="role-selector" className="text-sm font-medium text-gray-700">
                        I am:
                      </label>
                      <select
                        id="role-selector"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px]"
                      >
                        {/* Default 'Student' option */}
                        <option value="student">Student</option>
                        {/* Teacher options, sorted alphabetically */}
                        {teachers.sort((a, b) => a.name.localeCompare(b.name)).map(teacher => (
                          <option key={teacher.id} value={teacher.name.toLowerCase()}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                      
                      {/* Reset Button */}
                      <button
                        type="button"
                        onClick={() => setIsResetMode(prev => !prev)}
                        className={`ml-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm border border-gray-300 ${
                          isResetMode 
                            ? 'bg-red-600 text-white border-red-600' 
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Reset Cell"
                      >
                        Reset
                      </button>
                    </div>

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
                    
                    {/* Save Button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSavePrivateLessons}
                        disabled={isPrivateLessonsSaving || !currentWeek.weekOf}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-green-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isPrivateLessonsSaving ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            💾 Save
                          </>
                        )}
                      </button>
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
              
              {/* Save Status Display */}
              {privateLessonsSaveStatus && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-center p-2 bg-green-50 text-green-700 rounded">
                    {privateLessonsSaveStatus}
                  </div>
                </div>
              )}
              
              {/* Instructor Color Legend */}
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Instructor Colors</h3>
                <div className="flex flex-wrap gap-3">
                  {/* Only show teachers that exist in studio_teachers table AND have colors from JSON */}
                  {currentWeek.teachers && Object.keys(currentWeek.teachers).length > 0 ? (
                    Object.entries(currentWeek.teachers)
                      .filter(([teacherName, color]) => {
                        // Check if this teacher exists in the studio_teachers table with exact or very close matches
                        const cleanTeacherName = teacherName.toLowerCase().trim();
                        return teachers.some(teacher => {
                          const teacherFullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase().trim();
                          const teacherDisplayName = teacher.name.toLowerCase().trim();
                          const teacherFirstName = teacher.firstName.toLowerCase().trim();
                          const teacherLastName = teacher.lastName.toLowerCase().trim();
                          
                          // Exact matches only
                          return cleanTeacherName === teacherFullName ||
                                 cleanTeacherName === teacherDisplayName ||
                                 cleanTeacherName === teacherFirstName ||
                                 cleanTeacherName === teacherLastName;
                        });
                      })
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([teacher, color]) => (
                        <div key={teacher} className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color }}
                            title={`${teacher}: ${color}`}
                          ></div>
                          <span className="text-sm text-gray-700">{teacher}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No instructor colors available. Upload an Excel schedule to see color legend.
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule Grid using Table with Sticky */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-auto max-h-[600px] relative">
                  <table className="border-collapse" style={{ width: `${Math.max(1400, 120 + (days.length * (currentWeek.studios?.length || 3) * 144))}px`, minWidth: `${Math.max(1400, 120 + (days.length * (currentWeek.studios?.length || 3) * 144))}px` }}>
                    <thead>
                      {/* Day Header Row */}
                      <tr className="sticky top-0 z-20 bg-gray-50">
                        <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300 sticky left-0 z-30 bg-gray-50">
                          Time
                        </th>
                        {days.map(day => (
                          <th key={day} colSpan={currentWeek.studios?.length || 3} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300 bg-gray-50">
                            {day}
                          </th>
                        ))}
                      </tr>
                      {/* Studio Sub-Header Row */}
                      <tr className="sticky top-[49px] z-20 bg-gray-50">
                        <th className="w-24 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300 sticky left-0 z-30 bg-gray-50">
                          {/* Empty */}
                        </th>
                        {days.map(day =>
                          (currentWeek.studios || ['Studio 1', 'Studio 2', 'Studio 3']).map(studio => (
                            <th key={`${day}-${studio}`} className="w-36 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300 bg-gray-50">
                              {studio}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {timeSlots.map(time => (
                        <tr key={time}>
                          <td className="w-24 px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300 bg-gray-50 sticky left-0 z-10">
                            {time}
                          </td>
                          {days.map(day =>
                            (currentWeek.studios || ['Studio 1', 'Studio 2', 'Studio 3']).map(studio => {
                              const time24 = formatTime24(time);
                              const slot = currentWeek.slots.find(s => {
                                if (!s || !s.day || !s.time) return false;
                                const dayMatch = s.day.toUpperCase() === day.toUpperCase();
                                const timeMatch = s.time === time24 || formatTime(s.time) === time;
                                const studioMatch = s.studio === studio;
                                return dayMatch && timeMatch && studioMatch;
                              });
                              
                              return (
                                <td key={`${day}-${studio}-${time}`} className="w-36 px-2 py-2 border border-gray-300 relative h-16">
                                  {slot ? (
                                    <div
                                      className="rounded p-1 text-black text-xs h-full flex flex-col justify-center cursor-pointer hover:opacity-90 transition-opacity"
                                      style={{
                                        backgroundColor: slot.color || getFallbackColor(slot.teacher),
                                        borderLeft: `4px solid ${slot.color || getFallbackColor(slot.teacher)}`
                                      }}
                                      onClick={() => handleCellClick(day, time, studio)}
                                    >
                                      <div className="font-medium truncate">{slot.studentName}</div>
                                      <div className="opacity-75 truncate">{slot.lessonType}</div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleCellClick(day, time, studio)}
                                      className="w-full h-full border-2 border-dashed border-gray-300 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs text-gray-500 hover:text-blue-600"
                                    >
                                      +
                                    </button>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Invoicing View */}
          {activeView === 'invoicing' && (
            <div className="space-y-6">
              {/* Week Selector */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Month Selector */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="invoice-month-selector" className="text-sm font-medium text-gray-700">
                        Month:
                      </label>
                      <select
                        id="invoice-month-selector"
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
                      <label htmlFor="invoice-week-selector" className="text-sm font-medium text-gray-700">
                        Week:
                      </label>
                      <select
                        id="invoice-week-selector"
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
                    
                    {/* Process Invoices Button */}
                    <button
                      onClick={handleProcessInvoices}
                      disabled={isProcessingInvoices || !currentWeek.weekOf}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-green-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProcessingInvoices ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          💳 Process Invoices
                        </>
                      )}
                    </button>
                  </div>
                  
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
              
              {/* Status Display */}
              {invoicingStatus && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className={`text-sm text-center p-3 rounded ${
                    invoicingStatus.includes('Error') 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {invoicingStatus}
                  </div>
                </div>
              )}
              
              {/* Invoice Results */}
              {invoiceResults.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Invoice Results</h3>
                    <p className="text-sm text-gray-600">Successfully processed {invoiceResults.length} invoices</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Teacher
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lessons
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Cost
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
                        {invoiceResults.map((invoice, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{invoice.student_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.student_email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.teacher_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.lesson_count}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">${invoice.total_cost}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {invoice.error ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Error
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {invoice.status || 'Created'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {invoice.stripe_invoice_url && (
                                <a
                                  href={invoice.stripe_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  View Invoice
                                </a>
                              )}
                              {invoice.error && (
                                <span className="text-red-600 text-xs">
                                  {invoice.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Info Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">💰</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Stripe Invoicing System</h3>
                  <p className="text-gray-600 mb-6">Automatically generate and send invoices to students</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>• Counts lessons per student per teacher for a given week</p>
                    <p>• Calculates costs using the formula: lessons × 2 × teacher price</p>
                    <p>• Creates Stripe customers and invoices with student emails</p>
                    <p>• Uses teacher-to-color mapping from the JSON schedule data</p>
                  </div>
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
