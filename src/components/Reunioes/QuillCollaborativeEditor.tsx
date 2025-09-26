import React, { useEffect, useRef, useCallback, useState } from 'react';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import { useYjsCollaboration } from '@/hooks/useYjsCollaboration';
import { PresenceIndicator } from './PresenceIndicator';
import 'quill/dist/quill.snow.css';

// Quill toolbar configuration
const TOOLBAR_OPTIONS = [
  [{ 'header': [2, 3, false] }],
  ['bold', 'italic', 'underline'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  ['link'],
  ['clean']
];

interface QuillCollaborativeEditorProps {
  documentId: string;
  blockId: string;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  permissions?: {
    canEdit: boolean;
    canView: boolean;
  };
}

export function QuillCollaborativeEditor({
  documentId,
  blockId,
  content,
  onChange,
  placeholder = "Digite o conteúdo da pauta...",
  className = "",
  permissions = { canEdit: true, canView: true }
}: QuillCollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const bindingRef = useRef<QuillBinding | null>(null);
  const [isQuillReady, setIsQuillReady] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    presenceUsers,
    connectionStatus,
    saveStatus,
    updateTypingStatus,
    updateCursor,
    getYDoc,
    getProvider,
    isInitialized,
    permissions: yjsPermissions
  } = useYjsCollaboration({
    documentId,
    blockId,
    initialContent: content,
    onContentChange: onChange,
    permissions
  });

  // Initialize Quill editor
  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      modules: {
        toolbar: permissions.canEdit ? TOOLBAR_OPTIONS : false,
        history: {
          userOnly: true // Only undo/redo user actions, not collaborative changes
        }
      },
      placeholder,
      readOnly: !permissions.canEdit
    });

    quillRef.current = quill;
    setIsQuillReady(true);

    // Handle text changes for typing indicator
    quill.on('text-change', (delta, oldDelta, source) => {
      if (source === 'user') {
        // Update typing status
        updateTypingStatus(true);
        
        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          updateTypingStatus(false);
        }, 1000);
      }
    });

    // Handle selection changes for cursor position
    quill.on('selection-change', (range, oldRange, source) => {
      if (source === 'user' && range) {
        updateCursor(range);
      }
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, [permissions.canEdit, placeholder, updateTypingStatus, updateCursor]);

  // Setup Yjs binding when both Quill and Yjs are ready
  useEffect(() => {
    if (!isQuillReady || !isInitialized || !quillRef.current) return;

    const ydoc = getYDoc();
    const provider = getProvider();
    
    if (!ydoc || !provider) return;

    const ytext = ydoc.getText('quill');
    
    // Create Yjs-Quill binding
    const binding = new QuillBinding(ytext, quillRef.current, provider.awareness);
    bindingRef.current = binding;

    console.log('Quill-Yjs binding established');

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [isQuillReady, isInitialized, getYDoc, getProvider]);

  // Handle permission changes
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(permissions.canEdit);
    }
  }, [permissions.canEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      // Force save is handled automatically by the collaboration hook
    }
  }, []);

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Presence Indicator */}
      <div className="border-b p-3 bg-muted/30">
        <PresenceIndicator
          presenceUsers={presenceUsers}
          connectionStatus={connectionStatus}
          saveStatus={saveStatus}
          permissions={yjsPermissions}
        />
      </div>

      {/* Quill Editor */}
      <div 
        className="quill-collaborative-editor"
        onKeyDown={handleKeyDown}
      >
        <div ref={editorRef} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .quill-collaborative-editor .ql-editor {
          min-height: 120px;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .quill-collaborative-editor .ql-toolbar {
          border-bottom: 1px solid var(--border);
        }
        
        .quill-collaborative-editor .ql-container {
          border: none;
        }
        
        /* Collaborative cursor styles */
        .ql-cursor {
          position: absolute;
          border-left: 2px solid;
          border-color: inherit;
          height: 1em;
          pointer-events: none;
        }
        
        .ql-cursor-name {
          position: absolute;
          top: -1.5em;
          left: -1px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          background: inherit;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          z-index: 10;
        }
        
        .ql-cursor-caret {
          position: absolute;
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 6px solid;
          border-color: inherit;
          top: 100%;
          left: -3px;
        }
        
        /* Selection styles */
        .ql-selection {
          background: rgba(0, 0, 0, 0.2);
          position: absolute;
          pointer-events: none;
        }
        
        /* Custom toolbar styling */
        .quill-collaborative-editor .ql-toolbar.ql-snow {
          border: none;
          padding: 8px 12px;
          background: transparent;
        }
        
        .quill-collaborative-editor .ql-toolbar .ql-formats {
          margin-right: 12px;
        }
        
        /* Focus styles */
        .quill-collaborative-editor .ql-editor:focus {
          outline: none;
        }
        
        /* Placeholder styling */
        .quill-collaborative-editor .ql-editor.ql-blank::before {
          color: var(--muted-foreground);
          font-style: normal;
        }
        
        /* Read-only mode styling */
        .quill-collaborative-editor .ql-editor[contenteditable="false"] {
          background: var(--muted/50);
        }
      ` }} />
    </div>
  );
}