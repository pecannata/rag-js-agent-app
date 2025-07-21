# CloudFlare SSL Certificate Configuration

## ⚠️ IMPORTANT: SSL Certificate Issue

The deployment script **no longer automatically overwrites** CloudFlare Origin certificates. Previous versions of the deployment script would create self-signed certificates that would overwrite proper CloudFlare Origin certificates, causing SSL issues.

## 🔧 Fixed Deployment Behavior

The `deploy.sh` script now:
- **Checks** for existing CloudFlare Origin certificates 
- **Does NOT create** self-signed certificates automatically
- **Provides instructions** for proper CloudFlare SSL setup if certificates are missing
- **Continues with HTTP-only** configuration until proper certificates are installed

## 🚀 Quick Setup

### Option 1: Use the Configuration Script (Recommended)
```bash
./configure-cloudflare-ssl.sh
```

This interactive script will:
- Show setup instructions
- Check current certificate status
- Help upload CloudFlare Origin certificates
- Restart nginx with proper certificates
- Test SSL connections

### Option 2: Manual Setup

1. **Get CloudFlare Origin Certificate:**
   - Go to https://dash.cloudflare.com
   - Select your domain: `alwayscurious.ai`
   - Go to **SSL/TLS** → **Origin Server**
   - Click **Create Certificate**
   - Select "Let Cloudflare generate a private key and a CSR"
   - Add hostnames: `alwayscurious.ai`, `*.alwayscurious.ai`
   - Choose validity: **15 years** (recommended)
   - Click **Create**

2. **Save Certificate Files:**
   - Copy the **Origin Certificate** content to a file (e.g., `cloudflare-cert.pem`)
   - Copy the **Private Key** content to a file (e.g., `cloudflare-key.pem`)

3. **Upload to Server:**
   ```bash
   # Upload certificate
   scp -i ~/.ssh/your-key.key cloudflare-cert.pem opc@129.146.0.190:/tmp/
   
   # Upload private key  
   scp -i ~/.ssh/your-key.key cloudflare-key.pem opc@129.146.0.190:/tmp/
   
   # Install on server
   ssh -i ~/.ssh/your-key.key opc@129.146.0.190 "
     sudo mkdir -p /etc/ssl/certs /etc/ssl/private
     sudo mv /tmp/cloudflare-cert.pem /etc/ssl/certs/cloudflare-origin.crt
     sudo mv /tmp/cloudflare-key.pem /etc/ssl/private/cloudflare-origin.key
     sudo chmod 644 /etc/ssl/certs/cloudflare-origin.crt
     sudo chmod 600 /etc/ssl/private/cloudflare-origin.key
     sudo chown root:root /etc/ssl/certs/cloudflare-origin.crt
     sudo chown root:root /etc/ssl/private/cloudflare-origin.key
   "
   ```

4. **Restart Nginx:**
   ```bash
   ssh -i ~/.ssh/your-key.key opc@129.146.0.190 "
     sudo nginx -t
     sudo systemctl restart nginx
   "
   ```

## 📋 Certificate Locations

The deployment script expects certificates at:
- **Certificate:** `/etc/ssl/certs/cloudflare-origin.crt`
- **Private Key:** `/etc/ssl/private/cloudflare-origin.key`

## 🔍 Troubleshooting

### Check Current Certificates
```bash
ssh -i ~/.ssh/your-key.key opc@129.146.0.190 "
  sudo openssl x509 -in /etc/ssl/certs/cloudflare-origin.crt -text -noout | grep -E '(Subject:|Issuer:|Not Before|Not After|DNS:)'
"
```

### Check Nginx Configuration
```bash
ssh -i ~/.ssh/your-key.key opc@129.146.0.190 "sudo nginx -t"
```

### Check Nginx Status
```bash
ssh -i ~/.ssh/your-key.key opc@129.146.0.190 "sudo systemctl status nginx"
```

### Test SSL Connection
```bash
curl -I https://alwayscurious.ai
```

## 🔄 After Installing Certificates

Once proper CloudFlare Origin certificates are installed:

1. **Run deployment again** - it will detect the certificates and configure nginx properly
2. **Application will be available at:** https://alwayscurious.ai
3. **SSL will work correctly** between CloudFlare and your server

## 🚨 What NOT to Do

- ❌ Do NOT use self-signed certificates with CloudFlare
- ❌ Do NOT manually create openssl certificates for production
- ❌ Do NOT skip CloudFlare Origin certificate setup

## ✅ Benefits of Proper Setup

- 🔐 **Secure connection** between CloudFlare and your server
- 🚀 **Full SSL/TLS encryption** end-to-end
- 🛡️ **Proper certificate validation**
- 📱 **No browser SSL warnings**
- ⚡ **CloudFlare performance optimizations**

## 📞 Support

If you encounter issues:

1. Check the nginx error logs: `sudo journalctl -u nginx -f`
2. Verify certificate files exist and have correct permissions
3. Test nginx configuration: `sudo nginx -t`
4. Use the configuration script for guided setup: `./configure-cloudflare-ssl.sh`
