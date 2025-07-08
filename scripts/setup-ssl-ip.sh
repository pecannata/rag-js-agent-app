#!/bin/bash

# Simple SSL Setup Script for IP Address
# This script sets up HTTPS using a self-signed certificate for your server IP

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Get server IP automatically
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")

function check_config() {
    print_step "Checking server configuration..."
    
    if [[ -z "$SERVER_IP" ]]; then
        print_error "Could not determine server IP address automatically."
        echo "Please check your internet connection and try again."
        exit 1
    fi
    
    print_success "Server IP detected: $SERVER_IP"
}

function install_nginx() {
    print_step "Installing and configuring Nginx..."
    
    # Install nginx
    if command -v yum >/dev/null 2>&1; then
        # RHEL/CentOS/Oracle Linux
        sudo yum update -y
        sudo yum install -y nginx openssl
    elif command -v apt >/dev/null 2>&1; then
        # Debian/Ubuntu
        sudo apt update
        sudo apt install -y nginx openssl
    else
        print_error "Unsupported package manager. Please install nginx and openssl manually."
        exit 1
    fi
    
    # Enable and start nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    print_success "Nginx installed and started"
}

function create_self_signed_certificate() {
    print_step "Creating self-signed SSL certificate..."
    
    # Create SSL directory
    sudo mkdir -p /etc/ssl/certs /etc/ssl/private
    
    # Generate private key
    sudo openssl genrsa -out /etc/ssl/private/nginx-selfsigned.key 2048
    
    # Generate certificate
    sudo openssl req -new -x509 -key /etc/ssl/private/nginx-selfsigned.key \
        -out /etc/ssl/certs/nginx-selfsigned.crt \
        -days 365 \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$SERVER_IP"
    
    # Set permissions
    sudo chmod 600 /etc/ssl/private/nginx-selfsigned.key
    sudo chmod 644 /etc/ssl/certs/nginx-selfsigned.crt
    
    print_success "Self-signed certificate created"
    print_warning "Note: Browsers will show a security warning for self-signed certificates"
    print_warning "This is normal and safe for development/testing purposes"
}

function configure_nginx_ssl() {
    print_step "Configuring Nginx with SSL..."
    
    # Create nginx config directories
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/rag-app >/dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $SERVER_IP;

    # Redirect all HTTP requests to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name $SERVER_IP;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
    }

    # Additional security for API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/rag-app /etc/nginx/sites-enabled/
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx config
    sudo nginx -t
    
    # Reload nginx
    sudo systemctl reload nginx
    
    print_success "Nginx configured with SSL"
}

function configure_firewall() {
    print_step "Configuring firewall for HTTPS..."
    
    # Configure firewalld if running
    if systemctl is-active --quiet firewalld 2>/dev/null; then
        echo "Configuring firewalld..."
        sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
        sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
        sudo firewall-cmd --reload 2>/dev/null || true
    fi
    
    # Configure iptables
    echo "Configuring iptables..."
    # Remove any existing rules to avoid duplicates
    sudo iptables -D INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    sudo iptables -D INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
    # Add the rules
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    
    # Save iptables rules
    if [ -d "/etc/sysconfig" ]; then
        # RHEL/CentOS/Oracle Linux style
        sudo iptables-save | sudo tee /etc/sysconfig/iptables >/dev/null
    else
        # Debian/Ubuntu style
        sudo mkdir -p /etc/iptables
        sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null
    fi
    
    print_success "Firewall configured for HTTP and HTTPS"
}

function test_ssl() {
    print_step "Testing SSL configuration..."
    
    sleep 3  # Give nginx a moment to start
    
    # Test HTTP redirect
    if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP" | grep -q "301"; then
        print_success "HTTP to HTTPS redirect working"
    else
        print_warning "HTTP to HTTPS redirect may not be working"
    fi
    
    # Test HTTPS (ignore certificate warnings for self-signed)
    if curl -s -k "https://$SERVER_IP" >/dev/null 2>&1; then
        print_success "HTTPS connection working"
    else
        print_warning "HTTPS connection may have issues"
    fi
}

function main() {
    echo -e "${GREEN}"
    echo "🔒 Simple SSL/HTTPS Setup for RAG JS Agent App"
    echo "=============================================="
    echo -e "${NC}"
    
    check_config
    install_nginx
    create_self_signed_certificate
    configure_nginx_ssl
    configure_firewall
    test_ssl
    
    echo -e "${GREEN}"
    echo "🎉 SSL/HTTPS Setup Complete!"
    echo "============================"
    echo -e "${NC}"
    echo "Your application is now available at:"
    echo "🔒 https://$SERVER_IP"
    echo ""
    echo "⚠️  IMPORTANT NOTES:"
    echo "• Browsers will show a security warning for self-signed certificates"
    echo "• Click 'Advanced' then 'Proceed to $SERVER_IP (unsafe)' to continue"
    echo "• This is normal and safe for development/internal use"
    echo "• HTTP requests are automatically redirected to HTTPS"
    echo ""
    echo "To check nginx status:"
    echo "  sudo systemctl status nginx"
    echo ""
    echo "To restart nginx:"
    echo "  sudo systemctl restart nginx"
}

# Run main function
main "$@"
