#!/bin/bash

# SSL Setup Script for RAG JS Agent App
# This script sets up HTTPS using Let's Encrypt and Nginx

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

# Configuration - YOU MUST SET THESE VALUES
DOMAIN=""           # e.g., "myapp.example.com"
EMAIL=""            # e.g., "admin@example.com" for Let's Encrypt notifications

function check_config() {
    print_step "Checking configuration..."
    
    if [[ -z "$DOMAIN" ]]; then
        print_error "DOMAIN not set. Please edit this script and set your domain name."
        echo "Example: DOMAIN=\"myapp.example.com\""
        exit 1
    fi
    
    if [[ -z "$EMAIL" ]]; then
        print_error "EMAIL not set. Please edit this script and set your email address."
        echo "Example: EMAIL=\"admin@example.com\""
        exit 1
    fi
    
    print_success "Configuration looks good"
    echo "Domain: $DOMAIN"
    echo "Email: $EMAIL"
}

function check_dns() {
    print_step "Checking DNS resolution for $DOMAIN..."
    
    if nslookup "$DOMAIN" >/dev/null 2>&1; then
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "unknown")
        DOMAIN_IP=$(nslookup "$DOMAIN" | grep -A1 "Name:" | tail -1 | awk '{print $2}' 2>/dev/null || echo "unknown")
        
        print_success "DNS resolution successful"
        echo "Server IP: $SERVER_IP"
        echo "Domain IP: $DOMAIN_IP"
        
        if [[ "$SERVER_IP" != "unknown" && "$DOMAIN_IP" != "unknown" ]]; then
            if [[ "$SERVER_IP" == "$DOMAIN_IP" ]]; then
                print_success "DNS points to this server ✓"
            else
                print_warning "DNS may not point to this server"
                echo "Server IP: $SERVER_IP"
                echo "Domain IP: $DOMAIN_IP"
                echo "Make sure your domain's A record points to $SERVER_IP"
            fi
        fi
    else
        print_error "DNS resolution failed for $DOMAIN"
        echo "Make sure:"
        echo "1. Your domain's A record points to this server's IP"
        echo "2. DNS propagation is complete (can take up to 48 hours)"
        exit 1
    fi
}

function install_nginx() {
    print_step "Installing and configuring Nginx..."
    
    # Install nginx
    if command -v yum >/dev/null 2>&1; then
        # RHEL/CentOS/Oracle Linux
        sudo yum update -y
        sudo yum install -y nginx
    elif command -v apt >/dev/null 2>&1; then
        # Debian/Ubuntu
        sudo apt update
        sudo apt install -y nginx
    else
        print_error "Unsupported package manager. Please install nginx manually."
        exit 1
    fi
    
    # Enable and start nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    print_success "Nginx installed and started"
}

function install_certbot() {
    print_step "Installing Certbot (Let's Encrypt client)..."
    
    if command -v yum >/dev/null 2>&1; then
        # RHEL/CentOS/Oracle Linux
        sudo yum install -y epel-release
        sudo yum install -y certbot python3-certbot-nginx
    elif command -v apt >/dev/null 2>&1; then
        # Debian/Ubuntu
        sudo apt install -y certbot python3-certbot-nginx
    else
        print_error "Unsupported package manager. Please install certbot manually."
        exit 1
    fi
    
    print_success "Certbot installed"
}

function configure_nginx_initial() {
    print_step "Configuring Nginx for initial setup..."
    
    # Create nginx config from template
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    
    # Create initial config (HTTP only for Let's Encrypt challenge)
    sudo tee /etc/nginx/sites-available/rag-app >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Allow Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Temporarily serve the app over HTTP for testing
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
    
    print_success "Nginx configured for initial setup"
}

function obtain_ssl_certificate() {
    print_step "Obtaining SSL certificate from Let's Encrypt..."
    
    # Ensure web root exists
    sudo mkdir -p /var/www/html
    
    # Obtain certificate
    sudo certbot certonly \
        --webroot \
        --webroot-path=/var/www/html \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN"
    
    if [[ $? -eq 0 ]]; then
        print_success "SSL certificate obtained successfully"
    else
        print_error "Failed to obtain SSL certificate"
        echo "Common issues:"
        echo "1. Domain doesn't point to this server"
        echo "2. Firewall blocking port 80"
        echo "3. Another service using port 80"
        exit 1
    fi
}

function configure_nginx_ssl() {
    print_step "Configuring Nginx with SSL..."
    
    # Create the full nginx config with SSL
    sudo tee /etc/nginx/sites-available/rag-app >/dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN;

    # Allow Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other HTTP requests to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

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

function setup_auto_renewal() {
    print_step "Setting up automatic certificate renewal..."
    
    # Add cron job for certificate renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -
    
    print_success "Automatic certificate renewal configured"
}

function test_ssl() {
    print_step "Testing SSL configuration..."
    
    sleep 3  # Give nginx a moment to start
    
    # Test HTTP redirect
    if curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" | grep -q "301"; then
        print_success "HTTP to HTTPS redirect working"
    else
        print_warning "HTTP to HTTPS redirect may not be working"
    fi
    
    # Test HTTPS
    if curl -s -k "https://$DOMAIN" >/dev/null 2>&1; then
        print_success "HTTPS connection working"
    else
        print_warning "HTTPS connection may have issues"
    fi
}

function main() {
    echo -e "${GREEN}"
    echo "🔒 SSL/HTTPS Setup for RAG JS Agent App"
    echo "======================================"
    echo -e "${NC}"
    
    check_config
    check_dns
    install_nginx
    install_certbot
    configure_nginx_initial
    configure_firewall
    obtain_ssl_certificate
    configure_nginx_ssl
    setup_auto_renewal
    test_ssl
    
    echo -e "${GREEN}"
    echo "🎉 SSL/HTTPS Setup Complete!"
    echo "============================"
    echo -e "${NC}"
    echo "Your application is now available at:"
    echo "🔒 https://$DOMAIN"
    echo ""
    echo "HTTP requests are automatically redirected to HTTPS"
    echo "SSL certificate will auto-renew every 90 days"
    echo ""
    echo "To check SSL certificate status:"
    echo "  sudo certbot certificates"
    echo ""
    echo "To manually renew certificate:"
    echo "  sudo certbot renew"
    echo ""
    echo "To check nginx status:"
    echo "  sudo systemctl status nginx"
}

# Check if configuration section needs to be filled out
if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
    print_error "Please edit the configuration section at the top of this script:"
    echo ""
    echo "DOMAIN=\"your-domain.com\"        # e.g., \"myapp.example.com\""
    echo "EMAIL=\"your-email@example.com\"   # e.g., \"admin@example.com\""
    echo ""
    echo "Make sure your domain's A record points to this server's IP address"
    echo "before running this script."
    echo ""
    exit 1
fi

# Run main function
main "$@"
