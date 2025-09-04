#!/bin/bash

# Simple restart script that uses the same SSH connection as deploy.sh
# This assumes the deploy.sh script already has working SSH configuration

# Configuration - Same as deploy.sh
LINUX_SERVER="129.146.0.190"
LINUX_USER="opc"
SSH_KEY="/Users/pcannata/.ssh/ssh-key-2023-03-25-phil-react.key"

echo "🔄 Attempting to restart services on remote server..."
echo "This will use the same SSH configuration as your deploy script."
echo ""

# Build SSH command
SSH_CMD="ssh"
if [[ -n "$SSH_KEY" ]]; then
    SSH_CMD="ssh -i $SSH_KEY"
fi

# Try to restart the services using the SSH connection from deploy script
# First, let's see what servers we can reach
$SSH_CMD "$LINUX_USER@$LINUX_SERVER" << 'EOF'
echo "Connected to remote server successfully"

# Stop any running Next.js processes
echo "Stopping Next.js processes..."
sudo pkill -f "next" || echo "No Next.js processes found"
sleep 2

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading nginx..."
sudo nginx -s reload

# Navigate to application directory and start the app
echo "Starting Next.js application..."
cd /opt/rag-js-agent-app
nohup npm start > server.log 2>&1 &

sleep 3

# Check if the process started
if pgrep -f "next" > /dev/null; then
    echo "✅ Next.js application started successfully"
else
    echo "❌ Failed to start Next.js application"
    echo "Last few lines of log:"
    tail -n 10 server.log
fi

echo "✅ Remote restart completed"
EOF

echo "Remote restart process finished."
