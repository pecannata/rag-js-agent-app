#!/bin/bash

# RAG JS Agent App - Remote Deployment Script
# This script runs on your Mac and deploys to your Linux server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - EDIT THESE VALUES
LINUX_SERVER="129.213.106.172"           # e.g., "192.168.1.100" or "your-server.com"
LINUX_USER="opc"             # e.g., "oracle" or "root"
SSH_KEY="/Users/pcannata/.ssh/ssh-key-2023-03-25-phil-react.key"                # e.g., "~/.ssh/id_rsa" (optional, leave empty for password auth)
DEPLOY_PATH="/opt/rag-js-agent-app"
SERVICE_NAME="rag-js-agent"

# API Keys - EDIT THESE
COHERE_API_KEY="your_cohere_api_key_here"
SERPAPI_KEY="your_serpapi_key_here"

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

function check_dependencies() {
    print_step "Checking local dependencies..."
    
    # Check if we have ssh
    if ! command -v ssh &> /dev/null; then
        print_error "SSH not found. Please install SSH client."
        exit 1
    fi
    
    # Check if we have scp
    if ! command -v scp &> /dev/null; then
        print_error "SCP not found. Please install SCP."
        exit 1
    fi
    
    # Check if we have npm
    if ! command -v npm &> /dev/null; then
        print_error "NPM not found. Please install Node.js."
        exit 1
    fi
    
    print_success "Dependencies OK"
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

function build_deployment_package() {
    print_step "Building deployment package..."
    
    # Clean previous build
    rm -rf ../deployment-package
    rm -f ../rag-js-agent-app-deployment.tar.gz
    
    # Create deployment package
    mkdir -p ../deployment-package
    rsync -av --exclude='node_modules' --exclude='.next' --exclude='data' --exclude='errors.md' --exclude='.git' . ../deployment-package/
    
    # Create archive
    cd ../deployment-package
    tar -czf ../rag-js-agent-app-deployment.tar.gz .
    cd ../rag-js-agent-app
    
    print_success "Deployment package created ($(du -h ../rag-js-agent-app-deployment.tar.gz | cut -f1))"
}

function transfer_files() {
    print_step "Transferring files to $LINUX_SERVER..."
    
    SCP_CMD="scp"
    if [[ -n "$SSH_KEY" ]]; then
        SCP_CMD="scp -i $SSH_KEY"
    fi
    
    # Transfer the deployment package
    $SCP_CMD ../rag-js-agent-app-deployment.tar.gz "$LINUX_USER@$LINUX_SERVER:/tmp/"
    
    print_success "Files transferred"
}

function remote_install() {
    print_step "Installing application on remote server..."
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
# Create remote installation script
    cat > /tmp/remote_install.sh << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

DEPLOY_PATH="$1"
SERVICE_NAME="$2"
COHERE_API_KEY="$3"
SERPAPI_KEY="$4"
LINUX_SERVER="$5"

echo "🔧 Starting remote installation..."

# Stop existing service if running
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "Stopping existing service..."
    sudo systemctl stop "$SERVICE_NAME"
fi

# Kill any remaining npm/next processes on port 3000
echo "Checking for processes on port 3000..."
if netstat -tulpn 2>/dev/null | grep -q ":3000"; then
    echo "Found processes on port 3000, terminating..."
    
    # Find and kill all npm and next-server processes
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    
    # Wait a moment for processes to terminate
    sleep 2
    
    # Force kill if still running
    if netstat -tulpn 2>/dev/null | grep -q ":3000"; then
        echo "Force killing remaining processes on port 3000..."
        lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
    fi
    
    echo "✅ Port 3000 cleared"
else
    echo "✅ Port 3000 is free"
fi

# Backup users.json if it exists
if [ -f "$DEPLOY_PATH/data/users.json" ]; then
    echo "Backing up existing users.json..."
    sudo cp "$DEPLOY_PATH/data/users.json" "/tmp/users_backup.json"
fi

# Remove existing application directory for clean deployment
if [ -d "$DEPLOY_PATH" ]; then
    echo "Removing existing application directory..."
    sudo rm -rf "$DEPLOY_PATH"
fi

# Create application directory
echo "Creating application directory..."
sudo mkdir -p "$DEPLOY_PATH"
cd "$DEPLOY_PATH"

# Extract application
echo "Extracting application..."
sudo tar -xzf /tmp/rag-js-agent-app-deployment.tar.gz -C .
sudo chown -R $USER:$USER .

# Make scripts executable
chmod +x SQLclScript.sh

# Restore users.json if backup exists
if [ -f "/tmp/users_backup.json" ]; then
    echo "Restoring users.json backup..."
    mkdir -p data
    cp "/tmp/users_backup.json" data/users.json
    sudo rm -f "/tmp/users_backup.json"
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install --production

# Install Python dependencies for document processing
echo "Installing Python dependencies..."
pip3 install --user PyPDF2==2.12.1 python-docx==0.8.11 'Pillow<9.0.0' python-pptx==0.6.21 XlsxWriter nltk 2>/dev/null || echo "Warning: Some Python packages may have failed to install"


# Create environment file
echo "Creating environment configuration..."
cat > .env.local << EOF
# NextAuth.js Configuration
NEXTAUTH_SECRET=um9aZX/BP6mrqA2o0fNu2x4Za6kn7ht1sC/o08j3WW4=
NEXTAUTH_URL=http://$LINUX_SERVER:3000

# Cohere API key
COHERE_API_KEY=$COHERE_API_KEY

# SerpAPI key
SERPAPI_KEY=$SERPAPI_KEY

# Oracle Database access via SQLclScript.sh
# No connection strings needed - using local SQLcl installation
EOF

chmod 600 .env.local

# Build the application
echo "Building application..."
npm run build

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=RAG JS Agent App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_PATH
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# Start the service with retry logic
echo "Starting $SERVICE_NAME service..."
for i in {1..3}; do
    if sudo systemctl start "$SERVICE_NAME"; then
        echo "✅ Service started successfully"
        break
    else
        echo "❌ Service start attempt $i failed, retrying in 5 seconds..."
        sleep 5
        if [ $i -eq 3 ]; then
            echo "❌ Failed to start service after 3 attempts"
            echo "Service logs:"
            sudo journalctl -u "$SERVICE_NAME" --no-pager -l --since "5 minutes ago"
            exit 1
        fi
    fi
done

# Verify service is running
echo "Verifying service status..."
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Service is active and running"
else
    echo "❌ Service is not running"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
    exit 1
fi

# Configure firewall
echo "Configuring firewall for port 3000..."

# Configure firewalld if running
if systemctl is-active --quiet firewalld 2>/dev/null; then
    echo "Configuring firewalld..."
    sudo firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
fi

# Configure iptables (Oracle Linux commonly uses iptables)
echo "Configuring iptables..."
# Remove any existing rules for port 3000 to avoid duplicates
sudo iptables -D INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
# Add the rule
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
# Save iptables rules
if [ -d "/etc/sysconfig" ]; then
    # RHEL/CentOS/Oracle Linux style
    sudo iptables-save | sudo tee /etc/sysconfig/iptables >/dev/null
else
    # Debian/Ubuntu style
    sudo mkdir -p /etc/iptables
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null
fi
echo "✅ Firewall configured"

echo "✅ Installation complete!"
echo "🌐 Application should be available at: http://$LINUX_SERVER:3000"
echo "👤 Admin login: phil.cannata@yahoo.com / password123"

# Check service status
echo "📊 Service status:"
sudo systemctl status "$SERVICE_NAME" --no-pager -l
REMOTE_SCRIPT

    # Transfer and execute the remote script
    $SCP_CMD /tmp/remote_install.sh "$LINUX_USER@$LINUX_SERVER:/tmp/"
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "chmod +x /tmp/remote_install.sh && /tmp/remote_install.sh '$DEPLOY_PATH' '$SERVICE_NAME' '$COHERE_API_KEY' '$SERPAPI_KEY' '$LINUX_SERVER'"
    
    print_success "Remote installation complete"
}

function test_deployment() {
    print_step "Testing deployment..."
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    # Test if service is running
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "systemctl is-active --quiet $SERVICE_NAME"; then
        print_success "Service is running"
    else
        print_error "Service is not running"
        return 1
    fi
    
    # Test if application responds
    sleep 5  # Give it a moment to start
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s http://localhost:3000 >/dev/null"; then
        print_success "Application is responding"
    else
        print_warning "Application may still be starting up"
    fi
}

function cleanup() {
    print_step "Cleaning up temporary files..."
    rm -f /tmp/remote_install.sh
    rm -f ../rag-js-agent-app-deployment.tar.gz
    rm -rf ../deployment-package
    print_success "Cleanup complete"
}

function main() {
    echo -e "${GREEN}"
    echo "🚀 RAG JS Agent App - Remote Deployment Script"
    echo "=============================================="
    echo -e "${NC}"
    
    # Configuration check
    check_config
    check_dependencies
    test_ssh_connection
    
    # Deployment process
    build_deployment_package
    transfer_files
    remote_install
    test_deployment
    cleanup
    
    echo -e "${GREEN}"
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo -e "${NC}"
    echo "Application URL: http://$LINUX_SERVER:3000"
    echo "Admin Login: phil.cannata@yahoo.com / password123"
    echo "Test User: test@example.com / password123"
    echo ""
    echo "To manage the service on your Linux server:"
    echo "  sudo systemctl status $SERVICE_NAME"
    echo "  sudo systemctl restart $SERVICE_NAME"
    echo "  sudo journalctl -u $SERVICE_NAME -f"
}

# Check if configuration section needs to be filled out
if [[ "$LINUX_SERVER" == "" || "$LINUX_USER" == "" ]]; then
    print_error "Please edit the configuration section at the top of this script:"
    echo ""
    echo "LINUX_SERVER=\"your-server-ip\"     # e.g., \"192.168.1.100\""
    echo "LINUX_USER=\"your-username\"        # e.g., \"oracle\" or \"root\""
    echo "SSH_KEY=\"~/.ssh/id_rsa\"           # Optional SSH key path"
    echo "COHERE_API_KEY=\"your-api-key\"     # Your Cohere API key"
    echo "SERPAPI_KEY=\"your-serpapi-key\"    # Your SerpAPI key"
    echo ""
    echo "Note: Oracle database access is handled via SQLclScript.sh"
    echo "No Oracle connection strings needed in environment variables."
    echo ""
    exit 1
fi

# Run main function
main "$@"
