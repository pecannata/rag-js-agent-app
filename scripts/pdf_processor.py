#!/usr/bin/env python3
"""
PDF Text Extraction Script
Extracts text from PDF files using PyPDF2 and handles various edge cases.
"""

import sys
import json
import argparse
from pathlib import Path

try:
    import PyPDF2
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "PyPDF2 not installed. Please run: pip install PyPDF2",
        "text": "",
        "pageCount": 0
    }))
    sys.exit(1)

def extract_text_from_pdf(pdf_path, max_pages=50):
    """
    Extract text from PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file
        max_pages (int): Maximum number of pages to process
        
    Returns:
        dict: Result containing success status, text, and metadata
    """
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            # Get basic metadata
            num_pages = len(pdf_reader.pages)
            pages_to_process = min(num_pages, max_pages)
            
            extracted_text = ""
            page_texts = []
            
            for page_num in range(pages_to_process):
                try:
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    
                    if page_text.strip():
                        page_texts.append({
                            "page": page_num + 1,
                            "text": page_text.strip()
                        })
                        extracted_text += f"\n--- Page {page_num + 1} ---\n{page_text}\n"
                    
                except Exception as page_error:
                    page_texts.append({
                        "page": page_num + 1,
                        "text": f"[Error extracting text from page {page_num + 1}: {str(page_error)}]"
                    })
                    extracted_text += f"\n--- Page {page_num + 1} ---\n[Error extracting text]\n"
            
            # Clean up the text
            cleaned_text = extracted_text.strip()
            if cleaned_text:
                # Normalize whitespace but preserve paragraph breaks
                cleaned_text = '\n'.join(line.strip() for line in cleaned_text.split('\n') if line.strip())
            
            return {
                "success": True,
                "text": cleaned_text,
                "pageCount": num_pages,
                "processedPages": pages_to_process,
                "pageTexts": page_texts,
                "hasText": bool(cleaned_text.strip())
            }
            
    except FileNotFoundError:
        return {
            "success": False,
            "error": f"PDF file not found: {pdf_path}",
            "text": "",
            "pageCount": 0
        }
    except PyPDF2.errors.PdfReadError as e:
        return {
            "success": False,
            "error": f"Failed to read PDF: {str(e)}. File may be corrupted or password-protected.",
            "text": "",
            "pageCount": 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error processing PDF: {str(e)}",
            "text": "",
            "pageCount": 0
        }

def main():
    parser = argparse.ArgumentParser(description='Extract text from PDF files')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    parser.add_argument('--max-pages', type=int, default=50, help='Maximum pages to process')
    
    args = parser.parse_args()
    
    result = extract_text_from_pdf(args.pdf_path, args.max_pages)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
