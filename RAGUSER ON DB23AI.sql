insert into segs (id, seg, doc) values ('1', '--- Page 1 ---
Oracle DatabaseA complete and simple platform for all data management needs.Building an Environment of InnovationAdd a SQL statement, not a database! Oracle Database delivers best-of-breed support for all modern data types, workloads, and development styles. You can enhance productivity through the flexibility and simplicity of choosing the best data model and development framework for your application without worrying about integrating different database engines, managing multiple security models, or synchronizing data.Thanks to its commitment to continuous innovation and readiness, tens of thousands of businesses rely on the Oracle Database today. Whether youre a growing business or a globally recognized organization, the Oracle Database offers unparalleled availability, reliability, security, and scalability. In fact, 97% of the Fortune 100 companies use Oracle Database.Always Enterprise Ready
Elevate Your EfficiencyThe Oracle Database lets you focus on development', '23ai-one-pager');

select id, doc, vec, seg from segs where doc = '23ai-one-pager' order by 1;
select id, doc, vec, seg from segs where doc = 'enterprise_manager_overview_-_dd' order by 1;
select id, doc, vec, seg from segs where doc = 'Oracle RAG and Agentic AI Development Value Triangle'  order by 1;
select id, doc, vec, seg from segs where doc = 'Introducing OCI Database with PostgreSQL (Cloud World) (Customer Presentation)' order by 1;
select id, doc, vec, seg from segs where doc = 'OCI PostgreSQL Customer Deck (Customer Presentation)'  order by 1;

delete from segs where doc = '23ai-one-pager';

update segs set vec = (SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING seg as data) 
FROM segs where id = 1 and doc = '23ai-one-pager') where id = 1 and doc = '23ai-one-pager';

update segs set vec = (SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING seg as data) 
FROM segs where id = 4 and doc = '23ai-one-pager') where id = 4 and doc = '23ai-one-pager';

SELECT seg FROM segs WHERE doc = 'Introducing OCI Database with PostgreSQL (Cloud World) (Customer Presentation)' 
ORDER BY vector_distance(vec, 
(SELECT vector_embedding(ALL_MINILM_L12_V2 using 'Open Source Commitment' as data)), COSINE) 
FETCH FIRST 2 ROWS ONLY;

select unique(doc), count(*) as vectors from segs group by doc;

SELECT seg FROM segs WHERE doc = 'Introducing OCI Database with PostgreSQL (Cloud World) (Customer Presentation)' 
ORDER BY vector_distance(vec, 
(SELECT vector_embedding(ALL_MINILM_L12_V2 using 'OCIs unique features' as data)), COSINE) 
FETCH FIRST 2 ROWS ONLY;

SELECT seg FROM segs WHERE doc = 'Spiritual Informationals Book' 
ORDER BY vector_distance(vec, 
(SELECT vector_embedding(ALL_MINILM_L12_V2 using 'What miracles are mentioned' as data)), COSINE) 
FETCH FIRST 5 ROWS ONLY;

Tables for Clerk authentication
-- Users table
CREATE TABLE RAG_AUTH_USERS (
    id VARCHAR2(36) PRIMARY KEY,
    clerk_user_id VARCHAR2(100) UNIQUE NOT NULL, -- Clerk's user ID
    email VARCHAR2(255) UNIQUE NOT NULL,
    first_name VARCHAR2(100),
    last_name VARCHAR2(100),
    is_active NUMBER(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- User preferences/metadata
CREATE TABLE RAG_AUTH_USER_METADATA (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES RAG_AUTH_USERS(id),
    clerk_user_id VARCHAR2(100) NOT NULL,
    metadata_key VARCHAR2(100) NOT NULL,
    metadata_value CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User activity log (optional - for audit trail)
CREATE TABLE RAG_AUTH_USER_ACTIVITY (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES RAG_AUTH_USERS(id),
    clerk_user_id VARCHAR2(100) NOT NULL,
    activity_type VARCHAR2(50) NOT NULL, -- 'login', 'logout', 'document_upload', etc.
    activity_details CLOB, -- JSON with additional details
    ip_address VARCHAR2(45),
    user_agent VARCHAR2(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document access permissions (if needed later)
CREATE TABLE RAG_AUTH_DOCUMENT_PERMISSIONS (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES RAG_AUTH_USERS(id),
    document_id VARCHAR2(36), -- Reference to your documents
    permission_type VARCHAR2(20) NOT NULL, -- 'read', 'write', 'delete'
    granted_by VARCHAR2(36), -- User ID who granted permission
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IDX_RAG_AUTH_USERS_CLERK_ID ON RAG_AUTH_USERS(clerk_user_id);
CREATE INDEX IDX_RAG_AUTH_USERS_EMAIL ON RAG_AUTH_USERS(email);
CREATE INDEX IDX_RAG_AUTH_METADATA_USER ON RAG_AUTH_USER_METADATA(user_id);
CREATE INDEX IDX_RAG_AUTH_METADATA_CLERK ON RAG_AUTH_USER_METADATA(clerk_user_id);
CREATE INDEX IDX_RAG_AUTH_ACTIVITY_USER ON RAG_AUTH_USER_ACTIVITY(user_id);
CREATE INDEX IDX_RAG_AUTH_ACTIVITY_DATE ON RAG_AUTH_USER_ACTIVITY(created_at);