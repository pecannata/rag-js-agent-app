# AI Provider Integration Guide

This chat application now supports **two AI providers** that you can choose between:

## 🌐 Cohere (Cloud-based)
- **Type**: Cloud API service
- **Model**: Command R Plus
- **Requirements**: Cohere API key
- **Best for**: Production use, latest features, reliable cloud infrastructure

## 🖥️ Ollama (Local)
- **Type**: Local AI model runner
- **Model**: Llama 3.1 8B (locally installed)
- **Requirements**: Ollama service running locally
- **Best for**: Privacy, offline use, no API costs, local development

---

## 🚀 Quick Start

### Cohere Setup
1. Get a Cohere API key from [cohere.ai](https://cohere.ai)
2. Enter it in the sidebar
3. Select "Cohere (Cloud)" from the provider dropdown
4. Start chatting!

### Ollama Setup
1. Ollama is already installed and configured with Llama 3.1 8B
2. Ensure the service is running: `brew services start ollama`
3. Select "Ollama (Local)" from the provider dropdown
4. The status indicator will show if it's ready
5. Start chatting!

---

## 🔄 Switching Between Providers

You can switch providers anytime using the dropdown in the chat header:
- **Cohere (Cloud)**: Requires API key, uses cloud processing
- **Ollama (Local)**: No API key needed, uses local GPU acceleration

> **Note**: Messages are cleared when switching providers to avoid confusion.

---

## 📊 Status Indicators

### Cohere
- ❌ Red message: "Configure your Cohere API key"
- ✅ Ready when valid API key is provided

### Ollama
- ✅ Green: "Ollama ready (X models available)"
- ❌ Red: Service not running or error
- 🔍 Shows available models and confirms Llama 3.1 8B

---

## ⚙️ Technical Details

### Ollama Configuration
- **Service**: Runs on `localhost:11434`
- **Model**: Llama 3.1 8B with GPU acceleration (Metal on Apple Silicon)
- **Management**: Via Homebrew (`brew services start/stop ollama`)

### Provider Architecture
- Both providers use the same ReAct agent framework
- Database queries and web search work with both
- Automatic error handling and fallbacks
- Same augmentation features (math, knowledge base, web search)

### Performance
- **Cohere**: Fast cloud processing, consistent availability
- **Ollama**: Local processing, privacy-focused, GPU-accelerated

---

## 🛠️ Management Commands

### Ollama Service
```bash
# Start Ollama service
brew services start ollama

# Stop Ollama service  
brew services stop ollama

# Check service status
brew services list | grep ollama

# List installed models
ollama list

# Pull additional models
ollama pull codellama:7b
```

### Model Information
- **Current Model**: Llama 3.1 8B
- **Size**: ~4.9 GB
- **Performance**: Optimized for Apple Silicon with Metal GPU acceleration

---

## 🔍 Troubleshooting

### Ollama Issues
1. **"Ollama service is not available"**
   ```bash
   brew services start ollama
   ```

2. **Model not found**
   ```bash
   ollama pull llama3.1:8b
   ```

3. **Slow responses**
   - Ensure sufficient RAM (8GB+ recommended)
   - Check if other resource-intensive apps are running

### Cohere Issues
1. **"API key required"**
   - Enter valid Cohere API key in sidebar
   - Check key permissions and quota

2. **Rate limiting**
   - Cohere has usage limits based on your plan
   - Consider using Ollama for development/testing

---

## 🎯 Best Practices

### When to Use Cohere
- Production deployments
- Need latest AI capabilities
- Consistent, reliable responses
- Don't want to manage local infrastructure

### When to Use Ollama
- Privacy-sensitive conversations
- Offline development
- Cost optimization (no API fees)
- Custom model experimentation
- Learning and experimentation

### Development Workflow
1. **Development**: Use Ollama for cost-free testing
2. **Testing**: Validate with both providers
3. **Production**: Deploy with Cohere for reliability

---

## 📈 Feature Parity

Both providers support:
- ✅ ReAct reasoning framework
- ✅ Database query integration
- ✅ Web search augmentation
- ✅ Mathematical calculations
- ✅ Knowledge base searches
- ✅ Domain similarity checking
- ✅ Multi-step analysis
- ✅ Streaming responses (Ollama)
- ✅ Temperature control
- ✅ Context management

---

## 🔐 Security & Privacy

### Cohere
- Data sent to Cohere's servers
- Subject to Cohere's privacy policy
- API key required (store securely)

### Ollama
- All processing happens locally
- No data leaves your machine
- No API keys or external dependencies
- Full privacy control

---

This dual-provider setup gives you the flexibility to choose the best AI backend for your specific needs while maintaining a consistent user experience!
