# SendGrid Sender Verification Fix

## Current Issue
Your SendGrid API key is working, but emails fail with a 403 Forbidden error because the sender email address (`cannata@utexas.edu`) is not verified as a "Sender Identity" in SendGrid.

## Error Message
```
The from address does not match a verified Sender Identity. Mail cannot be sent until this error is resolved.
```

## Solution Steps

### Step 1: Access SendGrid Dashboard
1. Go to https://app.sendgrid.com/
2. Log in with your SendGrid account

### Step 2: Navigate to Sender Authentication
1. In the left sidebar, click on **Settings**
2. Click on **Sender Authentication**

### Step 3: Verify Single Sender
1. Look for the **"Authenticate Your Domain"** section
2. Click on **"Verify a Single Sender"** (this is easier than domain authentication)
3. Click **"Create New Sender"**

### Step 4: Fill Out Sender Information
Fill in the form with your details:
- **From Name**: Your name or blog name (e.g., "Dr. Cannata's Blog")
- **From Email**: `cannata@utexas.edu`
- **Reply To**: `cannata@utexas.edu` (same as from email)
- **Company Address**: Your address
- **City**: Your city
- **State**: Your state
- **Zip**: Your zip code
- **Country**: Your country

### Step 5: Complete Email Verification
1. Click **"Create"**
2. SendGrid will send a verification email to `cannata@utexas.edu`
3. Check your UT email inbox (and spam folder)
4. Click the verification link in the email from SendGrid

### Step 6: Verify Success
Once verified, you should see:
- A green checkmark next to your sender identity in the SendGrid dashboard
- The status should show "Verified"

### Step 7: Test Email Sending
After verification is complete:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Test with the minimal script:
   ```bash
   node test-sendgrid-minimal.js
   ```

3. Or test through your application's test endpoint:
   ```
   http://localhost:3001/api/test-email
   ```

## Alternative: Domain Authentication (Advanced)
If you plan to send many emails, consider authenticating your entire domain instead:
1. In **Settings → Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Follow the DNS setup instructions

This provides better deliverability but requires DNS configuration.

## Troubleshooting
- **Still getting 403 errors**: Make sure you clicked the verification link in your email
- **No verification email**: Check spam folder, or try resending from SendGrid dashboard
- **Wrong sender**: Make sure the "from" email in your code exactly matches the verified sender

## Important Notes
- Sender verification is separate from your account email verification
- Each "from" email address must be individually verified
- Free SendGrid accounts can verify up to 100 sender identities
