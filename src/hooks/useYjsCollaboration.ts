import { useEffect, useRef, useState, useCallback } from 'react';
import { YjsDocumentManager, createUserAwareness } from '@/utils/yjsUtils';
import { useCurrentUser } from './useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';

export interface PresenceUser {
  userId: string;
  name: string;
  avatar: string | null;
  color: string;
  isTyping: boolean;
  cursor: any;
}

export interface UseYjsCollaborationProps {
  documentId: string;
  blockId: string;
  initialContent: string;
  onContentChange: (content: string) => void;
  permissions?: {
    canEdit: boolean;
    canView: boolean;
  };
}

export function useYjsCollaboration({
  documentId,
  blockId,
  initialContent,
  onContentChange,
  permissions = { canEdit: true, canView: true }
}: UseYjsCollaborationProps) {
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const yjsManagerRef = useRef<YjsDocumentManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Yjs document manager
  useEffect(() => {
    if (!documentId || !blockId || !userData || !user) {
      return;
    }

    const manager = new YjsDocumentManager(
      documentId,
      blockId,
      onContentChange,
      3000 // 3 second autosave delay
    );

    yjsManagerRef.current = manager;

    // Set initial content if provided
    if (initialContent && initialContent.trim()) {
      manager.setInitialContent(initialContent);
    }

    // Setup awareness (presence)
    const provider = manager.getProvider();
    if (provider && provider.awareness) {
      const awareness = provider.awareness;
      
      // Set local user awareness
      const userAwareness = createUserAwareness(userData);
      awareness.setLocalStateField('user', userAwareness);

      // Listen for awareness changes
      const handleAwarenessChange = () => {
        const states = Array.from(awareness.getStates().entries());
        const users: PresenceUser[] = states
          .filter(([clientId, state]) => clientId !== awareness.clientID && state.user)
          .map(([clientId, state]) => ({
            userId: state.user.name || `user-${clientId}`,
            name: state.user.name,
            avatar: state.user.avatar,
            color: state.user.color,
            isTyping: state.user.isTyping || false,
            cursor: state.user.cursor
          }));
        
        setPresenceUsers(users);
      };

      awareness.on('change', handleAwarenessChange);

      // Handle connection status
      const handleStatusChange = (event: { status: string }) => {
        switch (event.status) {
          case 'connected':
            setConnectionStatus('connected');
            break;
          case 'connecting':
            setConnectionStatus('connecting');
            break;
          case 'disconnected':
            setConnectionStatus('disconnected');
            break;
          default:
            setConnectionStatus('error');
        }
      };

      provider.on('status', handleStatusChange);

      setIsInitialized(true);

      return () => {
        awareness.off('change', handleAwarenessChange);
        provider.off('status', handleStatusChange);
        manager.destroy();
      };
    }

    setIsInitialized(true);

    return () => {
      manager.destroy();
    };
  }, [documentId, blockId, userData, user, initialContent, onContentChange]);

  // Update save status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (yjsManagerRef.current) {
        setSaveStatus(yjsManagerRef.current.getSaveStatus());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateTypingStatus = useCallback((isTyping: boolean) => {
    const provider = yjsManagerRef.current?.getProvider();
    if (provider && provider.awareness && userData) {
      const awareness = provider.awareness;
      const currentState = awareness.getLocalState();
      
      awareness.setLocalStateField('user', {
        ...currentState?.user,
        isTyping
      });
    }
  }, [userData]);

  const updateCursor = useCallback((cursor: any) => {
    const provider = yjsManagerRef.current?.getProvider();
    if (provider && provider.awareness && userData) {
      const awareness = provider.awareness;
      const currentState = awareness.getLocalState();
      
      awareness.setLocalStateField('user', {
        ...currentState?.user,
        cursor
      });
    }
  }, [userData]);

  const forceSave = useCallback(async () => {
    if (yjsManagerRef.current) {
      try {
        setSaveStatus('saving');
        await yjsManagerRef.current.forceSave();
        setSaveStatus('saved');
      } catch (error) {
        console.error('Force save failed:', error);
        setSaveStatus('error');
      }
    }
  }, []);

  const getYDoc = useCallback(() => {
    return yjsManagerRef.current?.getYDoc() || null;
  }, []);

  const getProvider = useCallback(() => {
    return yjsManagerRef.current?.getProvider() || null;
  }, []);

  // Force save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (yjsManagerRef.current) {
        yjsManagerRef.current.forceSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    presenceUsers,
    connectionStatus,
    saveStatus,
    updateTypingStatus,
    updateCursor,
    forceSave,
    getYDoc,
    getProvider,
    isInitialized,
    permissions
  };
}