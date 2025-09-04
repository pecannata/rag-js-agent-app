#!/bin/bash

# Script to restart services on remote server after configuration changes

set -e

# Load environment variables from .env.secrets.local
if [ -f .env.secrets.local ]; then
    echo "Loading API keys from .env.secrets.local file..."
    set -a
    source .env.secrets.local
    set +a
else
    echo "⚠️ Warning: .env.secrets.local file not found. Some environment variables may not be set."
fi

# Check if required variables are set
if [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_USER" ]; then
    echo "❌ Error: REMOTE_HOST and REMOTE_USER must be set in .env.secrets.local"
    exit 1
fi

echo "🔄 Restarting Services on Remote Server"
echo "========================================"
echo ""
echo "Host: $REMOTE_HOST"
echo "User: $REMOTE_USER"
echo ""

# Test SSH connection
echo "===> Testing SSH connection to $REMOTE_USER@$REMOTE_HOST..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE_USER@$REMOTE_HOST" echo "SSH connection successful" >/dev/null 2>&1; then
    echo "❌ SSH connection failed. Please check:"
    echo "   - SSH key is added to ssh-agent"
    echo "   - Remote host is accessible"
    echo "   - User has proper permissions"
    exit 1
fi
echo "✅ SSH connection successful"

# Restart services on remote server
echo ""
echo "===> Restarting services on remote server..."

# Create restart commands
RESTART_COMMANDS=$(cat <<'EOF'
# Stop existing services
echo "Stopping services..."
sudo pkill -f "next" || true
sleep 2

# Reload nginx configuration
echo "Reloading nginx configuration..."
sudo nginx -t && sudo nginx -s reload

# Navigate to application directory
cd /home/opc/rag-js-agent-app/rag-js-agent-app

# Start Next.js application in production mode
echo "Starting Next.js application..."
nohup npm start > server.log 2>&1 &

# Wait for services to start
sleep 5

# Check if services are running
echo "Checking service status..."
if pgrep -f "next" > /dev/null; then
    echo "✅ Next.js application is running"
else
    echo "❌ Next.js application failed to start"
    echo "Checking logs:"
    tail -n 20 server.log
    exit 1
fi

if sudo nginx -t > /dev/null 2>&1; then
    echo "✅ Nginx configuration is valid and reloaded"
else
    echo "❌ Nginx configuration error"
    sudo nginx -t
    exit 1
fi

echo ""
echo "✅ All services restarted successfully!"
echo "The application should now be available with updated configuration"
EOF
)

# Execute restart commands on remote server
ssh "$REMOTE_USER@$REMOTE_HOST" "$RESTART_COMMANDS"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Remote restart completed successfully!"
    echo ""
    echo "Services Status:"
    echo "- Next.js application: ✅ Running"
    echo "- Nginx: ✅ Configuration reloaded"
    echo ""
    echo "The video playback fixes should now be active."
    echo "Please test YouTube videos in your blog posts."
else
    echo ""
    echo "❌ Remote restart failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi
