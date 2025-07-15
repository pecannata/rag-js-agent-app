#!/usr/bin/env node

/**
 * Initialize Studio Database
 * This script sets up the studio database tables and sample data
 */

const { executeQuery } = require('../app/lib/database');

async function initializeDatabase() {
  console.log('🚀 Initializing Studio Database...');
  
  try {
    // Check if tables exist
    console.log('1. Checking if tables exist...');
    
    const tableChecks = [
      'STUDIO_STUDENTS',
      'STUDIO_CLASS_TYPES',
      'STUDIO_STUDENT_CLASSES',
      'STUDIO_WEEKLY_SCHEDULES',
      'STUDIO_SCHEDULE_SLOTS',
      'STUDIO_ATTENDANCE'
    ];
    
    for (const table of tableChecks) {
      try {
        const result = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Table ${table} exists with ${result[0].count} rows`);
      } catch (error) {
        console.log(`❌ Table ${table} does not exist or has issues`);
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Check class types
    console.log('\n2. Checking class types...');
    try {
      const classTypes = await executeQuery('SELECT * FROM STUDIO_CLASS_TYPES ORDER BY CLASS_TYPE_CODE');
      console.log('✅ Class types found:');
      classTypes.forEach(ct => {
        console.log(`   - ${ct.class_type_code}: ${ct.class_type_name} (${ct.is_active === 'Y' ? 'Active' : 'Inactive'})`);
      });
    } catch (error) {
      console.log('❌ Error checking class types:', error.message);
    }
    
    // Check students
    console.log('\n3. Checking students...');
    try {
      const students = await executeQuery('SELECT COUNT(*) as count FROM STUDIO_STUDENTS');
      console.log(`✅ Found ${students[0].count} students in database`);
      
      if (students[0].count > 0) {
        const sampleStudents = await executeQuery(`
          SELECT STUDENT_NAME, CONTACT_EMAIL, AUDITION_STATUS 
          FROM STUDIO_STUDENTS 
          WHERE ROWNUM <= 5
          ORDER BY STUDENT_NAME
        `);
        console.log('   Sample students:');
        sampleStudents.forEach(student => {
          console.log(`   - ${student.student_name} (${student.contact_email}) - ${student.audition_status}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking students:', error.message);
    }
    
    // Check class enrollments
    console.log('\n4. Checking class enrollments...');
    try {
      const enrollments = await executeQuery(`
        SELECT 
          ct.CLASS_TYPE_NAME,
          COUNT(sc.STUDENT_ID) as ENROLLMENT_COUNT
        FROM STUDIO_CLASS_TYPES ct
        LEFT JOIN STUDIO_STUDENT_CLASSES sc ON ct.CLASS_TYPE_ID = sc.CLASS_TYPE_ID AND sc.STATUS = 'ACTIVE'
        GROUP BY ct.CLASS_TYPE_NAME
        ORDER BY ct.CLASS_TYPE_NAME
      `);
      console.log('✅ Class enrollments:');
      enrollments.forEach(enrollment => {
        console.log(`   - ${enrollment.class_type_name}: ${enrollment.enrollment_count} students`);
      });
    } catch (error) {
      console.log('❌ Error checking class enrollments:', error.message);
    }
    
    console.log('\n✅ Database initialization check complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
