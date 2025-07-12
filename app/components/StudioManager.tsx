'use client';

import { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';

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
  notes: string;
}

interface WeekSchedule {
  weekOf: string;
  slots: ScheduleSlot[];
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
    weekOf: new Date().toISOString().split('T')[0],
    slots: []
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Time slots for scheduling
  const timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
    '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Load data from database
  useEffect(() => {
    loadStudents();
    loadSchedule();
    loadTeachers();
    loadAnalytics();
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
        setCurrentWeek(scheduleData);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/studio/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        // Store analytics data in state if needed
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    classEnrollment: {
      auditionPrep: 0,
      techniqueIntensive: 0,
      balletIntensive: 0,
      masterIntensive: 0
    },
    ageGroups: {
      minis: 0,
      juniors: 0,
      teens: 0,
      seniors: 0
    },
    totalLessons: 0
  });

  const getAnalytics = async () => {
    try {
      const response = await fetch('/api/studio/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        setAnalytics(analyticsData);
        return analyticsData;
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    return analytics;
  };

  // Update analytics when students or schedule changes
  useEffect(() => {
    getAnalytics();
  }, [students, currentWeek.slots]);

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
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={exportToExcel}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Export to CSV
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
              {/* Week Selector */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Week of {new Date(currentWeek.weekOf).toLocaleDateString()}
                  </h3>
                  <input
                    type="date"
                    value={currentWeek.weekOf}
                    onChange={(e) => setCurrentWeek(prev => ({ ...prev, weekOf: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                            const slot = currentWeek.slots.find(s => s.day === day && s.time === time);
                            return (
                              <td key={`${day}-${time}`} className="px-6 py-4 whitespace-nowrap">
                                {slot ? (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                    <div className="text-sm font-medium text-blue-900">{slot.studentName}</div>
                                    <div className="text-xs text-blue-700">{slot.lessonType}</div>
                                    <div className="flex gap-1 mt-1">
                                      <button
                                        onClick={() => handleUpdateScheduleSlot(slot.id, { studentName: prompt('Student name:') || slot.studentName })}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteScheduleSlot(slot.id)}
                                        className="text-xs text-red-600 hover:text-red-800"
                                      >
                                        Delete
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
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 bg-blue-100 rounded-full">
                        <span className="text-blue-600 font-medium">👥</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.totalStudents}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 bg-green-100 rounded-full">
                        <span className="text-green-600 font-medium">📚</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Technique Intensive</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.classEnrollment.techniqueIntensive}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 bg-purple-100 rounded-full">
                        <span className="text-purple-600 font-medium">🩰</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Ballet Intensive</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.classEnrollment.balletIntensive}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 bg-orange-100 rounded-full">
                        <span className="text-orange-600 font-medium">📅</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Weekly Lessons</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.totalLessons}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Age Groups */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Age Groups</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.ageGroups.minis}</div>
                    <div className="text-sm text-gray-500">Minis (4-7)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.ageGroups.juniors}</div>
                    <div className="text-sm text-gray-500">Juniors (8-11)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analytics.ageGroups.teens}</div>
                    <div className="text-sm text-gray-500">Teens (12-15)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{analytics.ageGroups.seniors}</div>
                    <div className="text-sm text-gray-500">Seniors (16+)</div>
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
