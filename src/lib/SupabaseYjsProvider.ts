import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SupabaseYjsProviderConfig {
  tableName: string;
  documentIdColumn: string;
  channelPrefix: string;
}

const DEFAULT_CONFIG: SupabaseYjsProviderConfig = {
  tableName: 'pauta_colaboracao',
  documentIdColumn: 'pauta_id',
  channelPrefix: 'yjs:pauta',
};

export class SupabaseYjsProvider {
  private ydoc: Y.Doc;
  private channel: RealtimeChannel;
  private documentId: string;
  private config: SupabaseYjsProviderConfig;
  public awareness: Awareness;
  private isConnected: boolean = false;
  private updateHandler: (update: Uint8Array, origin: any) => void;
  private awarenessUpdateHandler: (changes: { added: number[]; updated: number[]; removed: number[] }, origin: any) => void;
  private saveTimeout?: NodeJS.Timeout;
  private onSyncedCallback?: () => void;
  public synced: boolean = false;

  constructor(
    documentId: string,
    ydoc: Y.Doc,
    awareness?: Awareness | null,
    config?: SupabaseYjsProviderConfig,
    onSynced?: () => void
  ) {
    this.documentId = documentId;
    this.ydoc = ydoc;
    this.config = config || DEFAULT_CONFIG;
    this.awareness = awareness || new Awareness(ydoc);

    // Create Supabase channel
    this.channel = supabase.channel(`${this.config.channelPrefix}:${documentId}`, {
      config: { broadcast: { self: false } }
    });

    // Handler para mudancas locais do Yjs
    this.updateHandler = (update: Uint8Array, origin: any) => {
      // Nao enviar se foi originado de outro usuario
      if (origin !== this) {
        this.broadcastUpdate(update);
      }
    };

    // Handler para mudancas de awareness (cursores, typing, etc)
    this.awarenessUpdateHandler = (changes: { added: number[]; updated: number[]; removed: number[] }, origin: any) => {
      if (origin === 'remote') return;
      const changedClients = changes.added.concat(changes.updated).concat(changes.removed);
      if (changedClients.length === 0) return;

      const update = encodeAwarenessUpdate(this.awareness, changedClients);
      this.broadcastAwareness(update);
    };

    this.onSyncedCallback = onSynced;
    this.setupChannel();
    this.loadInitialState();
  }

  private setupChannel() {
    // Receber atualizacoes de outros usuarios
    this.channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        const update = new Uint8Array(payload.update);
        Y.applyUpdate(this.ydoc, update, this);
      })
      .on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
        const update = new Uint8Array(payload.update);
        applyAwarenessUpdate(this.awareness, update, 'remote');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.ydoc.on('update', this.updateHandler);
          this.awareness.on('update', this.awarenessUpdateHandler);

          // Enviar awareness inicial para que outros saibam que estamos online
          const update = encodeAwarenessUpdate(this.awareness, [this.ydoc.clientID]);
          this.broadcastAwareness(update);
        }
      });
  }

  private async loadInitialState() {
    try {
      // Use type assertion to work with dynamic table names
      const result = await supabase
        .from(this.config.tableName as 'pauta_colaboracao')
        .select('conteudo_yjs, versao')
        .eq(this.config.documentIdColumn as 'pauta_id', this.documentId)
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const data = result.data as { conteudo_yjs: string | null; versao: number | null } | null;

      if (data && data.conteudo_yjs) {
        const base64String = data.conteudo_yjs as string;
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        Y.applyUpdate(this.ydoc, bytes, this);
      } else if (!data) {
        // Primeira vez: criar registro vazio
        await this.saveState();
      }

      this.synced = true;
      this.onSyncedCallback?.();
    } catch (error) {
      console.error('Erro ao carregar estado inicial:', error);
      // Mesmo com erro, marcar como synced para nao travar a UI
      this.synced = true;
      this.onSyncedCallback?.();
    }
  }

  private broadcastUpdate(update: Uint8Array) {
    if (!this.isConnected) return;

    this.channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { update: Array.from(update) }
    });

    // Debounce para salvar no DB (a cada 5 segundos)
    this.debouncedSave();
  }

  private broadcastAwareness(update: Uint8Array) {
    if (!this.isConnected) return;

    this.channel.send({
      type: 'broadcast',
      event: 'awareness-update',
      payload: { update: Array.from(update) }
    });
  }

  private debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 5000);
  }

  private async saveState() {
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc);
      const jsonState = this.ydoc.toJSON();

      // Converter Uint8Array para base64 string
      // Usar chunks para evitar stack overflow em documentos grandes
      let base64String = '';
      const chunkSize = 8192;
      for (let i = 0; i < state.length; i += chunkSize) {
        const chunk = state.subarray(i, i + chunkSize);
        base64String += String.fromCharCode(...chunk);
      }
      base64String = btoa(base64String);

      // Use type assertion for dynamic table operations
      await (supabase
        .from(this.config.tableName as 'pauta_colaboracao')
        .upsert({
          [this.config.documentIdColumn]: this.documentId,
          conteudo_yjs: base64String,
          conteudo_json: jsonState,
          atualizado_em: new Date().toISOString()
        } as any, {
          onConflict: this.config.documentIdColumn
        }));
    } catch (error) {
      console.error('Erro ao salvar estado Yjs:', error);
    }
  }

  // Snapshot manual
  async createSnapshot(descricao?: string) {
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc);
      let base64String = '';
      const chunkSize = 8192;
      for (let i = 0; i < state.length; i += chunkSize) {
        const chunk = state.subarray(i, i + chunkSize);
        base64String += String.fromCharCode(...chunk);
      }
      base64String = btoa(base64String);

      const { error } = await supabase
        .from('yjs_snapshots')
        .insert({
          document_id: this.documentId,
          block_id: 'full-document',
          snapshot_data: base64String,
          description: descricao || 'Snapshot manual',
          version: Date.now()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao criar snapshot:', error);
      return false;
    }
  }

  // Restaurar snapshot
  async restoreSnapshot(snapshotId: string) {
    try {
      const { data, error } = await supabase
        .from('yjs_snapshots')
        .select('snapshot_data')
        .eq('id', snapshotId)
        .single();

      if (error || !data) throw error;

      const base64String = data.snapshot_data as string;
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const newDoc = new Y.Doc();
      Y.applyUpdate(newDoc, bytes);

      await this.saveState();

      return true;
    } catch (error) {
      console.error('Erro ao restaurar snapshot:', error);
      return false;
    }
  }

  // Forcar salvamento imediato
  async forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    await this.saveState();
  }

  destroy() {
    // Salvar antes de destruir
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveState();
    }

    // Remover awareness local antes de desconectar
    removeAwarenessStates(this.awareness, [this.ydoc.clientID], 'local');

    this.ydoc.off('update', this.updateHandler);
    this.awareness.off('update', this.awarenessUpdateHandler);
    this.channel.unsubscribe();
    supabase.removeChannel(this.channel);
  }
}
