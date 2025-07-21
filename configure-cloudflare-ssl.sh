#!/bin/bash

# CloudFlare Origin SSL Certificate Configuration Script
# This script helps you configure proper CloudFlare Origin certificates
# instead of using self-signed certificates

set -e

# Configuration
LINUX_SERVER="129.146.0.190"
LINUX_USER="opc"
SSH_KEY="/Users/pcannata/.ssh/ssh-key-2023-03-25-phil-react.key"
DOMAIN_NAME="alwayscurious.ai"

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

function print_instructions() {
    echo -e "${YELLOW}"
    echo "🔐 CloudFlare Origin SSL Certificate Setup"
    echo "=========================================="
    echo -e "${NC}"
    echo ""
    echo "To properly configure SSL with CloudFlare Origin certificates:"
    echo ""
    echo "1️⃣  Go to CloudFlare Dashboard:"
    echo "   → Login to https://dash.cloudflare.com"
    echo "   → Select your domain: $DOMAIN_NAME"
    echo "   → Go to SSL/TLS → Origin Server"
    echo ""
    echo "2️⃣  Create Origin Certificate:"
    echo "   → Click 'Create Certificate'"
    echo "   → Select 'Let Cloudflare generate a private key and a CSR'"
    echo "   → Add hostnames: $DOMAIN_NAME, *.$DOMAIN_NAME"
    echo "   → Choose validity: 15 years (recommended)"
    echo "   → Click 'Create'"
    echo ""
    echo "3️⃣  Download and Save Certificate:"
    echo "   → Copy the 'Origin Certificate' content"
    echo "   → Copy the 'Private Key' content"
    echo "   → Save both to temporary files on your computer"
    echo ""
    echo "4️⃣  Transfer to Server:"
    echo "   → Use this script's upload function (option below)"
    echo "   → Or manually copy to:"
    echo "     - Certificate: /etc/ssl/certs/cloudflare-origin.crt"
    echo "     - Private Key: /etc/ssl/private/cloudflare-origin.key"
    echo ""
}

function check_current_certs() {
    print_step "Checking current SSL certificates on server..."
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    # Check if certificates exist
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "[ -f /etc/ssl/certs/cloudflare-origin.crt ] && [ -f /etc/ssl/private/cloudflare-origin.key ]"; then
        print_success "CloudFlare Origin certificates found on server"
        
        # Get certificate details
        echo ""
        echo "📋 Current certificate details:"
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo openssl x509 -in /etc/ssl/certs/cloudflare-origin.crt -text -noout | grep -E '(Subject:|Issuer:|Not Before|Not After|DNS:)'"
        
        return 0
    else
        print_warning "CloudFlare Origin certificates NOT found on server"
        return 1
    fi
}

function upload_certificates() {
    print_step "Uploading CloudFlare Origin certificates..."
    
    # Check if local certificate files exist
    read -p "Enter path to CloudFlare Origin certificate file: " cert_file
    read -p "Enter path to CloudFlare Origin private key file: " key_file
    
    if [[ ! -f "$cert_file" ]]; then
        print_error "Certificate file not found: $cert_file"
        return 1
    fi
    
    if [[ ! -f "$key_file" ]]; then
        print_error "Private key file not found: $key_file"
        return 1
    fi
    
    SSH_CMD="ssh"
    SCP_CMD="scp"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
        SCP_CMD="scp -i $SSH_KEY"
    fi
    
    # Create directories on server
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo mkdir -p /etc/ssl/certs /etc/ssl/private"
    
    # Upload certificate files to temp location first
    $SCP_CMD "$cert_file" "$LINUX_USER@$LINUX_SERVER:/tmp/cloudflare-origin.crt"
    $SCP_CMD "$key_file" "$LINUX_USER@$LINUX_SERVER:/tmp/cloudflare-origin.key"
    
    # Move to final location with proper permissions
    $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "
        sudo mv /tmp/cloudflare-origin.crt /etc/ssl/certs/cloudflare-origin.crt
        sudo mv /tmp/cloudflare-origin.key /etc/ssl/private/cloudflare-origin.key
        sudo chmod 644 /etc/ssl/certs/cloudflare-origin.crt
        sudo chmod 600 /etc/ssl/private/cloudflare-origin.key
        sudo chown root:root /etc/ssl/certs/cloudflare-origin.crt
        sudo chown root:root /etc/ssl/private/cloudflare-origin.key
    "
    
    print_success "CloudFlare Origin certificates uploaded successfully"
    
    # Verify the certificates
    check_current_certs
}

function restart_nginx() {
    print_step "Restarting nginx to use new certificates..."
    
    SSH_CMD="ssh"
    if [[ -n "$SSH_KEY" ]]; then
        SSH_CMD="ssh -i $SSH_KEY"
    fi
    
    # Test nginx configuration first
    if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo nginx -t"; then
        print_success "Nginx configuration is valid"
        
        # Restart nginx
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo systemctl restart nginx"
        print_success "Nginx restarted successfully"
        
        # Check nginx status
        if $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo systemctl is-active --quiet nginx"; then
            print_success "Nginx is running properly"
        else
            print_error "Nginx failed to start properly"
            $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo systemctl status nginx"
        fi
    else
        print_error "Nginx configuration test failed"
        $SSH_CMD "$LINUX_USER@$LINUX_SERVER" "sudo nginx -t"
    fi
}

function test_ssl() {
    print_step "Testing SSL connection..."
    
    # Test SSL connection
    if curl -s -I "https://$DOMAIN_NAME" >/dev/null; then
        print_success "HTTPS connection to $DOMAIN_NAME is working"
        
        # Show certificate details
        echo ""
        echo "📋 SSL Certificate verification:"
        echo | openssl s_client -servername "$DOMAIN_NAME" -connect "$DOMAIN_NAME:443" 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null || echo "Could not retrieve certificate details"
    else
        print_warning "HTTPS connection test failed - this is expected if using CloudFlare proxy"
        echo "   CloudFlare may be using its own certificate for public connections"
        echo "   The origin certificate is used for CloudFlare-to-server communication"
    fi
}

function main_menu() {
    while true; do
        echo ""
        echo -e "${BLUE}🔐 CloudFlare SSL Configuration Menu${NC}"
        echo "======================================"
        echo ""
        echo "1) Show setup instructions"
        echo "2) Check current certificates on server"
        echo "3) Upload CloudFlare Origin certificates"
        echo "4) Restart nginx (after certificate update)"
        echo "5) Test SSL connection"
        echo "6) Exit"
        echo ""
        read -p "Select an option (1-6): " choice
        
        case $choice in
            1)
                print_instructions
                ;;
            2)
                check_current_certs
                ;;
            3)
                upload_certificates
                ;;
            4)
                restart_nginx
                ;;
            5)
                test_ssl
                ;;
            6)
                echo "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-6."
                ;;
        esac
    done
}

# Start with instructions and menu
print_instructions
main_menu
