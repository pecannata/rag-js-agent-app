#!/bin/bash

# Fix SSL certificates on remote server
# This script checks and restores Cloudflare certificates

set -e

REMOTE_HOST="opc@129.146.0.190"
DOMAIN="alwayscurious.ai"

echo "🔧 Checking SSL certificates on remote server..."

# Check if certificates exist
ssh $REMOTE_HOST "ls -la /etc/nginx/ssl/ || echo 'SSL directory not found'"

echo ""
echo "🔍 Checking nginx configuration..."
ssh $REMOTE_HOST "nginx -t && echo '✅ Nginx config is valid' || echo '❌ Nginx config has errors'"

echo ""
echo "🔧 Checking if certificates are valid..."
ssh $REMOTE_HOST "
if [ -f /etc/nginx/ssl/${DOMAIN}.crt ] && [ -f /etc/nginx/ssl/${DOMAIN}.key ]; then
    echo '📋 Certificate files exist:'
    ls -la /etc/nginx/ssl/${DOMAIN}.*
    echo ''
    echo '🔍 Checking certificate validity:'
    openssl x509 -in /etc/nginx/ssl/${DOMAIN}.crt -text -noout | grep -A2 'Validity'
    echo ''
    echo '📅 Certificate expiry:'
    openssl x509 -in /etc/nginx/ssl/${DOMAIN}.crt -enddate -noout
else
    echo '❌ Certificate files are missing'
    echo 'Creating directory structure...'
    sudo mkdir -p /etc/nginx/ssl
    echo 'Please manually upload your SSL certificates to:'
    echo '  /etc/nginx/ssl/${DOMAIN}.crt'
    echo '  /etc/nginx/ssl/${DOMAIN}.key'
fi
"

echo ""
echo "🔧 Checking nginx status..."
ssh $REMOTE_HOST "systemctl status nginx --no-pager | head -10"

echo ""
echo "To fix SSL certificates, you need to:"
echo "1. Upload your SSL certificate files to the remote server"
echo "2. Place them in /etc/nginx/ssl/"
echo "3. Restart nginx"
echo ""
echo "Example commands to run on remote server:"
echo "  sudo scp your-cert.crt opc@129.146.0.190:/tmp/"
echo "  sudo scp your-key.key opc@129.146.0.190:/tmp/"
echo "  sudo mv /tmp/your-cert.crt /etc/nginx/ssl/${DOMAIN}.crt"
echo "  sudo mv /tmp/your-key.key /etc/nginx/ssl/${DOMAIN}.key"
echo "  sudo chmod 644 /etc/nginx/ssl/${DOMAIN}.crt"
echo "  sudo chmod 600 /etc/nginx/ssl/${DOMAIN}.key"
echo "  sudo systemctl reload nginx"
