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

### 1. Install tmux (if not already installed)
```bash
brew install tmux
```

### 2. Stop any existing servers
```bash
./stop.mac
```

### 3. Build the production version
```bash
npm run build -- --no-lint
```

### 4. Start production server in tmux session
```bash
tmux new-session -d -s rag-js-agent-app 'npm start 2>&1 | tee production.log'
```

### 5. Verify deployment
```bash
# Wait 3-5 seconds, then check
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### 6. Check server status
```bash
# Should return "200" if successful
tmux ls
```

## Process Management

### View logs
```bash
tail -f production.log
```

### Monitor the server (attach to tmux session)
```bash
tmux attach -t rag-js-agent-app
```

### Detach from tmux session
```
Ctrl+B, then D
```

### Stop server (preferred method)
```bash
./stop.mac
```

### Stop server (manual method)
```bash
# Kill the tmux session
tmux kill-session -t rag-js-agent-app

# Or use pkill as fallback
pkill -f "npm start"
```

### Check if running
```bash
# Check tmux sessions
tmux ls

# Or check all next processes
ps aux | grep next
```

## Expected Results
- Server runs on http://localhost:3000
- HTTP status code 200
- Logs written to production.log
- Process runs in tmux session (survives terminal closure)
- Session name: `rag-js-agent-app`

## Key Features
- **Background Process**: Uses `tmux` to run independently of terminal
- **Interactive Monitoring**: Can attach to session to see live output
- **Session Management**: Easy to find and manage with `tmux ls`
- **Clean Shutdown**: `stop.mac` script handles graceful termination
- **Persistent Operation**: Server continues running after terminal closure
- **Live Logs**: Both file logging and interactive session viewing

## tmux Quick Reference

### Basic Commands
```bash
# List all sessions
tmux ls

# Attach to session
tmux attach -t rag-js-agent-app

# Kill session
tmux kill-session -t rag-js-agent-app

# Create new session
tmux new-session -d -s session-name 'command'
```

### Inside tmux Session
- **Detach**: `Ctrl+B`, then `D`
- **Scroll up**: `Ctrl+B`, then `[`, then use arrow keys
- **Exit scroll mode**: `Q`

## To Ask AI Agent to Deploy
Say: "Please run ./deploy.mac to deploy the production build"
