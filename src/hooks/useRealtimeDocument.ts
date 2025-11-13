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

  // Debounce function for batching updates - REDUCED for instant broadcast
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const DEBOUNCE_DELAY = 100;
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const CONNECTION_TIMEOUT = 5000; // 5 seconds
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!documentId || !user || documentId.length === 0) {
      setSyncStatus('idle');
      return;
    }

    const channelName = `pauta-sync:${documentId}`;
    
    const channel = supabase
      .channel(channelName, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'document_sync' }, (message) => {
        const event = message.payload as DocumentSyncEvent;
        
        // Ignore events from current user
        if (event.user_id === user.id) return;

        console.log('📥 [Realtime] Recebeu evento de sincronização:', event);
        
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
      });

    channelRef.current = channel;

    // Connection timeout - se não conectar em 5s, marcar erro e tentar retry
    connectionTimeoutRef.current = setTimeout(() => {
      if (syncStatus === 'idle' || syncStatus === 'syncing') {
        console.error('⚠️ [Realtime] Timeout de conexão - tentativa', retryCountRef.current + 1);
        
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          toast({
            title: "Reconectando...",
            description: `Tentativa ${retryCountRef.current} de ${MAX_RETRIES}`,
          });
          
          // Retry connection
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
          }
          setSyncStatus('idle');
        } else {
          setSyncStatus('error');
          toast({
            title: "❌ Erro de conexão",
            description: "Não foi possível conectar ao servidor. Suas mudanças serão salvas localmente.",
            variant: "destructive",
          });
        }
      }
    }, CONNECTION_TIMEOUT);

    channel.subscribe((status) => {
      console.log('📡 [Realtime] Status do canal de sincronização:', status);
      
      if (status === 'SUBSCRIBED') {
        // Limpar timeout de conexão e resetar retry counter
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        retryCountRef.current = 0;
        setSyncStatus('synced');
        
        // Iniciar heartbeat para verificar conexão
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          // Verificar se canal ainda está ativo
          const currentStatus = channelRef.current?.state;
          if (currentStatus !== 'joined') {
            console.warn('⚠️ [Realtime] Canal não está mais conectado');
            setSyncStatus('error');
          }
        }, 10000); // Check every 10 seconds
        
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setSyncStatus('error');
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [documentId, user?.id]);

  const broadcastUpdate = useCallback((event: Omit<DocumentSyncEvent, 'user_id' | 'timestamp'>, immediate = false) => {
    if (!channelRef.current || !userData || !user) return;

    const syncEvent: DocumentSyncEvent = {
      ...event,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    };

    // Se immediate = true, enviar imediatamente sem debounce
    if (immediate) {
      setSyncStatus('syncing');
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'document_sync',
        payload: syncEvent,
      });

      console.log('📤 [Realtime] Broadcast imediato enviado:', syncEvent);
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      return;
    }

    // Add to pending updates for debouncing
    pendingUpdatesRef.current.push(syncEvent);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the broadcast (100ms para broadcast rápido)
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
        payload: lastUpdate,
      });

      console.log('📤 [Realtime] Broadcast enviado:', lastUpdate);
      setLastSyncTime(new Date());
      setSyncStatus('synced');
    }, DEBOUNCE_DELAY);
  }, [userData, user]);

  const broadcastContentUpdate = useCallback((blockId: string, field: string, value: any, immediate = false) => {
    broadcastUpdate({
      type: 'content_update',
      block_id: blockId,
      field,
      value,
    }, immediate);
  }, [broadcastUpdate]);

  const broadcastBlockCreate = useCallback((blockId: string) => {
    broadcastUpdate({
      type: 'block_create',
      block_id: blockId,
    }, true); // Criação de bloco sempre imediato
  }, [broadcastUpdate]);

  const broadcastBlockDelete = useCallback((blockId: string) => {
    broadcastUpdate({
      type: 'block_delete',
      block_id: blockId,
    }, true); // Exclusão de bloco sempre imediato
  }, [broadcastUpdate]);

  // Flush immediate - força envio de tudo que está pendente
  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length > 0 && channelRef.current) {
      const updates = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];

      updates.forEach(update => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'document_sync',
          payload: update,
        });
      });

      console.log('Flushed pending updates:', updates.length);
    }
  }, []);

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
    flushPendingUpdates,
    onSyncEvent,
    syncStatus,
    lastSyncTime,
  };
}