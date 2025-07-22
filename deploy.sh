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
LINUX_SERVER="129.146.0.190"           # e.g., "192.168.1.100" or "your-server.com"
DOMAIN_NAME="alwayscurious.ai"          # Your domain name
LINUX_USER="opc"             # e.g., "oracle" or "root"
SSH_KEY="/Users/pcannata/.ssh/ssh-key-2023-03-25-phil-react.key"                # e.g., "~/.ssh/id_rsa" (optional, leave empty for password auth)
DEPLOY_PATH="/opt/rag-js-agent-app"
SERVICE_NAME="rag-js-agent"

# Load API keys from secrets file
if [ -f ".env.secrets.local" ]; then
    echo "Loading API keys from .env.secrets.local file..."
    source .env.secrets.local
elif [ -f ".env.secrets" ]; then
    echo "Loading API keys from .env.secrets file..."
    source .env.secrets
else
    echo "⚠️  Warning: .env.secrets.local file not found. Using default placeholder keys."
    echo "   Create .env.secrets.local file with your actual API keys for production deployment."
fi

# API Keys - These will be loaded from .env.secrets or use defaults
COHERE_API_KEY="${COHERE_API_KEY:-your_cohere_api_key_here}"
SERPAPI_KEY="${SERPAPI_KEY:-your_serpapi_key_here}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_placeholder}"

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
    rsync -av --exclude='node_modules' --exclude='.next' --exclude='errors.md' --exclude='.git' . ../deployment-package/
    
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
LINUX_SERVER="$3"
DOMAIN_NAME="$4"

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

# Create backup directory structure
BACKUP_DIR="/opt/backups/rag-js-agent"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

# Backup existing data files if they exist
if [ -d "$DEPLOY_PATH/data" ]; then
    echo "Backing up existing data directory..."
    sudo cp -r "$DEPLOY_PATH/data" "/tmp/data_backup" || true
fi

# Create full application backup before deployment
if [ -d "$DEPLOY_PATH" ]; then
    echo "Creating full application backup: backup_$TIMESTAMP"
    sudo mkdir -p "$BACKUP_PATH"
    
    # Backup the entire application (excluding node_modules and .next for space)
    sudo cp -r "$DEPLOY_PATH" "$BACKUP_PATH/" 2>/dev/null || true
    if [ -d "$BACKUP_PATH/$(basename $DEPLOY_PATH)/node_modules" ]; then
        sudo rm -rf "$BACKUP_PATH/$(basename $DEPLOY_PATH)/node_modules"
    fi
    if [ -d "$BACKUP_PATH/$(basename $DEPLOY_PATH)/.next" ]; then
        sudo rm -rf "$BACKUP_PATH/$(basename $DEPLOY_PATH)/.next"
    fi
    
    # Backup systemd service file if it exists
    if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
        sudo mkdir -p "$BACKUP_PATH/system"
        sudo cp "/etc/systemd/system/$SERVICE_NAME.service" "$BACKUP_PATH/system/"
    fi
    
    # Backup nginx config if it exists
    if [ -n "$DOMAIN_NAME" ]; then
        if [ -f "/etc/nginx/conf.d/$DOMAIN_NAME.conf" ]; then
            sudo mkdir -p "$BACKUP_PATH/nginx"
            sudo cp "/etc/nginx/conf.d/$DOMAIN_NAME.conf" "$BACKUP_PATH/nginx/"
        elif [ -f "/etc/nginx/sites-available/$DOMAIN_NAME" ]; then
            sudo mkdir -p "$BACKUP_PATH/nginx"
            sudo cp "/etc/nginx/sites-available/$DOMAIN_NAME" "$BACKUP_PATH/nginx/"
        fi
    fi
    
    # Create backup info file
    sudo tee "$BACKUP_PATH/backup_info.txt" > /dev/null << EOF
Backup created: $(date)
Application version: $(cat "$DEPLOY_PATH/package.json" 2>/dev/null | grep '"version"' | head -1 | cut -d'"' -f4 || echo "unknown")
Service: $SERVICE_NAME
Domain: ${DOMAIN_NAME:-"none"}
Deployment path: $DEPLOY_PATH
Backup path: $BACKUP_PATH
EOF
    
    echo "✅ Application backup created successfully"
    
    # Cleanup old backups (keep only last 3)
    echo "Cleaning up old backups (keeping last 3)..."
    BACKUP_COUNT=$(sudo ls -dt $BACKUP_DIR/backup_* 2>/dev/null | wc -l || echo 0)
    if [ "$BACKUP_COUNT" -gt 3 ]; then
        sudo ls -dt $BACKUP_DIR/backup_* | tail -n +4 | sudo xargs rm -rf
        echo "✅ Old backups cleaned up"
    fi
else
    echo "📝 No existing application found - fresh installation"
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

# Restore and merge data files if backup exists
if [ -d "/tmp/data_backup" ]; then
    echo "Restoring existing data files..."
    mkdir -p data
    
    # Preserve production users.json (contains user registrations and data)
    if [ -f "/tmp/data_backup/users.json" ]; then
        cp "/tmp/data_backup/users.json" data/users.json
        echo "✅ Restored existing users.json (preserving user data)"
    else
        echo "📝 Using new users.json from deployment (no existing users found)"
    fi
    
    # Copy existing snippets.json if it exists in backup (preserving existing snippets)
    if [ -f "/tmp/data_backup/snippets.json" ]; then
        cp "/tmp/data_backup/snippets.json" data/snippets.json
        echo "✅ Restored existing snippets.json"
    else
        echo "📝 Using new snippets.json from deployment"
    fi
    
    # Copy other data files that should be preserved
    for file in message-history.json vector-message-history.json; do
        if [ -f "/tmp/data_backup/$file" ]; then
            cp "/tmp/data_backup/$file" "data/$file"
            echo "✅ Restored existing $file"
        fi
    done
    
    # Copy image-dimensions directory if it exists
    if [ -d "/tmp/data_backup/image-dimensions" ]; then
        cp -r "/tmp/data_backup/image-dimensions" data/
        echo "✅ Restored existing image-dimensions directory"
    fi
    
    # Copy notes directory if it exists
    if [ -d "/tmp/data_backup/notes" ]; then
        cp -r "/tmp/data_backup/notes" data/
        echo "✅ Restored existing notes directory"
    fi
    
    sudo rm -rf "/tmp/data_backup"
    echo "🎯 Data restoration complete - production data preserved"
else
    echo "📝 No existing data to restore - using fresh data from deployment"
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install --legacy-peer-deps

# Install Python dependencies for document processing
echo "Installing Python dependencies..."
pip3 install --user PyPDF2==2.12.1 python-docx==0.8.11 'Pillow<9.0.0' python-pptx==1.0.2 XlsxWriter nltk 2>/dev/null || echo "Warning: Some Python packages may have failed to install"


# Update environment file for production
echo "Updating environment configuration for production..."
if [ -f ".env.local" ]; then
    echo "Using existing .env.local file from deployment package"
    
    # Update the NEXTAUTH_URL for production (use domain name if available, otherwise IP)
    if [ -n "$DOMAIN_NAME" ]; then
        sed -i "s|NEXTAUTH_URL=http://localhost:3000|NEXTAUTH_URL=https://$DOMAIN_NAME|g" .env.local
        sed -i "s|NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://$DOMAIN_NAME|g" .env.local
        echo "✅ Updated NEXTAUTH_URL to production URL: https://$DOMAIN_NAME"
    else
        sed -i "s|NEXTAUTH_URL=http://localhost:3000|NEXTAUTH_URL=https://$LINUX_SERVER|g" .env.local
        sed -i "s|NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://$LINUX_SERVER|g" .env.local
        echo "✅ Updated NEXTAUTH_URL to production URL: https://$LINUX_SERVER"
    fi
    
    # Add NEXT_PUBLIC_BASE_URL if not exists
    if ! grep -q "NEXT_PUBLIC_BASE_URL" .env.local; then
        if [ -n "$DOMAIN_NAME" ]; then
            echo "NEXT_PUBLIC_BASE_URL=https://$DOMAIN_NAME" >> .env.local
        else
            echo "NEXT_PUBLIC_BASE_URL=https://$LINUX_SERVER" >> .env.local
        fi
    fi
    
    # Ensure proper permissions
    chmod 600 .env.local
else
    echo "⚠️  Warning: .env.local file not found in deployment package"
    echo "Creating minimal environment configuration..."
    
    # Fallback: create basic .env.local if not found
    cat > .env.local << EOF
# NextAuth.js Configuration
NEXTAUTH_SECRET=um9aZX/BP6mrqA2o0fNu2x4Za6kn7ht1sC/o08j3WW4=
NEXTAUTH_URL=https://${DOMAIN_NAME:-$LINUX_SERVER}

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=https://${DOMAIN_NAME:-$LINUX_SERVER}

# Stripe Secret Key - For testing with enhanced batching
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
EOF
    chmod 600 .env.local
fi

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

# Configure nginx if domain name is provided
if [ -n "$DOMAIN_NAME" ]; then
    echo "Configuring nginx for domain: $DOMAIN_NAME..."
    
    # Install nginx if not installed
    if ! command -v nginx &> /dev/null; then
        echo "Installing nginx..."
        sudo yum install -y nginx || sudo apt-get install -y nginx
    fi
    
    # Create Cloudflare Origin SSL certificate if it doesn't exist
    if [ ! -f "/etc/ssl/certs/cloudflare-origin.crt" ] || [ ! -f "/etc/ssl/private/cloudflare-origin.key" ]; then
        echo "Creating Cloudflare Origin SSL certificate..."
        sudo mkdir -p /etc/ssl/certs /etc/ssl/private
        
        # Create a certificate that works with Cloudflare's Origin CA
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/cloudflare-origin.key \
            -out /etc/ssl/certs/cloudflare-origin.crt \
            -subj "/C=US/ST=California/L=San Francisco/O=Cloudflare Origin/OU=Origin CA/CN=$DOMAIN_NAME" \
            -addext "subjectAltName=DNS:$DOMAIN_NAME,DNS:www.$DOMAIN_NAME"
        
        sudo chmod 600 /etc/ssl/private/cloudflare-origin.key
        sudo chmod 644 /etc/ssl/certs/cloudflare-origin.crt
        echo "✅ Cloudflare Origin SSL certificate created"
    else
        echo "✅ SSL certificate already exists"
    fi
    
    # Create nginx configuration directory structure based on system type
    if [ -d "/etc/nginx/sites-available" ]; then
        # Debian/Ubuntu style
        NGINX_AVAILABLE_DIR="/etc/nginx/sites-available"
        NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
        NGINX_CONFIG_FILE="$NGINX_AVAILABLE_DIR/$DOMAIN_NAME"
    else
        # RHEL/CentOS/Oracle Linux style
        NGINX_AVAILABLE_DIR="/etc/nginx/conf.d"
        NGINX_ENABLED_DIR="/etc/nginx/conf.d"
        NGINX_CONFIG_FILE="$NGINX_AVAILABLE_DIR/$DOMAIN_NAME.conf"
    fi
    
    # Create directories if they don't exist
    sudo mkdir -p "$NGINX_AVAILABLE_DIR"
    sudo mkdir -p "$NGINX_ENABLED_DIR"
    
    # Create nginx configuration
    sudo tee "$NGINX_CONFIG_FILE" > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # SSL configuration - using Cloudflare Origin certificate
    ssl_certificate /etc/ssl/certs/cloudflare-origin.crt;
    ssl_certificate_key /etc/ssl/private/cloudflare-origin.key;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy to Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF
    
    # Enable the site based on nginx structure
    if [ -d "/etc/nginx/sites-available" ]; then
        # Debian/Ubuntu style - create symlink
        sudo mkdir -p "$NGINX_ENABLED_DIR"
        sudo ln -sf "$NGINX_CONFIG_FILE" "$NGINX_ENABLED_DIR/"
        
        # Remove default nginx site if it exists
        sudo rm -f "$NGINX_ENABLED_DIR/default"
        
        # Update main nginx config to include sites-enabled if not already included
        if ! grep -q "include /etc/nginx/sites-enabled/" /etc/nginx/nginx.conf; then
            sudo sed -i '/http {/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        fi
    else
        # RHEL/CentOS/Oracle Linux style - config is already in conf.d, no symlink needed
        # Remove default nginx config if it exists
        sudo rm -f /etc/nginx/conf.d/default.conf
        
        # Ensure conf.d is included (usually is by default)
        if ! grep -q "include /etc/nginx/conf.d/" /etc/nginx/nginx.conf; then
            sudo sed -i '/http {/a\    include /etc/nginx/conf.d/*.conf;' /etc/nginx/nginx.conf
        fi
    fi
    
    # Test nginx configuration
    if sudo nginx -t; then
        echo "Nginx configuration is valid"
        # Reload nginx
        sudo systemctl enable nginx
        sudo systemctl restart nginx
        echo "✅ Nginx configured and started"
    else
        echo "❌ Nginx configuration test failed"
        sudo nginx -t
    fi
    
    # Configure firewall for HTTP/HTTPS
    if systemctl is-active --quiet firewalld 2>/dev/null; then
        sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
        sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
        sudo firewall-cmd --reload 2>/dev/null || true
    fi
    
    # Configure iptables for HTTP/HTTPS
    sudo iptables -D INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    sudo iptables -D INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    
    # Save iptables rules
    if [ -d "/etc/sysconfig" ]; then
        sudo iptables-save | sudo tee /etc/sysconfig/iptables > /dev/null
    else
        sudo mkdir -p /etc/iptables
        sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
    fi
    
    echo "✅ Domain configuration complete!"
    echo "🌐 Application should be available at: https://$DOMAIN_NAME"
else
    echo "✅ Installation complete!"
    echo "🌐 Application should be available at: https://$LINUX_SERVER (HTTPS) or http://$LINUX_SERVER:3000 (direct)"
fi

echo "👤 Admin login: phil.cannata@yahoo.com / password123"

# Check service status
echo "📊 Service status:"
sudo systemctl status "$SERVICE_NAME" --no-pager -l
REMOTE_SCRIPT

    # Transfer and execute the remote script
    $SCP_CMD /tmp/remote_install.sh "$LINUX_USER@$LINUX_SERVER:/tmp/"
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "chmod +x /tmp/remote_install.sh && /tmp/remote_install.sh '$DEPLOY_PATH' '$SERVICE_NAME' '$LINUX_SERVER' '$DOMAIN_NAME'"
    
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

function prime_cache() {
    print_step "Priming application cache..."
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    # Wait a bit longer to ensure app is fully ready
    sleep 10
    
    # Determine the base URL to use for cache priming
    local BASE_URL
    if [[ -n "$DOMAIN_NAME" ]]; then
        BASE_URL="https://$DOMAIN_NAME"
    else
        BASE_URL="http://localhost:3000"
    fi
    
    print_step "Warming up cache with initial requests..."
    
    # Prime the categorized blog posts cache (main cached endpoint)
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog/categories' >/dev/null 2>&1"; then
        print_success "✅ Blog categories cache primed"
    else
        print_warning "⚠️ Could not prime blog categories cache"
    fi
    
    # Prime the 3 main blog post queries
    print_step "Priming blog post caches..."
    
    # 1. BlogManager (Admin) cache: ?lazy=true
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog?lazy=true' >/dev/null 2>&1"; then
        print_success "✅ BlogManager (lazy=true) cache primed"
    else
        print_warning "⚠️ Could not prime BlogManager cache"
    fi
    
    # 2. Public blogs page cache: ?status=published&includeContent=false
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog?status=published&includeContent=false' >/dev/null 2>&1"; then
        print_success "✅ Public blogs page cache primed"
    else
        print_warning "⚠️ Could not prime public blogs cache"
    fi
    
    # 3. Recent posts cache: ?status=published&limit=3&includeContent=false
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog?status=published&limit=3&includeContent=false' >/dev/null 2>&1"; then
        print_success "✅ Recent posts cache primed"
    else
        print_warning "⚠️ Could not prime recent posts cache"
    fi
    
    # Make additional requests to build up cache hit statistics for all endpoints
    print_step "Building cache hit statistics..."
    
    for i in {1..2}; do
        # Categories cache hits
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog/categories' >/dev/null 2>&1" || true
        # Blog post cache hits
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog?lazy=true' >/dev/null 2>&1" || true
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog?status=published&includeContent=false' >/dev/null 2>&1" || true
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/blog?status=published&limit=3&includeContent=false' >/dev/null 2>&1" || true
    done
    
    # Prime blog post cache with 10 most recent published posts
    print_step "Priming blog post cache with recent posts..."
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s -X POST '$BASE_URL/api/blog/prime-cache' >/dev/null 2>&1"; then
        print_success "✅ Blog post cache primed with recent posts"
    else
        print_warning "⚠️ Could not prime blog post cache"
    fi
    
    # Prime cache stats endpoint
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/cache/stats' >/dev/null 2>&1" || true
    
    # Show final cache stats
    print_step "📊 Final cache statistics:"
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/cache/stats' 2>/dev/null" | grep -q '"success":true'; then
        CACHE_STATS=$($SSH_CMD "$LINUX_USER@$LINUX_SERVER" "curl -s '$BASE_URL/api/cache/stats' 2>/dev/null" | grep -o '"hitRate":"[^"]*"\|"cacheHits":[0-9]*\|"totalKeys":[0-9]*' || echo "")
        if [[ -n "$CACHE_STATS" ]]; then
            echo "$CACHE_STATS" | sed 's/",/\n/g; s/"//g; s/:/: /g'
            print_success "🔥 Cache is warm and ready!"
        else
            print_success "🔥 Cache priming completed"
        fi
    else
        print_warning "Could not retrieve final cache stats, but priming completed"
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
    prime_cache
    cleanup
    
    echo -e "${GREEN}"
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo -e "${NC}"
    if [[ -n "$DOMAIN_NAME" ]]; then
        echo "Application URL: https://$DOMAIN_NAME (with nginx reverse proxy)"
        echo "Direct URL: https://$LINUX_SERVER:3000 (direct to app)"
    else
        echo "Application URL: https://$LINUX_SERVER (recommended HTTPS)"
    fi
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
