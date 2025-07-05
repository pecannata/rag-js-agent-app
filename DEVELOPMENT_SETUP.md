# Development Setup Guide

Your application is currently running in **development mode** with authentication and database features partially disabled.

## Current Status

🚧 **Authentication**: Disabled (Clerk not configured)
🚧 **Oracle Database**: Not configured  
✅ **Core App**: Working (document processing, chat, etc.)

## What You Need to Configure

### 1. Oracle Database (SQLclScript.sh)

Your authentication system uses the existing `SQLclScript.sh` for database operations - **no additional Oracle configuration needed!**

**Requirements:**
- `SQLclScript.sh` should be in the parent directory (`../SQLclScript.sh`)
- Same Oracle connection your app already uses
- Oracle tables created (RAG_AUTH_* tables)

**Advantages:**
- ✅ Reuses your existing Oracle setup
- ✅ No duplicate connection configuration
- ✅ Consistent with your app's database pattern
- ✅ Same SQLcl/Oracle client tools

### 2. Clerk Authentication (Optional for development)

1. **Sign up at [https://clerk.com](https://clerk.com)**
2. **Create a new application**
3. **Get your keys** from the dashboard
4. **Update `.env.local`:**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Current Behavior

### ✅ What Works Now:
- Document processing (PDF, DOCX, PPTX)
- AI chat functionality
- Vector search
- File uploads
- Basic UI

### ⚠️ What's Disabled:
- User authentication (bypassed in dev mode)
- Activity logging (Oracle not configured)
- User management
- Database user sync

## Development vs Production

| Feature | Development (Now) | Production (After Setup) |
|---------|------------------|--------------------------|
| Authentication | Bypassed | Required |
| Database | Mocked/Skipped | Full Oracle integration |
| Activity Logging | Skipped | Full audit trail |
| User Management | N/A | Complete user system |

## Next Steps

1. **For immediate development**: The app works as-is
2. **For Oracle setup**: Configure your database connection
3. **For authentication**: Set up Clerk account and keys
4. **For production**: Configure both Oracle and Clerk

## Error Messages You Might See

- `"Oracle database not configured"` - Normal in development
- `"Publishable key not valid"` - Normal without Clerk setup
- `"Skipping activity logging"` - Normal without Oracle

These are all expected and don't break functionality!
