#!/bin/bash

# Enhanced SQLclScript.sh with Connection Pooling
# This script maintains compatibility with the original SQLclScript.sh
# while adding connection pooling for better performance

if [ $# -ne 1 ]; then
    echo "Usage: $0 SQLQuery"
    exit 1
fi

# Check if pool manager is available
POOL_MANAGER="./SQLclPoolManager.sh"
if [[ -x "$POOL_MANAGER" ]]; then
    # Use connection pool for better performance
    "$POOL_MANAGER" query "$1"
else
    # Fallback to original method
    echo "⚠️  Pool manager not found, using direct connection" >&2
    
    sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<EOF
-- Configure session settings for optimal performance
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
-- Execute query
$1;
EOF
fi
