// Teacher synchronization utility for Studio Management and Oracle database

export interface TeacherSyncResult {
  success: boolean;
  message: string;
  changes?: string[];
  errors?: string[];
}

export interface TeacherData {
  id?: string;
  name: string;
  firstName?: string; // Keep for backward compatibility but optional
  lastName?: string;  // Keep for backward compatibility but optional
  email: string;
  phone: string;
  specialties: string;
  status: string;
  notes: string;
  price?: number;
  createdDate?: string;
  modifiedDate?: string;
}

/**
 * Synchronizes teacher data between Studio Management frontend and Oracle database
 * Ensures data consistency and real-time updates
 */
export class TeacherSyncManager {
  private static instance: TeacherSyncManager;
  private listeners: Array<(teachers: TeacherData[]) => void> = [];
  private lastSync: Date = new Date();
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): TeacherSyncManager {
    if (!TeacherSyncManager.instance) {
      TeacherSyncManager.instance = new TeacherSyncManager();
    }
    return TeacherSyncManager.instance;
  }

  /**
   * Register a listener for teacher data changes
   */
  public addListener(callback: (teachers: TeacherData[]) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener for teacher data changes
   */
  public removeListener(callback: (teachers: TeacherData[]) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of teacher data changes
   */
  private notifyListeners(teachers: TeacherData[]): void {
    this.listeners.forEach(listener => listener(teachers));
  }

  /**
   * Fetch latest teacher data from Oracle database
   */
  public async fetchTeachers(search?: string): Promise<TeacherData[]> {
    try {
      const url = search 
        ? `/api/studio/teachers?search=${encodeURIComponent(search)}`
        : '/api/studio/teachers';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const teachers = await response.json();
      this.lastSync = new Date();
      this.notifyListeners(teachers);
      
      return teachers;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  }

  /**
   * Create a new teacher in Oracle database
   */
  public async createTeacher(teacher: TeacherData): Promise<TeacherSyncResult> {
    try {
      // Validate teacher data
      const validation = this.validateTeacherData(teacher);
      if (!validation.success) {
        return validation;
      }

      const response = await fetch('/api/studio/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teacher),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.error || 'Failed to create teacher',
          errors: [errorData.error || 'Unknown error']
        };
      }

      // Refresh teacher list to maintain synchronization
      await this.fetchTeachers();

      return {
        success: true,
        message: 'Teacher created successfully',
        changes: ['Teacher added to database']
      };
    } catch (error) {
      console.error('Error creating teacher:', error);
      return {
        success: false,
        message: 'Failed to create teacher',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Update an existing teacher in Oracle database
   */
  public async updateTeacher(teacher: TeacherData): Promise<TeacherSyncResult> {
    try {
      if (!teacher.id) {
        return {
          success: false,
          message: 'Teacher ID is required for updates',
          errors: ['Missing teacher ID']
        };
      }

      // Validate teacher data
      const validation = this.validateTeacherData(teacher);
      if (!validation.success) {
        return validation;
      }

      const response = await fetch(`/api/studio/teachers/${teacher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teacher),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.error || 'Failed to update teacher',
          errors: [errorData.error || 'Unknown error']
        };
      }

      // Refresh teacher list to maintain synchronization
      await this.fetchTeachers();

      return {
        success: true,
        message: 'Teacher updated successfully',
        changes: ['Teacher information updated in database']
      };
    } catch (error) {
      console.error('Error updating teacher:', error);
      return {
        success: false,
        message: 'Failed to update teacher',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Delete a teacher from Oracle database
   */
  public async deleteTeacher(teacherId: string): Promise<TeacherSyncResult> {
    try {
      if (!teacherId) {
        return {
          success: false,
          message: 'Teacher ID is required for deletion',
          errors: ['Missing teacher ID']
        };
      }

      const response = await fetch(`/api/studio/teachers/${teacherId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.error || 'Failed to delete teacher',
          errors: [errorData.error || 'Unknown error']
        };
      }

      // Refresh teacher list to maintain synchronization
      await this.fetchTeachers();

      return {
        success: true,
        message: 'Teacher deleted successfully',
        changes: ['Teacher removed from database']
      };
    } catch (error) {
      console.error('Error deleting teacher:', error);
      return {
        success: false,
        message: 'Failed to delete teacher',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Validate teacher data before sending to Oracle
   */
  private validateTeacherData(teacher: TeacherData): TeacherSyncResult {
    const errors: string[] = [];

    // Required fields validation
    if (!teacher.name || teacher.name.trim() === '') {
      errors.push('Teacher name is required');
    }

    // Email validation
    if (teacher.email && teacher.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(teacher.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation
    if (teacher.phone && teacher.phone.trim() !== '') {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(teacher.phone)) {
        errors.push('Invalid phone format');
      }
    }

    // Status validation
    if (!teacher.status || !['Active', 'Inactive', 'ACTIVE', 'INACTIVE'].includes(teacher.status)) {
      errors.push('Status must be either "Active" or "Inactive"');
    }

    // Price validation
    if (teacher.price !== undefined && teacher.price !== null) {
      if (teacher.price < 0) {
        errors.push('Price must be a positive number');
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        errors
      };
    }

    return {
      success: true,
      message: 'Validation passed'
    };
  }

  /**
   * Start automatic synchronization with Oracle database
   */
  public startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.fetchTeachers();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop automatic synchronization
   */
  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get last synchronization time
   */
  public getLastSyncTime(): Date {
    return this.lastSync;
  }

  /**
   * Force synchronization with Oracle database
   */
  public async forceSync(): Promise<TeacherSyncResult> {
    try {
      const teachers = await this.fetchTeachers();
      return {
        success: true,
        message: `Synchronized ${teachers.length} teachers`,
        changes: [`Fetched ${teachers.length} teachers from Oracle database`]
      };
    } catch (error) {
      return {
        success: false,
        message: 'Synchronization failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Check if teacher exists in Oracle database
   */
  public async checkTeacherExists(teacherName: string): Promise<boolean> {
    try {
      const teachers = await this.fetchTeachers(teacherName);
      return teachers.some(teacher => 
        teacher.name.toLowerCase() === teacherName.toLowerCase() ||
        `${teacher.firstName} ${teacher.lastName}`.toLowerCase() === teacherName.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking teacher existence:', error);
      return false;
    }
  }

  /**
   * Get teacher by name from Oracle database
   */
  public async getTeacherByName(teacherName: string): Promise<TeacherData | null> {
    try {
      const teachers = await this.fetchTeachers(teacherName);
      return teachers.find(teacher => 
        teacher.name.toLowerCase() === teacherName.toLowerCase() ||
        `${teacher.firstName} ${teacher.lastName}`.toLowerCase() === teacherName.toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Error getting teacher by name:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopAutoSync();
    this.listeners = [];
  }
}

// Export singleton instance
export const teacherSync = TeacherSyncManager.getInstance();
