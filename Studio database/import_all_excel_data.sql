-- Master Studio Data Import Script
-- Generated from Excel calendar data on 2025-07-12T01:54:05.402Z
-- 
-- This script imports all studio data from Excel calendar:
-- • 8 teachers
-- • 213 students  
-- • 41 weekly schedules
-- • 569 lessons
--
-- Execute this script to load all data at once

-- 1. Import Teachers
@@studio_teachers_from_excel.sql

-- 2. Import Students
@@studio_students_from_excel.sql

-- 3. Import Weekly Schedules
@@studio_weekly_schedules_from_excel.sql

-- 4. Import Lessons
@@studio_lessons_from_excel.sql

-- Final verification
SELECT 'Import Complete' as status,
       (SELECT COUNT(*) FROM STUDIO_TEACHERS) as teachers,
       (SELECT COUNT(*) FROM STUDIO_STUDENTS) as students,
       (SELECT COUNT(*) FROM STUDIO_WEEKLY_SCHEDULES) as schedules,
       (SELECT COUNT(*) FROM STUDIO_SCHEDULE_SLOTS) as lessons
FROM DUAL;
