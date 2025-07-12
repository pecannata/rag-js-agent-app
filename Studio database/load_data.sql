-- Bulk Data Loading Script for Studio Private Lessons
-- This script loads the first 10 records from the insert script

-- First record
INSERT INTO STUDIO_PRIVATE_LESSONS (
    WEEK_START_DATE,
    WEEK_IDENTIFIER,
    SHEET_NAME,
    TIME_SLOT,
    LESSON_DATA,
    FULL_WEEK_JSON
) VALUES (
    DATE '2025-06-09',
    '2025-06-09-69 -615',
    '69 -615',
    '10:00:00',
    q'[{"time": "10:00:00", "lessons": [{"day": "TUESDAY", "date": "2025-06-09", "studio": "STUDIO 1", "student_info": "Reese", "teacher_color": "FFFFF2CC", "teacher": "PAIGE", "column": 5}, {"day": "THURSDAY", "date": "2025-06-12", "studio": "STUDIO 3", "student_info": "Reese", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 11}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 1", "student_info": "Kaylee Kaloustian", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 12}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 2", "student_info": "Kelly jazz", "teacher_color": null, "teacher": "Unknown", "column": 13}]}]',
    q'[{"week_info": {"sheet_name": "69 -615", "week_dates": [], "extracted_date": "2025-07-12T12:53:10.738446"}, "teachers": {"FF4A86E8": "N/A", "FFEFEFEF": "N/A", "FFFFF2CC": "PAIGE", "FFA4C2F4": "Larkin", "FFFF00FF": "TBD", "FFEAD1DC": "MEGHAN", "FFF3F3F3": "N/A", "FF00FF00": "Gabi", "FFB4A7D6": "Kinley", "FFFF9900": "Ava Fransen", "FFC9DAF8": "RYANN", "FFD9EAD3": "GRACIE", "FFD9D2E9": "CARALIN ( BALLET TEACHER)", "FFF6B26B": "HUNTER", "FFE06666": "ARDEN"}, "studios": ["STUDIO 2", "STUDIO 1", "STUDIO 3"], "schedule": [{"time": "10:00:00", "lessons": [{"day": "TUESDAY", "date": "2025-06-09", "studio": "STUDIO 1", "student_info": "Reese", "teacher_color": "FFFFF2CC", "teacher": "PAIGE", "column": 5}, {"day": "THURSDAY", "date": "2025-06-12", "studio": "STUDIO 3", "student_info": "Reese", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 11}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 1", "student_info": "Kaylee Kaloustian", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 12}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 2", "student_info": "Kelly jazz", "teacher_color": null, "teacher": "Unknown", "column": 13}]}], "summary": {"total_time_slots": 15, "total_lessons": 76, "unique_teachers": 13, "date_range": "Unknown"}}]'
);

-- Second record
INSERT INTO STUDIO_PRIVATE_LESSONS (
    WEEK_START_DATE,
    WEEK_IDENTIFIER,
    SHEET_NAME,
    TIME_SLOT,
    LESSON_DATA,
    FULL_WEEK_JSON
) VALUES (
    DATE '2025-06-09',
    '2025-06-09-69 -615',
    '69 -615',
    '11:00:00',
    q'[{"time": "11:00:00", "lessons": [{"day": "MONDAY", "date": "2025-06-09", "studio": "STUDIO 1", "student_info": "Rehearsal", "teacher_color": "FFFF00FF", "teacher": "TBD", "column": 3}, {"day": "TUESDAY", "date": "2025-06-02", "studio": "STUDIO 3", "student_info": "Kaylee Kaloustian", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 6}, {"day": "WEDNESDAY", "date": "2025-06-10", "studio": "STUDIO 1", "student_info": "Rehearsal", "teacher_color": "FFFF00FF", "teacher": "TBD", "column": 7}, {"day": "WEDNESDAY", "date": "2025-06-10", "studio": "STUDIO 3", "student_info": "Vivian Fincher", "teacher_color": "FFFFF2CC", "teacher": "PAIGE", "column": 8}, {"day": "THURSDAY", "date": "2025-06-11", "studio": "STUDIO 1", "student_info": "Mila & Reese duo", "teacher_color": "FFEAD1DC", "teacher": "MEGHAN", "column": 9}, {"day": "THURSDAY", "date": "2025-06-12", "studio": "STUDIO 3", "student_info": "Everly/Larkin", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 11}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 1", "student_info": "Marik solo", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 12}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 2", "student_info": "Teagan tap", "teacher_color": null, "teacher": "Unknown", "column": 13}]}]',
    q'[{"week_info": {"sheet_name": "69 -615", "week_dates": [], "extracted_date": "2025-07-12T12:53:10.738446"}, "teachers": {"FF4A86E8": "N/A", "FFEFEFEF": "N/A", "FFFFF2CC": "PAIGE", "FFA4C2F4": "Larkin", "FFFF00FF": "TBD", "FFEAD1DC": "MEGHAN", "FFF3F3F3": "N/A", "FF00FF00": "Gabi", "FFB4A7D6": "Kinley", "FFFF9900": "Ava Fransen", "FFC9DAF8": "RYANN", "FFD9EAD3": "GRACIE", "FFD9D2E9": "CARALIN ( BALLET TEACHER)", "FFF6B26B": "HUNTER", "FFE06666": "ARDEN"}, "studios": ["STUDIO 2", "STUDIO 1", "STUDIO 3"], "schedule": [{"time": "10:00:00", "lessons": [{"day": "TUESDAY", "date": "2025-06-09", "studio": "STUDIO 1", "student_info": "Reese", "teacher_color": "FFFFF2CC", "teacher": "PAIGE", "column": 5}, {"day": "THURSDAY", "date": "2025-06-12", "studio": "STUDIO 3", "student_info": "Reese", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 11}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 1", "student_info": "Kaylee Kaloustian", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 12}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 2", "student_info": "Kelly jazz", "teacher_color": null, "teacher": "Unknown", "column": 13}]}], "summary": {"total_time_slots": 15, "total_lessons": 76, "unique_teachers": 13, "date_range": "Unknown"}}]'
);

-- Third record  
INSERT INTO STUDIO_PRIVATE_LESSONS (
    WEEK_START_DATE,
    WEEK_IDENTIFIER,
    SHEET_NAME,
    TIME_SLOT,
    LESSON_DATA,
    FULL_WEEK_JSON
) VALUES (
    DATE '2025-06-09',
    '2025-06-09-69 -615',
    '69 -615',
    '16:00:00',
    q'[{"time": "16:00:00", "lessons": [{"day": "THURSDAY", "date": "2025-06-12", "studio": "STUDIO 3", "student_info": "Kinley - technique / solo", "teacher_color": "FFFFF2CC", "teacher": "PAIGE", "column": 11}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 1", "student_info": "Kinley - solo", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 12}]}]',
    q'[{"week_info": {"sheet_name": "69 -615", "week_dates": [], "extracted_date": "2025-07-12T12:53:10.738446"}, "teachers": {"FF4A86E8": "N/A", "FFEFEFEF": "N/A", "FFFFF2CC": "PAIGE", "FFA4C2F4": "Larkin", "FFFF00FF": "TBD", "FFEAD1DC": "MEGHAN", "FFF3F3F3": "N/A", "FF00FF00": "Gabi", "FFB4A7D6": "Kinley", "FFFF9900": "Ava Fransen", "FFC9DAF8": "RYANN", "FFD9EAD3": "GRACIE", "FFD9D2E9": "CARALIN ( BALLET TEACHER)", "FFF6B26B": "HUNTER", "FFE06666": "ARDEN"}, "studios": ["STUDIO 2", "STUDIO 1", "STUDIO 3"], "schedule": [{"time": "10:00:00", "lessons": [{"day": "TUESDAY", "date": "2025-06-09", "studio": "STUDIO 1", "student_info": "Reese", "teacher_color": "FFFFF2CC", "teacher": "PAIGE", "column": 5}, {"day": "THURSDAY", "date": "2025-06-12", "studio": "STUDIO 3", "student_info": "Reese", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 11}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 1", "student_info": "Kaylee Kaloustian", "teacher_color": "FFA4C2F4", "teacher": "Larkin", "column": 12}, {"day": "FRIDAY", "date": "2025-06-12", "studio": "STUDIO 2", "student_info": "Kelly jazz", "teacher_color": null, "teacher": "Unknown", "column": 13}]}], "summary": {"total_time_slots": 15, "total_lessons": 76, "unique_teachers": 13, "date_range": "Unknown"}}]'
);

COMMIT;
