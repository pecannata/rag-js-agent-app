-- Create blog_comments table for comment system with moderation
-- Run this with: ./SQLclScript.sh "$(cat create-blog-comments-table.sql)"

-- Drop table if it exists (for development)
-- DROP TABLE blog_comments CASCADE CONSTRAINTS;

CREATE TABLE blog_comments (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    blog_post_id NUMBER NOT NULL,
    blog_post_title VARCHAR2(500) NOT NULL, -- Store the blog post title for foreign key
    author_name VARCHAR2(255) NOT NULL,
    author_email VARCHAR2(255) NOT NULL,
    author_website VARCHAR2(500),
    comment_content CLOB NOT NULL,
    status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
    -- Notification preferences
    notify_follow_up CHAR(1) DEFAULT 'N' CHECK (notify_follow_up IN ('Y', 'N')),
    notify_new_posts CHAR(1) DEFAULT 'N' CHECK (notify_new_posts IN ('Y', 'N')),
    save_info CHAR(1) DEFAULT 'N' CHECK (save_info IN ('Y', 'N')),
    -- Metadata
    ip_address VARCHAR2(45), -- Store IP for spam detection
    user_agent VARCHAR2(500), -- Store user agent for spam detection
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by VARCHAR2(255),
    -- Add foreign key constraint to blog_posts table (using title as PK)
    CONSTRAINT fk_blog_comments_post FOREIGN KEY (blog_post_title) REFERENCES blog_posts(title) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_blog_comments_post_id ON blog_comments(blog_post_id);
CREATE INDEX idx_blog_comments_post_title ON blog_comments(blog_post_title);
CREATE INDEX idx_blog_comments_status ON blog_comments(status);
CREATE INDEX idx_blog_comments_created ON blog_comments(created_at);
CREATE INDEX idx_blog_comments_email ON blog_comments(author_email);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER trg_blog_comments_updated_at
    BEFORE UPDATE ON blog_comments
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON blog_comments TO RAGUSER;

-- Show table structure
DESC blog_comments;

-- Show that table was created successfully
SELECT COUNT(*) as comment_count FROM blog_comments;

COMMIT;
