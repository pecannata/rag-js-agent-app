-- Ultra-minimalist design for STUDIO_PRIVATE_LESSONS table
-- Remove WEEK_IDENTIFIER and SHEET_NAME columns since this data exists in the JSON

-- Drop existing table and recreate with minimal columns
DROP TABLE STUDIO_PRIVATE_LESSONS CASCADE CONSTRAINTS;

-- Create ultra-minimalist table with only essential columns
CREATE TABLE STUDIO_PRIVATE_LESSONS (
    LESSON_ID         VARCHAR2(50) PRIMARY KEY,
    WEEK_START_DATE   DATE NOT NULL,
    FULL_WEEK_JSON    CLOB CHECK (FULL_WEEK_JSON IS JSON),
    CREATED_DATE      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    MODIFIED_DATE     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on JSON structure for efficient querying
CREATE INDEX IX_STUDIO_WEEK_START ON STUDIO_PRIVATE_LESSONS(WEEK_START_DATE);

-- Index on sheet name extracted from JSON
CREATE INDEX IX_STUDIO_SHEET_JSON ON STUDIO_PRIVATE_LESSONS(
    JSON_VALUE(FULL_WEEK_JSON, '$.week_info.sheet_name')
);

-- Index on week identifier extracted from JSON  
CREATE INDEX IX_STUDIO_WEEK_ID_JSON ON STUDIO_PRIVATE_LESSONS(
    JSON_VALUE(FULL_WEEK_JSON, '$.week_info.week_identifier')
);

-- Create view for time slots with extracted metadata
CREATE OR REPLACE VIEW V_STUDIO_TIME_SLOTS AS
SELECT 
    s.LESSON_ID,
    s.WEEK_START_DATE,
    JSON_VALUE(s.FULL_WEEK_JSON, '$.week_info.sheet_name') AS SHEET_NAME,
    JSON_VALUE(s.FULL_WEEK_JSON, '$.week_info.week_identifier') AS WEEK_IDENTIFIER,
    jt.TIME_SLOT,
    jt.LESSON_DATA
FROM STUDIO_PRIVATE_LESSONS s,
JSON_TABLE(s.FULL_WEEK_JSON, '$.schedule[*]'
    COLUMNS (
        TIME_SLOT VARCHAR2(20) PATH '$.time_slot',
        LESSON_DATA CLOB FORMAT JSON PATH '$.lessons'
    )
) jt;

-- Create detailed view for individual lessons
CREATE OR REPLACE VIEW V_STUDIO_LESSONS_DETAIL AS
SELECT 
    ts.LESSON_ID,
    ts.WEEK_START_DATE,
    ts.SHEET_NAME,
    ts.WEEK_IDENTIFIER,
    ts.TIME_SLOT,
    ld.STUDENT_NAME,
    ld.TEACHER,
    ld.STUDIO,
    ld.LESSON_TYPE,
    ld.STATUS
FROM V_STUDIO_TIME_SLOTS ts,
JSON_TABLE(ts.LESSON_DATA, '$[*]'
    COLUMNS (
        STUDENT_NAME VARCHAR2(200) PATH '$.student_name',
        TEACHER VARCHAR2(100) PATH '$.teacher',
        STUDIO VARCHAR2(50) PATH '$.studio',
        LESSON_TYPE VARCHAR2(50) PATH '$.lesson_type',
        STATUS VARCHAR2(50) PATH '$.status'
    )
) ld
ORDER BY ts.WEEK_START_DATE, ts.TIME_SLOT, ld.STUDENT_NAME;

-- Add comments to document the ultra-minimalist design
COMMENT ON TABLE STUDIO_PRIVATE_LESSONS IS 'Ultra-minimalist private lesson schedule storage - all metadata extracted from JSON';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.LESSON_ID IS 'Unique identifier for each lesson schedule entry';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.WEEK_START_DATE IS 'Start date of the lesson week';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.FULL_WEEK_JSON IS 'Complete JSON containing all lesson data, metadata, and schedule information';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.CREATED_DATE IS 'Timestamp when record was created';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.MODIFIED_DATE IS 'Timestamp when record was last modified';

COMMIT;
