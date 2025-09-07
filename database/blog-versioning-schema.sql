-- Blog Post Branch-like Versioning Schema
-- Extends existing blog_posts table with branching capabilities

-- 1. Blog Post Branches Table
-- Stores different versions/branches of blog posts
CREATE TABLE blog_post_branches (
    branch_id VARCHAR2(50) PRIMARY KEY,
    post_id NUMBER NOT NULL,
    branch_name VARCHAR2(100) NOT NULL,
    parent_branch_id VARCHAR2(50), -- References another branch this was created from
    branch_type VARCHAR2(50) DEFAULT 'feature', -- 'main', 'draft', 'feature', 'hotfix', 'review'
    
    -- Post content (same structure as blog_posts)
    title VARCHAR2(500) NOT NULL,
    slug VARCHAR2(300),
    content CLOB,
    excerpt VARCHAR2(2000),
    author VARCHAR2(100),
    status VARCHAR2(50) DEFAULT 'draft',
    tags VARCHAR2(1000),
    published_at TIMESTAMP,
    scheduled_date TIMESTAMP,
    is_scheduled NUMBER(1) DEFAULT 0,
    
    -- Branch metadata
    created_by VARCHAR2(100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR2(100),
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active NUMBER(1) DEFAULT 1,
    is_merged NUMBER(1) DEFAULT 0,
    merged_date TIMESTAMP,
    merged_by VARCHAR2(100),
    
    -- Foreign key to parent branch
    CONSTRAINT fk_blog_branch_parent FOREIGN KEY (parent_branch_id) 
        REFERENCES blog_post_branches(branch_id),
    
    -- Unique constraint on post_id + branch_name
    CONSTRAINT uk_blog_branch_post_name UNIQUE (post_id, branch_name)
);

-- 2. Blog Post Merge History
-- Tracks merge operations between branches
CREATE TABLE blog_post_merges (
    merge_id VARCHAR2(50) PRIMARY KEY,
    from_branch_id VARCHAR2(50) NOT NULL,
    to_branch_id VARCHAR2(50) NOT NULL,
    post_id NUMBER NOT NULL,
    merge_strategy VARCHAR2(50) DEFAULT 'auto', -- 'auto', 'manual', 'ai-assisted'
    merge_status VARCHAR2(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'conflicted'
    
    -- Merge metadata
    merged_by VARCHAR2(100),
    merge_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    merge_message VARCHAR2(1000),
    
    -- Conflict resolution
    conflicts_detected CLOB, -- JSON array of conflicts
    ai_resolution_used NUMBER(1) DEFAULT 0,
    ai_confidence_score NUMBER(3,2), -- 0.00 to 1.00
    
    -- Foreign keys
    CONSTRAINT fk_merge_from_branch FOREIGN KEY (from_branch_id) 
        REFERENCES blog_post_branches(branch_id),
    CONSTRAINT fk_merge_to_branch FOREIGN KEY (to_branch_id) 
        REFERENCES blog_post_branches(branch_id)
);

-- 3. Blog Post Branch Conflicts
-- Stores conflict details for manual resolution
CREATE TABLE blog_post_conflicts (
    conflict_id VARCHAR2(50) PRIMARY KEY,
    merge_id VARCHAR2(50) NOT NULL,
    conflict_type VARCHAR2(50) NOT NULL, -- 'content', 'title', 'excerpt', 'tags', 'metadata'
    field_name VARCHAR2(100) NOT NULL,
    
    -- Conflict data
    base_value CLOB,
    current_branch_value CLOB,
    incoming_branch_value CLOB,
    resolved_value CLOB,
    
    -- Resolution metadata
    resolution_method VARCHAR2(50), -- 'manual', 'ai-suggested', 'auto-accept-current', 'auto-accept-incoming'
    resolved_by VARCHAR2(100),
    resolved_date TIMESTAMP,
    ai_suggestion CLOB, -- AI-generated resolution suggestion
    ai_reasoning CLOB, -- AI explanation for the suggestion
    
    -- Status
    status VARCHAR2(50) DEFAULT 'pending', -- 'pending', 'resolved', 'skipped'
    
    -- Foreign key
    CONSTRAINT fk_conflict_merge FOREIGN KEY (merge_id) 
        REFERENCES blog_post_merges(merge_id)
);

-- 4. Blog Post Change Log
-- Tracks all changes made to branches (audit trail)
CREATE TABLE blog_post_change_log (
    change_id VARCHAR2(50) PRIMARY KEY,
    branch_id VARCHAR2(50) NOT NULL,
    post_id NUMBER NOT NULL,
    
    -- Change details
    change_type VARCHAR2(50) NOT NULL, -- 'create', 'update', 'merge', 'delete'
    field_changed VARCHAR2(100),
    old_value CLOB,
    new_value CLOB,
    change_summary VARCHAR2(500), -- AI-generated or user-provided summary
    
    -- Change metadata
    changed_by VARCHAR2(100),
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_reason VARCHAR2(500),
    
    -- AI analysis
    ai_impact_score NUMBER(3,2), -- 0.00 to 1.00 (how significant is this change)
    ai_change_category VARCHAR2(100), -- 'content-update', 'style-change', 'factual-correction', etc.
    
    -- Foreign key
    CONSTRAINT fk_changelog_branch FOREIGN KEY (branch_id) 
        REFERENCES blog_post_branches(branch_id)
);

-- 5. Create indexes for performance
CREATE INDEX idx_blog_branches_post_id ON blog_post_branches(post_id);
CREATE INDEX idx_blog_branches_name ON blog_post_branches(branch_name);
CREATE INDEX idx_blog_branches_type ON blog_post_branches(branch_type);
CREATE INDEX idx_blog_branches_active ON blog_post_branches(is_active);
CREATE INDEX idx_blog_branches_created ON blog_post_branches(created_date);

CREATE INDEX idx_blog_merges_post_id ON blog_post_merges(post_id);
CREATE INDEX idx_blog_merges_status ON blog_post_merges(merge_status);
CREATE INDEX idx_blog_merges_date ON blog_post_merges(merge_date);

CREATE INDEX idx_blog_conflicts_merge ON blog_post_conflicts(merge_id);
CREATE INDEX idx_blog_conflicts_status ON blog_post_conflicts(status);

CREATE INDEX idx_blog_changelog_branch ON blog_post_change_log(branch_id);
CREATE INDEX idx_blog_changelog_post ON blog_post_change_log(post_id);
CREATE INDEX idx_blog_changelog_date ON blog_post_change_log(change_date);

-- 6. Create triggers for automatic timestamp updates
CREATE OR REPLACE TRIGGER trg_blog_branches_update
    BEFORE UPDATE ON blog_post_branches
    FOR EACH ROW
BEGIN
    :NEW.modified_date := CURRENT_TIMESTAMP;
END;
/

-- 7. Function to generate unique IDs
CREATE OR REPLACE FUNCTION generate_blog_id RETURN VARCHAR2 IS
BEGIN
    RETURN 'blog_' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISS') || '_' || 
           LPAD(DBMS_RANDOM.VALUE(1000, 9999), 4, '0');
END;
/

-- 8. Create initial 'main' branches for existing posts
-- This will be run separately after table creation
/*
INSERT INTO blog_post_branches (
    branch_id, post_id, branch_name, branch_type, 
    title, slug, content, excerpt, author, status, tags, 
    published_at, scheduled_date, is_scheduled, created_by
)
SELECT 
    generate_blog_id() as branch_id,
    id as post_id,
    'main' as branch_name,
    'main' as branch_type,
    title, slug, content, excerpt, author, status, tags,
    published_at, scheduled_date, is_scheduled,
    'system' as created_by
FROM blog_posts
WHERE id IS NOT NULL;
*/

-- 9. Create views for easy querying
CREATE OR REPLACE VIEW v_blog_active_branches AS
SELECT 
    b.branch_id,
    b.post_id,
    b.branch_name,
    b.branch_type,
    b.title,
    b.author,
    b.status,
    b.created_date,
    b.modified_date,
    b.created_by,
    b.is_merged,
    CASE 
        WHEN b.branch_type = 'main' THEN 'Published Version'
        WHEN b.branch_type = 'draft' THEN 'Draft Version'  
        WHEN b.branch_type = 'review' THEN 'Under Review'
        ELSE 'Feature Branch'
    END as branch_description
FROM blog_post_branches b
WHERE b.is_active = 1
ORDER BY b.post_id, 
    CASE b.branch_type 
        WHEN 'main' THEN 1 
        WHEN 'draft' THEN 2 
        WHEN 'review' THEN 3 
        ELSE 4 
    END,
    b.created_date DESC;

-- 10. Create view for merge conflicts that need resolution
CREATE OR REPLACE VIEW v_blog_pending_conflicts AS
SELECT 
    c.conflict_id,
    m.merge_id,
    m.post_id,
    fb.branch_name as from_branch,
    tb.branch_name as to_branch,
    c.conflict_type,
    c.field_name,
    c.status,
    m.merged_by,
    c.ai_suggestion IS NOT NULL as has_ai_suggestion,
    c.resolved_date
FROM blog_post_conflicts c
JOIN blog_post_merges m ON c.merge_id = m.merge_id
JOIN blog_post_branches fb ON m.from_branch_id = fb.branch_id
JOIN blog_post_branches tb ON m.to_branch_id = tb.branch_id
WHERE c.status = 'pending'
ORDER BY m.merge_date DESC;

COMMIT;

-- Comments
COMMENT ON TABLE blog_post_branches IS 'Stores different versions/branches of blog posts with Git-like branching';
COMMENT ON TABLE blog_post_merges IS 'Tracks merge operations between blog post branches';  
COMMENT ON TABLE blog_post_conflicts IS 'Stores merge conflicts that require resolution';
COMMENT ON TABLE blog_post_change_log IS 'Audit trail of all changes made to blog post branches';
