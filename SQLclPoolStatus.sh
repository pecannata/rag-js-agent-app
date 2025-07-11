#!/bin/bash

# SQLcl Connection Pool Status Monitor
# Usage: ./SQLclPoolStatus.sh

echo "🔍 SQLcl Connection Pool Status Monitor"
echo "========================================"

sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<EOF
-- Enable connection pooling (if not already enabled)
SET POOL ENABLED
SET POOL MIN 2
SET POOL MAX 10
SET POOL INCREMENT 1
SET POOL TIMEOUT 60
SET POOL VALIDATE

-- Show pool information
SHOW POOL

-- Get current session information
SELECT 
    'Current Session ID: ' || SYS_CONTEXT('USERENV', 'SESSIONID') as session_info
FROM DUAL;

-- Get connection statistics
SELECT 
    'Database: ' || SYS_CONTEXT('USERENV', 'DB_NAME') as db_info,
    'User: ' || SYS_CONTEXT('USERENV', 'SESSION_USER') as user_info,
    'Host: ' || SYS_CONTEXT('USERENV', 'HOST') as host_info,
    'Current Time: ' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') as current_time
FROM DUAL;

-- Check active sessions for our user
SELECT 
    'Active Sessions: ' || COUNT(*) as active_sessions
FROM V\$SESSION 
WHERE USERNAME = 'RAGUSER' 
AND STATUS = 'ACTIVE';

exit;
EOF

echo ""
echo "✅ Pool status check completed"
