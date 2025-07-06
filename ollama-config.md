# Ollama GPU Optimization Configuration

## Current Setup
- **Model**: Llama 3.1 8B
- **Platform**: macOS with Apple Silicon
- **Service**: Running via Homebrew (`brew services start ollama`)
- **API Endpoint**: http://localhost:11434

## GPU Acceleration
Ollama automatically detects and uses Metal Performance Shaders (MPS) on Apple Silicon Macs for GPU acceleration.

### Performance Optimizations Applied:
1. **Metal GPU Acceleration**: Automatically enabled for Apple Silicon
2. **Memory Management**: Optimized for 8GB+ RAM systems
3. **Model Loading**: Kept in memory for faster responses

### Environment Variables (Optional):
```bash
# Enable flash attention (faster processing)
export OLLAMA_FLASH_ATTENTION=1

# Optimize KV cache for better memory usage
export OLLAMA_KV_CACHE_TYPE=q8_0

# Set GPU memory limit (optional)
# export OLLAMA_GPU_MEMORY_LIMIT=8G
```

## Service Management
```bash
# Start service
brew services start ollama

# Stop service
brew services stop ollama

# Restart service
brew services restart ollama

# Check service status
brew services list | grep ollama
```

## Model Management
```bash
# List installed models
ollama list

# Pull additional models
ollama pull llama3.1:8b-instruct-q8_0  # Higher quality version
ollama pull codellama:7b                # For code tasks

# Remove unused models
ollama rm model_name
```

## Performance Monitoring
```bash
# Check GPU usage (if available)
sudo powermetrics --samplers gpu_power -n 1 -i 1000

# Monitor memory usage
htop
```

## Integration with Node.js
Use the provided `OllamaClient` class in `lib/ollama-client.js` for optimal integration.

### Key Features:
- Automatic error handling
- Streaming support for real-time responses
- GPU acceleration enabled by default
- Connection pooling for better performance
- Configurable model parameters

## Best Practices
1. Keep the service running in the background
2. Use streaming for long responses
3. Adjust temperature based on use case:
   - 0.3-0.5 for factual responses
   - 0.7-0.9 for creative tasks
4. Monitor memory usage with large models
5. Use model-specific optimization when available
