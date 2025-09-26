import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '@/integrations/supabase/client';

export interface YjsSnapshot {
  id: string;
  document_id: string;
  block_id: string;
  snapshot_data: Uint8Array;
  created_at: string;
  created_by: string;
  version: number;
  operations_count: number;
}

export interface AutosaveManager {
  lastSave: Date | null;
  pendingChanges: boolean;
  saveTimeout: NodeJS.Timeout | null;
}

export class YjsDocumentManager {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private autosaveManager: AutosaveManager;
  private onSave: (content: string) => void;
  private saveInterval: number;
  private operationsCount = 0;
  private lastCheckpoint = Date.now();
  private checkpointInterval = 5 * 60 * 1000; // 5 minutes
  private maxOperationsBeforeCheckpoint = 1000;
  private currentDocumentId: string;
  private currentBlockId: string;

  constructor(
    documentId: string,
    blockId: string,
    onSave: (content: string) => void,
    saveInterval: number = 3000
  ) {
    this.ydoc = new Y.Doc();
    this.onSave = onSave;
    this.saveInterval = saveInterval;
    this.currentDocumentId = documentId;
    this.currentBlockId = blockId;
    this.autosaveManager = {
      lastSave: null,
      pendingChanges: false,
      saveTimeout: null
    };

    // Setup document update listener
    this.ydoc.on('update', this.handleDocumentUpdate.bind(this));

    // Setup provider
    this.initializeProvider(documentId, blockId);
  }

  private initializeProvider(documentId: string, blockId: string) {
    const room = `pauta:${documentId}:${blockId}`;
    
    try {
      // Use Supabase WebSocket for production or fallback to local for development
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `wss://yjs-server.yourdomain.com/${room}`
        : `ws://localhost:1234`;
      
      this.provider = new WebsocketProvider(wsUrl, room, this.ydoc, {
        resyncInterval: 5000,
        maxBackoffTime: 30000,
      });

      this.provider.on('status', this.handleProviderStatus.bind(this));
      this.provider.on('connection-error', this.handleConnectionError.bind(this));

    } catch (error) {
      console.error('Failed to initialize Yjs provider:', error);
      // Fallback to local mode without sync
      console.warn('Running in local-only mode without real-time collaboration');
    }
  }

  private handleDocumentUpdate(update: Uint8Array, origin: any) {
    this.operationsCount++;
    
    // Skip autosave if update comes from loading
    if (origin === 'load') return;

    this.autosaveManager.pendingChanges = true;
    this.scheduleAutosave();
    this.checkForCheckpoint();
  }

  private handleProviderStatus(event: { status: string }) {
    console.log('Yjs provider status:', event.status);
    
    if (event.status === 'connected') {
      console.log('Yjs provider connected');
    } else if (event.status === 'disconnected') {
      console.log('Yjs provider disconnected, will attempt reconnection');
    }
  }

  private handleConnectionError(error: any) {
    console.error('Yjs connection error:', error);
  }

  private scheduleAutosave() {
    if (this.autosaveManager.saveTimeout) {
      clearTimeout(this.autosaveManager.saveTimeout);
    }

    this.autosaveManager.saveTimeout = setTimeout(() => {
      this.performAutosave();
    }, this.saveInterval);
  }

  private async performAutosave() {
    if (!this.autosaveManager.pendingChanges) return;

    try {
      const content = this.getContentAsHTML();
      await this.onSave(content);
      
      this.autosaveManager.lastSave = new Date();
      this.autosaveManager.pendingChanges = false;
      
      console.log('Autosave completed');
    } catch (error) {
      console.error('Autosave failed:', error);
      // Retry autosave after a delay
      setTimeout(() => this.scheduleAutosave(), 5000);
    }
  }

  private checkForCheckpoint() {
    const now = Date.now();
    const timeSinceLastCheckpoint = now - this.lastCheckpoint;
    
    if (
      timeSinceLastCheckpoint >= this.checkpointInterval ||
      this.operationsCount >= this.maxOperationsBeforeCheckpoint
    ) {
      this.createCheckpoint();
    }
  }

  private async createCheckpoint() {
    try {
      const snapshot = Y.encodeStateAsUpdate(this.ydoc);
      
      // Convert to base64 for storage
      const snapshotBase64 = btoa(String.fromCharCode(...Array.from(snapshot)));
      
      // Store checkpoint in Supabase using the function we created
      const { data, error } = await supabase.rpc('create_yjs_snapshot', {
        _document_id: this.currentDocumentId,
        _block_id: this.currentBlockId,
        _snapshot_data: snapshotBase64,
        _version: this.operationsCount,
        _operations_count: this.operationsCount,
        _description: `Checkpoint at ${new Date().toISOString()}`
      });

      if (error) {
        console.error('Failed to create checkpoint:', error);
      } else {
        console.log('Checkpoint created successfully:', data);
      }
      
      this.lastCheckpoint = Date.now();
      this.operationsCount = 0;
      
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
    }
  }

  public getContentAsHTML(): string {
    const ytext = this.ydoc.getText('quill');
    return ytext.toString();
  }

  public setInitialContent(content: string) {
    const ytext = this.ydoc.getText('quill');
    ytext.insert(0, content);
  }

  public getYDoc(): Y.Doc {
    return this.ydoc;
  }

  public getProvider(): WebsocketProvider | null {
    return this.provider;
  }

  public getSaveStatus(): 'saving' | 'saved' | 'error' {
    if (this.autosaveManager.pendingChanges) {
      return 'saving';
    }
    return 'saved';
  }

  public async forceSave(): Promise<void> {
    if (this.autosaveManager.saveTimeout) {
      clearTimeout(this.autosaveManager.saveTimeout);
    }
    await this.performAutosave();
  }

  public destroy() {
    if (this.autosaveManager.saveTimeout) {
      clearTimeout(this.autosaveManager.saveTimeout);
    }
    
    if (this.provider) {
      this.provider.destroy();
    }
    
    this.ydoc.destroy();
  }
}

export const createUserAwareness = (user: any) => {
  return {
    name: user.nome || user.email || 'Anonymous',
    avatar: user.avatar_url || null,
    color: generateUserColor(user.id || user.user_id),
    cursor: null,
    isTyping: false
  };
};

export const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
};