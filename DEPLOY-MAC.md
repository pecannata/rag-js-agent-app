# Mac Local Deployment Instructions

## Quick Start (Recommended)

### Deploy with automatic script
```bash
./deploy.mac
```

### Stop the server
```bash
./stop.mac
```

## Manual Steps (if needed)

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

## Process Management

### View logs
```bash
tail -f production.log
```

### Stop server (preferred method)
```bash
./stop.mac
```

### Stop server (manual method)
```bash
# If you have the PID file
kill $(cat app.pid)

# Or use pkill as fallback
pkill -f "npm start"
```

### Check if running
```bash
# Check specific process
ps -p $(cat app.pid)

# Or check all next processes
ps aux | grep next
```

## Expected Results
- Server runs on http://localhost:3000
- HTTP status code 200
- Logs written to production.log
- Process runs in background (survives terminal closure)
- Process ID saved to app.pid file

## Key Features
- **Background Process**: Uses `nohup` to run independently of terminal
- **Process Tracking**: Saves PID to `app.pid` for easy management
- **Clean Shutdown**: `stop.mac` script handles graceful termination
- **Persistent Operation**: Server continues running after terminal closure

## To Ask AI Agent to Deploy
Say: "Please run ./deploy.mac to deploy the production build"
