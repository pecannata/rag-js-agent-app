'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  apiKey: string;
}

export default function MarkdownEditor({ apiKey }: MarkdownEditorProps) {
  const [markdown, setMarkdown] = useState<string>('# Welcome to Markdown Editor\n\nThis is a **markdown editor** with *live preview* and drag-and-drop support for images and links.\n\n## Features\n\n- ✅ Live preview mode\n- ✅ Drag and drop images\n- ✅ Clickable links (try this: [Google](https://www.google.com))\n- ✅ Full markdown support\n- ✅ Code syntax highlighting\n\n## Getting Started\n\n1. Type your markdown in the editor\n2. See the live preview on the right\n3. Drag images directly into the editor\n4. Save your work locally\n5. Click links in preview mode - they open in new tabs!\n\n```javascript\nconst example = "Hello, World!";\nconsole.log(example);\n```\n\n> This is a blockquote example\n\n---\n\n**Happy writing!** 📝');
  const [savedDocuments, setSavedDocuments] = useState<{ id: string; title: string; content: string; lastModified: Date }[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');

  // Load saved documents from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('markdown-documents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedDocuments(parsed.map((doc: any) => ({
          ...doc,
          lastModified: new Date(doc.lastModified)
        })));
      } catch (error) {
        console.error('Error loading saved documents:', error);
      }
    }
  }, []);

  // Save documents to localStorage whenever savedDocuments changes
  useEffect(() => {
    if (savedDocuments.length > 0) {
      localStorage.setItem('markdown-documents', JSON.stringify(savedDocuments));
    }
  }, [savedDocuments]);

  const handleSave = () => {
    if (currentDocumentId) {
      // Update existing document
      setSavedDocuments(prev => prev.map(doc => 
        doc.id === currentDocumentId 
          ? { ...doc, content: markdown, lastModified: new Date() }
          : doc
      ));
    } else {
      // Save new document
      setShowSaveDialog(true);
    }
  };

  const handleSaveNew = () => {
    if (documentTitle.trim()) {
      const newDoc = {
        id: Date.now().toString(),
        title: documentTitle.trim(),
        content: markdown,
        lastModified: new Date()
      };
      setSavedDocuments(prev => [newDoc, ...prev]);
      setCurrentDocumentId(newDoc.id);
      setShowSaveDialog(false);
      setDocumentTitle('');
    }
  };

  const handleLoad = (doc: { id: string; title: string; content: string; lastModified: Date }) => {
    setMarkdown(doc.content);
    setCurrentDocumentId(doc.id);
  };

  const handleNew = () => {
    const newContent = '# New Document\n\nStart writing your markdown here...';
    setMarkdown(newContent);
    setCurrentDocumentId(null);
  };

  const handleDelete = (docId: string) => {
    setSavedDocuments(prev => prev.filter(doc => doc.id !== docId));
    if (currentDocumentId === docId) {
      setCurrentDocumentId(null);
    }
  };

  const handleExport = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getCurrentDocumentTitle() || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCurrentDocumentTitle = () => {
    if (currentDocumentId) {
      const doc = savedDocuments.find(d => d.id === currentDocumentId);
      return doc?.title || 'Untitled';
    }
    return 'New Document';
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        handleImageUpload(file).then(dataUrl => {
          const imageMarkdown = `![${file.name}](${dataUrl})`;
          setMarkdown(prev => prev + '\n\n' + imageMarkdown);
        });
      }
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📝 {getCurrentDocumentTitle()}
            </h2>
            {currentDocumentId && (
              <span className="text-sm text-gray-500">
                Last saved: {savedDocuments.find(d => d.id === currentDocumentId)?.lastModified.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
            >
              New
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
            >
              Save
            </button>
            <button
              onClick={handleExport}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar with saved documents */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Documents</h3>
            {savedDocuments.length === 0 ? (
              <p className="text-gray-500 text-sm">No saved documents yet</p>
            ) : (
              <div className="space-y-2">
                {savedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg border cursor-pointer transition duration-200 ${
                      currentDocumentId === doc.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => handleLoad(doc)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {doc.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {doc.lastModified.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete document"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6">
          <div className="h-full flex flex-col">
            {/* Monaco Editor */}
            <div className="flex-1 flex flex-col">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 rounded-t-lg">
                <h3 className="text-sm font-medium text-gray-700">📝 Monaco Editor (VS Code)</h3>
              </div>
              <div className="flex-1 border border-gray-200 rounded-b-lg overflow-hidden">
                <Editor
                  height="600px"
                  defaultLanguage="markdown"
                  value={markdown}
                  onChange={(value) => setMarkdown(value || '')}
                  theme="vs"
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
                    smoothScrolling: true
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Document</h3>
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Enter document title..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveNew()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!documentTitle.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition duration-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
