# Mac Local Deployment Instructions

## Steps to Deploy Production Build Locally

### 1. Stop any existing servers
```bash
pkill -f "npm start"
pkill -f "next-server"
pkill -f "next dev"
```

### 2. Build the production version
```bash
npm run build -- --no-lint
```

### 3. Start production server in background
```bash
nohup npm start > production.log 2>&1 &
```

### 4. Verify deployment
```bash
# Wait 3-5 seconds, then check
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### 5. Check server status
```bash
# Should return "200" if successful
ps aux | grep next
```

## Management Commands

### View logs
```bash
tail -f production.log
```

### Stop server
```bash
pkill -f "npm start"
```

### Check if running
```bash
ps aux | grep next
```

## Expected Results
- Server runs on http://localhost:3000
- HTTP status code 200
- Logs written to production.log
- Process runs in background (survives terminal closure)

## To Ask AI Agent to Deploy
Say: "Please follow the steps in DEPLOY-MAC.md to deploy the production build"
