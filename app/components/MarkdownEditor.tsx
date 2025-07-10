'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  apiKey: string;
}

interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
}

interface ReadmeFile {
  name: string;
  path: string;
  relativePath: string;
  type: 'file';
}

interface DirectoryInfo {
  name: string;
  path: string;
  relativePath: string;
  type: 'directory';
  readmeFiles: ReadmeFile[];
  subdirectories?: DirectoryInfo[];
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string;
  directories: DirectoryItem[];
  readmeFiles: DirectoryItem[];
}

interface ReadmeBrowseResponse {
  currentPath: string;
  parentPath: string;
  directories: DirectoryInfo[];
  readmeFiles: ReadmeFile[];
  parentReadmeFiles: ReadmeFile[];
  groupedReadmeFiles: { [key: string]: ReadmeFile[] };
}

export default function MarkdownEditor({ apiKey: _apiKey }: MarkdownEditorProps) {

  const handleBrowseDirectory = async (path: string) => {
    setNewFileLoading(true);
    try {
      const response = await fetch(`/api/browse-files?path=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data: BrowseResponse = await response.json();
        setNewFileDirectories(data.directories);
        setNewFileParentPath(data.parentPath);
        setNewFilePath(path);
      } else {
        console.error('Failed to browse directory');
      }
    } catch (error) {
      console.error('Error browsing directory:', error);
    } finally {
      setNewFileLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const response = await fetch('/api/create-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dirPath: newFilePath,
          dirName: newFolderName,
        }),
      });

      if (response.ok) {
        setShowNewFolderInput(false);
        setNewFolderName('');
        await handleBrowseDirectory(newFilePath);
        
        // If we're creating a folder in the current path, refresh the main directory listing
        if (newFilePath === currentPath) {
          await browseDirectory(currentPath);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create folder');
      }

    } catch (error) {
      setError('Error creating folder: ' + error);
    } finally {
      setCreatingFolder(false);
    }
  };
  const [markdown, setMarkdown] = useState<string>('# Welcome to Markdown Organizer\n\nThis is a **markdown organizer** with Monaco Editor (VS Code).\n\n## Features\n\n- ✅ Professional code editor experience\n- ✅ Markdown syntax highlighting\n- ✅ IntelliSense and autocompletion\n- ✅ File organizer for .md files\n- ✅ Document management\n- ✅ Create files and folders\n\n## Getting Started\n\n1. Browse directories in the Organizer sidebar\n2. Click on .md files to open them\n3. Create new files and folders\n4. Edit with full VS Code functionality\n5. Save and manage your documents\n\n**Happy organizing!** 📝');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [readmeFiles, setReadmeFiles] = useState<ReadmeFile[]>([]);
  const [parentReadmeFiles, setParentReadmeFiles] = useState<ReadmeFile[]>([]);
  const [_groupedReadmeFiles, _setGroupedReadmeFiles] = useState<{ [key: string]: ReadmeFile[] }>({});
  const [_parentPath, _setParentPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPathBrowser, setShowPathBrowser] = useState(false);
  const [pathBrowserPath, setPathBrowserPath] = useState<string>('');
  const [pathBrowserDirs, setPathBrowserDirs] = useState<DirectoryItem[]>([]);
  const [pathBrowserParent, setPathBrowserParent] = useState<string>('');
  const [pathBrowserLoading, setPathBrowserLoading] = useState(false);
  const [pathBrowserInitialized, setPathBrowserInitialized] = useState(false);
  const [editorRef, setEditorRef] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null);
  const [findText, setFindText] = useState('');
  const [decorationIds, setDecorationIds] = useState<string[]>([]);
  const [findTimeout, setFindTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentMatches, setCurrentMatches] = useState<any[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{[key: string]: {width: number, height: number}}>({});
  const [savingDimensions, setSavingDimensions] = useState<string | null>(null);
  const [autoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileDirectories, setNewFileDirectories] = useState<DirectoryItem[]>([]);
  const [newFileParentPath, setNewFileParentPath] = useState('');
  const [newFileLoading, setNewFileLoading] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingFile, setCreatingFile] = useState(false);
  const [isSideBySideMode] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [tocHeaders, setTocHeaders] = useState<{id: string, level: number, text: string, isSpace?: boolean}[]>([]);
  const [tocMaxLevel, setTocMaxLevel] = useState(3); // Default to show H1, H2, H3
  const [showTOCInsertModal, setShowTOCInsertModal] = useState(false);
  const [tocInsertLevel, setTocInsertLevel] = useState(3); // Level for inserting TOC
  const [tocIncludeSpacing, setTocIncludeSpacing] = useState(false); // Add spacing between levels
  const [showCheatSheet, setShowCheatSheet] = useState(false); // Markdown cheat sheet modal
  const [showNotepad, setShowNotepad] = useState(false); // Notepad modal
  const [notepadContent, setNotepadContent] = useState(''); // Notepad content
  const [notepadLoading, setNotepadLoading] = useState(false); // Notepad loading state
  const [notepadSaving, setNotepadSaving] = useState(false); // Notepad saving state
  const [notepadDimensions, setNotepadDimensions] = useState({ width: 384, height: 320 }); // Notepad dimensions
  const [isResizing, setIsResizing] = useState(false); // Notepad resize state
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 384, height: 320 }); // Resize start position
  const imageContextMapRef = useRef<Map<string, {index: number, context: string}>>(new Map());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);


  // Notepad functions
  const openNotepad = async () => {
    setShowNotepad(true);
    setNotepadLoading(true);
    
    try {
      const response = await fetch('/api/notepad');
      if (response.ok) {
        const data = await response.json();
        setNotepadContent(data.content || '');
      } else {
        console.error('Failed to load notepad');
        setNotepadContent('');
      }
    } catch (error) {
      console.error('Error loading notepad:', error);
      setNotepadContent('');
    } finally {
      setNotepadLoading(false);
    }
  };
  
  const saveNotepad = async () => {
    setNotepadSaving(true);
    
    try {
      const response = await fetch('/api/notepad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: notepadContent }),
      });
      
      if (!response.ok) {
        console.error('Failed to save notepad');
      }
    } catch (error) {
      console.error('Error saving notepad:', error);
    } finally {
      setNotepadSaving(false);
    }
  };
  
  const closeNotepad = () => {
    setShowNotepad(false);
  };
  
  // Resize functions for notepad
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: notepadDimensions.width,
      height: notepadDimensions.height
    });
  };
  
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    const newWidth = Math.max(300, resizeStart.width + deltaX); // Min width 300px
    const newHeight = Math.max(200, resizeStart.height + deltaY); // Min height 200px
    
    setNotepadDimensions({ width: newWidth, height: newHeight });
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false);
  };
  
  // Add event listeners for resize
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
    
    // Return empty cleanup function for non-resizing state
    return () => {};
  }, [isResizing, resizeStart]);

  // Toolbar functions for inserting markdown syntax
  const insertMarkdownSyntax = (before: string, after: string = '', defaultText: string = '') => {
    if (!editorRef) return;
    
    const selection = editorRef.getSelection();
    if (!selection) return;
    
    const model = editorRef.getModel();
    if (!model) return;
    
    const selectedText = model.getValueInRange(selection);
    const textToInsert = selectedText || defaultText;
    const newText = `${before}${textToInsert}${after}`;
    
    editorRef.executeEdits('toolbar-insert', [{
      range: selection,
      text: newText
    }]);
    
    // Set cursor position after insertion
    const startLine = selection.startLineNumber;
    const startCol = selection.startColumn;
    const endCol = startCol + newText.length;
    
    if (!selectedText && defaultText) {
      // Select the default text so user can replace it
      const selectStart = startCol + before.length;
      const selectEnd = startCol + before.length + defaultText.length;
      editorRef.setSelection({
        startLineNumber: startLine,
        startColumn: selectStart,
        endLineNumber: startLine,
        endColumn: selectEnd
      });
    } else {
      // Move cursor to end of inserted text
      editorRef.setPosition({
        lineNumber: startLine,
        column: endCol
      });
    }
  };
  
  const insertBold = () => insertMarkdownSyntax('**', '**', 'bold text');
  const insertItalic = () => insertMarkdownSyntax('*', '*', 'italic text');
  const insertStrikethrough = () => insertMarkdownSyntax('~~', '~~', 'strikethrough text');
  const insertHeader1 = () => insertMarkdownSyntax('# ', '', 'Header 1');
  const insertHeader2 = () => insertMarkdownSyntax('## ', '', 'Header 2');
  const insertHeader3 = () => insertMarkdownSyntax('### ', '', 'Header 3');
  const insertBlockquote = () => insertMarkdownSyntax('> ', '', 'blockquote text');
  const insertUnorderedList = () => insertMarkdownSyntax('- ', '', 'List item');
  const insertOrderedList = () => insertMarkdownSyntax('1. ', '', 'List item');
  const insertCheckbox = () => insertMarkdownSyntax('- [ ] ', '', 'task item');
  const insertLink = () => insertMarkdownSyntax('[', '](url)', 'link text');
  const insertCodeBlock = () => insertMarkdownSyntax('```\n', '\n```', 'code');
  const insertInlineCode = () => insertMarkdownSyntax('`', '`', 'code');
  const insertHorizontalRule = () => insertMarkdownSyntax('\n---\n', '', '');
  const insertTable = () => insertMarkdownSyntax('| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', '', '');
  const insertTOCSpace = () => insertMarkdownSyntax('<!-- TOC-SPACE -->\n', '', '');
  
  // Function to insert Table of Contents
  const insertTOC = () => {
    setShowTOCInsertModal(true);
  };
  
  // Function to actually insert TOC with specified level
  const performTOCInsert = (maxLevel: number) => {
    const headers = generateTOC(markdown);
    const filteredHeaders = headers.filter(header => header.isSpace || header.level <= maxLevel);
    
    // Debug: Log the filtered headers
    console.log('Filtered headers for TOC:');
    console.log(filteredHeaders);
    
    if (filteredHeaders.filter(h => !h.isSpace).length === 0) {
      // If no headers found, insert a placeholder
      insertMarkdownSyntax('\n## Table of Contents\n\n*No headers found. Add some headers (# Header) to your document to generate a table of contents.*\n\n', '', '');
      // Force save after insertion
      setTimeout(() => {
        if (currentFilePath) {
          setHasUnsavedChanges(true);
          handleSave();
        }
      }, 100);
      return;
    }
    
    let tocContent = '\n## Table of Contents\n\n';
    
    if (tocIncludeSpacing) {
      // Group headers by level and add spacing between different levels using sections
      let lastLevel = 0;
      let currentSection: typeof filteredHeaders = [];
      const sections: typeof filteredHeaders[] = [];
      
      filteredHeaders.forEach((header, index) => {
        if (header.isSpace) {
          // End current section and start a new one
          if (currentSection.length > 0) {
            sections.push(currentSection);
            currentSection = [];
          }
        } else {
          // Add automatic spacing logic
          if (header.level === 1 && index > 0 && lastLevel > 0) {
            // New H1 section - end current section and start new one
            if (currentSection.length > 0) {
              sections.push(currentSection);
              currentSection = [];
            }
          } else if (header.level < lastLevel && currentSection.length > 0) {
            // Moving to higher level - end current section and start new one
            sections.push(currentSection);
            currentSection = [];
          }
          
          currentSection.push(header);
          lastLevel = header.level;
        }
      });
      
      // Add the final section
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }
      
      // Generate TOC with separate list sections
      sections.forEach((section, sectionIndex) => {
        section.forEach(header => {
          const indent = '  '.repeat(header.level - 1);
          tocContent += `${indent}- [${header.text}](#${header.id})\n`;
        });
        
        // Add visible spacing between sections (except after the last section)
        if (sectionIndex < sections.length - 1) {
          tocContent += '\n&nbsp;\n';
        }
      });
    } else {
      // Standard TOC with manual spacing markers - break into separate list sections
      let currentSection: typeof filteredHeaders = [];
      const sections: typeof filteredHeaders[] = [];
      
      filteredHeaders.forEach((header) => {
        if (header.isSpace) {
          // End current section and start a new one
          if (currentSection.length > 0) {
            sections.push(currentSection);
            currentSection = [];
          }
        } else {
          currentSection.push(header);
        }
      });
      
      // Add the final section
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }
      
      // Generate TOC with separate list sections
      sections.forEach((section, sectionIndex) => {
        section.forEach(header => {
          const indent = '  '.repeat(header.level - 1);
          tocContent += `${indent}- [${header.text}](#${header.id})\n`;
        });
        
        // Add visible spacing between sections (except after the last section)
        if (sectionIndex < sections.length - 1) {
          tocContent += '\n&nbsp;\n';
        }
      });
    }
    
    tocContent += '\n';
    
    // Debug: Log the generated TOC content
    console.log('Generated TOC content:');
    console.log(JSON.stringify(tocContent));
    
    insertMarkdownSyntax(tocContent, '', '');
    
    // Force save after insertion
    setTimeout(() => {
      if (currentFilePath) {
        setHasUnsavedChanges(true);
        handleSave();
      }
    }, 100);
    
    setShowTOCInsertModal(false);
  };

  // Handle find functionality with throttling
  const handleFind = () => {
    if (!editorRef) return;
    
    // Clear previous decorations
    if (decorationIds.length > 0) {
      editorRef.deltaDecorations(decorationIds, []);
      setDecorationIds([]);
    }
    
    if (!findText.trim()) {
      // Clear selection and matches if no search text
      editorRef.setSelection(null);
      setCurrentMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    
    try {
      const model = editorRef.getModel();
      if (!model) return;
      
      // Find all matches
      const matches = model.findMatches(
        findText,
        true, // searchOnlyEditableRange
        false, // isRegex
        false, // matchCase
        null, // wordSeparators
        true // captureMatches
      );
      
      setCurrentMatches(matches);
      setCurrentMatchIndex(0);
      
      if (matches.length > 0) {
        // Select the first match
        const firstMatch = matches[0];
        editorRef.setSelection(firstMatch.range);
        editorRef.revealRangeInCenter(firstMatch.range);
        
        // Add decorations to highlight all matches
        const decorations = matches.map((match: any, index: number) => ({
          range: match.range,
          options: {
            className: index === 0 ? 'findMatch currentMatch' : 'findMatch',
            stickiness: 1
          }
        }));
        
        // Apply decorations and store their IDs
        const newDecorationIds = editorRef.deltaDecorations([], decorations);
        setDecorationIds(newDecorationIds);
      } else {
        // Clear selection if no matches
        editorRef.setSelection(null);
      }
    } catch (error) {
      console.error('Find error:', error);
    }
  };
  
  // Navigate to next match
  const findNext = () => {
    if (currentMatches.length === 0) return;
    
    const nextIndex = (currentMatchIndex + 1) % currentMatches.length;
    setCurrentMatchIndex(nextIndex);
    
    const match = currentMatches[nextIndex];
    editorRef.setSelection(match.range);
    editorRef.revealRangeInCenter(match.range);
    
    // Update decorations to highlight current match
    updateMatchDecorations(nextIndex);
  };
  
  // Navigate to previous match
  const findPrevious = () => {
    if (currentMatches.length === 0) return;
    
    const prevIndex = currentMatchIndex === 0 ? currentMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    
    const match = currentMatches[prevIndex];
    editorRef.setSelection(match.range);
    editorRef.revealRangeInCenter(match.range);
    
    // Update decorations to highlight current match
    updateMatchDecorations(prevIndex);
  };
  
  // Update decorations to highlight current match
  const updateMatchDecorations = (activeIndex: number) => {
    if (!editorRef || currentMatches.length === 0) return;
    
    const decorations = currentMatches.map((match: any, index: number) => ({
      range: match.range,
      options: {
        className: index === activeIndex ? 'findMatch currentMatch' : 'findMatch',
        stickiness: 1
      }
    }));
    
    const newDecorationIds = editorRef.deltaDecorations(decorationIds, decorations);
    setDecorationIds(newDecorationIds);
  };

  // Helper function to create a hash from string
  const createHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };

  // Helper function to get surrounding context for an image
  const getImageContext = (markdownContent: string, imageSrc: string, imageAlt: string) => {
    const imageMarkdown = `![${imageAlt}](${imageSrc})`;
    const imageIndex = markdownContent.indexOf(imageMarkdown);
    
    if (imageIndex === -1) return '';
    
    // Get 100 characters before and after the image for context
    const contextStart = Math.max(0, imageIndex - 100);
    const contextEnd = Math.min(markdownContent.length, imageIndex + imageMarkdown.length + 100);
    
    return markdownContent.substring(contextStart, contextEnd);
  };

  // Helper function to get stable image key based on content
  const getStableImageKey = (src: string, alt: string | undefined, filePath: string) => {
    const context = getImageContext(markdown, src, alt || '');
    const contextHash = createHash(context);
    const imageKey = `${src}:${alt || ''}:${contextHash}`;
    
    // Check if we already have this image in our map
    if (!imageContextMapRef.current.has(imageKey)) {
      const currentIndices = Array.from(imageContextMapRef.current.values()).map(v => v.index);
      const nextIndex = currentIndices.length > 0 ? Math.max(...currentIndices) + 1 : 0;
      imageContextMapRef.current.set(imageKey, { index: nextIndex, context });
    }
    
    const mappedData = imageContextMapRef.current.get(imageKey)!;
    return `${filePath}:${contextHash}:${mappedData.index}`;
  };

  // Helper function to get display index for an image
  const getDisplayIndex = (src: string, alt: string | undefined) => {
    const context = getImageContext(markdown, src, alt || '');
    const contextHash = createHash(context);
    const imageKey = `${src}:${alt || ''}:${contextHash}`;
    
    return imageContextMapRef.current.get(imageKey)?.index || 0;
  };


  // Helper function to save image dimensions
  const saveImageDimensions = (src: string, width: number, height: number, alt?: string) => {
    if (!currentFilePath) return;
    
    const imageKey = getStableImageKey(src, alt, currentFilePath);
    setSavingDimensions(imageKey);
    
    setImageDimensions(prev => ({
      ...prev,
      [imageKey]: { width: Math.round(width), height: Math.round(height) }
    }));
    
    // Clear the saving indicator after a short delay
    setTimeout(() => setSavingDimensions(null), 1000);
  };

  // Helper function to reset image dimensions
  const resetImageDimensions = (src: string, alt?: string) => {
    if (!currentFilePath) return;
    
    const imageKey = getStableImageKey(src, alt, currentFilePath);
    setImageDimensions(prev => {
      const newDimensions = { ...prev };
      delete newDimensions[imageKey];
      return newDimensions;
    });
  };



  // Helper function to get saved image dimensions
  const getSavedImageDimensions = (src: string, alt?: string) => {
    if (!currentFilePath) return { width: 300, height: 200 };
    
    const imageKey = getStableImageKey(src, alt, currentFilePath);
    return imageDimensions[imageKey] || { width: 300, height: 200 };
  };

  // Helper function to generate unique header IDs
  const generateHeaderId = (level: number, text: string, idCounts: Map<string, number>) => {
    const levelPrefix = `h${level}`;
    const baseId = `header-${levelPrefix}-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
    
    // Ensure unique IDs by adding a counter if needed
    let id = baseId;
    const count = idCounts.get(baseId) || 0;
    if (count > 0) {
      id = `${baseId}-${count}`;
    }
    idCounts.set(baseId, count + 1);
    
    return id;
  };

  // Helper function to generate table of contents
  const generateTOC = (markdownContent: string) => {
    const lines = markdownContent.split('\n');
    const headers: {id: string, level: number, text: string, isSpace?: boolean}[] = [];
    const idCounts = new Map<string, number>();
    
    lines.forEach((line) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      const tocSpaceMatch = line.match(/^<!--\s*TOC-SPACE\s*-->/);
      
      if (headerMatch && headerMatch[1] && headerMatch[2]) {
        const level = headerMatch[1].length;
        const text = headerMatch[2].trim();
        const id = generateHeaderId(level, text, idCounts);
        headers.push({ id, level, text });
      } else if (tocSpaceMatch) {
        // Add a special spacing entry
        headers.push({ id: '', level: 0, text: '', isSpace: true });
      }
    });
    
    return headers;
  };

  // Helper function to filter TOC headers by max level
  const getFilteredTOCHeaders = () => {
    // Ensure we're comparing numbers
    const maxLevel = Number(tocMaxLevel);
    const filtered = tocHeaders.filter(header => {
      // Include spacing markers or headers within level limit
      if (header.isSpace) return true;
      const headerLevel = Number(header.level);
      return headerLevel <= maxLevel;
    });
    return filtered;
  };

  // Helper function to sync scroll between editor and preview
  const syncScrollToPreview = () => {
    if (!editorRef || !previewRef.current || !isSideBySideMode) return;
    
    const editorScrollTop = editorRef.getScrollTop();
    const editorScrollHeight = editorRef.getScrollHeight();
    const previewScrollHeight = previewRef.current.scrollHeight;
    const previewClientHeight = previewRef.current.clientHeight;
    
    if (editorScrollHeight > 0 && previewScrollHeight > previewClientHeight) {
      const scrollRatio = editorScrollTop / (editorScrollHeight - editorRef.getLayoutInfo().height);
      const previewScrollTop = scrollRatio * (previewScrollHeight - previewClientHeight);
      previewRef.current.scrollTop = previewScrollTop;
    }
  };



  const handleSave = async () => {
    if (!currentFilePath) {
      setError('No file selected to save');
      return;
    }

    try {
      const response = await fetch('/api/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: currentFilePath,
          content: markdown,
        }),
      });

      if (response.ok) {
        // Clear any existing errors
        setError(null);
        // Reset unsaved changes flag
        setHasUnsavedChanges(false);
        setOriginalContent(markdown);
        setLastSaved(new Date());
        // Could add a success message here if desired
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save file');
      }
    } catch (error) {
      setError('Error saving file: ' + error);
    }
  };

  // Auto-save functionality
  const triggerAutoSave = () => {
    if (!autoSaveEnabled || !currentFilePath || !hasUnsavedChanges) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (3 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 3000);
  };

  // Calculate word count
  const calculateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  // File management functions
  const handleNewFile = async () => {
    setShowNewFileModal(true);
    setNewFileName('');
    setNewFileLoading(true);
    
    // Start at the current path if available, otherwise default to home directory
    const startPath = currentPath || '';
    setNewFilePath(startPath);
    
    try {
      const response = await fetch(`/api/browse-files${startPath ? `?path=${encodeURIComponent(startPath)}` : ''}`);
      if (response.ok) {
        const data: BrowseResponse = await response.json();
        setNewFileDirectories(data.directories);
        setNewFileParentPath(data.parentPath);
        setNewFilePath(data.currentPath);
      } else {
        console.error('Failed to browse directory');
      }
    } catch (error) {
      console.error('Error browsing directory:', error);
    } finally {
      setNewFileLoading(false);
    }
  };

  const createNewFile = async () => {
    console.log('=== createNewFile called ===');
    console.log('newFileName:', newFileName);
    console.log('newFilePath:', newFilePath);
    
    if (!newFileName.trim() || !newFilePath) {
      console.log('Validation failed - missing name or path');
      setError('Please enter a file name and select a directory');
      return;
    }

    setCreatingFile(true);
    setError(null);

    // Ensure the file has .md extension
    const fileName = newFileName.endsWith('.md') ? newFileName : `${newFileName}.md`;
    const filePath = `${newFilePath}/${fileName}`;

    console.log('Creating file at:', filePath);

    // Simple markdown content
    const content = `# ${newFileName}\n\nStart writing here...`;
    console.log('Content to save:', content);

    try {
      console.log('Making fetch request to /api/save-file');
      const response = await fetch('/api/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: filePath,
          content: content,
        }),
      });

      console.log('Response received:', response.status, response.statusText);

      if (response.ok) {
        console.log('File created successfully');
        // Load the new file
        setMarkdown(content);
        setOriginalContent(content);
        setCurrentFilePath(filePath);
        setDocumentTitle(fileName);
        setHasUnsavedChanges(false);
        setShowNewFileModal(false);
        setError(null);

        // Set the current path to the new file's directory and refresh the directory listing
        console.log('Refreshing directory listing');
        await browseDirectory(newFilePath);
        console.log('Directory refreshed');
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(errorData.error || 'Failed to create file');
      }
    } catch (error) {
      console.error('Catch error:', error);
      setError('Error creating file: ' + String(error));
    } finally {
      console.log('Setting creatingFile to false');
      setCreatingFile(false);
    }
  };

  const exportAsHTML = () => {
    const contentHtml = document.querySelector('.prose')?.innerHTML || '';
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle || 'Markdown Document'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; }
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em; color: #666; font-style: italic; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    del { color: #888; }
    hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
    svg { width: 16px; height: 16px; vertical-align: middle; }
    .inline-flex { display: inline-flex; align-items: center; gap: 4px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    // Create a new window with the content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const contentHtml = document.querySelector('.prose')?.innerHTML || '';
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${documentTitle || 'Markdown Document'}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; page-break-after: avoid; }
    p { margin-bottom: 1em; }
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em; color: #666; font-style: italic; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto; page-break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; page-break-inside: avoid; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    del { color: #888; }
    hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
    svg { width: 16px; height: 16px; vertical-align: middle; }
    .inline-flex { display: inline-flex; align-items: center; gap: 4px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="margin-bottom: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Print/Save as PDF</button>
  </div>
  ${contentHtml}
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  };


  const handleSaveAndContinue = async () => {
    await handleSave();
    if (pendingFilePath) {
      await loadFile(pendingFilePath);
      setPendingFilePath(null);
    }
    setShowUnsavedWarning(false);
  };

  const handleDiscardChanges = async () => {
    if (pendingFilePath) {
      await loadFile(pendingFilePath);
      setPendingFilePath(null);
    }
    setShowUnsavedWarning(false);
  };

  const handleCancelFileSwitch = () => {
    setPendingFilePath(null);
    setShowUnsavedWarning(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentPath) {
      setError('No file selected or current path not available');
      return;
    }

    setIsUploadingFile(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('currentPath', currentPath);

      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        
        // Create appropriate markdown syntax based on file type
        let markdownSyntax = '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
          markdownSyntax = `![${fileName}](${data.path})`;
        } else {
          markdownSyntax = `[${fileName}](${data.path})`;
        }

        // Insert the markdown syntax at the current cursor position
        if (editorRef) {
          const selection = editorRef.getSelection();
          const range = {
            startLineNumber: selection?.startLineNumber || 1,
            startColumn: selection?.startColumn || 1,
            endLineNumber: selection?.endLineNumber || 1,
            endColumn: selection?.endColumn || 1,
          };

          editorRef.executeEdits('upload-file', [{
            range: range,
            text: markdownSyntax,
          }]);

          // Move cursor to end of inserted text
          const newPosition = {
            lineNumber: range.startLineNumber,
            column: range.startColumn + markdownSyntax.length,
          };
          editorRef.setPosition(newPosition);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload file');
      }
    } catch (error) {
      setError('Error uploading file: ' + error);
    } finally {
      setIsUploadingFile(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Load persisted path, file, and image dimensions on component mount
  useEffect(() => {
    const loadPersistedData = async () => {
      const savedPath = localStorage.getItem('markdownEditor.currentPath');
      const savedFilePath = localStorage.getItem('markdownEditor.currentFilePath');
      
      // Load image dimensions from server
      try {
        const response = await fetch('/api/image-dimensions');
        if (response.ok) {
          const data = await response.json();
          setImageDimensions(data.imageDimensions || {});
        }
      } catch (error) {
        console.error('Error loading image dimensions:', error);
      }
      
      if (savedPath) {
        setPathBrowserInitialized(true);
        browseDirectory(savedPath).then(() => {
          // After loading the directory, try to open the saved file
          if (savedFilePath) {
            loadFile(savedFilePath);
          }
        });
      } else {
        // If no saved path, still scroll to bottom for better layout
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 500);
      }
    };
    
    loadPersistedData();
  }, []);

  // Click outside to close export modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportModal) {
        const target = event.target as HTMLElement;
        if (!target.closest('.export-modal')) {
          setShowExportModal(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportModal]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when editor has focus
      if (!editorRef || !editorRef.hasTextFocus()) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'b':
            e.preventDefault();
            insertBold();
            break;
          case 'i':
            e.preventDefault();
            insertItalic();
            break;
          case 'k':
            e.preventDefault();
            insertLink();
            break;
          case '/':
            e.preventDefault();
            insertCodeBlock();
            break;
          case 'u':
            e.preventDefault();
            insertUnorderedList();
            break;
        }
      }
      
      // Shift + modifier combinations
      if (modifier && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case 'X':
            e.preventDefault();
            insertStrikethrough();
            break;
          case 'Q':
            e.preventDefault();
            insertBlockquote();
            break;
          case 'C':
            e.preventDefault();
            insertInlineCode();
            break;
          case 'T':
            e.preventDefault();
            insertTable();
            break;
        }
      }
      
      // Header shortcuts (Ctrl/Cmd + 1-3)
      if (modifier && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case '1':
            insertHeader1();
            break;
          case '2':
            insertHeader2();
            break;
          case '3':
            insertHeader3();
            break;
        }
      }
      
      // Prevent Enter key from triggering file upload when editor has focus
      if (e.key === 'Enter' && editorRef && editorRef.hasTextFocus()) {
        // Don't preventDefault here - let the editor handle Enter normally
        // Just ensure no other handlers get triggered
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentFilePath, markdown, editorRef]);

  // Track unsaved changes, auto-save, and word count
  useEffect(() => {
    if (originalContent !== '' && markdown !== originalContent) {
      setHasUnsavedChanges(true);
      triggerAutoSave();
    } else if (markdown === originalContent) {
      setHasUnsavedChanges(false);
    }
    
    // Update word count
    setWordCount(calculateWordCount(markdown));
    
    // Update TOC
    const headers = generateTOC(markdown);
    setTocHeaders(headers);
  }, [markdown, originalContent, autoSaveEnabled, currentFilePath]);

  // Set up scroll sync for side-by-side mode
  useEffect(() => {
    if (!editorRef || !isSideBySideMode) return;
    
    const handleEditorScroll = () => {
      syncScrollToPreview();
    };
    
    editorRef.onDidScrollChange(handleEditorScroll);
    
    return () => {
      if (editorRef) {
        editorRef.onDidScrollChange(null);
      }
    };
  }, [editorRef, isSideBySideMode]);

  // Save image dimensions to server when they change
  useEffect(() => {
    const saveImageDimensions = async () => {
      try {
        await fetch('/api/image-dimensions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageDimensions }),
        });
      } catch (error) {
        console.error('Error saving image dimensions:', error);
      }
    };
    
    // Only save if we have some dimensions to save
    if (Object.keys(imageDimensions).length > 0) {
      saveImageDimensions();
    }
  }, [imageDimensions]);

  // Clear image context map when switching files
  useEffect(() => {
    imageContextMapRef.current.clear();
  }, [currentFilePath]);

  // Handle image paste functionality
  useEffect(() => {
    console.log('Setting up paste handler, editorRef:', editorRef, 'currentPath:', currentPath);
    const handlePaste = async (event: ClipboardEvent) => {
      console.log('Document paste event detected.', event);
      console.log('Event target:', event.target);
      console.log('Event currentTarget:', event.currentTarget);
      
      // Only process if Monaco editor is focused
      console.log('Editor ref exists:', !!editorRef);
      if (editorRef) {
        console.log('Editor has text focus:', editorRef.hasTextFocus());
      }
      
      // Temporarily remove focus check to test all paste events
      // if (!editorRef || !editorRef.hasTextFocus()) {
      //   console.log('Editor not focused, ignoring paste.');
      //   return;
      // }
      
      const items = event.clipboardData?.items;
      if (!items) {
        console.log('No clipboard items found.');
        return;
      }

      console.log('Processing clipboard items...');
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        
        console.log('Item type:', item.type);
        
        if (item.type.indexOf('image') !== -1) {
          console.log('Image found in clipboard.');
          event.preventDefault();
          event.stopPropagation();
          
          const blob = item.getAsFile();
          if (!blob || !currentPath) {
            console.log('Missing blob or currentPath:', { blob, currentPath });
            return;
          }
          else {
            console.log('Blob and currentPath are available.');
          }
          
          setIsUploadingImage(true);
          setError(null);
          
          try {
            const formData = new FormData();
            formData.append('image', blob);
            formData.append('currentPath', currentPath);
            
            console.log('Uploading image...');
            const response = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData,
            });
            
            if (response.ok) {
              const data = await response.json();
              const markdownSyntax = `![Image](${data.path})`;
              console.log('Image uploaded successfully:', data);
              
              // Insert the markdown syntax at the current cursor position
              const selection = editorRef.getSelection();
              const range = {
                startLineNumber: selection?.startLineNumber || 1,
                startColumn: selection?.startColumn || 1,
                endLineNumber: selection?.endLineNumber || 1,
                endColumn: selection?.endColumn || 1,
              };
              
              editorRef.executeEdits('paste-image', [{
                range: range,
                text: markdownSyntax,
              }]);
              
              // Move cursor to end of inserted text
              const newPosition = {
                lineNumber: range.startLineNumber,
                column: range.startColumn + markdownSyntax.length,
              };
              editorRef.setPosition(newPosition);
              
            } else {
              const errorData = await response.json();
              console.error('Upload failed:', errorData);
              setError(errorData.error || 'Failed to upload image');
            }
          } catch (error) {
            console.error('Upload error:', error);
            setError('Error uploading image: ' + error);
          } finally {
            setIsUploadingImage(false);
          }
          
          break; // Only handle the first image found
        }
      }
    };

    // Add event listener to document and window
    document.addEventListener('paste', handlePaste);
    window.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('paste', handlePaste);
    };
  }, [editorRef, currentPath]);

  const browseDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = path ? `/api/browse-readme-files?path=${encodeURIComponent(path)}` : '/api/browse-readme-files';
      const response = await fetch(url);
      if (response.ok) {
        const data: ReadmeBrowseResponse = await response.json();
        setCurrentPath(data.currentPath);
        _setParentPath(data.parentPath);
        setDirectories(data.directories);
        setReadmeFiles(data.readmeFiles);
        setParentReadmeFiles(data.parentReadmeFiles || []);
        _setGroupedReadmeFiles(data.groupedReadmeFiles || {});
        // Persist the current path to localStorage
        localStorage.setItem('markdownEditor.currentPath', data.currentPath);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to browse directory');
        console.error('Failed to browse directory:', errorData);
      }
    } catch (error) {
      setError('Error browsing directory: ' + error);
      console.error('Error browsing directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReadmeFile = async (filePath: string) => {
    // Check for unsaved changes before switching files
    if (hasUnsavedChanges && currentFilePath && currentFilePath !== filePath) {
      setPendingFilePath(filePath);
      setShowUnsavedWarning(true);
      return;
    }
    
    await loadFile(filePath);
  };

  const loadFile = async (filePath: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/read-file?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        setMarkdown(data.content);
        setOriginalContent(data.content);
        setCurrentFilePath(filePath);
        setDocumentTitle(data.name);
        setHasUnsavedChanges(false);
        // Persist the current file path to localStorage
        localStorage.setItem('markdownEditor.currentFilePath', filePath);
        
        // Auto-scroll to bottom to enable proper editor scrolling
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to read file');
        console.error('Failed to read file:', errorData);
      }
    } catch (error) {
      setError('Error reading file: ' + error);
      console.error('Error reading file:', error);
    }
  };

  // Removed handleNew and handleExport functions - not needed for README editing

  const getCurrentDocumentTitle = () => {
    if (currentFilePath) {
      return documentTitle || 'README*.md';
    }
    return 'New Document';
  };

  const openPathBrowser = async () => {
    setShowPathBrowser(true);
    setPathBrowserPath(currentPath);
    await browsePathBrowserDirectory(currentPath);
  };

  const browsePathBrowserDirectory = async (path: string) => {
    setPathBrowserLoading(true);
    try {
      const url = path ? `/api/browse-files?path=${encodeURIComponent(path)}` : '/api/browse-files';
      const response = await fetch(url);
      if (response.ok) {
        const data: BrowseResponse = await response.json();
        setPathBrowserPath(data.currentPath);
        setPathBrowserParent(data.parentPath);
        setPathBrowserDirs(data.directories);
      } else {
        console.error('Failed to browse directory for path browser');
      }
    } catch (error) {
      console.error('Error browsing directory for path browser:', error);
    } finally {
      setPathBrowserLoading(false);
    }
  };

  const selectPath = async (selectedPath: string) => {
    setShowPathBrowser(false);
    setPathBrowserInitialized(true);
    await browseDirectory(selectedPath);
  };

  const renderDirectoryStructure = () => {
    const renderTreeLevel = (dirs: DirectoryInfo[], depth: number = 0): React.ReactElement[] => {
      const items: React.ReactElement[] = [];
      
      dirs.forEach(dir => {
        const indentStyle = { paddingLeft: `${depth * 16}px` };
        
        // Add directory header
        items.push(
          <div key={`dir-${dir.path}`} className="space-y-1">
            <div 
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200"
              style={indentStyle}
            >
              <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-red-700 truncate flex-1">{dir.name}</span>
            </div>
            
            {/* Render README files in this directory */}
            {dir.readmeFiles.length > 0 && (
              <div className="space-y-1">
                {dir.readmeFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => openReadmeFile(file.path)}
                    className={`w-full group flex items-center gap-2 p-1.5 rounded-md border transition-all duration-200 hover:shadow-sm ${
                      currentFilePath === file.path
                        ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                        : 'bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300'
                    }`}
                    style={{ paddingLeft: `${(depth + 1) * 16}px` }}
                  >
                    <div className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors ${
                      currentFilePath === file.path
                        ? 'bg-emerald-200'
                        : 'bg-emerald-100 group-hover:bg-emerald-200'
                    }`}>
                      <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className={`text-xs font-medium truncate flex-1 text-left transition-colors ${
                      currentFilePath === file.path
                        ? 'text-emerald-900'
                        : 'text-slate-700 group-hover:text-emerald-900'
                    }`}>{file.name}</span>
                    {currentFilePath === file.path && (
                      <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {/* Recursively render subdirectories */}
            {dir.subdirectories && dir.subdirectories.length > 0 && (
              <div className="space-y-1">
                {renderTreeLevel(dir.subdirectories, depth + 1)}
              </div>
            )}
          </div>
        );
      });
      
      return items;
    };
    
    // Also render README files in the root directory
    const rootReadmeFiles = readmeFiles.filter(file => file.path.startsWith(currentPath) && file.path.lastIndexOf('/') === currentPath.length);
    
    return (
      <div className="space-y-2">
        {/* Parent README files */}
        {parentReadmeFiles.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              <span className="text-xs font-bold text-slate-600">Parent Directory</span>
            </div>
            <div className="space-y-1 mb-3">
              {parentReadmeFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => openReadmeFile(file.path)}
                  className={`w-full group flex items-center gap-2 p-1.5 rounded-md border transition-all duration-200 hover:shadow-sm ${
                    currentFilePath === file.path
                      ? 'bg-amber-50 border-amber-300 shadow-sm'
                      : 'bg-white hover:bg-amber-50 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors ${
                    currentFilePath === file.path
                      ? 'bg-amber-200'
                      : 'bg-amber-100 group-hover:bg-amber-200'
                  }`}>
                    <svg className="w-2.5 h-2.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-medium truncate flex-1 text-left transition-colors ${
                    currentFilePath === file.path
                      ? 'text-amber-900'
                      : 'text-slate-700 group-hover:text-amber-900'
                  }`}>{file.name}</span>
                  {currentFilePath === file.path && (
                    <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
        
        {/* Root README files */}
        {rootReadmeFiles.length > 0 && (
          <div className="space-y-1">
            {rootReadmeFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => openReadmeFile(file.path)}
                className={`w-full group flex items-center gap-2 p-1.5 rounded-md border transition-all duration-200 hover:shadow-sm ${
                  currentFilePath === file.path
                    ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors ${
                  currentFilePath === file.path
                    ? 'bg-emerald-200'
                    : 'bg-emerald-100 group-hover:bg-emerald-200'
                }`}>
                  <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className={`text-xs font-medium truncate flex-1 text-left transition-colors ${
                  currentFilePath === file.path
                    ? 'text-emerald-900'
                    : 'text-slate-700 group-hover:text-emerald-900'
                }`}>{file.name}</span>
                {currentFilePath === file.path && (
                  <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* Directory tree */}
        {renderTreeLevel(directories)}
      </div>
    );
  };


  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
          overflow-y: scroll !important;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          -webkit-appearance: none;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
          min-height: 20px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
        
        /* Force scrollbar to always be visible on macOS */
        .custom-scrollbar::-webkit-scrollbar-thumb:vertical {
          min-height: 30px;
        }
        
        /* Find match highlighting */
        .findMatch {
          background-color: #ffeb3b !important;
          border: 1px solid #ffc107 !important;
          border-radius: 2px !important;
        }
        
        /* Current match highlighting */
        .currentMatch {
          background-color: #ff9800 !important;
          border: 2px solid #f57c00 !important;
          border-radius: 2px !important;
        }
        
        /* Preview mode styles */
        .prose {
          max-width: none !important;
        }
        
        .prose h1 {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 0.5em;
          color: #1f2937;
        }
        
        .prose h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 0.5em;
          color: #374151;
        }
        
        .prose h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-bottom: 0.5em;
          color: #4b5563;
        }
        
        .prose p {
          margin-bottom: 1em;
          line-height: 1.6;
          color: #1f2937;
        }
        
        .prose ul, .prose ol {
          margin-bottom: 1em;
          padding-left: 1.5em;
        }
        
        .prose li {
          margin-bottom: 0.5em;
        }
        
        .prose blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
          font-style: italic;
        }
        
        .prose code {
          background-color: #f3f4f6;
          padding: 0.125em 0.25em;
          border-radius: 0.25em;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
          color: #1f2937;
        }
        
        .prose pre {
          background-color: #f3f4f6;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1em 0;
        }
        
        .prose pre code {
          background-color: transparent;
          padding: 0;
        }
        
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5em;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin: 1em 0;
        }
        
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        
        .prose th, .prose td {
          border: 1px solid #e5e7eb;
          padding: 0.5em;
          text-align: left;
        }
        
        .prose th {
          background-color: #f9fafb;
          font-weight: bold;
        }
      `}</style>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📝 {getCurrentDocumentTitle()}
              {hasUnsavedChanges && (
                <span className="ml-2 text-orange-600 font-normal" title="Unsaved changes">
                  •
                </span>
              )}
            </h2>
            {currentFilePath && (
              <span className="text-sm text-gray-500">
                File: {currentFilePath}
                {hasUnsavedChanges && (
                  <span className="ml-2 text-orange-600" title="Unsaved changes">
                    (modified)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Removed New and Export buttons - not needed for file editing */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* File Browser Sidebar */}
        <div className="w-80 bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 shadow-inner flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100vh - 120px)' }}>
            {/* Current Path Card */}
            <div className="mb-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-medium text-slate-600">Current Location</span>
                  </div>
                  <button
                    onClick={openPathBrowser}
                    className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Browse and select path"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    Browse
                  </button>
                </div>
                <div className="bg-slate-50 rounded-md p-2 border border-slate-200">
                  <p className="text-xs font-mono text-slate-700 break-all" title={currentPath}>
                    {currentPath || '~/Home'}
                  </p>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1l4 4-4 4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-800">Organizer</h3>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Files and Directories Display */}
            <div className="space-y-2">
              {!pathBrowserInitialized ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1l4 4-4 4" />
                    </svg>
                  </div>
                  <p className="text-slate-600 text-xs font-medium mb-1">Select a path to browse</p>
                  <p className="text-slate-400 text-xs mb-3">Click the "Browse" button above to choose a directory</p>
                  <button
                    onClick={openPathBrowser}
                    className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    Browse Path
                  </button>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200"></div>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Directory Structure with README Files */}
                  {renderDirectoryStructure()}
                  
                  {/* Empty State */}
                  {directories.length === 0 && readmeFiles.length === 0 && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                      </div>
                      <p className="text-slate-500 text-xs font-medium">No files found</p>
                      <p className="text-slate-400 text-xs mt-1">Try selecting a different path</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col p-6 min-h-0">
          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col min-h-0" style={{ height: 'calc(100vh - 120px)' }}>
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-700">📝 Monaco Editor (VS Code)</h3>
                  
                  {/* Word Count */}
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
                    </svg>
                    <span className="text-xs">{wordCount} words</span>
                  </div>
                  
                  {/* Auto-save Status */}
                  {autoSaveEnabled && currentFilePath && (
                    <div className="flex items-center gap-2 text-green-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      <span className="text-xs">
                        {hasUnsavedChanges ? 'Auto-saving...' : 
                         lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Auto-save on'}
                      </span>
                    </div>
                  )}
                  
                  {isUploadingImage && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-xs">Uploading image...</span>
                    </div>
                  )}
                  {isUploadingFile && (
                    <div className="flex items-center gap-2 text-teal-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-teal-600 border-t-transparent"></div>
                      <span className="text-xs">Uploading file...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTOC(!showTOC)}
                    className={`flex items-center gap-1 ${showTOC ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-500 hover:bg-gray-600'} text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95`}
                    title="Toggle Table of Contents"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    TOC
                  </button>
                  <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className={`flex items-center gap-1 ${isPreviewMode ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95`}
                    title="Toggle Preview Mode"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {isPreviewMode ? 'Edit' : 'Preview'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.clipboard && navigator.clipboard.read) {
                          const clipboardItems = await navigator.clipboard.read();
                          console.log('Clipboard items:', clipboardItems);
                          
                          for (const clipboardItem of clipboardItems) {
                            console.log('Clipboard item types:', clipboardItem.types);
                            for (const type of clipboardItem.types) {
                              if (type.startsWith('image/')) {
                                const blob = await clipboardItem.getType(type);
                                console.log('Found image blob:', blob);
                                
                                if (blob && currentPath) {
                                  setIsUploadingImage(true);
                                  
                                  const formData = new FormData();
                                  formData.append('image', blob);
                                  formData.append('currentPath', currentPath);
                                  
                                  const response = await fetch('/api/upload-image', {
                                    method: 'POST',
                                    body: formData,
                                  });
                                  
                                  if (response.ok) {
                                    const data = await response.json();
                                    const markdownSyntax = `![Image](${data.path})`;
                                    
                                    if (editorRef) {
                                      const selection = editorRef.getSelection();
                                      const range = {
                                        startLineNumber: selection?.startLineNumber || 1,
                                        startColumn: selection?.startColumn || 1,
                                        endLineNumber: selection?.endLineNumber || 1,
                                        endColumn: selection?.endColumn || 1,
                                      };
                                      
                                      editorRef.executeEdits('paste-image', [{
                                        range: range,
                                        text: markdownSyntax,
                                      }]);
                                      
                                      const newPosition = {
                                        lineNumber: range.startLineNumber,
                                        column: range.startColumn + markdownSyntax.length,
                                      };
                                      editorRef.setPosition(newPosition);
                                    }
                                  }
                                  
                                  setIsUploadingImage(false);
                                }
                                break;
                              }
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Clipboard API error:', error);
                        setError('Clipboard access denied. Please paste directly or use file upload.');
                      }
                    }}
                    className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Insert image from clipboard"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Image from clipboard
                  </button>
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="*/*"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex items-center gap-1 bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                      title="Upload and insert file"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    >
                      {isUploadingFile ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      )}
                      {isUploadingFile ? 'Uploading...' : 'Upload File'}
                    </label>
                  </div>
                  {currentFilePath && (
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Save file (Cmd+S)"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Save
                    </button>
                  )}
                  
                  {/* New File Button */}
                  <button
                    onClick={handleNewFile}
                    className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Create new file"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New File
                  </button>
                  
                  {/* Notepad Button */}
                  <button
                    onClick={openNotepad}
                    className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Open Notepad"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Notepad
                  </button>
                  
                  {/* Markdown Cheat Sheet Button */}
                  <button
                    onClick={() => setShowCheatSheet(true)}
                    className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Markdown Cheat Sheet"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Cheat Sheet
                  </button>
                  
                  {/* Export Button - Only show in Preview mode */}
                  {isPreviewMode && (
                    <div className="relative">
                      <button
                        onClick={() => setShowExportModal(!showExportModal)}
                        className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Export document"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export
                      </button>
                      
                      {showExportModal && (
                        <div className="export-modal absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <button
                            onClick={() => { exportAsHTML(); setShowExportModal(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            Export as HTML
                          </button>
                          <button
                            onClick={() => { exportAsPDF(); setShowExportModal(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Export as PDF
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Markdown Toolbar */}
              {!isPreviewMode && (
                <div className="bg-white px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">🔧 Markdown Formatting Tools</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Bold Button */}
                    <button
                      onClick={insertBold}
                      className="flex items-center gap-1 bg-slate-500 hover:bg-slate-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Bold (Ctrl+B)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h8.5c2.76 0 5 2.24 5 5 0 1.1-.35 2.12-.94 2.95.59.83.94 1.85.94 2.95 0 2.76-2.24 5-5 5H6V4zm3 6h4.5c1.1 0 2-.9 2-2s-.9-2-2-2H9v4zm0 6h5.5c1.1 0 2-.9 2-2s-.9-2-2-2H9v4z"/>
                      </svg>
                      Bold
                    </button>
                    
                    {/* Italic Button */}
                    <button
                      onClick={insertItalic}
                      className="flex items-center gap-1 bg-slate-500 hover:bg-slate-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Italic (Ctrl+I)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
                      </svg>
                      Italic
                    </button>
                    
                    {/* Strikethrough Button */}
                    <button
                      onClick={insertStrikethrough}
                      className="flex items-center gap-1 bg-slate-500 hover:bg-slate-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Strikethrough (Ctrl+Shift+X)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.85 7.08C6.85 4.37 9.45 3 12.24 3c1.64 0 3 0.49 3.9 1.28c0.77 0.65 1.18 1.61 1.25 2.56l0.01 0.20h-2.42l-0.05-0.12c-0.25-0.63-0.85-1.16-1.71-1.16c-1.02 0-1.74 0.38-1.74 1.44c0 0.65 0.77 1.17 1.99 1.17h1.40v1.73h-1.40c-2.52 0-4.05-1.18-4.05-2.90zM6.85 7.08c0.13-0.86 0.67-1.64 1.46-2.18zm5.39 9.77c1.4 0 2.4-0.57 2.4-1.69c0-0.8-0.58-1.4-1.94-1.4H8.44v1.73h4.15c0.48 0 0.78 0.23 0.78 0.63c0 0.4-0.30 0.63-0.78 0.63H8.44v1.73h4.15c2.23 0 3.53-1.09 3.53-2.63c0-1.64-1.68-2.64-4.26-2.64H6.85V7.08z"/>
                      </svg>
                      Strike
                    </button>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    
                    {/* Headers */}
                    <button
                      onClick={insertHeader1}
                      className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Header 1"
                    >
                      H1
                    </button>
                    
                    <button
                      onClick={insertHeader2}
                      className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Header 2"
                    >
                      H2
                    </button>
                    
                    <button
                      onClick={insertHeader3}
                      className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Header 3"
                    >
                      H3
                    </button>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    
                    {/* Lists */}
                    <button
                      onClick={insertUnorderedList}
                      className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Unordered List"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
                      </svg>
                      List
                    </button>
                    
                    <button
                      onClick={insertOrderedList}
                      className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Ordered List"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
                      </svg>
                      1. List
                    </button>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    
                    {/* Link */}
                    <button
                      onClick={insertLink}
                      className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Link"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                      </svg>
                      Link
                    </button>
                    
                    {/* Code */}
                    <button
                      onClick={insertInlineCode}
                      className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Inline Code"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                      </svg>
                      Code
                    </button>
                    
                    <button
                      onClick={insertCodeBlock}
                      className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Code Block"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                      </svg>
                      ```
                    </button>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    
                    {/* New Enhanced Buttons */}
                    <button
                      onClick={insertBlockquote}
                      className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Blockquote (Ctrl+Shift+Q)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                      </svg>
                      Quote
                    </button>
                    
                    <button
                      onClick={insertCheckbox}
                      className="flex items-center gap-1 bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Checkbox"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1 .9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      ☑ Task
                    </button>
                    
                    <button
                      onClick={insertHorizontalRule}
                      className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Horizontal Rule"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13H5v-2h14v2z"/>
                      </svg>
                      ---
                    </button>
                    
                    <button
                      onClick={insertTable}
                      className="flex items-center gap-1 bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Table (Ctrl+Shift+T)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 4h14v2H5V4zm0 4h14v2H5V8zm0 4h14v2H5v-2zm0 4h14v2H5v-2z"/>
                      </svg>
                      Table
                    </button>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    
                    {/* Table of Contents Button */}
                    <button
                      onClick={insertTOC}
                      className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Insert Table of Contents"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                      TOC
                    </button>
                    
                    {/* TOC Space Button */}
                    <button
                      onClick={insertTOCSpace}
                      className="flex items-center gap-1 bg-indigo-400 hover:bg-indigo-500 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Insert TOC Spacing Marker"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 12h18m-9-9v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                      </svg>
                      +Space
                    </button>
                  </div>
                </div>
              )}
              
              {/* Find Box */}
              <div className="bg-white px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">💡 Tip: You can paste images directly into the editor!</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={findText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFindText(value);
                        
                        // Clear previous timeout
                        if (findTimeout) {
                          clearTimeout(findTimeout);
                        }
                        
                        // Set new timeout for throttling
                        const newTimeout = setTimeout(() => {
                          handleFind();
                        }, 300); // 300ms delay
                        
                        setFindTimeout(newTimeout);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFind();
                        }
                      }}
                      onFocus={(e) => e.stopPropagation()}
                      onBlur={(e) => e.stopPropagation()}
                      placeholder="Find text..."
                      className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {findText && (
                      <button
                        onClick={() => {
                          setFindText('');
                          if (editorRef && decorationIds.length > 0) {
                            editorRef.deltaDecorations(decorationIds, []);
                            setDecorationIds([]);
                            editorRef.setSelection(null);
                          }
                          setCurrentMatches([]);
                          setCurrentMatchIndex(0);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Match counter and navigation */}
                  {currentMatches.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {currentMatchIndex + 1} of {currentMatches.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={findPrevious}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="Previous match"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={findNext}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="Next match"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Table of Contents */}
              {showTOC && tocHeaders.length > 0 && (
                <div className="bg-white px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      TOC
                    </h3>
                    <div className="flex items-center gap-1">
                      <label htmlFor="toc-level" className="text-xs text-gray-500">Max:</label>
                      <select 
                        id="toc-level" 
                        value={tocMaxLevel}
                        onChange={(e) => {
                          const newValue = Number(e.target.value);
                          setTocMaxLevel(newValue);
                        }}
                        className="px-1 py-0.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={1}>H1 Only</option>
                        <option value={2}>H1-H2</option>
                        <option value={3}>H1-H3</option>
                        <option value={4}>H1-H4</option>
                        <option value={5}>H1-H5</option>
                        <option value={6}>H1-H6</option>
                      </select>
                    </div>
                  </div>
                  <div className="max-h-12 overflow-y-auto">
                    {getFilteredTOCHeaders().length > 0 ? (
                      <ul className="space-y-0 text-xs">
                        {getFilteredTOCHeaders().map((header) => {
                          const indentClass = header.level === 1 ? 'ml-0' : 
                                            header.level === 2 ? 'ml-4' : 
                                            header.level === 3 ? 'ml-8' : 
                                            header.level === 4 ? 'ml-12' : 
                                            header.level === 5 ? 'ml-16' : 'ml-20';
                          return (
                          <li key={header.id} className={`${indentClass} text-gray-700 hover:text-blue-600 transition-colors`}>
                            <a 
                              href={`#${header.id}`} 
                              className="flex items-center gap-1 py-0 px-1 rounded hover:bg-blue-50 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                // In preview mode, try to scroll to the header
                                if (isPreviewMode) {
                                  const element = document.getElementById(header.id);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth' });
                                  }
                                } else {
                                  // In edit mode, find the header text and position cursor there
                                  if (editorRef) {
                                    const model = editorRef.getModel();
                                    if (model) {
                                      const content = model.getValue();
                                      const lines = content.split('\n');
                                      const headerRegex = new RegExp(`^#{${header.level}}\\s+${header.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                                      
                                      for (let i = 0; i < lines.length; i++) {
                                        if (headerRegex.test(lines[i])) {
                                          editorRef.setPosition({ lineNumber: i + 1, column: 1 });
                                          editorRef.revealLineInCenter(i + 1);
                                          editorRef.focus();
                                          break;
                                        }
                                      }
                                    }
                                  }
                                }
                              }}
                            >
                              <span className="text-gray-400 text-xs w-4 flex-shrink-0">{'#'.repeat(header.level)}</span>
                              <span className="truncate text-xs">{header.text}</span>
                            </a>
                          </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No headers found for the selected levels</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex-1 border border-gray-200 rounded-b-lg overflow-hidden">
                {isPreviewMode ? (
                  <div className="h-full p-6 bg-white overflow-y-auto custom-scrollbar">
                    <div className="max-w-none prose prose-sm prose-slate prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={(() => {
                          // Use the same headers that were generated for TOC to ensure ID consistency
                          const headerMap = new Map<string, string>();
                          tocHeaders.forEach(header => {
                            const key = `${header.level}-${header.text}`;
                            headerMap.set(key, header.id);
                          });
                          
                          return {
                            h1: ({ children, ...props }) => {
                              const text = React.Children.toArray(children).join('');
                              const key = `1-${text}`;
                              const id = headerMap.get(key) || `header-h1-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                              return <h1 id={id} className="text-2xl font-bold mb-4 text-gray-900" {...props}>{children}</h1>;
                            },
                            h2: ({ children, ...props }) => {
                              const text = React.Children.toArray(children).join('');
                              const key = `2-${text}`;
                              const id = headerMap.get(key) || `header-h2-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                              return <h2 id={id} className="text-xl font-bold mb-3 text-gray-800" {...props}>{children}</h2>;
                            },
                            h3: ({ children, ...props }) => {
                              const text = React.Children.toArray(children).join('');
                              const key = `3-${text}`;
                              const id = headerMap.get(key) || `header-h3-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                              return <h3 id={id} className="text-lg font-bold mb-2 text-gray-700" {...props}>{children}</h3>;
                            },
                            h4: ({ children, ...props }) => {
                              const text = React.Children.toArray(children).join('');
                              const key = `4-${text}`;
                              const id = headerMap.get(key) || `header-h4-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                              return <h4 id={id} className="text-base font-bold mb-2 text-gray-600" {...props}>{children}</h4>;
                            },
                            h5: ({ children, ...props }) => {
                              const text = React.Children.toArray(children).join('');
                              const key = `5-${text}`;
                              const id = headerMap.get(key) || `header-h5-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                              return <h5 id={id} className="text-sm font-bold mb-2 text-gray-500" {...props}>{children}</h5>;
                            },
                            h6: ({ children, ...props }) => {
                              const text = React.Children.toArray(children).join('');
                              const key = `6-${text}`;
                              const id = headerMap.get(key) || `header-h6-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                              return <h6 id={id} className="text-xs font-bold mb-2 text-gray-400" {...props}>{children}</h6>;
                            },
                          del: ({ children, ...props }) => (
                            <del className="line-through text-gray-500" {...props}>
                              {children}
                            </del>
                          ),
                          input: ({ checked, ...props }) => (
                            <input 
                              type="checkbox" 
                              checked={checked} 
                              disabled 
                              className="mr-2 align-middle" 
                              {...props} 
                            />
                          ),
                          ul: ({ children, ...props }) => (
                            <ul className="list-disc ml-6 my-4 space-y-2" {...props}>
                              {children}
                            </ul>
                          ),
                          ol: ({ children, ...props }) => (
                            <ol className="list-decimal ml-6 my-4 space-y-2" {...props}>
                              {children}
                            </ol>
                          ),
                          li: ({ children, ...props }) => {
                            // Check if this is a task list item
                            const childrenArray = React.Children.toArray(children);
                            const firstChild = childrenArray[0];
                            
                            // Handle task list items
                            if (typeof firstChild === 'string' && firstChild.startsWith('[ ]')) {
                              return (
                                <li className="ml-0 flex items-center" {...props}>
                                  <input type="checkbox" className="mr-2" disabled />
                                  <span>{firstChild.substring(3)}</span>
                                  {childrenArray.slice(1)}
                                </li>
                              );
                            }
                            
                            if (typeof firstChild === 'string' && firstChild.startsWith('[x]')) {
                              return (
                                <li className="ml-0 flex items-center" {...props}>
                                  <input type="checkbox" className="mr-2" checked disabled />
                                  <span>{firstChild.substring(3)}</span>
                                  {childrenArray.slice(1)}
                                </li>
                              );
                            }
                            
                            return (
                              <li className="ml-0" {...props}>
                                {children}
                              </li>
                            );
                          },
                          blockquote: ({ children, ...props }) => (
                            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600" {...props}>
                              {children}
                            </blockquote>
                          ),
                          hr: ({ ...props }) => (
                            <hr className="border-gray-300 my-8" {...props} />
                          ),
                          table: ({ children, ...props }) => (
                            <table className="w-full border-collapse border border-gray-300 my-4" {...props}>
                              {children}
                            </table>
                          ),
                          thead: ({ children, ...props }) => (
                            <thead className="bg-gray-50" {...props}>
                              {children}
                            </thead>
                          ),
                          tbody: ({ children, ...props }) => (
                            <tbody {...props}>
                              {children}
                            </tbody>
                          ),
                          tr: ({ children, ...props }) => (
                            <tr className="border-b border-gray-200" {...props}>
                              {children}
                            </tr>
                          ),
                          td: ({ children, ...props }) => (
                            <td className="border border-gray-300 px-4 py-2" {...props}>
                              {children}
                            </td>
                          ),
                          th: ({ children, ...props }) => (
                            <th className="border border-gray-300 px-4 py-2 font-semibold text-left" {...props}>
                              {children}
                            </th>
                          ),
                          a: ({ href, children, ...props }) => {
                            // Check that the link is a file and not an external link
                            const isFileLink = href && 
                              !href.startsWith('http') && 
                              !href.startsWith('mailto:') && 
                              !href.startsWith('#') && 
                              !href.startsWith('javascript:');
                            
                            
                            let downloadUrl = href;
                            if (isFileLink && href?.startsWith('./')) {
                              // Handle relative file paths
                              let filePath = href.replace('./', `${currentPath}/`);
                              
                              // Check if the path is already URL-encoded by looking for % characters
                              // If not encoded, encode it. If already encoded, use as is.
                              const isAlreadyEncoded = href.includes('%');
                              if (!isAlreadyEncoded) {
                                // Path has spaces/special chars but isn't encoded - encode it
                                filePath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
                              }
                              
                              downloadUrl = `/api/serve-file?path=${encodeURIComponent(filePath)}`;
                            }
                            
                            return (
                              <span className="inline-flex items-center gap-1">
                                {isFileLink && (
                                  <a href={downloadUrl} download className="inline-flex items-center text-blue-600 hover:text-blue-800 mr-2" title="Download file">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                                    </svg>
                                  </a>
                                )}
                                <a href={href} {...props}>
                                  {children}
                                </a>
                              </span>
                            );
                          },
                          img: ({ src, alt, ...props }) => {
                            // Get stable key and display index for this image
                            const srcString = typeof src === 'string' ? src : '';
                            const displayIndex = getDisplayIndex(srcString, alt);
                            const stableKey = getStableImageKey(srcString, alt, currentFilePath || '');
                            
                            // Handle relative image paths
                            if (srcString.startsWith('./README_images/')) {
                              const imagePath = srcString.replace('./README_images/', `${currentPath}/README_images/`);
                              const imageUrl = `/api/serve-image?path=${encodeURIComponent(imagePath)}`;
                              const savedDimensions = getSavedImageDimensions(srcString, alt);
                              
                              return (
                                <div 
                                  className="resizable-image-wrapper"
                                  style={{
                                    resize: 'both',
                                    overflow: 'hidden',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    minWidth: '100px',
                                    minHeight: '100px',
                                    maxWidth: '100%',
                                    width: `${savedDimensions.width}px`,
                                    height: `${savedDimensions.height}px`,
                                    margin: '1rem 0',
                                    position: 'relative'
                                  }}
                                  onMouseUp={(e) => {
                                    const element = e.currentTarget;
                                    const rect = element.getBoundingClientRect();
                                    saveImageDimensions(srcString, rect.width, rect.height, alt);
                                  }}
                                  title="Resize me! Dimensions are automatically saved."
                                >
                                  <img 
                                    src={imageUrl} 
                                    alt={alt} 
                                    {...props}
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'contain',
                                      display: 'block'
                                    }}
                                    onError={(e) => {
                                      console.error('Image failed to load:', imageUrl);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  {savingDimensions === stableKey && (
                                    <div className="absolute top-1 right-1 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium animate-pulse">
                                      Saved! 💾
                                    </div>
                                  )}
                                  <div className="absolute top-1 left-1 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium opacity-75">
                                    #{displayIndex + 1} {savedDimensions.width}×{savedDimensions.height}
                                  </div>
                                  <button
                                    onClick={() => resetImageDimensions(srcString, alt)}
                                    className="absolute bottom-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-md text-xs font-medium opacity-75 hover:opacity-100 transition-opacity"
                                    title="Reset to default size"
                                  >
                                    ↺
                                  </button>
                                </div>
                              );
                            } else if (srcString.startsWith('./images/')) {
                              // Support legacy image paths
                              const imagePath = srcString.replace('./images/', `${currentPath}/images/`);
                              const imageUrl = `/api/serve-image?path=${encodeURIComponent(imagePath)}`;
                              const savedDimensions = getSavedImageDimensions(srcString, alt);
                              
                              return (
                                <div 
                                  className="resizable-image-wrapper"
                                  style={{
                                    resize: 'both',
                                    overflow: 'hidden',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    minWidth: '100px',
                                    minHeight: '100px',
                                    maxWidth: '100%',
                                    width: `${savedDimensions.width}px`,
                                    height: `${savedDimensions.height}px`,
                                    margin: '1rem 0',
                                    position: 'relative'
                                  }}
                                  onMouseUp={(e) => {
                                    const element = e.currentTarget;
                                    const rect = element.getBoundingClientRect();
                                    saveImageDimensions(srcString, rect.width, rect.height, alt);
                                  }}
                                  title="Resize me! Dimensions are automatically saved."
                                >
                                  <img 
                                    src={imageUrl} 
                                    alt={alt} 
                                    {...props}
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'contain',
                                      display: 'block'
                                    }}
                                    onError={(e) => {
                                      console.error('Image failed to load:', imageUrl);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  {savingDimensions === stableKey && (
                                    <div className="absolute top-1 right-1 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium animate-pulse">
                                      Saved! 💾
                                    </div>
                                  )}
                                  <div className="absolute top-1 left-1 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium opacity-75">
                                    #{displayIndex + 1} {savedDimensions.width}×{savedDimensions.height}
                                  </div>
                                  <button
                                    onClick={() => resetImageDimensions(srcString, alt)}
                                    className="absolute bottom-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-md text-xs font-medium opacity-75 hover:opacity-100 transition-opacity"
                                    title="Reset to default size"
                                  >
                                    ↺
                                  </button>
                                </div>
                              );
                            }
                            // Handle regular images
                            const savedDimensions = getSavedImageDimensions(srcString, alt);
                            return (
                              <div 
                                className="resizable-image-wrapper"
                                style={{
                                  resize: 'both',
                                  overflow: 'hidden',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  display: 'inline-block',
                                  minWidth: '100px',
                                  minHeight: '100px',
                                  maxWidth: '100%',
                                  width: `${savedDimensions.width}px`,
                                  height: `${savedDimensions.height}px`,
                                  margin: '1rem 0',
                                  position: 'relative'
                                }}
                                onMouseUp={(e) => {
                                  const element = e.currentTarget;
                                  const rect = element.getBoundingClientRect();
                                  saveImageDimensions(srcString, rect.width, rect.height, alt);
                                }}
                                title="Resize me! Dimensions are automatically saved."
                              >
                                <img 
                                  src={src} 
                                  alt={alt} 
                                  {...props}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain',
                                    display: 'block'
                                  }}
                                />
                                {savingDimensions === stableKey && (
                                  <div className="absolute top-1 right-1 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium animate-pulse">
                                    Saved! 💾
                                  </div>
                                )}
                                <div className="absolute top-1 left-1 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium opacity-75">
                                  #{displayIndex + 1} {savedDimensions.width}×{savedDimensions.height}
                                </div>
                                <button
                                  onClick={() => resetImageDimensions(srcString, alt)}
                                  className="absolute bottom-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-md text-xs font-medium opacity-75 hover:opacity-100 transition-opacity"
                                  title="Reset to default size"
                                >
                                  ↺
                                </button>
                              </div>
                            );
                          }
                        };
                      })()}
                      >
                        {markdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    value={markdown}
                    onChange={(value) => setMarkdown(value || '')}
                    theme="vs"
                    onMount={(editor, _monaco) => {
                    console.log('Editor mounted:', editor);
                    setEditorRef(editor);
                    }}
                    options={{
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      padding: { top: 16, bottom: 16 },
                      suggest: {
                        showKeywords: true,
                        showSnippets: true
                      },
                      quickSuggestions: true,
                      parameterHints: { enabled: true },
                      folding: true,
                      renderWhitespace: 'selection',
                      cursorBlinking: 'blink',
                      smoothScrolling: true,
                      find: {
                        seedSearchStringFromSelection: 'always',
                        autoFindInSelection: 'never',
                        globalFindClipboard: false
                      }
                    }}
                  />
                )}
              </div>
          </div>
        </div>
      </div>

      {/* Path Browser Popup Modal */}
      {showPathBrowser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-h-[600px] flex flex-col">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <h3 className="text-lg font-semibold">📁 Select Path</h3>
              <button
                onClick={() => setShowPathBrowser(false)}
                className="text-white hover:text-gray-200 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Current Path Display */}
            <div className="px-6 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-600 mb-1">Current Path:</p>
              <p className="text-sm font-mono bg-white p-2 rounded border break-all">
                {pathBrowserPath || 'Home'}
              </p>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {pathBrowserLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Up Directory Button */}
                  {pathBrowserPath && pathBrowserParent && pathBrowserPath !== pathBrowserParent && (
                    <button
                      onClick={() => browsePathBrowserDirectory(pathBrowserParent)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center gap-3"
                    >
                      <span className="text-lg">📁</span>
                      <span className="font-medium">..</span>
                      <span className="text-sm text-gray-500">(Up one level)</span>
                    </button>
                  )}

                  {/* Directories */}
                  {pathBrowserDirs.map((dir) => (
                    <button
                      key={dir.path}
                      onClick={() => browsePathBrowserDirectory(dir.path)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center gap-3"
                    >
                      <span className="text-lg">📁</span>
                      <span className="font-medium truncate">{dir.name}</span>
                    </button>
                  ))}

                  {pathBrowserDirs.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No directories found
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg flex items-center justify-between">
              <button
                onClick={() => setShowPathBrowser(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => selectPath(pathBrowserPath)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200"
                disabled={pathBrowserLoading}
              >
                Select This Path
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[380px]">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">Unsaved Changes</h3>
              <p className="text-sm text-gray-600 mt-2">
                You have unsaved changes. What would you like to do?
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg flex items-center justify-end gap-2">
              <button
                onClick={handleCancelFileSwitch}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition duration-200"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSaveAndContinue}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Save and Continue
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[700px] flex flex-col">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <h3 className="text-lg font-semibold">📝 Create New File</h3>
              <button
                onClick={() => setShowNewFileModal(false)}
                className="text-white hover:text-gray-200 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            {/* Directory Browser Section */}
            <div className="flex-1 overflow-y-auto">
              {/* Current Path Display */}
              <div className="px-6 py-3 bg-gray-50 border-b">
                <p className="text-sm text-gray-600 mb-1">Selected Directory:</p>
                <p className="text-sm font-mono bg-white p-2 rounded border break-all">
                  {newFilePath || 'Loading...'}
                </p>
              </div>
              
              {/* New Folder Input */}
              {showNewFolderInput && (
                <div className="px-6 py-3 bg-blue-50 border-b">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim() && !creatingFolder) {
                          handleCreateFolder();
                        }
                        if (e.key === 'Escape') {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }
                      }}
                      placeholder="Enter new folder name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim() || creatingFolder}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition duration-200"
                    >
                      {creatingFolder ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Directory Browser */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Choose Directory:</h4>
                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                  >
                    📁 New Folder
                  </button>
                </div>
                
                {newFileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {/* Up Directory Button */}
                    {newFilePath && newFileParentPath && newFilePath !== newFileParentPath && (
                      <button
                        onClick={() => handleBrowseDirectory(newFileParentPath)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center gap-3"
                      >
                        <span className="text-lg">📁</span>
                        <span className="font-medium">..</span>
                        <span className="text-sm text-gray-500">(Up one level)</span>
                      </button>
                    )}
                    
                    {/* Directories */}
                    {newFileDirectories.map((dir) => (
                      <button
                        key={dir.path}
                        onClick={() => handleBrowseDirectory(dir.path)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center gap-3"
                      >
                        <span className="text-lg">📁</span>
                        <span className="font-medium truncate">{dir.name}</span>
                      </button>
                    ))}
                    
                    {newFileDirectories.length === 0 && (
                      <p className="text-gray-500 text-center py-8">
                        No directories found
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* File Creation Form */}
              <div className="px-6 py-4 border-t space-y-4">
                <div>
                  <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
                    File Name
                  </label>
                  <input
                    type="text"
                    id="fileName"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFileName.trim() && newFilePath) {
                        createNewFile();
                      }
                    }}
                    placeholder="Enter file name (e.g., my-document)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">.md extension will be added automatically</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-1">File will be created as:</p>
                  <p className="text-xs text-gray-600">
                    {newFilePath ? `${newFilePath}/${newFileName ? (newFileName.endsWith('.md') ? newFileName : `${newFileName}.md`) : 'filename.md'}` : 'Select a directory first'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={createNewFile}
                disabled={!newFileName.trim() || !newFilePath || creatingFile}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                {creatingFile ? 'Creating...' : 'Create File'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TOC Insert Modal */}
      {showTOCInsertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Insert Table of Contents</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Header Level to Include:
                  </label>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map(level => {
                      const headerCount = generateTOC(markdown).filter(h => h.level <= level).length;
                      const levelText = level === 1 ? 'H1 only' : `H1 through H${level}`;
                      return (
                        <label key={level} className="flex items-center">
                          <input
                            type="radio"
                            name="tocLevel"
                            value={level}
                            checked={tocInsertLevel === level}
                            onChange={(e) => setTocInsertLevel(Number(e.target.value))}
                            className="mr-3"
                          />
                          <span className="text-sm">
                            {levelText} ({headerCount} headers)
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tocIncludeSpacing}
                      onChange={(e) => setTocIncludeSpacing(e.target.checked)}
                      className="mr-3"
                    />
                    <span className="text-sm">
                      Add automatic spacing between header sections
                    </span>
                  </label>
                  <div className="text-xs text-gray-500 ml-6 mt-1">
                    Adds blank lines to visually separate different header levels
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    💡 Tip: Manual TOC Spacing
                  </div>
                  <div className="text-xs text-blue-700">
                    Add <code className="bg-blue-100 px-1 rounded">{'<!-- TOC-SPACE -->'}</code> anywhere in your markdown to create custom spacing in the generated TOC.
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  Preview: This will include all headers from H1 through H{tocInsertLevel}
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTOCInsertModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => performTOCInsert(tocInsertLevel)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  Insert TOC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Markdown Cheat Sheet Modal */}
      {showCheatSheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">📝 Markdown Cheat Sheet</h2>
                <button
                  onClick={() => setShowCheatSheet(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Headers */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-gray-800">📋 Headers</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded"># H1</code>
                      <span className="text-gray-600">Main Title</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded">## H2</code>
                      <span className="text-gray-600">Section</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded">### H3</code>
                      <span className="text-gray-600">Subsection</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded">#### H4</code>
                      <span className="text-gray-600">Sub-subsection</span>
                    </div>
                  </div>
                </div>
                
                {/* Text Formatting */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-gray-800">✨ Text Formatting</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded">**bold**</code>
                      <span className="font-bold">bold</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded">*italic*</code>
                      <span className="italic">italic</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded">~~strike~~</code>
                      <span className="line-through">strikethrough</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="bg-gray-200 px-2 py-1 rounded">`code`</code>
                      <span className="bg-gray-200 px-1 rounded font-mono text-xs">inline code</span>
                    </div>
                  </div>
                </div>
                
                {/* Lists */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-gray-800">📝 Lists</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">- item</code>
                      <span className="text-gray-600 ml-2">Bullet list</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">1. item</code>
                      <span className="text-gray-600 ml-2">Numbered list</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">- [ ] task</code>
                      <span className="text-gray-600 ml-2">Task list</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">- [x] done</code>
                      <span className="text-gray-600 ml-2">Completed task</span>
                    </div>
                  </div>
                </div>
                
                {/* Links & Images */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-gray-800">🔗 Links & Images</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">[text](url)</code>
                      <span className="text-gray-600 ml-2">Link</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">![alt](url)</code>
                      <span className="text-gray-600 ml-2">Image</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">[ref]: url</code>
                      <span className="text-gray-600 ml-2">Reference</span>
                    </div>
                  </div>
                </div>
                
                {/* Code Blocks */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-gray-800">💻 Code Blocks</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">```js</code>
                      <span className="text-gray-600 ml-2">Code block</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">```</code>
                      <span className="text-gray-600 ml-2">Close block</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Languages: js, python, html, css, etc.
                    </div>
                  </div>
                </div>
                
                {/* Other Elements */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-gray-800">🔧 Other Elements</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">{'> quote'}</code>
                      <span className="text-gray-600 ml-2">Blockquote</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded">---</code>
                      <span className="text-gray-600 ml-2">Horizontal rule</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">| A | B |</code>
                      <span className="text-gray-600 ml-2">Table</span>
                    </div>
                    <div>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">|---|---|</code>
                      <span className="text-gray-600 ml-2">Table separator</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Keyboard Shortcuts */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-3 text-blue-900">⌨️ Keyboard Shortcuts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Bold</span>
                      <kbd className="bg-white px-2 py-1 rounded border">Ctrl+B</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Italic</span>
                      <kbd className="bg-white px-2 py-1 rounded border">Ctrl+I</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Save</span>
                      <kbd className="bg-white px-2 py-1 rounded border">Ctrl+S</kbd>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Link</span>
                      <kbd className="bg-white px-2 py-1 rounded border">Ctrl+K</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Code Block</span>
                      <kbd className="bg-white px-2 py-1 rounded border">Ctrl+/</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Unordered List</span>
                      <kbd className="bg-white px-2 py-1 rounded border">Ctrl+U</kbd>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pro Tips */}
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold mb-3 text-green-900">💡 Pro Tips</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Use the toolbar buttons for quick formatting</li>
                  <li>• Paste images directly into the editor</li>
                  <li>• Use the TOC button to generate table of contents</li>
                  <li>• Files are auto-saved every 3 seconds</li>
                  <li>• Use {'<!-- TOC-SPACE -->'} for custom TOC spacing</li>
                </ul>
              </div>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCheatSheet(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notepad Popup */}
      {showNotepad && (
        <>
          {/* Backdrop to close popup when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeNotepad}
          ></div>
          
          {/* Popup positioned relative to button */}
          <div 
            className="fixed top-32 right-8 z-50 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col"
            style={{ 
              width: `${notepadDimensions.width}px`, 
              height: `${notepadDimensions.height}px` 
            }}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                📝 Quick Notes
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveNotepad}
                  disabled={notepadSaving}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  title="Save notes"
                >
                  {notepadSaving ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  {notepadSaving ? 'Saving' : 'Save'}
                </button>
                <button
                  onClick={closeNotepad}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded"
                  title="Close notepad"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-3">
              {notepadLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-500 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Loading...</p>
                  </div>
                </div>
              ) : (
                <textarea
                  value={notepadContent}
                  onChange={(e) => setNotepadContent(e.target.value)}
                  className="w-full h-full resize-none border border-gray-300 rounded p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Jot down quick notes here..."
                  autoFocus
                />
              )}
            </div>
            
            <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 relative">
              <div className="flex items-center justify-between">
                <span>💾 Click Save to persist</span>
                <span>{notepadContent.length} chars</span>
              </div>
              
              {/* Resize Handle */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-50 hover:opacity-75 transition-opacity"
                onMouseDown={handleResizeStart}
                title="Drag to resize"
              >
                <svg 
                  className="w-4 h-4 text-gray-400" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M22 22H2v-2h20v2zm0-4H12v-2h10v2zm0-4H16v-2h6v2z"/>
                </svg>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
