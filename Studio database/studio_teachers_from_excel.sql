-- Studio Teachers Insert Statements
-- Generated from Excel calendar data on 2025-07-12T01:54:05.397Z
-- This file contains 8 teacher records

-- Clear existing teachers (optional - remove these lines to keep existing data)
-- DELETE FROM STUDIO_TEACHERS WHERE NOTES LIKE '%Excel calendar%';

-- Insert teachers

-- Teacher 1: Unknown Teacher
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Unknown Teacher', 
       'Unknown', 
       'Teacher', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Unknown Teacher'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

-- Teacher 2: Meghan Lajoie
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Meghan Lajoie', 
       'Meghan', 
       'Lajoie', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Meghan Lajoie'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

-- Teacher 3: Hazel
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Hazel', 
       'Hazel', 
       '', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Hazel'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

-- Teacher 4: Larkin
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Larkin', 
       'Larkin', 
       '', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Larkin'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

-- Teacher 5: Gemma
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Gemma', 
       'Gemma', 
       '', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Gemma'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

-- Teacher 6: Marik
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Marik', 
       'Marik', 
       '', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Marik'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

-- Teacher 7: Remi
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Remi', 
       'Remi', 
       '', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Remi'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

-- Teacher 8: Everly
INSERT INTO STUDIO_TEACHERS (TEACHER_NAME, FIRST_NAME, LAST_NAME, SPECIALTIES, NOTES)
SELECT 'Everly', 
       'Everly', 
       '', 
       'Dance Instruction', 
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_TEACHERS 
    WHERE TEACHER_NAME = 'Everly'
    AND NVL(EMAIL, 'NULL') = 'NULL'
);

COMMIT;

-- Verification query
SELECT COUNT(*) as teacher_count FROM STUDIO_TEACHERS;
