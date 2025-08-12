'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  height?: number | string;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  height = 400,
  placeholder = 'Start writing...'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  }, [onChange]);

  // Execute commands
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  // Handle image uploads
  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const img = `<img src="${e.target.result}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" alt="Uploaded image" />`;
        document.execCommand('insertHTML', false, img);
        handleInput();
      }
    };
    reader.readAsDataURL(file);
  }, [handleInput]);

  // Handle file input
  const handleFileInput = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  }, [handleImageUpload]);

  // Handle YouTube embed
  const handleYouTubeEmbed = useCallback(() => {
    const url = prompt('Enter YouTube video URL:');
    if (url) {
      let videoId = '';
      const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
        /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([^&\n?#]+)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          videoId = match[1];
          break;
        }
      }

      if (videoId) {
        const embedHTML = `
          <div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; margin: 1rem 0; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
            <iframe 
              src="https://www.youtube.com/embed/${videoId}" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
              frameborder="0" 
              allowfullscreen
              title="YouTube video"
            ></iframe>
          </div>
        `;
        document.execCommand('insertHTML', false, embedHTML);
        handleInput();
      } else {
        alert('Invalid YouTube URL. Please use a valid YouTube link.');
      }
    }
  }, [handleInput]);

  // Insert table
  const insertTable = useCallback(() => {
    const tableHTML = `
      <table style="border-collapse: collapse; width: 100%; margin: 1rem 0; border: 1px solid #ddd;">
        <tbody>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 1</td>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 2</td>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 4</td>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 5</td>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 6</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHTML);
    handleInput();
  }, [handleInput]);

  // Insert emoji
  const insertEmoji = useCallback(() => {
    const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤔', '😴', '😌', '👍', '👎', '👏', '🙌', '💪', '✨', '🎉', '🎊', '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '💯', '🔥', '⭐', '🌟'];
    const emoji = prompt('Choose an emoji: ' + emojis.join(' '));
    if (emoji && emojis.includes(emoji)) {
      document.execCommand('insertText', false, emoji);
      handleInput();
    }
  }, [handleInput]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hasImages = Array.from(e.dataTransfer.items).some(
      item => item.type.startsWith('image/')
    );
    if (hasImages) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach((file, index) => {
      setTimeout(() => handleImageUpload(file), index * 100);
    });
  }, [handleImageUpload]);

  // Paste handler for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      e.preventDefault();
      const file = imageItems[0]?.getAsFile();
      if (file) {
        handleImageUpload(file);
      }
    }
  }, [handleImageUpload]);

  return (
    <div className={`${styles.richEditor} ${isDragOver ? styles.dragOver : ''}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => execCommand('bold')} title="Bold">𝐁</button>
          <button type="button" onClick={() => execCommand('italic')} title="Italic">𝐼</button>
          <button type="button" onClick={() => execCommand('underline')} title="Underline">U̲</button>
          <button type="button" onClick={() => execCommand('strikeThrough')} title="Strikethrough">S̶</button>
        </div>
        
        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1">H1</button>
          <button type="button" onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2">H2</button>
          <button type="button" onClick={() => execCommand('formatBlock', 'h3')} title="Heading 3">H3</button>
          <button type="button" onClick={() => execCommand('formatBlock', 'p')} title="Paragraph">P</button>
        </div>
        
        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Bullet List">• List</button>
          <button type="button" onClick={() => execCommand('insertOrderedList')} title="Numbered List">1. List</button>
          <button type="button" onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote">❝ Quote</button>
        </div>
        
        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => execCommand('justifyLeft')} title="Align Left">⬅</button>
          <button type="button" onClick={() => execCommand('justifyCenter')} title="Align Center">↔</button>
          <button type="button" onClick={() => execCommand('justifyRight')} title="Align Right">➡</button>
        </div>
        
        <div className={styles.toolbarGroup}>
          <button type="button" onClick={insertLink} title="Insert Link">🔗</button>
          <button type="button" onClick={handleFileInput} title="Insert Image">🖼️</button>
          <button type="button" onClick={handleYouTubeEmbed} title="YouTube Video">📺</button>
          <button type="button" onClick={insertTable} title="Insert Table">⊞</button>
          <button type="button" onClick={insertEmoji} title="Insert Emoji">😀</button>
        </div>
        
        <div className={styles.toolbarGroup}>
          <button type="button" onClick={() => execCommand('undo')} title="Undo">↶</button>
          <button type="button" onClick={() => execCommand('redo')} title="Redo">↷</button>
        </div>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        className={styles.editorContent}
        contentEditable
        suppressContentEditableWarning
        style={{ 
          height: typeof height === 'number' ? `${height - 60}px` : 'calc(100% - 60px)',
          minHeight: '300px'
        }}
        onInput={handleInput}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        data-placeholder={placeholder}
      />
      
      {isDragOver && (
        <div className={styles.dropOverlay}>
          📁 Drop images here
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
