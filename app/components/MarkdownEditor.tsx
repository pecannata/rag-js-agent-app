'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [markdown, setMarkdown] = useState<string>('# Welcome to Markdown Editor\n\nThis is a **markdown editor** with Monaco Editor (VS Code).\n\n## Features\n\n- ✅ Professional code editor experience\n- ✅ Markdown syntax highlighting\n- ✅ IntelliSense and autocompletion\n- ✅ File browser for README*.md files\n- ✅ Document management\n\n## Getting Started\n\n1. Browse directories in the sidebar\n2. Click on README*.md files to open them\n3. Edit with full VS Code functionality\n4. Save and manage your documents\n\n**Happy writing!** 📝');
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{[key: string]: {width: number, height: number}}>({});
  const [savingDimensions, setSavingDimensions] = useState<string | null>(null);
  const imageContextMapRef = useRef<Map<string, {index: number, context: string}>>(new Map());

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

  // Helper function to reset all image dimensions for current file
  const resetAllImageDimensions = () => {
    if (!currentFilePath) return;
    
    setImageDimensions(prev => {
      const newDimensions = { ...prev };
      Object.keys(newDimensions).forEach(key => {
        if (key.startsWith(currentFilePath + ':')) {
          delete newDimensions[key];
        }
      });
      return newDimensions;
    });
  };


  // Helper function to get saved image dimensions
  const getSavedImageDimensions = (src: string, alt?: string) => {
    if (!currentFilePath) return { width: 300, height: 200 };
    
    const imageKey = getStableImageKey(src, alt, currentFilePath);
    return imageDimensions[imageKey] || { width: 300, height: 200 };
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
        // Could add a success message here if desired
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save file');
      }
    } catch (error) {
      setError('Error saving file: ' + error);
    }
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
      }
    };
    
    loadPersistedData();
  }, []);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentFilePath, markdown]);

  // Track unsaved changes
  useEffect(() => {
    if (originalContent !== '' && markdown !== originalContent) {
      setHasUnsavedChanges(true);
    } else if (markdown === originalContent) {
      setHasUnsavedChanges(false);
    }
  }, [markdown, originalContent]);

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
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
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
            {/* Removed New and Export buttons - not needed for README editing */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* File Browser Sidebar */}
        <div className="w-80 bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 shadow-inner flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar min-h-0">
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
              <h3 className="text-base font-semibold text-slate-800">File Browser</h3>
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

            {/* README Files Display */}
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
                      <p className="text-slate-500 text-xs font-medium">No README*.md files found</p>
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
          <div className="flex-1 flex flex-col min-h-0">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-700">📝 Monaco Editor (VS Code)</h3>
                  {isUploadingImage && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-xs">Uploading image...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                  {isPreviewMode && currentFilePath && (
                    <button
                      onClick={resetAllImageDimensions}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      title="Reset all image sizes to default"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset All Image Sizes
                    </button>
                  )}
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
                </div>
              </div>
              
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
              
              <div className="flex-1 border border-gray-200 rounded-b-lg overflow-hidden">
                {isPreviewMode ? (
                  <div className="h-full p-6 bg-white overflow-y-auto custom-scrollbar">
                    <div className="max-w-none prose prose-sm prose-slate">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt, ...props }) => {
                            // Get stable key and display index for this image
                            const srcString = typeof src === 'string' ? src : '';
                            const displayIndex = getDisplayIndex(srcString, alt);
                            const stableKey = getStableImageKey(srcString, alt, currentFilePath || '');
                            
                            // Handle relative image paths
                            if (srcString.startsWith('./images/')) {
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
                        }}
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
    </div>
  );
}
