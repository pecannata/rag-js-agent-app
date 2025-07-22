#!/bin/bash

# RAG JS Agent App - Rollback Script
# This script rolls back to the most recent backup on the Linux server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - EDIT THESE VALUES (should match deploy.sh)
LINUX_SERVER="129.146.0.190"           # e.g., "192.168.1.100" or "your-server.com"
LINUX_USER="opc"             # e.g., "oracle" or "root"
SSH_KEY="/Users/pcannata/.ssh/ssh-key-2023-03-25-phil-react.key"                # e.g., "~/.ssh/id_rsa" (optional, leave empty for password auth)
DEPLOY_PATH="/opt/rag-js-agent-app"
SERVICE_NAME="rag-js-agent"

function print_step() {
    echo -e "${BLUE}===> $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function check_config() {
    print_step "Checking configuration..."
    
    if [[ -z "$LINUX_SERVER" ]]; then
        print_error "LINUX_SERVER not set. Please edit the script and set your server IP/hostname."
        exit 1
    fi
    
    if [[ -z "$LINUX_USER" ]]; then
        print_error "LINUX_USER not set. Please edit the script and set your Linux username."
        exit 1
    fi
    
    print_success "Configuration looks good"
}

function test_ssh_connection() {
    print_step "Testing SSH connection to $LINUX_USER@$LINUX_SERVER..."
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    if $SSH_CMD -o ConnectTimeout=10 "$LINUX_USER@$LINUX_SERVER" "echo 'SSH connection successful'" &> /dev/null; then
        print_success "SSH connection successful"
    else
        print_error "Cannot connect to $LINUX_USER@$LINUX_SERVER via SSH"
        print_warning "Make sure:"
        echo "  - The server is running and accessible"
        echo "  - SSH is enabled on the server"
        echo "  - Your SSH key is set up correctly (or password auth is enabled)"
        echo "  - The username and server address are correct"
        exit 1
    fi
}

function list_backups() {
    print_step "Listing available backups..."
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    # Get backup list
    BACKUP_LIST=$($SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo ls -dt /opt/backups/rag-js-agent/backup_* 2>/dev/null || echo 'NO_BACKUPS'")
    
    if [[ "$BACKUP_LIST" == "NO_BACKUPS" ]]; then
        print_error "No backups found on the server"
        echo "Available backup directory structure:"
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo ls -la /opt/backups/ 2>/dev/null || echo 'No backups directory found'"
        exit 1
    fi
    
    echo "Available backups:"
    echo "$BACKUP_LIST" | head -5 | while read backup; do
        if [[ -n "$backup" ]]; then
            BACKUP_NAME=$(basename "$backup")
            # Try to get backup info
            BACKUP_INFO=$($SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo cat '$backup/backup_info.txt' 2>/dev/null" || echo "No info available")
            echo "  📦 $BACKUP_NAME"
            echo "     $(echo "$BACKUP_INFO" | head -2 | tail -1)"
        fi
    done
    
    # Return the most recent backup
    echo "$BACKUP_LIST" | head -1
}

function perform_rollback() {
    local BACKUP_TO_RESTORE="$1"
    
    if [[ -z "$BACKUP_TO_RESTORE" ]]; then
        print_error "No backup specified for rollback"
        exit 1
    fi
    
    print_step "Rolling back to: $(basename "$BACKUP_TO_RESTORE")"
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    # Create rollback script for remote execution
    cat > /tmp/rollback_remote.sh << 'ROLLBACK_SCRIPT'
#!/bin/bash
set -e

BACKUP_PATH="$1"
DEPLOY_PATH="$2"
SERVICE_NAME="$3"

echo "🔄 Starting rollback process..."

# Verify backup exists
if [ ! -d "$BACKUP_PATH" ]; then
    echo "❌ Backup directory not found: $BACKUP_PATH"
    exit 1
fi

# Show backup info
if [ -f "$BACKUP_PATH/backup_info.txt" ]; then
    echo "📋 Backup information:"
    sudo cat "$BACKUP_PATH/backup_info.txt"
    echo ""
fi

# Stop current service
echo "Stopping current service..."
sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true

# Kill any remaining processes
echo "Cleaning up running processes..."
pkill -f "npm start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

if netstat -tulpn 2>/dev/null | grep -q ":3000"; then
    echo "Force killing remaining processes on port 3000..."
    lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
fi

# Backup current data files before rollback
echo "Backing up current user data..."
if [ -d "$DEPLOY_PATH/data" ]; then
    sudo cp -r "$DEPLOY_PATH/data" "/tmp/current_data_backup" || true
fi

# Remove current application
echo "Removing current application..."
sudo rm -rf "$DEPLOY_PATH"

# Restore application from backup
echo "Restoring application from backup..."
sudo cp -r "$BACKUP_PATH/$(basename $DEPLOY_PATH)" "$DEPLOY_PATH"
sudo chown -R $USER:$USER "$DEPLOY_PATH"

# Restore current user data
echo "Restoring current user data..."
if [ -d "/tmp/current_data_backup" ]; then
    sudo cp -r "/tmp/current_data_backup"/* "$DEPLOY_PATH/data/" 2>/dev/null || true
    sudo rm -rf "/tmp/current_data_backup"
    echo "✅ User data preserved during rollback"
fi

# Restore system files if they exist in backup
if [ -f "$BACKUP_PATH/system/$SERVICE_NAME.service" ]; then
    echo "Restoring systemd service file..."
    sudo cp "$BACKUP_PATH/system/$SERVICE_NAME.service" "/etc/systemd/system/"
fi

if [ -d "$BACKUP_PATH/nginx" ]; then
    echo "Restoring nginx configuration..."
    for nginx_file in "$BACKUP_PATH/nginx"/*; do
        if [ -f "$nginx_file" ]; then
            filename=$(basename "$nginx_file")
            if [[ "$filename" == *.conf ]]; then
                sudo cp "$nginx_file" "/etc/nginx/conf.d/"
            else
                sudo cp "$nginx_file" "/etc/nginx/sites-available/" 2>/dev/null || true
            fi
        fi
    done
fi

# Reinstall dependencies
cd "$DEPLOY_PATH"
echo "Reinstalling Node.js dependencies..."
npm install --legacy-peer-deps

# Rebuild application
echo "Rebuilding application..."
npm run build

# Reload systemd and restart services
echo "Restarting services..."
sudo systemctl daemon-reload
sudo systemctl start "$SERVICE_NAME"
sudo systemctl restart nginx 2>/dev/null || true

# Verify service is running
sleep 5
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Service is running after rollback"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
else
    echo "❌ Service failed to start after rollback"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
    sudo journalctl -u "$SERVICE_NAME" --no-pager -l --since "5 minutes ago"
    exit 1
fi

echo "🎉 Rollback completed successfully!"
ROLLBACK_SCRIPT

    # Transfer and execute rollback script
    SCP_CMD="scp"
    if [[ -n "$SSH_KEY" ]]; then
        SCP_CMD="scp -i $SSH_KEY"
    fi
    
    $SCP_CMD /tmp/rollback_remote.sh "$LINUX_USER@$LINUX_SERVER:/tmp/"
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "chmod +x /tmp/rollback_remote.sh && /tmp/rollback_remote.sh '$BACKUP_TO_RESTORE' '$DEPLOY_PATH' '$SERVICE_NAME'"
    
    # Cleanup
    rm -f /tmp/rollback_remote.sh
    
    print_success "Rollback completed successfully!"
}

function main() {
    echo -e "${GREEN}"
    echo "🔄 RAG JS Agent App - Rollback Script"
    echo "====================================="
    echo -e "${NC}"
    
    # Configuration and connection check
    check_config
    test_ssh_connection
    
    # List available backups and get the most recent
    LATEST_BACKUP=$(list_backups)
    
    if [[ -z "$LATEST_BACKUP" || "$LATEST_BACKUP" == "NO_BACKUPS" ]]; then
        print_error "No backups available for rollback"
        exit 1
    fi
    
    echo ""
    print_step "Most recent backup: $(basename "$LATEST_BACKUP")"
    echo ""
    
    # Confirm rollback
    read -p "Do you want to rollback to this backup? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        perform_rollback "$LATEST_BACKUP"
        
        echo ""
        echo -e "${GREEN}🎉 Rollback Complete!${NC}"
        echo "======================================"
        echo "Application has been rolled back to the previous version."
        echo "Application URL: https://alwayscurious.ai"
        echo ""
        echo "To check the service status:"
        echo "  sudo systemctl status $SERVICE_NAME"
        echo "  sudo journalctl -u $SERVICE_NAME -f"
    else
        echo "Rollback cancelled."
        exit 0
    fi
}

# Run main function
main "$@"
