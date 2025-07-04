#!/usr/bin/env python3
"""
Microsoft PowerPoint Presentation Text Extraction Script
Extracts text from .pptx files using python-pptx.
"""

import sys
import json
import argparse
from pathlib import Path

try:
    from pptx import Presentation
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "python-pptx not installed. Please run: pip install python-pptx",
        "text": "",
        "slideCount": 0
    }))
    sys.exit(1)

def extract_text_from_pptx(pptx_path):
    """
    Extract text from PowerPoint file.
    
    Args:
        pptx_path (str): Path to the .pptx file
        
    Returns:
        dict: Result containing success status, text, and metadata
    """
    try:
        presentation = Presentation(pptx_path)
        
        extracted_text = ""
        slide_texts = []
        
        for i, slide in enumerate(presentation.slides):
            slide_text = ""
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    slide_text += shape.text + "\n"
            
            slide_text = slide_text.strip()
            if slide_text:  # Only include non-empty text
                slide_texts.append({
                    "slide": i + 1,
                    "text": slide_text
                })
                extracted_text += f"\n--- Slide {i + 1} ---\n{slide_text}\n"
        
        # Clean up the text
        cleaned_text = extracted_text.strip()
        if cleaned_text:
            # Normalize excessive whitespace but preserve breaks
            lines = []
            for line in cleaned_text.split('\n'):
                cleaned_line = line.strip()
                if cleaned_line or (lines and lines[-1]):  # Keep empty lines only if preceded by content
                    lines.append(cleaned_line)
            cleaned_text = '\n'.join(lines)
        
        return {
            "success": True,
            "text": cleaned_text,
            "slideCount": len(presentation.slides),
            "slideTexts": slide_texts,
            "hasText": bool(cleaned_text.strip())
        }
        
    except FileNotFoundError:
        return {
            "success": False,
            "error": f"PowerPoint file not found: {pptx_path}",
            "text": "",
            "slideCount": 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error processing PowerPoint: {str(e)}",
            "text": "",
            "slideCount": 0
        }

def main():
    parser = argparse.ArgumentParser(description='Extract text from Microsoft PowerPoint (.pptx) files')
    parser.add_argument('pptx_path', help='Path to the .pptx file')
    
    args = parser.parse_args()
    
    result = extract_text_from_pptx(args.pptx_path)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
