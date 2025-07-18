-- =====================================================
-- PHASE 1: Database Schema for Subscriber Email Notifications and Scheduled Posts
-- =====================================================

-- 1. Extend blog_posts table with scheduling functionality
-- =====================================================

-- Add scheduled_date column for post scheduling
ALTER TABLE blog_posts ADD (
    scheduled_date TIMESTAMP NULL,
    is_scheduled NUMBER(1) DEFAULT 0 CHECK (is_scheduled IN (0, 1))
);

-- Add comment for clarity
COMMENT ON COLUMN blog_posts.scheduled_date IS 'Date/time when the post should be automatically published';
COMMENT ON COLUMN blog_posts.is_scheduled IS 'Flag indicating if this post is scheduled (0=no, 1=yes)';

-- Update the status check constraint to include 'scheduled'
ALTER TABLE blog_posts DROP CONSTRAINT SYS_C0016234; -- This will need to be adjusted based on your actual constraint name
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_status_check 
    CHECK (status IN ('draft', 'published', 'archived', 'scheduled'));

-- 2. Create subscribers table
-- =====================================================

CREATE TABLE subscribers (
    id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    email VARCHAR2(255) NOT NULL UNIQUE,
    name VARCHAR2(255),
    subscription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR2(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unsubscribed')),
    unsubscribe_token VARCHAR2(100) UNIQUE NOT NULL,
    email_verified NUMBER(1) DEFAULT 0 CHECK (email_verified IN (0, 1)),
    verification_token VARCHAR2(100),
    verification_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);
CREATE INDEX idx_subscribers_verification_token ON subscribers(verification_token);

-- Add comments
COMMENT ON TABLE subscribers IS 'Blog subscribers for email notifications';
COMMENT ON COLUMN subscribers.email IS 'Subscriber email address (unique)';
COMMENT ON COLUMN subscribers.name IS 'Subscriber display name (optional)';
COMMENT ON COLUMN subscribers.status IS 'Subscription status: active, inactive, or unsubscribed';
COMMENT ON COLUMN subscribers.unsubscribe_token IS 'Unique token for unsubscribe links';
COMMENT ON COLUMN subscribers.email_verified IS 'Whether email has been verified (0=no, 1=yes)';
COMMENT ON COLUMN subscribers.verification_token IS 'Token for email verification';

-- 3. Create email_campaigns table
-- =====================================================

CREATE TABLE email_campaigns (
    id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    post_id NUMBER NOT NULL,
    campaign_type VARCHAR2(50) DEFAULT 'post_notification' CHECK (campaign_type IN ('post_notification', 'scheduled_post', 'newsletter')),
    subject VARCHAR2(500) NOT NULL,
    sent_date TIMESTAMP,
    recipient_count NUMBER DEFAULT 0,
    successful_sends NUMBER DEFAULT 0,
    failed_sends NUMBER DEFAULT 0,
    status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_campaign_post FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_campaigns_post_id ON email_campaigns(post_id);
CREATE INDEX idx_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_campaigns_sent_date ON email_campaigns(sent_date);
CREATE INDEX idx_campaigns_type ON email_campaigns(campaign_type);

-- Add comments
COMMENT ON TABLE email_campaigns IS 'Email campaigns sent to subscribers';
COMMENT ON COLUMN email_campaigns.post_id IS 'ID of the blog post this campaign is about';
COMMENT ON COLUMN email_campaigns.campaign_type IS 'Type of campaign: post_notification, scheduled_post, or newsletter';
COMMENT ON COLUMN email_campaigns.subject IS 'Email subject line';
COMMENT ON COLUMN email_campaigns.recipient_count IS 'Total number of recipients';
COMMENT ON COLUMN email_campaigns.successful_sends IS 'Number of successfully sent emails';
COMMENT ON COLUMN email_campaigns.failed_sends IS 'Number of failed email sends';

-- 4. Create scheduled_jobs table
-- =====================================================

CREATE TABLE scheduled_jobs (
    id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    job_type VARCHAR2(50) NOT NULL CHECK (job_type IN ('publish_post', 'send_email', 'cleanup')),
    reference_id NUMBER, -- Can reference post_id, campaign_id, etc.
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempts NUMBER DEFAULT 0,
    max_attempts NUMBER DEFAULT 3,
    error_message CLOB,
    result_data CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_scheduled_jobs_type ON scheduled_jobs(job_type);
CREATE INDEX idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_scheduled_for ON scheduled_jobs(scheduled_for);
CREATE INDEX idx_scheduled_jobs_reference_id ON scheduled_jobs(reference_id);

-- Add comments
COMMENT ON TABLE scheduled_jobs IS 'Queue for scheduled background jobs';
COMMENT ON COLUMN scheduled_jobs.job_type IS 'Type of job: publish_post, send_email, or cleanup';
COMMENT ON COLUMN scheduled_jobs.reference_id IS 'Reference to related entity (post_id, campaign_id, etc.)';
COMMENT ON COLUMN scheduled_jobs.scheduled_for IS 'When this job should be executed';
COMMENT ON COLUMN scheduled_jobs.attempts IS 'Number of execution attempts';
COMMENT ON COLUMN scheduled_jobs.max_attempts IS 'Maximum allowed attempts before marking as failed';

-- 5. Create email_campaign_logs table (for tracking individual sends)
-- =====================================================

CREATE TABLE email_campaign_logs (
    id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    campaign_id NUMBER NOT NULL,
    subscriber_id NUMBER NOT NULL,
    status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    sent_at TIMESTAMP,
    error_message VARCHAR2(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_log_campaign FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_subscriber FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate sends
    CONSTRAINT uk_campaign_subscriber UNIQUE (campaign_id, subscriber_id)
);

-- Create indexes for performance
CREATE INDEX idx_campaign_logs_campaign_id ON email_campaign_logs(campaign_id);
CREATE INDEX idx_campaign_logs_subscriber_id ON email_campaign_logs(subscriber_id);
CREATE INDEX idx_campaign_logs_status ON email_campaign_logs(status);

-- Add comments
COMMENT ON TABLE email_campaign_logs IS 'Individual email send logs for tracking delivery';
COMMENT ON COLUMN email_campaign_logs.campaign_id IS 'ID of the email campaign';
COMMENT ON COLUMN email_campaign_logs.subscriber_id IS 'ID of the subscriber who received the email';
COMMENT ON COLUMN email_campaign_logs.status IS 'Status of this individual email send';

-- 6. Create triggers for automatic timestamp updates
-- =====================================================

-- Trigger for subscribers table
CREATE OR REPLACE TRIGGER trg_subscribers_updated_at
    BEFORE UPDATE ON subscribers
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Trigger for email_campaigns table
CREATE OR REPLACE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Trigger for scheduled_jobs table
CREATE OR REPLACE TRIGGER trg_scheduled_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- 7. Insert some sample data for testing (optional)
-- =====================================================

-- Sample subscribers (commented out - uncomment if you want test data)
/*
INSERT INTO subscribers (email, name, unsubscribe_token, email_verified) VALUES 
('test@example.com', 'Test User', UPPER(SYS_GUID()), 1);

INSERT INTO subscribers (email, name, unsubscribe_token, email_verified) VALUES 
('demo@example.com', 'Demo User', UPPER(SYS_GUID()), 1);
*/

-- 8. Views for easier querying (optional but recommended)
-- =====================================================

-- View for scheduled posts that are ready to publish
CREATE OR REPLACE VIEW v_posts_ready_to_publish AS
SELECT 
    bp.*,
    TO_CHAR(bp.scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date_iso
FROM blog_posts bp
WHERE bp.status = 'scheduled' 
  AND bp.scheduled_date <= CURRENT_TIMESTAMP
  AND bp.is_scheduled = 1;

-- View for active subscribers
CREATE OR REPLACE VIEW v_active_subscribers AS
SELECT * FROM subscribers 
WHERE status = 'active' AND email_verified = 1;

-- View for campaign statistics
CREATE OR REPLACE VIEW v_campaign_stats AS
SELECT 
    ec.*,
    ROUND((ec.successful_sends / NULLIF(ec.recipient_count, 0)) * 100, 2) as success_rate,
    bp.title as post_title,
    bp.status as post_status
FROM email_campaigns ec
LEFT JOIN blog_posts bp ON ec.post_id = bp.id;

COMMIT;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- 
-- This migration adds:
-- 1. Scheduling functionality to blog_posts table
-- 2. Complete subscriber management system
-- 3. Email campaign tracking
-- 4. Scheduled job queue for background processing
-- 5. Detailed logging for email delivery
-- 6. Helpful views for common queries
-- 7. Proper indexes for performance
-- 8. Automatic timestamp triggers
--
-- Next steps:
-- 1. Run this migration script
-- 2. Update your API routes to handle scheduling
-- 3. Create subscription/unsubscription endpoints
-- 4. Implement the job scheduler (cron or node-cron)
-- 5. Choose and configure an email service
-- =====================================================
