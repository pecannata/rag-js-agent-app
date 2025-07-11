#!/bin/bash

# SQLcl Connection Pool Daemon
# Creates persistent SQLcl connections that stay alive in the background

POOL_DIR="/tmp/sqlcl_pool"
POOL_SIZE=3
DAEMON_DIR="$POOL_DIR/daemons"
QUERY_DIR="$POOL_DIR/queries"
RESPONSE_DIR="$POOL_DIR/responses"

# Create necessary directories
mkdir -p "$DAEMON_DIR" "$QUERY_DIR" "$RESPONSE_DIR"

# Function to start a connection daemon
start_daemon() {
    local connection_id=$1
    local daemon_pid_file="$DAEMON_DIR/daemon_${connection_id}.pid"
    local query_pipe="$QUERY_DIR/query_${connection_id}.pipe"
    local response_pipe="$RESPONSE_DIR/response_${connection_id}.pipe"
    
    # Create named pipes
    mkfifo "$query_pipe" "$response_pipe" 2>/dev/null || true
    
    # Start the daemon in background
    (
        echo "🚀 Starting SQLcl daemon $connection_id" >&2
        
        # Start persistent SQLcl session
        sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<EOF &
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

-- Keep connection alive and process queries
DECLARE
    query_text VARCHAR2(32767);
    cursor_id INTEGER;
    result_count INTEGER;
BEGIN
    -- Connection established, ready to process queries
    DBMS_OUTPUT.PUT_LINE('DAEMON_READY_$connection_id');
    
    -- Main processing loop
    LOOP
        -- This would be replaced with actual query processing
        -- For now, just keep the connection alive
        DBMS_LOCK.SLEEP(1);
    END LOOP;
END;
/
EOF
        
        # Store daemon PID
        echo $! > "$daemon_pid_file"
        
        # Process queries from the pipe
        while IFS= read -r query < "$query_pipe"; do
            if [[ "$query" == "SHUTDOWN" ]]; then
                echo "🛑 Shutting down daemon $connection_id" >&2
                break
            fi
            
            echo "🔍 Processing query on daemon $connection_id: ${query:0:50}..." >&2
            
            # Execute query and send result to response pipe
            sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<EOF > "$response_pipe"
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
$query;
EOF
        done
        
        # Cleanup
        rm -f "$daemon_pid_file" "$query_pipe" "$response_pipe"
        echo "✅ Daemon $connection_id shut down" >&2
        
    ) &
    
    local daemon_pid=$!
    echo "$daemon_pid" > "$daemon_pid_file"
    echo "🎯 Started daemon $connection_id with PID $daemon_pid" >&2
}

# Function to stop a daemon
stop_daemon() {
    local connection_id=$1
    local daemon_pid_file="$DAEMON_DIR/daemon_${connection_id}.pid"
    local query_pipe="$QUERY_DIR/query_${connection_id}.pipe"
    
    if [[ -f "$daemon_pid_file" ]]; then
        local daemon_pid=$(cat "$daemon_pid_file")
        
        # Send shutdown signal
        echo "SHUTDOWN" > "$query_pipe" 2>/dev/null || true
        
        # Wait a bit then force kill if necessary
        sleep 2
        if kill -0 "$daemon_pid" 2>/dev/null; then
            kill "$daemon_pid" 2>/dev/null || true
            sleep 1
            kill -9 "$daemon_pid" 2>/dev/null || true
        fi
        
        rm -f "$daemon_pid_file"
        echo "🛑 Stopped daemon $connection_id" >&2
    fi
}

# Function to execute query using daemon
execute_query_daemon() {
    local query="$1"
    local connection_id
    local query_pipe
    local response_pipe
    
    # Find available daemon
    for i in $(seq 1 $POOL_SIZE); do
        local daemon_pid_file="$DAEMON_DIR/daemon_${i}.pid"
        if [[ -f "$daemon_pid_file" ]]; then
            local daemon_pid=$(cat "$daemon_pid_file")
            if kill -0 "$daemon_pid" 2>/dev/null; then
                connection_id=$i
                break
            else
                # Daemon died, clean up
                rm -f "$daemon_pid_file"
            fi
        fi
    done
    
    # If no daemon available, start one
    if [[ -z "$connection_id" ]]; then
        connection_id=1
        start_daemon "$connection_id"
        sleep 3  # Wait for daemon to start
    fi
    
    query_pipe="$QUERY_DIR/query_${connection_id}.pipe"
    response_pipe="$RESPONSE_DIR/response_${connection_id}.pipe"
    
    # Send query to daemon
    echo "$query" > "$query_pipe"
    
    # Read response
    cat "$response_pipe"
}

# Function to start all daemons
start_pool() {
    echo "🚀 Starting SQLcl connection pool..."
    
    for i in $(seq 1 $POOL_SIZE); do
        start_daemon "$i"
        sleep 1  # Stagger startup
    done
    
    echo "✅ Connection pool started with $POOL_SIZE daemons"
}

# Function to stop all daemons
stop_pool() {
    echo "🛑 Stopping SQLcl connection pool..."
    
    for i in $(seq 1 $POOL_SIZE); do
        stop_daemon "$i"
    done
    
    # Clean up directories
    rm -rf "$DAEMON_DIR" "$QUERY_DIR" "$RESPONSE_DIR"
    rmdir "$POOL_DIR" 2>/dev/null || true
    
    echo "✅ Connection pool stopped"
}

# Function to check pool status
pool_status() {
    echo "🔍 SQLcl Connection Pool Daemon Status"
    echo "======================================"
    echo "Pool directory: $POOL_DIR"
    echo "Pool size: $POOL_SIZE"
    echo ""
    
    local active_daemons=0
    
    for i in $(seq 1 $POOL_SIZE); do
        local daemon_pid_file="$DAEMON_DIR/daemon_${i}.pid"
        if [[ -f "$daemon_pid_file" ]]; then
            local daemon_pid=$(cat "$daemon_pid_file")
            if kill -0 "$daemon_pid" 2>/dev/null; then
                echo "🔗 Daemon $i: ACTIVE (PID: $daemon_pid)"
                ((active_daemons++))
            else
                echo "🔒 Daemon $i: DEAD (PID: $daemon_pid)"
                rm -f "$daemon_pid_file"
            fi
        else
            echo "⭕ Daemon $i: NOT STARTED"
        fi
    done
    
    echo ""
    echo "Active daemons: $active_daemons"
    echo "Available connections: $active_daemons"
}

# Main script logic
case "${1:-status}" in
    "start")
        start_pool
        ;;
    "stop")
        stop_pool
        ;;
    "restart")
        stop_pool
        sleep 2
        start_pool
        ;;
    "status")
        pool_status
        ;;
    "query")
        if [[ -z "$2" ]]; then
            echo "Usage: $0 query \"SQL_STATEMENT\""
            exit 1
        fi
        execute_query_daemon "$2"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|query}"
        echo "  start        - Start connection pool daemons"
        echo "  stop         - Stop connection pool daemons"
        echo "  restart      - Restart connection pool"
        echo "  status       - Show pool status"
        echo "  query \"SQL\" - Execute SQL query using daemon pool"
        exit 1
        ;;
esac
