-- Final Optimized Data Loading - Only FULL_WEEK_JSON column

INSERT INTO STUDIO_PRIVATE_LESSONS (
    WEEK_START_DATE,
    WEEK_IDENTIFIER,
    SHEET_NAME,
    FULL_WEEK_JSON
) VALUES (
    DATE '2025-06-09',
    '2025-06-09-69 -615',
    '69 -615',
    q'[{
        "week_info": {
            "sheet_name": "69 -615",
            "week_dates": [],
            "extracted_date": "2025-07-12T12:53:10.738446"
        },
        "teachers": {
            "FF4A86E8": "N/A",
            "FFEFEFEF": "N/A", 
            "FFFFF2CC": "PAIGE",
            "FFA4C2F4": "Larkin",
            "FFFF00FF": "TBD",
            "FFEAD1DC": "MEGHAN",
            "FFF3F3F3": "N/A",
            "FF00FF00": "Gabi",
            "FFB4A7D6": "Kinley",
            "FFFF9900": "Ava Fransen",
            "FFC9DAF8": "RYANN",
            "FFD9EAD3": "GRACIE",
            "FFD9D2E9": "CARALIN ( BALLET TEACHER)",
            "FFF6B26B": "HUNTER",
            "FFE06666": "ARDEN"
        },
        "studios": ["STUDIO 2", "STUDIO 1", "STUDIO 3"],
        "schedule": [
            {
                "time": "10:00:00",
                "lessons": [
                    {
                        "day": "TUESDAY",
                        "date": "2025-06-09",
                        "studio": "STUDIO 1",
                        "student_info": "Reese",
                        "teacher_color": "FFFFF2CC",
                        "teacher": "PAIGE",
                        "column": 5
                    },
                    {
                        "day": "THURSDAY",
                        "date": "2025-06-12",
                        "studio": "STUDIO 3",
                        "student_info": "Reese",
                        "teacher_color": "FFA4C2F4",
                        "teacher": "Larkin",
                        "column": 11
                    }
                ]
            },
            {
                "time": "11:00:00",
                "lessons": [
                    {
                        "day": "MONDAY",
                        "date": "2025-06-09",
                        "studio": "STUDIO 1",
                        "student_info": "Rehearsal",
                        "teacher_color": "FFFF00FF",
                        "teacher": "TBD",
                        "column": 3
                    },
                    {
                        "day": "WEDNESDAY",
                        "date": "2025-06-10",
                        "studio": "STUDIO 3",
                        "student_info": "Vivian Fincher",
                        "teacher_color": "FFFFF2CC",
                        "teacher": "PAIGE",
                        "column": 8
                    }
                ]
            },
            {
                "time": "16:00:00",
                "lessons": [
                    {
                        "day": "THURSDAY",
                        "date": "2025-06-12",
                        "studio": "STUDIO 3",
                        "student_info": "Kinley - technique / solo",
                        "teacher_color": "FFFFF2CC",
                        "teacher": "PAIGE",
                        "column": 11
                    },
                    {
                        "day": "FRIDAY",
                        "date": "2025-06-12",
                        "studio": "STUDIO 1",
                        "student_info": "Kinley - solo",
                        "teacher_color": "FFA4C2F4",
                        "teacher": "Larkin",
                        "column": 12
                    }
                ]
            }
        ],
        "summary": {
            "total_time_slots": 3,
            "total_lessons": 6,
            "unique_teachers": 4,
            "date_range": "2025-06-09 to 2025-06-12"
        }
    }]'
);

COMMIT;
