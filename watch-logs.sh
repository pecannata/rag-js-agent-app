#!/bin/bash

# Configuration - Update these to match your deployment
LINUX_SERVER="129.146.0.190"
LINUX_USER="opc"
SERVICE_NAME="rag-js-agent"
SSH_KEY="~/.ssh/ssh-key-2023-03-25-phil-react.key"  # SSH key for Oracle Cloud

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}"
    echo "📋 RAG JS Agent App - Log Watcher"
    echo "================================="
    echo -e "${NC}"
    echo "Server: $LINUX_SERVER"
    echo "Service: $SERVICE_NAME"
    echo "User: $LINUX_USER"
    echo ""
}

function check_connection() {
    echo -e "${YELLOW}Testing SSH connection...${NC}"
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "echo 'Connection successful'" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
    else
        echo -e "${RED}❌ SSH connection failed${NC}"
        exit 1
    fi
}

function show_service_status() {
    echo -e "${YELLOW}Current service status:${NC}"
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo systemctl status $SERVICE_NAME --no-pager -l"
    echo ""
}

function watch_logs() {
    echo -e "${YELLOW}Starting log monitoring (Press Ctrl+C to stop)...${NC}"
    echo -e "${BLUE}==================================================${NC}"
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    # Follow the logs in real-time
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo journalctl -u $SERVICE_NAME -f --no-pager"
}

function show_recent_logs() {
    echo -e "${YELLOW}Recent logs (last 50 lines):${NC}"
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo journalctl -u $SERVICE_NAME --no-pager -l -n 50"
}

function show_help() {
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  -f, --follow    Follow logs in real-time (default)"
    echo "  -r, --recent    Show recent logs (last 50 lines)"
    echo "  -s, --status    Show service status"
    echo "  -h, --help      Show this help message"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    -r|--recent)
        print_header
        check_connection
        show_recent_logs
        ;;
    -s|--status)
        print_header
        check_connection
        show_service_status
        ;;
    -h|--help)
        show_help
        ;;
    -f|--follow|"")
        print_header
        check_connection
        show_service_status
        watch_logs
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
esac
