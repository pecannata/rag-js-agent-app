-- Studio Students Insert Statements
-- Generated from Excel calendar data on 2025-07-12T01:54:05.398Z
-- This file contains 213 student records

-- Clear existing students (optional - remove these lines to keep existing data)
-- DELETE FROM STUDIO_STUDENTS WHERE NOTES LIKE '%Excel calendar%';

-- Insert students

-- Student 1: TRIO CHOREO 12:30-1:30
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO CHOREO 12:30-1:30', 
       'TRIO Parent', 
       'CHOREO 12:30-1:30', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO CHOREO 12:30-1:30'
    AND CONTACT_EMAIL IS NULL
);

-- Student 2: Everly solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Everly solo', 
       'Everly Parent', 
       'solo', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Everly solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 3: Special Event
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Special Event', 
       'Special Parent', 
       'Event', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Special Event'
    AND CONTACT_EMAIL IS NULL
);

-- Student 4: REMI CHOREO 1:30-2:30
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'REMI CHOREO 1:30-2:30', 
       'REMI Parent', 
       'CHOREO 1:30-2:30', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'REMI CHOREO 1:30-2:30'
    AND CONTACT_EMAIL IS NULL
);

-- Student 5: LABOR DAY
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'LABOR DAY', 
       'LABOR Parent', 
       'DAY', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'LABOR DAY'
    AND CONTACT_EMAIL IS NULL
);

-- Student 6: 4:45: TRIO CHOREOGRAPHY SLOT
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:45: TRIO CHOREOGRAPHY SLOT', 
       '4:45: Parent', 
       'TRIO CHOREOGRAPHY SLOT', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:45: TRIO CHOREOGRAPHY SLOT'
    AND CONTACT_EMAIL IS NULL
);

-- Student 7: 5:15:TRIO CHOREOGRAPHY SLOT
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '5:15:TRIO CHOREOGRAPHY SLOT', 
       '5:15:TRIO Parent', 
       'CHOREOGRAPHY SLOT', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '5:15:TRIO CHOREOGRAPHY SLOT'
    AND CONTACT_EMAIL IS NULL
);

-- Student 8: Mila solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mila solo', 
       'Mila Parent', 
       'solo', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mila solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 9: Reese solo choreo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Reese solo choreo', 
       'Reese Parent', 
       'solo choreo', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Reese solo choreo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 10: TO DO
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TO DO', 
       'TO Parent', 
       'DO', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TO DO'
    AND CONTACT_EMAIL IS NULL
);

-- Student 11: Gemma - Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gemma - Solo', 
       'Gemma Parent', 
       '- Solo', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gemma - Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 12: Everly
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Everly', 
       'Everly Parent', 
       '', 
       18,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Everly'
    AND CONTACT_EMAIL IS NULL
);

-- Student 13: 0.6458333333333334
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.6458333333333334', 
       '0.6458333333333334 Parent', 
       '', 
       18,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.6458333333333334'
    AND CONTACT_EMAIL IS NULL
);

-- Student 14: 4:15: Larkin
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:15: Larkin', 
       '4:15: Parent', 
       'Larkin', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:15: Larkin'
    AND CONTACT_EMAIL IS NULL
);

-- Student 15: 0.6666666666666666
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.6666666666666666', 
       '0.6666666666666666 Parent', 
       '', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.6666666666666666'
    AND CONTACT_EMAIL IS NULL
);

-- Student 16: 4:45:TRIO CHOREOGRAPHY
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:45:TRIO CHOREOGRAPHY', 
       '4:45:TRIO Parent', 
       'CHOREOGRAPHY', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:45:TRIO CHOREOGRAPHY'
    AND CONTACT_EMAIL IS NULL
);

-- Student 17: 4:30:PM
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:30:PM', 
       '4:30:PM Parent', 
       '', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:30:PM'
    AND CONTACT_EMAIL IS NULL
);

-- Student 18: 5:15:TRIO CHOREOGRAPHY
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '5:15:TRIO CHOREOGRAPHY', 
       '5:15:TRIO Parent', 
       'CHOREOGRAPHY', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '5:15:TRIO CHOREOGRAPHY'
    AND CONTACT_EMAIL IS NULL
);

-- Student 19: Mila
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mila', 
       'Mila Parent', 
       '', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mila'
    AND CONTACT_EMAIL IS NULL
);

-- Student 20: Reese
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Reese', 
       'Reese Parent', 
       '', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Reese'
    AND CONTACT_EMAIL IS NULL
);

-- Student 21: Larkin - Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Larkin - Solo', 
       'Larkin Parent', 
       '- Solo', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Larkin - Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 22: SLOTS MAY BE ADDED
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'SLOTS MAY BE ADDED', 
       'SLOTS Parent', 
       'MAY BE ADDED', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'SLOTS MAY BE ADDED'
    AND CONTACT_EMAIL IS NULL
);

-- Student 23: 4:30: TRIO Choreo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:30: TRIO Choreo', 
       '4:30: Parent', 
       'TRIO Choreo', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:30: TRIO Choreo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 24: 5:00: TRIO Choreo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '5:00: TRIO Choreo', 
       '5:00: Parent', 
       'TRIO Choreo', 
       18,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '5:00: TRIO Choreo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 25: Larkin
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Larkin', 
       'Larkin Parent', 
       '', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Larkin'
    AND CONTACT_EMAIL IS NULL
);

-- Student 26: Hazel
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Hazel', 
       'Hazel Parent', 
       '', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Hazel'
    AND CONTACT_EMAIL IS NULL
);

-- Student 27: Marik
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik', 
       'Marik Parent', 
       '', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik'
    AND CONTACT_EMAIL IS NULL
);

-- Student 28: Meghan out of town this weekend
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Meghan out of town this weekend', 
       'Meghan Parent', 
       'out of town this weekend', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Meghan out of town this weekend'
    AND CONTACT_EMAIL IS NULL
);

-- Student 29: TRIO
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO', 
       'TRIO Parent', 
       '', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO'
    AND CONTACT_EMAIL IS NULL
);

-- Student 30: Trio
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Trio', 
       'Trio Parent', 
       '', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Trio'
    AND CONTACT_EMAIL IS NULL
);

-- Student 31: 12:00 Remi
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '12:00 Remi', 
       '12:00 Parent', 
       'Remi', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '12:00 Remi'
    AND CONTACT_EMAIL IS NULL
);

-- Student 32: 0.5416666666666666
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.5416666666666666', 
       '0.5416666666666666 Parent', 
       '', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.5416666666666666'
    AND CONTACT_EMAIL IS NULL
);

-- Student 33: 12:30 Marik
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '12:30 Marik', 
       '12:30 Parent', 
       'Marik', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '12:30 Marik'
    AND CONTACT_EMAIL IS NULL
);

-- Student 34: 0.0625
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.0625', 
       '0.0625 Parent', 
       '', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.0625'
    AND CONTACT_EMAIL IS NULL
);

-- Student 35: 0.041666666666666664
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.041666666666666664', 
       '0.041666666666666664 Parent', 
       '', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.041666666666666664'
    AND CONTACT_EMAIL IS NULL
);

-- Student 36: 0.08333333333333333
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.08333333333333333', 
       '0.08333333333333333 Parent', 
       '', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.08333333333333333'
    AND CONTACT_EMAIL IS NULL
);

-- Student 37: TRIO - this one should be or would be from Jenn
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO - this one should be or would be from Jenn', 
       'TRIO Parent', 
       '- this one should be or would be from Jenn', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO - this one should be or would be from Jenn'
    AND CONTACT_EMAIL IS NULL
);

-- Student 38: Gemma
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gemma', 
       'Gemma Parent', 
       '', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gemma'
    AND CONTACT_EMAIL IS NULL
);

-- Student 39: 1:30:00 pm everly solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '1:30:00 pm everly solo', 
       '1:30:00 Parent', 
       'pm everly solo', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '1:30:00 pm everly solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 40: 0.10416666666666667
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.10416666666666667', 
       '0.10416666666666667 Parent', 
       '', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.10416666666666667'
    AND CONTACT_EMAIL IS NULL
);

-- Student 41: 3:00- Gemma solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '3:00- Gemma solo', 
       '3:00- Parent', 
       'Gemma solo', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '3:00- Gemma solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 42: 2:30:00 - Larkin - paid
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '2:30:00 - Larkin - paid', 
       '2:30:00 Parent', 
       '- Larkin - paid', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '2:30:00 - Larkin - paid'
    AND CONTACT_EMAIL IS NULL
);

-- Student 43: 3:30- Gemma solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '3:30- Gemma solo', 
       '3:30- Parent', 
       'Gemma solo', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '3:30- Gemma solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 44: 3:00:00 AM TRIO - paid on 10.28 @3:46p and marked in memo as Trio 10.25
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '3:00:00 AM TRIO - paid on 10.28 @3:46p and marked in memo as Trio 10.25', 
       '3:00:00 Parent', 
       'AM TRIO - paid on 10.28 @3:46p and marked in memo as Trio 10.25', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '3:00:00 AM TRIO - paid on 10.28 @3:46p and marked in memo as Trio 10.25'
    AND CONTACT_EMAIL IS NULL
);

-- Student 45: 1:30:00 AM everly
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '1:30:00 AM everly', 
       '1:30:00 Parent', 
       'AM everly', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '1:30:00 AM everly'
    AND CONTACT_EMAIL IS NULL
);

-- Student 46: 3:30:00 AM TRIO - PAID by Jenn on 10/28
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '3:30:00 AM TRIO - PAID by Jenn on 10/28', 
       '3:30:00 Parent', 
       'AM TRIO - PAID by Jenn on 10/28', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '3:30:00 AM TRIO - PAID by Jenn on 10/28'
    AND CONTACT_EMAIL IS NULL
);

-- Student 47: 2:00:00 AM Marik
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '2:00:00 AM Marik', 
       '2:00:00 Parent', 
       'AM Marik', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '2:00:00 AM Marik'
    AND CONTACT_EMAIL IS NULL
);

-- Student 48: 7:00 Remi
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '7:00 Remi', 
       '7:00 Parent', 
       'Remi', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '7:00 Remi'
    AND CONTACT_EMAIL IS NULL
);

-- Student 49: 2:30:00 Remi
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '2:30:00 Remi', 
       '2:30:00 Parent', 
       'Remi', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '2:30:00 Remi'
    AND CONTACT_EMAIL IS NULL
);

-- Student 50: 0.3125
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.3125', 
       '0.3125 Parent', 
       '', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.3125'
    AND CONTACT_EMAIL IS NULL
);

-- Student 51: 3:00 Mila
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '3:00 Mila', 
       '3:00 Parent', 
       'Mila', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '3:00 Mila'
    AND CONTACT_EMAIL IS NULL
);

-- Student 52: TRIO - Paid by Tia on 10/28
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO - Paid by Tia on 10/28', 
       'TRIO Parent', 
       '- Paid by Tia on 10/28', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO - Paid by Tia on 10/28'
    AND CONTACT_EMAIL IS NULL
);

-- Student 53: Gemma - solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gemma - solo', 
       'Gemma Parent', 
       '- solo', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gemma - solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 54: 4:00-5:00 solo block. Run through in costumes
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:00-5:00 solo block. Run through in costumes', 
       '4:00-5:00 Parent', 
       'solo block. Run through in costumes', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:00-5:00 solo block. Run through in costumes'
    AND CONTACT_EMAIL IS NULL
);

-- Student 55: 3:30 Hazel
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '3:30 Hazel', 
       '3:30 Parent', 
       'Hazel', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '3:30 Hazel'
    AND CONTACT_EMAIL IS NULL
);

-- Student 56: 0.2708333333333333
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.2708333333333333', 
       '0.2708333333333333 Parent', 
       '', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.2708333333333333'
    AND CONTACT_EMAIL IS NULL
);

-- Student 57: 4:00:00 Marik
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:00:00 Marik', 
       '4:00:00 Parent', 
       'Marik', 
       18,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:00:00 Marik'
    AND CONTACT_EMAIL IS NULL
);

-- Student 58: 0.2916666666666667
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '0.2916666666666667', 
       '0.2916666666666667 Parent', 
       '', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '0.2916666666666667'
    AND CONTACT_EMAIL IS NULL
);

-- Student 59: 4:30 Remi
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4:30 Remi', 
       '4:30 Parent', 
       'Remi', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4:30 Remi'
    AND CONTACT_EMAIL IS NULL
);

-- Student 60: 5:00 Mila
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '5:00 Mila', 
       '5:00 Parent', 
       'Mila', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '5:00 Mila'
    AND CONTACT_EMAIL IS NULL
);

-- Student 61: 5:30:00 Reese choreo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '5:30:00 Reese choreo', 
       '5:30:00 Parent', 
       'Reese choreo', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '5:30:00 Reese choreo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 62: 6:00:00 Reese choreo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '6:00:00 Reese choreo', 
       '6:00:00 Parent', 
       'Reese choreo', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '6:00:00 Reese choreo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 63: I will add Gracie's Venmo for her lessons
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'I will add Gracie''s Venmo for her lessons', 
       'I Parent', 
       'will add Gracie''s Venmo for her lessons', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'I will add Gracie''s Venmo for her lessons'
    AND CONTACT_EMAIL IS NULL
);

-- Student 64: TBD: Will add more time slots here later!
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TBD: Will add more time slots here later!', 
       'TBD: Parent', 
       'Will add more time slots here later!', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TBD: Will add more time slots here later!'
    AND CONTACT_EMAIL IS NULL
);

-- Student 65: Remi
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Remi', 
       'Remi Parent', 
       '', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Remi'
    AND CONTACT_EMAIL IS NULL
);

-- Student 66: Will add
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Will add', 
       'Will Parent', 
       'add', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Will add'
    AND CONTACT_EMAIL IS NULL
);

-- Student 67: TBA
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TBA', 
       'TBA Parent', 
       '', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TBA'
    AND CONTACT_EMAIL IS NULL
);

-- Student 68: Will add in times here
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Will add in times here', 
       'Will Parent', 
       'add in times here', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Will add in times here'
    AND CONTACT_EMAIL IS NULL
);

-- Student 69: TRIO  - paid for by Jenn 12.30
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO  - paid for by Jenn 12.30', 
       'TRIO Parent', 
       '- paid for by Jenn 12.30', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO  - paid for by Jenn 12.30'
    AND CONTACT_EMAIL IS NULL
);

-- Student 70: Gemma Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gemma Solo', 
       'Gemma Parent', 
       'Solo', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gemma Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 71: TRIO - paid for by Tia 12.30
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO - paid for by Tia 12.30', 
       'TRIO Parent', 
       '- paid for by Tia 12.30', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO - paid for by Tia 12.30'
    AND CONTACT_EMAIL IS NULL
);

-- Student 72: Larkin solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Larkin solo', 
       'Larkin Parent', 
       'solo', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Larkin solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 73: Ballet optional 4:00-5:00
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Ballet optional 4:00-5:00', 
       'Ballet Parent', 
       'optional 4:00-5:00', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Ballet optional 4:00-5:00'
    AND CONTACT_EMAIL IS NULL
);

-- Student 74: Jazz optional 4:00-5:00
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Jazz optional 4:00-5:00', 
       'Jazz Parent', 
       'optional 4:00-5:00', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Jazz optional 4:00-5:00'
    AND CONTACT_EMAIL IS NULL
);

-- Student 75: TRIO - paid for by Allison 12.31
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO - paid for by Allison 12.31', 
       'TRIO Parent', 
       '- paid for by Allison 12.31', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO - paid for by Allison 12.31'
    AND CONTACT_EMAIL IS NULL
);

-- Student 76: TRIO- paid for by Jenn 12.31
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TRIO- paid for by Jenn 12.31', 
       'TRIO- Parent', 
       'paid for by Jenn 12.31', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TRIO- paid for by Jenn 12.31'
    AND CONTACT_EMAIL IS NULL
);

-- Student 77: Maybe Mila choreo start
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Maybe Mila choreo start', 
       'Maybe Parent', 
       'Mila choreo start', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Maybe Mila choreo start'
    AND CONTACT_EMAIL IS NULL
);

-- Student 78: Trio - 4:30 - Tia Paid
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Trio - 4:30 - Tia Paid', 
       'Trio Parent', 
       '- 4:30 - Tia Paid', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Trio - 4:30 - Tia Paid'
    AND CONTACT_EMAIL IS NULL
);

-- Student 79: Trio -5:00 paid by Alli
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Trio -5:00 paid by Alli', 
       'Trio Parent', 
       '-5:00 paid by Alli', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Trio -5:00 paid by Alli'
    AND CONTACT_EMAIL IS NULL
);

-- Student 80: Remi 5:30
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Remi 5:30', 
       'Remi Parent', 
       '5:30', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Remi 5:30'
    AND CONTACT_EMAIL IS NULL
);

-- Student 81: Mila 6:00
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mila 6:00', 
       'Mila Parent', 
       '6:00', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mila 6:00'
    AND CONTACT_EMAIL IS NULL
);

-- Student 82: 1/16- Jen Paid Trio
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '1/16- Jen Paid Trio', 
       '1/16- Parent', 
       'Jen Paid Trio', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '1/16- Jen Paid Trio'
    AND CONTACT_EMAIL IS NULL
);

-- Student 83: 1/16- Jaclyn paid
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '1/16- Jaclyn paid', 
       '1/16- Parent', 
       'Jaclyn paid', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '1/16- Jaclyn paid'
    AND CONTACT_EMAIL IS NULL
);

-- Student 84: 1/16- Tia Paid
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '1/16- Tia Paid', 
       '1/16- Parent', 
       'Tia Paid', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '1/16- Tia Paid'
    AND CONTACT_EMAIL IS NULL
);

-- Student 85: THESE LESSONS MAY BE AVAILABLE BUT WITH A DIFFERENT TEACHER
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'THESE LESSONS MAY BE AVAILABLE BUT WITH A DIFFERENT TEACHER', 
       'THESE Parent', 
       'LESSONS MAY BE AVAILABLE BUT WITH A DIFFERENT TEACHER', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'THESE LESSONS MAY BE AVAILABLE BUT WITH A DIFFERENT TEACHER'
    AND CONTACT_EMAIL IS NULL
);

-- Student 86: Stella
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Stella', 
       'Stella Parent', 
       '', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Stella'
    AND CONTACT_EMAIL IS NULL
);

-- Student 87: Yellow- pending I am feeling better!
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Yellow- pending I am feeling better!', 
       'Yellow- Parent', 
       'pending I am feeling better!', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Yellow- pending I am feeling better!'
    AND CONTACT_EMAIL IS NULL
);

-- Student 88: 7:00- Trio paid by Jenn
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '7:00- Trio paid by Jenn', 
       '7:00- Parent', 
       'Trio paid by Jenn', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '7:00- Trio paid by Jenn'
    AND CONTACT_EMAIL IS NULL
);

-- Student 89: 7:30: Choke
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '7:30: Choke', 
       '7:30: Parent', 
       'Choke', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '7:30: Choke'
    AND CONTACT_EMAIL IS NULL
);

-- Student 90: 6:00:
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '6:00:', 
       '6:00: Parent', 
       '', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '6:00:'
    AND CONTACT_EMAIL IS NULL
);

-- Student 91: 6:30:
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '6:30:', 
       '6:30: Parent', 
       '', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '6:30:'
    AND CONTACT_EMAIL IS NULL
);

-- Student 92: Georgia
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Georgia', 
       'Georgia Parent', 
       '', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Georgia'
    AND CONTACT_EMAIL IS NULL
);

-- Student 93: Gracie miller
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gracie miller', 
       'Gracie Parent', 
       'miller', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gracie miller'
    AND CONTACT_EMAIL IS NULL
);

-- Student 94: 7:00-7:30 Trio (*Tia paid)
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '7:00-7:30 Trio (*Tia paid)', 
       '7:00-7:30 Parent', 
       'Trio (*Tia paid)', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '7:00-7:30 Trio (*Tia paid)'
    AND CONTACT_EMAIL IS NULL
);

-- Student 95: Classes-Jacquelyn
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Classes-Jacquelyn', 
       'Classes-Jacquelyn Parent', 
       '', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Classes-Jacquelyn'
    AND CONTACT_EMAIL IS NULL
);

-- Student 96: Will have
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Will have', 
       'Will Parent', 
       'have', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Will have'
    AND CONTACT_EMAIL IS NULL
);

-- Student 97: Jessica cleaning tap
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Jessica cleaning tap', 
       'Jessica Parent', 
       'cleaning tap', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Jessica cleaning tap'
    AND CONTACT_EMAIL IS NULL
);

-- Student 98: Logan hip hop
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Logan hip hop', 
       'Logan Parent', 
       'hip hop', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Logan hip hop'
    AND CONTACT_EMAIL IS NULL
);

-- Student 99: Classes with Jamison
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Classes with Jamison', 
       'Classes Parent', 
       'with Jamison', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Classes with Jamison'
    AND CONTACT_EMAIL IS NULL
);

-- Student 100: Ballroom with Ashley
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Ballroom with Ashley', 
       'Ballroom Parent', 
       'with Ashley', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Ballroom with Ashley'
    AND CONTACT_EMAIL IS NULL
);

-- Student 101: 7:00-7:30 everly 
7:30-8:00 Duo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '7:00-7:30 everly 
7:30-8:00 Duo', 
       '7:00-7:30 Parent', 
       'everly 
7:30-8:00 Duo', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '7:00-7:30 everly 
7:30-8:00 Duo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 102: Courtney masterclass
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Courtney masterclass', 
       'Courtney Parent', 
       'masterclass', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Courtney masterclass'
    AND CONTACT_EMAIL IS NULL
);

-- Student 103: Classes- with Jamison
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Classes- with Jamison', 
       'Classes- Parent', 
       'with Jamison', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Classes- with Jamison'
    AND CONTACT_EMAIL IS NULL
);

-- Student 104: Possibly Mila choreo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Possibly Mila choreo', 
       'Possibly Parent', 
       'Mila choreo', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Possibly Mila choreo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 105: Blocks and bands: Jacquelyn
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Blocks and bands: Jacquelyn', 
       'Blocks Parent', 
       'and bands: Jacquelyn', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Blocks and bands: Jacquelyn'
    AND CONTACT_EMAIL IS NULL
);

-- Student 106: Jac & Gracie
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Jac & Gracie', 
       'Jac Parent', 
       '& Gracie', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Jac & Gracie'
    AND CONTACT_EMAIL IS NULL
);

-- Student 107: Hazel choreo 3-4 PM
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Hazel choreo 3-4 PM', 
       'Hazel Parent', 
       'choreo 3-4 PM', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Hazel choreo 3-4 PM'
    AND CONTACT_EMAIL IS NULL
);

-- Student 108: 9:30-10 Marik
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '9:30-10 Marik', 
       '9:30-10 Parent', 
       'Marik', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '9:30-10 Marik'
    AND CONTACT_EMAIL IS NULL
);

-- Student 109: Rehearsal
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Rehearsal', 
       'Rehearsal Parent', 
       '', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Rehearsal'
    AND CONTACT_EMAIL IS NULL
);

-- Student 110: 10-10:30 everly
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '10-10:30 everly', 
       '10-10:30 Parent', 
       'everly', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '10-10:30 everly'
    AND CONTACT_EMAIL IS NULL
);

-- Student 111: 7:00-7:30 Trio (paid by Alli)
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '7:00-7:30 Trio (paid by Alli)', 
       '7:00-7:30 Parent', 
       'Trio (paid by Alli)', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '7:00-7:30 Trio (paid by Alli)'
    AND CONTACT_EMAIL IS NULL
);

-- Student 112: 10:30-11 Hazel
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '10:30-11 Hazel', 
       '10:30-11 Parent', 
       'Hazel', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '10:30-11 Hazel'
    AND CONTACT_EMAIL IS NULL
);

-- Student 113: 6:00-6:30 Larkin
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '6:00-6:30 Larkin', 
       '6:00-6:30 Parent', 
       'Larkin', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '6:00-6:30 Larkin'
    AND CONTACT_EMAIL IS NULL
);

-- Student 114: Classes- stella
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Classes- stella', 
       'Classes- Parent', 
       'stella', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Classes- stella'
    AND CONTACT_EMAIL IS NULL
);

-- Student 115: Canceled
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Canceled', 
       'Canceled Parent', 
       '', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Canceled'
    AND CONTACT_EMAIL IS NULL
);

-- Student 116: 8:00-8:30- Mila
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '8:00-8:30- Mila', 
       '8:00-8:30- Parent', 
       'Mila', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '8:00-8:30- Mila'
    AND CONTACT_EMAIL IS NULL
);

-- Student 117: 8:00-8:30 everly
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '8:00-8:30 everly', 
       '8:00-8:30 Parent', 
       'everly', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '8:00-8:30 everly'
    AND CONTACT_EMAIL IS NULL
);

-- Student 118: 11:00-11:30- reese
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '11:00-11:30- reese', 
       '11:00-11:30- Parent', 
       'reese', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '11:00-11:30- reese'
    AND CONTACT_EMAIL IS NULL
);

-- Student 119: 6:30-7:00 Gemma
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '6:30-7:00 Gemma', 
       '6:30-7:00 Parent', 
       'Gemma', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '6:30-7:00 Gemma'
    AND CONTACT_EMAIL IS NULL
);

-- Student 120: Pink = Mrs Meghan
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Pink = Mrs Meghan', 
       'Pink Parent', 
       '= Mrs Meghan', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Pink = Mrs Meghan'
    AND CONTACT_EMAIL IS NULL
);

-- Student 121: Green= Gracie Lee
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Green= Gracie Lee', 
       'Green= Parent', 
       'Gracie Lee', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Green= Gracie Lee'
    AND CONTACT_EMAIL IS NULL
);

-- Student 122: NUVO HOUSTON
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'NUVO HOUSTON', 
       'NUVO Parent', 
       'HOUSTON', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'NUVO HOUSTON'
    AND CONTACT_EMAIL IS NULL
);

-- Student 123: Trio + Choke
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Trio + Choke', 
       'Trio Parent', 
       '+ Choke', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Trio + Choke'
    AND CONTACT_EMAIL IS NULL
);

-- Student 124: Classes- Juliana
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Classes- Juliana', 
       'Classes- Parent', 
       'Juliana', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Classes- Juliana'
    AND CONTACT_EMAIL IS NULL
);

-- Student 125: Streetz
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Streetz', 
       'Streetz Parent', 
       '', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Streetz'
    AND CONTACT_EMAIL IS NULL
);

-- Student 126: Mia
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mia', 
       'Mia Parent', 
       '', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mia'
    AND CONTACT_EMAIL IS NULL
);

-- Student 127: Rehearsals
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Rehearsals', 
       'Rehearsals Parent', 
       '', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Rehearsals'
    AND CONTACT_EMAIL IS NULL
);

-- Student 128: Jacquelyn
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Jacquelyn', 
       'Jacquelyn Parent', 
       '', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Jacquelyn'
    AND CONTACT_EMAIL IS NULL
);

-- Student 129: DANCEMAKERS
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'DANCEMAKERS', 
       'DANCEMAKERS Parent', 
       '', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'DANCEMAKERS'
    AND CONTACT_EMAIL IS NULL
);

-- Student 130: I don't speak French (Tia paid) 7:00-7:30 + Choke 7:30-8:00
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'I don''t speak French (Tia paid) 7:00-7:30 + Choke 7:30-8:00', 
       'I Parent', 
       'don''t speak French (Tia paid) 7:00-7:30 + Choke 7:30-8:00', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'I don''t speak French (Tia paid) 7:00-7:30 + Choke 7:30-8:00'
    AND CONTACT_EMAIL IS NULL
);

-- Student 131: With Ryann
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'With Ryann', 
       'With Parent', 
       'Ryann', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'With Ryann'
    AND CONTACT_EMAIL IS NULL
);

-- Student 132: Ryann- Hazel & Marik
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Ryann- Hazel & Marik', 
       'Ryann- Parent', 
       'Hazel & Marik', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Ryann- Hazel & Marik'
    AND CONTACT_EMAIL IS NULL
);

-- Student 133: 4-8: Kinley 5-7: Cora
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '4-8: Kinley 5-7: Cora', 
       '4-8: Parent', 
       'Kinley 5-7: Cora', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '4-8: Kinley 5-7: Cora'
    AND CONTACT_EMAIL IS NULL
);

-- Student 134: Trio- 7-7:30x - paid for by Alli
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Trio- 7-7:30x - paid for by Alli', 
       'Trio- Parent', 
       '7-7:30x - paid for by Alli', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Trio- 7-7:30x - paid for by Alli'
    AND CONTACT_EMAIL IS NULL
);

-- Student 135: 7-9: Paige
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT '7-9: Paige', 
       '7-9: Parent', 
       'Paige', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = '7-9: Paige'
    AND CONTACT_EMAIL IS NULL
);

-- Student 136: With Gracie
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'With Gracie', 
       'With Parent', 
       'Gracie', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'With Gracie'
    AND CONTACT_EMAIL IS NULL
);

-- Student 137: Kinley
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Kinley', 
       'Kinley Parent', 
       '', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Kinley'
    AND CONTACT_EMAIL IS NULL
);

-- Student 138: Marik- technique
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik- technique', 
       'Marik- Parent', 
       'technique', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik- technique'
    AND CONTACT_EMAIL IS NULL
);

-- Student 139: Marik - technique
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik - technique', 
       'Marik Parent', 
       '- technique', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik - technique'
    AND CONTACT_EMAIL IS NULL
);

-- Student 140: RYANN
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'RYANN', 
       'RYANN Parent', 
       '', 
       18,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'RYANN'
    AND CONTACT_EMAIL IS NULL
);

-- Student 141: PAIGE
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'PAIGE', 
       'PAIGE Parent', 
       '', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'PAIGE'
    AND CONTACT_EMAIL IS NULL
);

-- Student 142: MEGHAN
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'MEGHAN', 
       'MEGHAN Parent', 
       '', 
       18,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'MEGHAN'
    AND CONTACT_EMAIL IS NULL
);

-- Student 143: CARALIN
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'CARALIN', 
       'CARALIN Parent', 
       '', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'CARALIN'
    AND CONTACT_EMAIL IS NULL
);

-- Student 144: Marik -Technique
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik -Technique', 
       'Marik Parent', 
       '-Technique', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik -Technique'
    AND CONTACT_EMAIL IS NULL
);

-- Student 145: Gemma - Technique
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gemma - Technique', 
       'Gemma Parent', 
       '- Technique', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gemma - Technique'
    AND CONTACT_EMAIL IS NULL
);

-- Student 146: Marik- Pure Imagination
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik- Pure Imagination', 
       'Marik- Parent', 
       'Pure Imagination', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik- Pure Imagination'
    AND CONTACT_EMAIL IS NULL
);

-- Student 147: Marik - Pure Imagination
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik - Pure Imagination', 
       'Marik Parent', 
       '- Pure Imagination', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik - Pure Imagination'
    AND CONTACT_EMAIL IS NULL
);

-- Student 148: Trio - Technique
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Trio - Technique', 
       'Trio Parent', 
       '- Technique', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Trio - Technique'
    AND CONTACT_EMAIL IS NULL
);

-- Student 149: Sara Sharma
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Sara Sharma', 
       'Sara Parent', 
       'Sharma', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Sara Sharma'
    AND CONTACT_EMAIL IS NULL
);

-- Student 150: Bailey Townsend
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Bailey Townsend', 
       'Bailey Parent', 
       'Townsend', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Bailey Townsend'
    AND CONTACT_EMAIL IS NULL
);

-- Student 151: Remi-technique
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Remi-technique', 
       'Remi-technique Parent', 
       '', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Remi-technique'
    AND CONTACT_EMAIL IS NULL
);

-- Student 152: Mila-technique
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mila-technique', 
       'Mila-technique Parent', 
       '', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mila-technique'
    AND CONTACT_EMAIL IS NULL
);

-- Student 153: Mia  Jamel
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mia  Jamel', 
       'Mia Parent', 
       'Jamel', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mia  Jamel'
    AND CONTACT_EMAIL IS NULL
);

-- Student 154: Sasha Baer
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Sasha Baer', 
       'Sasha Parent', 
       'Baer', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Sasha Baer'
    AND CONTACT_EMAIL IS NULL
);

-- Student 155: Scarlet P
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Scarlet P', 
       'Scarlet Parent', 
       'P', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Scarlet P'
    AND CONTACT_EMAIL IS NULL
);

-- Student 156: Marik- Angels
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik- Angels', 
       'Marik- Parent', 
       'Angels', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik- Angels'
    AND CONTACT_EMAIL IS NULL
);

-- Student 157: Scarlet p
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Scarlet p', 
       'Scarlet Parent', 
       'p', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Scarlet p'
    AND CONTACT_EMAIL IS NULL
);

-- Student 158: Vivi P
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Vivi P', 
       'Vivi Parent', 
       'P', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Vivi P'
    AND CONTACT_EMAIL IS NULL
);

-- Student 159: Callie E
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Callie E', 
       'Callie Parent', 
       'E', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Callie E'
    AND CONTACT_EMAIL IS NULL
);

-- Student 160: Lyla E
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Lyla E', 
       'Lyla Parent', 
       'E', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Lyla E'
    AND CONTACT_EMAIL IS NULL
);

-- Student 161: GRACIE
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'GRACIE', 
       'GRACIE Parent', 
       '', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'GRACIE'
    AND CONTACT_EMAIL IS NULL
);

-- Student 162: CARALIN ( BALLET TEACHER)
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'CARALIN ( BALLET TEACHER)', 
       'CARALIN Parent', 
       '( BALLET TEACHER)', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'CARALIN ( BALLET TEACHER)'
    AND CONTACT_EMAIL IS NULL
);

-- Student 163: Mia Walsh
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mia Walsh', 
       'Mia Parent', 
       'Walsh', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mia Walsh'
    AND CONTACT_EMAIL IS NULL
);

-- Student 164: Hazel- tech
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Hazel- tech', 
       'Hazel- Parent', 
       'tech', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Hazel- tech'
    AND CONTACT_EMAIL IS NULL
);

-- Student 165: Hazel- solos
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Hazel- solos', 
       'Hazel- Parent', 
       'solos', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Hazel- solos'
    AND CONTACT_EMAIL IS NULL
);

-- Student 166: Rehearsal 4:30-6:30
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Rehearsal 4:30-6:30', 
       'Rehearsal Parent', 
       '4:30-6:30', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Rehearsal 4:30-6:30'
    AND CONTACT_EMAIL IS NULL
);

-- Student 167: STUDIO RENTED 4-6
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'STUDIO RENTED 4-6', 
       'STUDIO Parent', 
       'RENTED 4-6', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'STUDIO RENTED 4-6'
    AND CONTACT_EMAIL IS NULL
);

-- Student 168: Studio rented 4-6
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Studio rented 4-6', 
       'Studio Parent', 
       'rented 4-6', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Studio rented 4-6'
    AND CONTACT_EMAIL IS NULL
);

-- Student 169: TDA PREP
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TDA PREP', 
       'TDA Parent', 
       'PREP', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TDA PREP'
    AND CONTACT_EMAIL IS NULL
);

-- Student 170: Harlow- Pointe
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Harlow- Pointe', 
       'Harlow- Parent', 
       'Pointe', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Harlow- Pointe'
    AND CONTACT_EMAIL IS NULL
);

-- Student 171: Charlotte
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Charlotte', 
       'Charlotte Parent', 
       '', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Charlotte'
    AND CONTACT_EMAIL IS NULL
);

-- Student 172: Reese & Mila
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Reese & Mila', 
       'Reese Parent', 
       '& Mila', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Reese & Mila'
    AND CONTACT_EMAIL IS NULL
);

-- Student 173: Millie
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Millie', 
       'Millie Parent', 
       '', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Millie'
    AND CONTACT_EMAIL IS NULL
);

-- Student 174: Hazel- solo/tech
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Hazel- solo/tech', 
       'Hazel- Parent', 
       'solo/tech', 
       18,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Hazel- solo/tech'
    AND CONTACT_EMAIL IS NULL
);

-- Student 175: Larkin & Gemma
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Larkin & Gemma', 
       'Larkin Parent', 
       '& Gemma', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Larkin & Gemma'
    AND CONTACT_EMAIL IS NULL
);

-- Student 176: Marik - solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik - solo', 
       'Marik Parent', 
       '- solo', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik - solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 177: Magnolia House
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Magnolia House', 
       'Magnolia Parent', 
       'House', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Magnolia House'
    AND CONTACT_EMAIL IS NULL
);

-- Student 178: LOCOMOTION
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'LOCOMOTION', 
       'LOCOMOTION Parent', 
       '', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'LOCOMOTION'
    AND CONTACT_EMAIL IS NULL
);

-- Student 179: ALL AMERICAN
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'ALL AMERICAN', 
       'ALL Parent', 
       'AMERICAN', 
       17,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'ALL AMERICAN'
    AND CONTACT_EMAIL IS NULL
);

-- Student 180: Baya Bowencamp
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Baya Bowencamp', 
       'Baya Parent', 
       'Bowencamp', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Baya Bowencamp'
    AND CONTACT_EMAIL IS NULL
);

-- Student 181: FOREVER YOUNG
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'FOREVER YOUNG', 
       'FOREVER Parent', 
       'YOUNG', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'FOREVER YOUNG'
    AND CONTACT_EMAIL IS NULL
);

-- Student 182: Elin Fransen
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Elin Fransen', 
       'Elin Parent', 
       'Fransen', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Elin Fransen'
    AND CONTACT_EMAIL IS NULL
);

-- Student 183: PHRESH OFF THE RUNWAY
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'PHRESH OFF THE RUNWAY', 
       'PHRESH Parent', 
       'OFF THE RUNWAY', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'PHRESH OFF THE RUNWAY'
    AND CONTACT_EMAIL IS NULL
);

-- Student 184: Vivian Fincher
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Vivian Fincher', 
       'Vivian Parent', 
       'Fincher', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Vivian Fincher'
    AND CONTACT_EMAIL IS NULL
);

-- Student 185: Vivienne Fortino
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Vivienne Fortino', 
       'Vivienne Parent', 
       'Fortino', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Vivienne Fortino'
    AND CONTACT_EMAIL IS NULL
);

-- Student 186: Larkin-Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Larkin-Solo', 
       'Larkin-Solo Parent', 
       '', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Larkin-Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 187: Hazel-Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Hazel-Solo', 
       'Hazel-Solo Parent', 
       '', 
       16,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Hazel-Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 188: Everly-Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Everly-Solo', 
       'Everly-Solo Parent', 
       '', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Everly-Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 189: Remi-Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Remi-Solo', 
       'Remi-Solo Parent', 
       '', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Remi-Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 190: Mia Powell
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mia Powell', 
       'Mia Parent', 
       'Powell', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mia Powell'
    AND CONTACT_EMAIL IS NULL
);

-- Student 191: I don't speak French
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'I don''t speak French', 
       'I Parent', 
       'don''t speak French', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'I don''t speak French'
    AND CONTACT_EMAIL IS NULL
);

-- Student 192: Marik-Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Marik-Solo', 
       'Marik-Solo Parent', 
       '', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Marik-Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 193: Gemma-Solo
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gemma-Solo', 
       'Gemma-Solo Parent', 
       '', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gemma-Solo'
    AND CONTACT_EMAIL IS NULL
);

-- Student 194: Jeanna- Hazel Acting
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Jeanna- Hazel Acting', 
       'Jeanna- Parent', 
       'Hazel Acting', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Jeanna- Hazel Acting'
    AND CONTACT_EMAIL IS NULL
);

-- Student 195: Kaylee Kaloustian
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Kaylee Kaloustian', 
       'Kaylee Parent', 
       'Kaloustian', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Kaylee Kaloustian'
    AND CONTACT_EMAIL IS NULL
);

-- Student 196: Natalie
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Natalie', 
       'Natalie Parent', 
       '', 
       6,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Natalie'
    AND CONTACT_EMAIL IS NULL
);

-- Student 197: Aydin
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Aydin', 
       'Aydin Parent', 
       '', 
       12,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Aydin'
    AND CONTACT_EMAIL IS NULL
);

-- Student 198: Mia Tubbs
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mia Tubbs', 
       'Mia Parent', 
       'Tubbs', 
       9,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mia Tubbs'
    AND CONTACT_EMAIL IS NULL
);

-- Student 199: Kelly
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Kelly', 
       'Kelly Parent', 
       '', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Kelly'
    AND CONTACT_EMAIL IS NULL
);

-- Student 200: TODDLER CLASS
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'TODDLER CLASS', 
       'TODDLER Parent', 
       'CLASS', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'TODDLER CLASS'
    AND CONTACT_EMAIL IS NULL
);

-- Student 201: Kinley Griffin
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Kinley Griffin', 
       'Kinley Parent', 
       'Griffin', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Kinley Griffin'
    AND CONTACT_EMAIL IS NULL
);

-- Student 202: Mary- Stuido Rental
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Mary- Stuido Rental', 
       'Mary- Parent', 
       'Stuido Rental', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Mary- Stuido Rental'
    AND CONTACT_EMAIL IS NULL
);

-- Student 203: Gabi Menezes
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Gabi Menezes', 
       'Gabi Parent', 
       'Menezes', 
       11,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Gabi Menezes'
    AND CONTACT_EMAIL IS NULL
);

-- Student 204: Reserved
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Reserved', 
       'Reserved Parent', 
       '', 
       13,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Reserved'
    AND CONTACT_EMAIL IS NULL
);

-- Student 205: Adriana Bucheru
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Adriana Bucheru', 
       'Adriana Parent', 
       'Bucheru', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Adriana Bucheru'
    AND CONTACT_EMAIL IS NULL
);

-- Student 206: Reserved reserved
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Reserved reserved', 
       'Reserved Parent', 
       'reserved', 
       19,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Reserved reserved'
    AND CONTACT_EMAIL IS NULL
);

-- Student 207: Alexa Bucheru
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Alexa Bucheru', 
       'Alexa Parent', 
       'Bucheru', 
       8,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Alexa Bucheru'
    AND CONTACT_EMAIL IS NULL
);

-- Student 208: Juliana Leal
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Juliana Leal', 
       'Juliana Parent', 
       'Leal', 
       14,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Juliana Leal'
    AND CONTACT_EMAIL IS NULL
);

-- Student 209: Alia Pollema
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Alia Pollema', 
       'Alia Parent', 
       'Pollema', 
       7,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Alia Pollema'
    AND CONTACT_EMAIL IS NULL
);

-- Student 210: Claire
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Claire', 
       'Claire Parent', 
       '', 
       10,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Claire'
    AND CONTACT_EMAIL IS NULL
);

-- Student 211: Teagan
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'Teagan', 
       'Teagan Parent', 
       '', 
       5,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'Teagan'
    AND CONTACT_EMAIL IS NULL
);

-- Student 212: MEGHAN SOLO CHOREO
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'MEGHAN SOLO CHOREO', 
       'MEGHAN Parent', 
       'SOLO CHOREO', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'MEGHAN SOLO CHOREO'
    AND CONTACT_EMAIL IS NULL
);

-- Student 213: RESERVED
INSERT INTO STUDIO_STUDENTS (STUDENT_NAME, PARENT_FIRST_NAME, PARENT_LAST_NAME, AGE, NOTES)
SELECT 'RESERVED', 
       'RESERVED Parent', 
       '', 
       15,
       'Imported from Excel calendar data'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM STUDIO_STUDENTS 
    WHERE STUDENT_NAME = 'RESERVED'
    AND CONTACT_EMAIL IS NULL
);

COMMIT;

-- Verification query
SELECT COUNT(*) as student_count FROM STUDIO_STUDENTS;
