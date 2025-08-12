#!/bin/bash

# Ollama Model Setup Script
# This script ensures required models are available for the RAG JS Agent App

echo "🚀 Setting up Ollama models for RAG JS Agent App..."

# Define required models
REQUIRED_MODELS=(
    "qwen2.5:14b"         # Primary model for general tasks
    "llama3.2:3b"         # Lighter model for quick responses
    "codellama:7b"        # Code-specific tasks
    "nomic-embed-text"    # Embeddings model
)

# Function to check if Ollama is running
check_ollama_service() {
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "❌ Ollama service is not running"
        echo "📋 Starting Ollama service..."
        
        if command -v brew > /dev/null 2>&1; then
            brew services start ollama
            echo "⏳ Waiting for Ollama to start..."
            sleep 15
            
            # Check again
            if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
                echo "✅ Ollama service started successfully"
            else
                echo "❌ Failed to start Ollama service"
                echo "🔧 Try manually: brew services start ollama"
                exit 1
            fi
        else
            echo "❌ Homebrew not found. Please start Ollama manually"
            exit 1
        fi
    else
        echo "✅ Ollama service is running"
    fi
}

# Function to check if a model is installed
check_model_installed() {
    local model=$1
    if ollama list | grep -q "^$model"; then
        return 0  # Model is installed
    else
        return 1  # Model is not installed
    fi
}

# Function to pull a model
pull_model() {
    local model=$1
    echo "📥 Pulling model: $model"
    echo "⏳ This may take several minutes depending on model size..."
    
    if ollama pull "$model"; then
        echo "✅ Successfully pulled: $model"
        return 0
    else
        echo "❌ Failed to pull: $model"
        return 1
    fi
}

# Function to get model size info
get_model_info() {
    local model=$1
    local size=$(ollama list | grep "^$model" | awk '{print $2}')
    echo "📊 $model: $size"
}

# Main execution
echo "🔍 Checking Ollama service..."
check_ollama_service

echo ""
echo "📋 Checking installed models..."
ollama list

echo ""
echo "🎯 Checking required models..."

installed_models=()
missing_models=()

for model in "${REQUIRED_MODELS[@]}"; do
    if check_model_installed "$model"; then
        echo "✅ $model is installed"
        installed_models+=("$model")
    else
        echo "❌ $model is missing"
        missing_models+=("$model")
    fi
done

echo ""
if [ ${#missing_models[@]} -eq 0 ]; then
    echo "🎉 All required models are installed!"
else
    echo "📥 Need to install ${#missing_models[@]} missing model(s):"
    for model in "${missing_models[@]}"; do
        echo "  - $model"
    done
    
    echo ""
    read -p "Would you like to install missing models now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Installing missing models..."
        for model in "${missing_models[@]}"; do
            pull_model "$model"
            echo ""
        done
    else
        echo "⏭️  Skipping model installation"
        echo "⚠️  Note: Some functionality may not work without these models"
    fi
fi

echo ""
echo "📊 Final model status:"
for model in "${REQUIRED_MODELS[@]}"; do
    if check_model_installed "$model"; then
        get_model_info "$model"
    else
        echo "❌ $model: Not installed"
    fi
done

echo ""
echo "🔧 Ollama Management Commands:"
echo "  List models:     ollama list"
echo "  Pull model:      ollama pull MODEL_NAME"
echo "  Remove model:    ollama rm MODEL_NAME"
echo "  Service status:  brew services list | grep ollama"
echo "  Start service:   brew services start ollama"
echo "  Stop service:    brew services stop ollama"
echo ""
echo "✅ Ollama setup complete!"
