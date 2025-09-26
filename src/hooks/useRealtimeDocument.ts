import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { useAuth } from '@/components/Auth/AuthContext';
import { useToast } from './use-toast';

export interface DocumentSyncEvent {
  type: 'content_update' | 'block_update' | 'block_delete' | 'block_create';
  block_id?: string;
  field?: string;
  value?: any;
  user_id: string;
  timestamp: string;
  content?: string;
}

export function useRealtimeDocument(documentId: string) {
  const { userData } = useCurrentUser();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const channelRef = useRef<any>(null);
  const pendingUpdatesRef = useRef<DocumentSyncEvent[]>([]);
  const updateCallbacksRef = useRef<((event: DocumentSyncEvent) => void)[]>([]);

  // Debounce function for batching updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const DEBOUNCE_DELAY = 300;

  useEffect(() => {
    if (!documentId || !userData || !user) return;

    const channelName = `pauta-sync:${documentId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'document_sync' }, (payload) => {
        const event = payload.data as DocumentSyncEvent;
        
        // Ignore events from current user
        if (event.user_id === user.id) return;

        console.log('Received sync event:', event);
        
        // Call all registered callbacks
        updateCallbacksRef.current.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            console.error('Error processing sync event:', error);
          }
        });

        setLastSyncTime(new Date());
        setSyncStatus('synced');
        
        // Auto-reset status after 2 seconds
        setTimeout(() => setSyncStatus('idle'), 2000);
      });

    channelRef.current = channel;

    channel.subscribe((status) => {
      console.log('Document sync channel status:', status);
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [documentId, userData, user]);

  const broadcastUpdate = useCallback((event: Omit<DocumentSyncEvent, 'user_id' | 'timestamp'>) => {
    if (!channelRef.current || !userData || !user) return;

    const syncEvent: DocumentSyncEvent = {
      ...event,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    };

    // Add to pending updates for debouncing
    pendingUpdatesRef.current.push(syncEvent);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the broadcast
    debounceTimeoutRef.current = setTimeout(() => {
      const updates = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];

      if (updates.length === 0) return;

      setSyncStatus('syncing');

      // Broadcast the most recent update (for simplicity)
      const lastUpdate = updates[updates.length - 1];
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'document_sync',
        data: lastUpdate,
      });

      console.log('Broadcasted sync event:', lastUpdate);
    }, DEBOUNCE_DELAY);
  }, [userData, user]);

  const broadcastContentUpdate = useCallback((blockId: string, field: string, value: any) => {
    broadcastUpdate({
      type: 'content_update',
      block_id: blockId,
      field,
      value,
    });
  }, [broadcastUpdate]);

  const broadcastBlockCreate = useCallback((blockId: string) => {
    broadcastUpdate({
      type: 'block_create',
      block_id: blockId,
    });
  }, [broadcastUpdate]);

  const broadcastBlockDelete = useCallback((blockId: string) => {
    broadcastUpdate({
      type: 'block_delete',
      block_id: blockId,
    });
  }, [broadcastUpdate]);

  const onSyncEvent = useCallback((callback: (event: DocumentSyncEvent) => void) => {
    updateCallbacksRef.current.push(callback);
    
    // Return cleanup function
    return () => {
      updateCallbacksRef.current = updateCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  return {
    broadcastContentUpdate,
    broadcastBlockCreate,
    broadcastBlockDelete,
    onSyncEvent,
    syncStatus,
    lastSyncTime,
  };
}