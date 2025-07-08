#!/bin/bash

# Script to stop all services and processes related to rag-js-agent-app

# Stop services if running
if systemctl is-active --quiet agentic-rag-chat.service; then
    echo "Stopping agentic-rag-chat.service..."
    sudo systemctl stop agentic-rag-chat.service
fi

if systemctl is-active --quiet rag-js-agent-app.service; then
    echo "Stopping rag-js-agent-app.service..."
    sudo systemctl stop rag-js-agent-app.service
fi

# Disable services from starting on boot
sudo systemctl disable agentic-rag-chat.service
sudo systemctl disable rag-js-agent-app.service

# Kill any npm or next-server processes just in case
pkill -f "npm start"
pkill -f "next-server"

# Wait and force kill any remaining processes on port 3000
sleep 2
if netstat -tulpn 2>/dev/null | grep -q ":3000"; then
    echo "Force killing remaining processes on port 3000..."
    lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
fi

echo "All related services and processes have been stopped. 3000 is now free if no output."
