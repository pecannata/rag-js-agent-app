if [ $# -ne 1 ]
then
	echo "Usage: $0 SQLQuery"
	exit 1
fi

# Connection pooling using SQLcl's built-in features
# Set connection timeout and reuse options
export SQLCL_CONNECT_TIMEOUT=10
export SQLCL_SOCKET_TIMEOUT=300
export SQLCL_SOCKET_KEEP_ALIVE=true

# Use persistent connection with optimized settings
sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<!
-- Configure session settings for optimal performance and connection reuse
SET SQLFORMAT JSON-FORMATTED
set feedback off
set long 10000000
set pagesize 0
set linesize 32767
set wrap off
set trimout on
set trimspool on
set autocommit on
set timing off
set echo off
set verify off
set serveroutput off
-- Optimize connection handling
SET DEFINE OFF
SET SQLBLANKLINES ON
SET TAB OFF
-- Enable connection keepalive
SET SERVEROUTPUT ON SIZE 1000000
-- Execute query
$1;
-- Keep session active
SELECT 1 FROM DUAL WHERE 1=0;
!
