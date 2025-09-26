import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';

interface YjsContextType {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isReady: boolean;
}

const YjsContext = createContext<YjsContextType>({
  ydoc: null,
  provider: null,
  connectionStatus: 'disconnected',
  isReady: false
});

interface YjsProviderProps {
  documentId: string;
  children: React.ReactNode;
}

export function YjsProvider({ documentId, children }: YjsProviderProps) {
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!documentId || !userData || !user) {
      return;
    }

    // Create Y.Doc
    const doc = new Y.Doc();
    setYdoc(doc);

    // Create WebSocket provider
    const room = `pauta:${documentId}`;
    
    try {
      // Use a simple WebSocket server URL for Yjs
      // In production, you might want to use a dedicated Yjs server
      const wsUrl = `ws://localhost:1234`; // Fallback to local development
      
      const wsProvider = new WebsocketProvider(wsUrl, room, doc, {
        connect: true,
        resyncInterval: 5000,
        maxBackoffTime: 30000,
      });

      // Set user awareness information
      if (wsProvider.awareness && userData) {
        wsProvider.awareness.setLocalStateField('user', {
          name: userData.nome || userData.email || 'Anonymous',
          avatar: userData.avatar_url || null,
          color: generateUserColor(user.id),
          cursor: null,
          isTyping: false
        });
      }

      // Handle connection status
      wsProvider.on('status', ({ status }: { status: string }) => {
        console.log('Yjs WebSocket status:', status);
        
        switch (status) {
          case 'connected':
            setConnectionStatus('connected');
            setIsReady(true);
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
      });

      wsProvider.on('connection-error', (error: any) => {
        console.error('Yjs connection error:', error);
        setConnectionStatus('error');
      });

      setProvider(wsProvider);

      // Initial connection attempt
      setConnectionStatus('connecting');

    } catch (error) {
      console.error('Failed to initialize Yjs provider:', error);
      setConnectionStatus('error');
    }

    return () => {
      if (provider) {
        provider.destroy();
      }
      if (doc) {
        doc.destroy();
      }
      setYdoc(null);
      setProvider(null);
      setConnectionStatus('disconnected');
      setIsReady(false);
    };
  }, [documentId, userData, user]);

  const contextValue: YjsContextType = {
    ydoc,
    provider,
    connectionStatus,
    isReady
  };

  return (
    <YjsContext.Provider value={contextValue}>
      {children}
    </YjsContext.Provider>
  );
}

export function useYjs() {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error('useYjs must be used within a YjsProvider');
  }
  return context;
}

// Utility function to generate consistent colors for users
function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
}