# Authentication Checklist

## ✅ What I'll Remember (This Conversation)
- Add `withAuth()` wrapper to all new API routes
- Use proper activity logging
- Follow the template in `docs/API_ROUTE_TEMPLATE.md`

## 🔄 What You Need to Remember (Future)
When creating new API routes, always:

### 1. Start with the Template
```typescript
import { withAuth } from '@/lib/auth/with-auth';

export const POST = withAuth(async (request, user) => {
  // Your logic here
});
```

### 2. Quick Copy-Paste
```typescript
// Top of file
import { withAuth } from '@/lib/auth/with-auth';

// Replace this:
export async function POST(request: NextRequest) {
  // your code
}

// With this:
export const POST = withAuth(async (request, user) => {
  // your code - user is guaranteed authenticated
});
```

### 3. Routes That DON'T Need Auth
- Webhooks (`/api/webhooks/*`)
- Health checks
- Public metadata

For these, use:
```typescript
export const POST = withAuth(async (request, user) => {
  // your code
}, { skipAuth: true });
```

## 🛡️ What This Gives You
- ✅ Automatic authentication on all routes
- ✅ Consistent error responses
- ✅ User information available in every route
- ✅ Activity logging capability
- ✅ Security by default

## 📝 Current Protected Routes
- ✅ `/api/process-pptx` - Document processing
- ✅ `/api/chat` - AI interactions
- ⚠️ `/api/webhooks/clerk` - Intentionally unprotected (webhook)

## 🎯 Benefits
1. **Impossible to forget** - Template makes auth the default
2. **Cleaner code** - No repetitive auth checks
3. **Consistent logging** - Standardized activity tracking
4. **Easy debugging** - User context in every route
5. **Security first** - Auth is opt-out, not opt-in
