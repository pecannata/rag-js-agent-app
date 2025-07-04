#!/usr/bin/env python3
"""
Text chunking script using langchain's RecursiveCharacterTextSplitter
"""

import sys
import json
from typing import List, Dict

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
except ImportError:
    print(json.dumps({
        "error": "langchain not installed. Please run: pip install langchain",
        "success": False
    }))
    sys.exit(1)

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Dict]:
    """
    Chunk text using langchain's RecursiveCharacterTextSplitter
    
    Args:
        text: The text to chunk
        chunk_size: Target size of each chunk in characters
        chunk_overlap: Number of characters to overlap between chunks
        
    Returns:
        List of chunk dictionaries with id, text, charCount, and wordCount
    """
    try:
        # Create the text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Split the text
        chunks = text_splitter.split_text(text)
        
        # Format chunks for our application
        formatted_chunks = []
        for i, chunk in enumerate(chunks, 1):
            chunk_text = chunk.strip()
            if chunk_text:  # Only include non-empty chunks
                formatted_chunks.append({
                    "id": i,
                    "text": chunk_text,
                    "charCount": len(chunk_text),
                    "wordCount": len(chunk_text.split())
                })
        
        return formatted_chunks
        
    except Exception as e:
        raise Exception(f"Failed to chunk text: {str(e)}")

def main():
    """Main function to handle command line arguments and process text"""
    try:
        if len(sys.argv) != 4:
            print(json.dumps({
                "error": "Usage: python chunk_text.py <text> <chunk_size> <overlap>",
                "success": False
            }))
            sys.exit(1)
        
        text = sys.argv[1]
        chunk_size = int(sys.argv[2])
        overlap = int(sys.argv[3])
        
        # Validate inputs
        if not text or not text.strip():
            print(json.dumps({
                "error": "Empty text provided",
                "success": False
            }))
            sys.exit(1)
            
        if chunk_size <= 0:
            print(json.dumps({
                "error": "Chunk size must be greater than 0",
                "success": False
            }))
            sys.exit(1)
            
        if overlap < 0:
            print(json.dumps({
                "error": "Overlap must be 0 or greater",
                "success": False
            }))
            sys.exit(1)
            
        if overlap >= chunk_size:
            print(json.dumps({
                "error": "Overlap must be less than chunk size",
                "success": False
            }))
            sys.exit(1)
        
        # Chunk the text
        chunks = chunk_text(text, chunk_size, overlap)
        
        # Return success response
        result = {
            "success": True,
            "chunks": chunks,
            "metadata": {
                "totalChunks": len(chunks),
                "totalCharacters": sum(chunk["charCount"] for chunk in chunks),
                "totalWords": sum(chunk["wordCount"] for chunk in chunks),
                "averageChunkSize": sum(chunk["charCount"] for chunk in chunks) // len(chunks) if chunks else 0,
                "chunkSize": chunk_size,
                "overlap": overlap
            }
        }
        
        print(json.dumps(result))
        
    except ValueError as e:
        print(json.dumps({
            "error": f"Invalid numeric arguments: {str(e)}",
            "success": False
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "success": False
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
