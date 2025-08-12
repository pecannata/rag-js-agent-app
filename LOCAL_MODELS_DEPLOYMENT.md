# Local Models in Deployment Environments

## Overview

This document explains why you can't use local models (Ollama) in certain deployment environments and provides solutions for different deployment scenarios.

## Why Local Models Don't Work in All Deployments

### 1. **Cloud/Serverless Deployments** ❌
- **Vercel, Netlify, AWS Lambda, etc.**
- These environments don't allow you to run persistent services like Ollama
- No access to local filesystem for model storage
- Limited memory and CPU resources
- Ephemeral containers that reset between requests

### 2. **Container Orchestration** ⚠️
- **Docker, Kubernetes, etc.**
- Models need to be included in container images (increases size significantly)
- Requires persistent volumes for model storage
- Resource allocation needs to account for model memory usage
- Complex networking setup for model service communication

### 3. **Shared Hosting** ❌
- No ability to install system services
- Limited resource allocation
- No persistent background processes

## Where Local Models DO Work ✅

### 1. **Local Development** ✅
- Your development machine with Ollama installed
- Full control over services and resources
- Perfect for testing and development

### 2. **Dedicated Servers/VPS** ✅
- Full control over the system
- Can install and run Ollama as a system service
- Sufficient resources for model inference

### 3. **Self-Hosted Deployments** ✅
- Your own infrastructure
- Docker containers with proper resource allocation
- Private cloud instances

## Current Application Behavior

### Development Environment
```bash
# Start Ollama service
brew services start ollama

# Run development server
npm run dev
```

### Production Deployment with ./deploy.mac
```bash
# This deployment script:
1. Checks and starts Ollama service locally
2. Sets up required models
3. Runs the app in production mode locally
```

This works because `./deploy.mac` deploys to your **local machine** in production mode, not to a cloud service.

## Solutions for Different Deployment Types

### Option 1: Hybrid Approach (Recommended)
- Use **Cohere API** for cloud deployments
- Use **Ollama** for local development and self-hosted deployments
- The app automatically detects availability and shows appropriate options

### Option 2: Model-as-a-Service
- Host Ollama on a separate dedicated server
- Configure the app to connect to remote Ollama instance
- Update `OLLAMA_BASE_URL` in environment variables

### Option 3: Cloud GPU Services
- Use services like RunPod, Vast.ai, or Modal for model hosting
- Create API endpoints that mimic Ollama's interface
- Point your app to these endpoints

## Configuration

### Environment Variables
```bash
# For remote Ollama instance
OLLAMA_BASE_URL=http://your-ollama-server:11434

# Fallback provider for when Ollama is not available
DEFAULT_PROVIDER=cohere
COHERE_API_KEY=your_cohere_key
```

### Application Settings
The app includes provider selection in the UI:
- **Cohere (Cloud)**: Works everywhere
- **Ollama (Local)**: Only works where Ollama service is available

## Error Messages You Might See

### "Ollama service is not available in this deployment environment"
- **Cause**: App is deployed where Ollama can't run
- **Solution**: Switch to Cohere provider or deploy to compatible environment

### "Ollama service is not running"
- **Cause**: Ollama service not started
- **Solution**: Run `brew services start ollama` or `./setup-ollama-models.sh`

### "Ollama not initialized, falling back to simple search"
- **Cause**: Ollama service couldn't be reached during initialization
- **Solution**: Check Ollama service status and restart if needed

## Best Practices

### For Development
1. Use Ollama for privacy and offline development
2. Test with both providers to ensure compatibility
3. Keep models updated with `ollama pull model_name`

### For Production
1. Use Cohere API for cloud deployments
2. Use Ollama only for self-hosted deployments
3. Always provide fallback to cloud providers
4. Monitor resource usage when using local models

### For Testing
1. Test with both providers enabled
2. Verify graceful degradation when Ollama is unavailable
3. Test model switching functionality

## Model Storage Requirements

### Typical Model Sizes
- `llama3.2:3b`: ~2GB
- `qwen2.5:14b`: ~8GB  
- `codellama:7b`: ~4GB
- `nomic-embed-text`: ~274MB

### Resource Requirements
- **RAM**: Model size + 1-2GB overhead
- **Storage**: Model files + OS space
- **CPU/GPU**: For inference performance

## Troubleshooting

### Check Ollama Status
```bash
# Service status
brew services list | grep ollama

# API availability  
curl http://localhost:11434/api/tags

# Available models
ollama list
```

### Common Fixes
```bash
# Restart Ollama service
brew services restart ollama

# Pull missing models
ollama pull qwen2.5:14b

# Check app logs
tail -f production.log
```

## Conclusion

Local models are powerful for development and self-hosted deployments but require careful consideration for cloud deployments. The hybrid approach using both Cohere and Ollama provides the best flexibility and user experience.
