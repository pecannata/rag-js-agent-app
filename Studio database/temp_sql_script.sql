
-- Create STUDIO_PRIVATE_LESSONS table
DROP TABLE IF EXISTS STUDIO_PRIVATE_LESSONS;

CREATE TABLE STUDIO_PRIVATE_LESSONS (
    id SERIAL PRIMARY KEY,
    week_identifier VARCHAR(50) NOT NULL,
    sheet_name VARCHAR(100) NOT NULL,
    time_slot TIME NOT NULL,
    lesson_data JSONB NOT NULL,
    extracted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_studio_private_lessons_week ON STUDIO_PRIVATE_LESSONS(week_identifier);
CREATE INDEX idx_studio_private_lessons_time ON STUDIO_PRIVATE_LESSONS(time_slot);
CREATE INDEX idx_studio_private_lessons_sheet ON STUDIO_PRIVATE_LESSONS(sheet_name);

-- Add comments
COMMENT ON TABLE STUDIO_PRIVATE_LESSONS IS 'Store private lesson schedules extracted from Excel files';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.week_identifier IS 'Unique identifier for the week (e.g., 2025-06-09)';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.sheet_name IS 'Excel sheet name (e.g., 69-615)';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.time_slot IS 'Time slot for the lessons';
COMMENT ON COLUMN STUDIO_PRIVATE_LESSONS.lesson_data IS 'JSON data containing all lessons for this time slot';
