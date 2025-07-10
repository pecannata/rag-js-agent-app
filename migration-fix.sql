-- =====================================================
-- MIGRATION FIX SCRIPT
-- =====================================================

-- Fix the status constraint - drop the old one and keep the new one
ALTER TABLE blog_posts DROP CONSTRAINT SYS_C008454;

-- Complete the triggers that had compilation errors
CREATE OR REPLACE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_scheduled_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Complete the views
CREATE OR REPLACE VIEW v_posts_ready_to_publish AS
SELECT 
    bp.*,
    TO_CHAR(bp.scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date_iso
FROM blog_posts bp
WHERE bp.status = 'scheduled' 
  AND bp.scheduled_date <= CURRENT_TIMESTAMP
  AND bp.is_scheduled = 1;

CREATE OR REPLACE VIEW v_active_subscribers AS
SELECT * FROM subscribers 
WHERE status = 'active' AND email_verified = 1;

CREATE OR REPLACE VIEW v_campaign_stats AS
SELECT 
    ec.*,
    ROUND((ec.successful_sends / NULLIF(ec.recipient_count, 0)) * 100, 2) as success_rate,
    bp.title as post_title,
    bp.status as post_status
FROM email_campaigns ec
LEFT JOIN blog_posts bp ON ec.post_id = bp.id;

COMMIT;
