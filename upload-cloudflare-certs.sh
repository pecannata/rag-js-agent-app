#!/bin/bash

# Upload CloudFlare Origin Certificate Script
set -e

# Configuration
LINUX_SERVER="129.146.0.190"
LINUX_USER="opc"
SSH_KEY="/Users/pcannata/.ssh/ssh-key-2023-03-25-phil-react.key"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔐 CloudFlare Origin Certificate Upload${NC}"
echo "======================================"
echo ""

# Check if certificate files exist
CERT_FILE="$HOME/cloudflare-origin.crt"
KEY_FILE="$HOME/cloudflare-origin.key"

if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}❌ Certificate file not found: $CERT_FILE${NC}"
    echo "Please create the file first:"
    echo "  nano $CERT_FILE"
    echo "Then paste the CloudFlare Origin Certificate content"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ Private key file not found: $KEY_FILE${NC}"
    echo "Please create the file first:"
    echo "  nano $KEY_FILE"
    echo "Then paste the CloudFlare Private Key content"
    exit 1
fi

echo -e "${GREEN}✅ Found certificate files${NC}"
echo "Certificate: $CERT_FILE"
echo "Private Key: $KEY_FILE"
echo ""

# Show certificate preview
echo "📋 Certificate preview:"
echo "Subject: $(openssl x509 -in "$CERT_FILE" -noout -subject)"
echo "Issuer: $(openssl x509 -in "$CERT_FILE" -noout -issuer)"
echo "Valid until: $(openssl x509 -in "$CERT_FILE" -noout -enddate)"
echo ""

read -p "Continue with upload? (y/N): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "Upload cancelled."
    exit 0
fi

echo ""
echo "🚀 Uploading certificates to server..."

# Upload certificate files to temp location
scp -i "$SSH_KEY" "$CERT_FILE" "$LINUX_USER@$LINUX_SERVER:/tmp/"
scp -i "$SSH_KEY" "$KEY_FILE" "$LINUX_USER@$LINUX_SERVER:/tmp/"

echo -e "${GREEN}✅ Files uploaded${NC}"

# Install certificates with proper permissions
echo "🔧 Installing certificates..."
ssh -i "$SSH_KEY" "$LINUX_USER@$LINUX_SERVER" "
    sudo mkdir -p /etc/ssl/certs /etc/ssl/private
    sudo cp /tmp/cloudflare-origin.crt /etc/ssl/certs/cloudflare-origin.crt
    sudo cp /tmp/cloudflare-origin.key /etc/ssl/private/cloudflare-origin.key
    sudo chmod 644 /etc/ssl/certs/cloudflare-origin.crt
    sudo chmod 600 /etc/ssl/private/cloudflare-origin.key
    sudo chown root:root /etc/ssl/certs/cloudflare-origin.crt
    sudo chown root:root /etc/ssl/private/cloudflare-origin.key
    sudo rm /tmp/cloudflare-origin.crt /tmp/cloudflare-origin.key
"

echo -e "${GREEN}✅ Certificates installed${NC}"

# Verify certificates
echo "🔍 Verifying installed certificates..."
ssh -i "$SSH_KEY" "$LINUX_USER@$LINUX_SERVER" "
    echo 'Certificate details:'
    sudo openssl x509 -in /etc/ssl/certs/cloudflare-origin.crt -noout -subject -issuer -dates
"

# Test and restart nginx
echo "🔧 Testing and restarting nginx..."
if ssh -i "$SSH_KEY" "$LINUX_USER@$LINUX_SERVER" "sudo nginx -t"; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    
    ssh -i "$SSH_KEY" "$LINUX_USER@$LINUX_SERVER" "sudo systemctl restart nginx"
    
    if ssh -i "$SSH_KEY" "$LINUX_USER@$LINUX_SERVER" "sudo systemctl is-active --quiet nginx"; then
        echo -e "${GREEN}✅ Nginx restarted successfully${NC}"
    else
        echo -e "${RED}❌ Nginx failed to restart${NC}"
        ssh -i "$SSH_KEY" "$LINUX_USER@$LINUX_SERVER" "sudo systemctl status nginx"
        exit 1
    fi
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    ssh -i "$SSH_KEY" "$LINUX_USER@$LINUX_SERVER" "sudo nginx -t"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 CloudFlare Origin Certificate Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "✅ Real CloudFlare Origin certificate is now installed"
echo "✅ Nginx is using the proper certificate"  
echo "✅ SSL should now work correctly with CloudFlare"
echo ""
echo "🌐 Test your site: https://alwayscurious.ai"
