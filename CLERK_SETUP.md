# Clerk Authentication Setup

This guide will help you set up Clerk authentication for your Agentic RAG Chat application.

## 1. Create a Clerk Account & Get Keys

1. **Sign up**: Go to [https://clerk.com](https://clerk.com) and create a free account
2. **Create app**: Click "Add application" 
3. **Choose options**: 
   - Name: "Agentic RAG Chat" 
   - Choose "Email and Password" + "Google" (optional)
   - Select "Next.js" as framework
4. **Get your keys**: After creation, you'll see your keys immediately

## 2. Get Your API Keys

After creating your application in Clerk:

1. Go to the **API Keys** section in your Clerk dashboard
2. Copy the **Publishable Key** (starts with `pk_test_`)
3. Copy the **Secret Key** (starts with `sk_test_`)

## 3. Update Environment Variables

Update your `.env.local` file with your actual Clerk keys:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Clerk URLs (these are already configured correctly)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Add your existing environment variables here
# Oracle Database connection, OpenAI API key, etc.
```

## 4. Configure Webhooks (for Database Sync)

1. In your Clerk dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. Set the URL to: `https://your-domain.com/api/webhooks/clerk`
4. Select these events:
   - `user.created`
   - `user.updated`
   - `session.created`
5. Copy the **Signing Secret** and add it to your `.env.local` as `CLERK_WEBHOOK_SECRET`

## 5. Create Oracle Database Tables

Run these SQL commands in your Oracle database:

```sql
-- Users table
CREATE TABLE RAG_AUTH_USERS (
    id VARCHAR2(36) PRIMARY KEY,
    clerk_user_id VARCHAR2(100) UNIQUE NOT NULL,
    email VARCHAR2(255) UNIQUE NOT NULL,
    first_name VARCHAR2(100),
    last_name VARCHAR2(100),
    is_active NUMBER(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- User preferences/metadata
CREATE TABLE RAG_AUTH_USER_METADATA (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES RAG_AUTH_USERS(id),
    clerk_user_id VARCHAR2(100) NOT NULL,
    metadata_key VARCHAR2(100) NOT NULL,
    metadata_value CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User activity log (optional - for audit trail)
CREATE TABLE RAG_AUTH_USER_ACTIVITY (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES RAG_AUTH_USERS(id),
    clerk_user_id VARCHAR2(100) NOT NULL,
    activity_type VARCHAR2(50) NOT NULL,
    activity_details CLOB,
    ip_address VARCHAR2(45),
    user_agent VARCHAR2(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document access permissions (for future use)
CREATE TABLE RAG_AUTH_DOCUMENT_PERMISSIONS (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES RAG_AUTH_USERS(id),
    document_id VARCHAR2(36),
    permission_type VARCHAR2(20) NOT NULL,
    granted_by VARCHAR2(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IDX_RAG_AUTH_USERS_CLERK_ID ON RAG_AUTH_USERS(clerk_user_id);
CREATE INDEX IDX_RAG_AUTH_USERS_EMAIL ON RAG_AUTH_USERS(email);
CREATE INDEX IDX_RAG_AUTH_METADATA_USER ON RAG_AUTH_USER_METADATA(user_id);
CREATE INDEX IDX_RAG_AUTH_METADATA_CLERK ON RAG_AUTH_USER_METADATA(clerk_user_id);
CREATE INDEX IDX_RAG_AUTH_ACTIVITY_USER ON RAG_AUTH_USER_ACTIVITY(user_id);
CREATE INDEX IDX_RAG_AUTH_ACTIVITY_DATE ON RAG_AUTH_USER_ACTIVITY(created_at);
```

## 6. Configure Two-Factor Authentication

1. In your Clerk dashboard, go to **User & Authentication** → **Multi-factor**
2. Enable **TOTP (Authenticator app)**
3. Optionally enable **SMS** if you want SMS-based 2FA
4. Configure the settings as needed

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Visit your application
3. Click "Sign Up" to create a test account
4. Enable 2FA in your profile
5. Test signing in and out

## 8. Available Routes

- `/sign-in` - Sign in page
- `/sign-up` - Sign up page  
- `/profile` - User profile management (includes 2FA setup)

## 9. Features Included

✅ **User Registration & Login**
✅ **Email Verification**
✅ **Two-Factor Authentication** (TOTP & SMS)
✅ **Password Reset**
✅ **User Profile Management**
✅ **Session Management**
✅ **Database Sync** (Clerk users → Oracle database)
✅ **Activity Logging**
✅ **Route Protection**

## 10. Development Notes

- The middleware automatically protects all routes except public ones
- User data is synced to your Oracle database via webhooks
- API routes can use the `authenticateApiRequest()` utility for user authentication
- All authentication UI is handled by Clerk's pre-built components

## Need Help?

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Integration Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Webhook Setup](https://clerk.com/docs/integrations/webhooks)
