#!/bin/bash

echo "🐍 Setting up Python environment for document processing..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python 3 is available: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment and install packages
echo "📥 Installing Python packages..."
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install required packages for document processing
pip install python-pptx    # PowerPoint processing
pip install pillow         # Image processing (already installed via pptx)
pip install pytesseract    # OCR for extracting text from images

# Check if packages are installed correctly
echo ""
echo "🔍 Verifying installations..."

python3 -c "import pptx; print('✅ python-pptx:', getattr(pptx, '__version__', 'installed'))" 2>/dev/null || echo "❌ python-pptx not installed"
python3 -c "import PIL; print('✅ Pillow:', PIL.__version__)" 2>/dev/null || echo "❌ Pillow not installed"
python3 -c "import pytesseract; print('✅ pytesseract: installed')" 2>/dev/null || echo "❌ pytesseract not installed"

echo ""
echo "🎉 Python environment setup complete!"
echo "📝 To use the environment manually: source venv/bin/activate"
echo "🖥️  The application will automatically use this environment for document processing"

# Test the PowerPoint processor
if [ -f "scripts/pptx_processor.py" ]; then
    echo ""
    echo "🧪 Testing PowerPoint processor..."
    python3 scripts/pptx_processor.py --help
    if [ $? -eq 0 ]; then
        echo "✅ PowerPoint processor is working correctly"
    else
        echo "❌ PowerPoint processor test failed"
    fi
fi
