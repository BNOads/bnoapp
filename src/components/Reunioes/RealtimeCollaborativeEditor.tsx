import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WYSIWYGEditor } from '@/components/ui/WYSIWYGEditor';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { useRealtimeDocument } from '@/hooks/useRealtimeDocument';

interface RealtimeCollaborativeEditorProps {
  documentId: string;
  blockId: string;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RealtimeCollaborativeEditor({
  documentId,
  blockId,
  content,
  onChange,
  placeholder,
  className
}: RealtimeCollaborativeEditorProps) {
  const { updateTypingStatus } = useRealtimePresence(documentId);
  const { broadcastContentUpdate, onSyncEvent } = useRealtimeDocument(documentId);
  const [localContent, setLocalContent] = useState(content);
  const isLocalChangeRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync external content changes
  useEffect(() => {
    if (!isLocalChangeRef.current && content !== localContent) {
      setLocalContent(content);
    }
    isLocalChangeRef.current = false;
  }, [content]);

  // Listen for realtime updates
  useEffect(() => {
    const cleanup = onSyncEvent((event) => {
      if (event.type === 'content_update' && event.block_id === blockId && event.field === 'content') {
        if (event.value !== localContent) {
          setLocalContent(event.value);
          onChange(event.value);
        }
      }
    });

    return cleanup;
  }, [blockId, localContent, onChange, onSyncEvent]);

  const handleContentChange = useCallback((newContent: string) => {
    isLocalChangeRef.current = true;
    setLocalContent(newContent);
    onChange(newContent);

    // Broadcast typing status
    updateTypingStatus(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Debounce content broadcast and stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      broadcastContentUpdate(blockId, 'content', newContent);
      updateTypingStatus(false);
    }, 500);
  }, [blockId, onChange, updateTypingStatus, broadcastContentUpdate]);

  const handleTitleExtracted = useCallback((titles: string[]) => {
    // Handle title extraction if needed
    console.log('Titles extracted:', titles);
  }, []);

  return (
    <div className={className}>
      <WYSIWYGEditor
        content={localContent}
        onChange={handleContentChange}
        onTitleExtracted={handleTitleExtracted}
        placeholder={placeholder}
        showToolbar={true}
      />
    </div>
  );
}