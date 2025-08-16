# PDF Processing Setup and Troubleshooting

## Overview
This document explains the PDF processing functionality in the RAG JS Agent App, including setup requirements and troubleshooting steps.

## ✅ Issue Resolution Summary

**Problem**: PDF processing in the vectorize tab was failing with the error:
```
"PyPDF2 not installed. Please run: pip install PyPDF2"
```

**Root Cause**: Missing Python dependencies for document processing scripts.

**Solution**: ✅ **RESOLVED** - All Python dependencies have been installed and the deployment script updated.

## 🛠️ Setup Requirements

### Python Dependencies Installed
```bash
# Core document processing
PyPDF2==3.0.1              # PDF text extraction
python-docx==1.2.0          # Word document processing
python-pptx==1.0.2          # PowerPoint processing

# Advanced text processing
langchain==0.3.27           # Text chunking and processing
langchain-core==0.3.74
langchain-text-splitters==0.3.9

# OCR capabilities (optional)
pillow>=10.0.0              # Image processing
pytesseract>=0.3.10         # OCR text extraction

# Utilities
PyYAML>=6.0.0
requests>=2.31.0
```

### Installation Methods
1. **Automatic**: Run `./deploy.mac` (now includes dependency installation)
2. **Manual**: `pip3 install -r scripts/requirements.txt`
3. **Individual**: `pip3 install PyPDF2 python-docx python-pptx langchain`

## 📁 Document Processing Scripts

### Available Processors
- **`scripts/pdf_processor.py`**: PDF text extraction with error handling
- **`scripts/docx_processor.py`**: Word document processing + OCR
- **`scripts/pptx_processor.py`**: PowerPoint processing + OCR
- **`scripts/chunk_text.py`**: Text chunking using LangChain

### Testing Scripts
```bash
# Test PDF processing
python3 scripts/pdf_processor.py --help

# Test with actual PDF
python3 scripts/pdf_processor.py "path/to/file.pdf" --max-pages 10
```

## 🔧 Enhanced Deployment

### Updated `./deploy.mac` Features
- ✅ Ollama service setup and model management
- ✅ Python dependency installation
- ✅ Graceful error handling
- ✅ Comprehensive status reporting

### New Files Added
- `scripts/requirements.txt`: Python dependency specifications
- `setup-ollama-models.sh`: Automated model management
- `LOCAL_MODELS_DEPLOYMENT.md`: Local AI deployment guide

## 🚀 Current Status

### Production Server Status
- **URL**: http://localhost:3020
- **Status**: ✅ Running with PDF processing capabilities
- **Dependencies**: ✅ All Python packages installed
- **Ollama Models**: ✅ 7 models available (14GB+ total)

### Document Processing Features
- ✅ PDF text extraction
- ✅ Word document processing
- ✅ PowerPoint processing  
- ✅ Text chunking for vectorization
- ✅ OCR support (with optional dependencies)
- ✅ Error handling and logging

## 📋 Troubleshooting Guide

### Common Issues and Solutions

#### 1. "PyPDF2 not installed" Error
**Status**: ✅ **RESOLVED**
```bash
# Solution: Reinstall dependencies
pip3 install -r scripts/requirements.txt
./deploy.mac  # Redeploy with dependency check
```

#### 2. PDF Upload Fails in UI
**Check**:
1. Server logs: `tail -f production.log`
2. File size limits (default: 50MB)
3. Python script permissions

#### 3. OCR Not Working
**Optional Feature** - Install additional dependencies:
```bash
# macOS
brew install tesseract
pip3 install pytesseract pillow

# Verify
python3 -c "import pytesseract; print('OCR available')"
```

#### 4. Text Chunking Issues
**Check LangChain installation**:
```bash
python3 -c "from langchain.text_splitter import RecursiveCharacterTextSplitter; print('LangChain OK')"
```

### Debug Commands
```bash
# Check Python packages
pip3 list | grep -E "(PyPDF2|langchain|python-docx)"

# Test PDF processor directly
python3 scripts/pdf_processor.py "test.pdf" --max-pages 5

# Check server logs
tail -f production.log | grep -i pdf

# Monitor tmux session
tmux attach -t rag-js-agent-app
```

## 📊 Performance Notes

### File Size Limits
- **PDF**: Up to 50 pages by default (configurable)
- **Upload**: 50MB limit (configurable in API routes)
- **Memory**: Text extraction is memory-efficient

### Processing Times
- **Small PDF (1-5 pages)**: ~2-5 seconds
- **Large PDF (20-50 pages)**: ~10-30 seconds
- **OCR Processing**: +5-15 seconds per image

## 🔮 Future Enhancements

### Potential Improvements
1. **Batch Processing**: Multiple file uploads
2. **Advanced OCR**: Better image text extraction
3. **Format Support**: Additional document types
4. **Cloud Processing**: Optional cloud-based OCR
5. **Progress Indicators**: Real-time processing status

## ✅ Verification Steps

### Test PDF Processing
1. Go to http://localhost:3020
2. Navigate to "Vectorize" tab
3. Upload a PDF file
4. Verify text extraction works without errors
5. Check that text chunks are generated

### Expected Results
- ✅ PDF uploads successfully
- ✅ Text extracted and displayed
- ✅ No "PyPDF2 not installed" errors
- ✅ Chunks generated for vectorization
- ✅ Process completes without crashes

## 📞 Support Information

### Getting Help
1. Check `production.log` for detailed errors
2. Run `python3 scripts/pdf_processor.py --help`
3. Verify dependencies: `pip3 list | grep PyPDF2`
4. Test scripts individually before debugging API

### Dependencies Summary
All required Python packages are now installed and the deployment process has been enhanced to automatically handle dependencies in future deployments.
