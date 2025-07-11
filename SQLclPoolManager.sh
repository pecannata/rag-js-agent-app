#!/bin/bash

# SQLcl Connection Pool Manager
# Maintains persistent SQLcl connections for better performance

POOL_DIR="/tmp/sqlcl_pool"
POOL_SIZE=3
CONNECTION_TIMEOUT=300  # 5 minutes
LOCK_TIMEOUT=30

# Create pool directory
mkdir -p "$POOL_DIR"

# Function to get a connection from the pool
get_connection() {
    local connection_id
    local lockfile
    local start_time=$(date +%s)
    
    # Try to get an available connection
    for i in $(seq 1 $POOL_SIZE); do
        lockfile="$POOL_DIR/conn_${i}.lock"
        
        # Try to acquire lock with timeout
        if (set -C; echo $$ > "$lockfile") 2>/dev/null; then
            connection_id=$i
            echo "🔗 Acquired connection $connection_id" >&2
            break
        fi
        
        # Check if lock is stale (process died)
        if [[ -f "$lockfile" ]]; then
            local lock_pid=$(cat "$lockfile" 2>/dev/null)
            if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
                echo "🧹 Cleaning stale lock for connection $i" >&2
                rm -f "$lockfile"
                if (set -C; echo $$ > "$lockfile") 2>/dev/null; then
                    connection_id=$i
                    echo "🔗 Acquired connection $connection_id (after cleanup)" >&2
                    break
                fi
            fi
        fi
    done
    
    # If no connection available, wait and retry
    if [[ -z "$connection_id" ]]; then
        local elapsed=$(($(date +%s) - start_time))
        if [[ $elapsed -lt $LOCK_TIMEOUT ]]; then
            echo "⏳ No connections available, waiting..." >&2
            sleep 1
            get_connection
            return
        else
            echo "❌ Connection pool exhausted after ${LOCK_TIMEOUT}s" >&2
            exit 1
        fi
    fi
    
    echo "$connection_id"
}

# Function to release a connection
release_connection() {
    local connection_id=$1
    local lockfile="$POOL_DIR/conn_${connection_id}.lock"
    
    rm -f "$lockfile"
    echo "🔓 Released connection $connection_id" >&2
}

# Function to execute query using a pooled connection
execute_query() {
    local query="$1"
    local connection_id
    
    # Get connection from pool
    connection_id=$(get_connection)
    
    # Set up trap to ensure connection is released
    trap "release_connection $connection_id" EXIT INT TERM
    
    # Execute query
    echo "🚀 Executing query on connection $connection_id" >&2
    
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
$query;
EOF
    
    # Connection will be released by trap
}

# Function to check pool status
pool_status() {
    echo "🔍 SQLcl Connection Pool Status"
    echo "=============================="
    echo "Pool directory: $POOL_DIR"
    echo "Pool size: $POOL_SIZE"
    echo "Connection timeout: ${CONNECTION_TIMEOUT}s"
    echo ""
    
    local active_connections=0
    local stale_connections=0
    
    for i in $(seq 1 $POOL_SIZE); do
        local lockfile="$POOL_DIR/conn_${i}.lock"
        if [[ -f "$lockfile" ]]; then
            local lock_pid=$(cat "$lockfile" 2>/dev/null)
            if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
                echo "🔗 Connection $i: ACTIVE (PID: $lock_pid)"
                ((active_connections++))
            else
                echo "🔒 Connection $i: STALE (PID: $lock_pid)"
                ((stale_connections++))
            fi
        else
            echo "✅ Connection $i: AVAILABLE"
        fi
    done
    
    echo ""
    echo "Active connections: $active_connections"
    echo "Stale connections: $stale_connections"
    echo "Available connections: $((POOL_SIZE - active_connections - stale_connections))"
}

# Function to cleanup stale connections
cleanup_pool() {
    echo "🧹 Cleaning up stale connections..."
    
    for i in $(seq 1 $POOL_SIZE); do
        local lockfile="$POOL_DIR/conn_${i}.lock"
        if [[ -f "$lockfile" ]]; then
            local lock_pid=$(cat "$lockfile" 2>/dev/null)
            if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
                echo "🧹 Removing stale lock for connection $i (PID: $lock_pid)"
                rm -f "$lockfile"
            fi
        fi
    done
    
    echo "✅ Pool cleanup completed"
}

# Function to shutdown pool
shutdown_pool() {
    echo "🛑 Shutting down connection pool..."
    
    # Remove all lock files
    rm -f "$POOL_DIR"/conn_*.lock
    
    # Remove pool directory if empty
    rmdir "$POOL_DIR" 2>/dev/null || true
    
    echo "✅ Pool shutdown completed"
}

# Main script logic
case "${1:-query}" in
    "status")
        pool_status
        ;;
    "cleanup")
        cleanup_pool
        ;;
    "shutdown")
        shutdown_pool
        ;;
    "query")
        if [[ -z "$2" ]]; then
            echo "Usage: $0 query \"SQL_STATEMENT\""
            exit 1
        fi
        execute_query "$2"
        ;;
    *)
        echo "Usage: $0 {query|status|cleanup|shutdown}"
        echo "  query \"SQL\"  - Execute SQL query using connection pool"
        echo "  status       - Show pool status"
        echo "  cleanup      - Clean up stale connections"
        echo "  shutdown     - Shutdown connection pool"
        exit 1
        ;;
esac
