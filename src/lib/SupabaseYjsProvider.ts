import * as Y from 'yjs';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class SupabaseYjsProvider {
  private ydoc: Y.Doc;
  private channel: RealtimeChannel;
  private pautaId: string;
  private awareness: any;
  private isConnected: boolean = false;
  private updateHandler: (update: Uint8Array, origin: any) => void;
  private saveTimeout?: NodeJS.Timeout;

  constructor(pautaId: string, ydoc: Y.Doc, awareness?: any) {
    this.pautaId = pautaId;
    this.ydoc = ydoc;
    this.awareness = awareness;

    // Create Supabase channel
    this.channel = supabase.channel(`yjs:pauta:${pautaId}`, {
      config: { broadcast: { self: false } }
    });

    // Handler para mudanças locais do Yjs
    this.updateHandler = (update: Uint8Array, origin: any) => {
      // Não enviar se foi originado de outro usuário
      if (origin !== this) {
        this.broadcastUpdate(update);
      }
    };

    this.setupChannel();
    this.loadInitialState();
  }

  private setupChannel() {
    // Receber atualizações de outros usuários
    this.channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        const update = new Uint8Array(payload.update);
        Y.applyUpdate(this.ydoc, update, this);
      })
      .on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
        if (this.awareness) {
          // Aplicar awareness de outros usuários
          this.awareness.setLocalState(payload.state);
        }
      })
      .subscribe((status) => {
        console.log('Yjs channel status:', status);
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.ydoc.on('update', this.updateHandler);
        }
      });
  }

  private async loadInitialState() {
    try {
      // Buscar último estado do Yjs no Supabase
      const { data, error } = await supabase
        .from('pauta_colaboracao')
        .select('conteudo_yjs, versao')
        .eq('pauta_id', this.pautaId)
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.conteudo_yjs) {
        // Aplicar estado inicial
        // O conteudo_yjs é armazenado como string base64 no Supabase
        const base64String = data.conteudo_yjs as string;
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        Y.applyUpdate(this.ydoc, bytes, this);
        console.log('Estado inicial Yjs carregado:', data.versao);
      } else {
        // Primeira vez: criar registro vazio
        await this.saveState();
      }
    } catch (error) {
      console.error('Erro ao carregar estado inicial:', error);
    }
  }

  private broadcastUpdate(update: Uint8Array) {
    if (!this.isConnected) return;

    // Enviar update via broadcast
    this.channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { update: Array.from(update) }
    });

    // Debounce para salvar no DB (a cada 5 segundos)
    this.debouncedSave();
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
      const base64String = btoa(String.fromCharCode(...state));

      await supabase
        .from('pauta_colaboracao')
        .upsert({
          pauta_id: this.pautaId,
          conteudo_yjs: base64String,
          conteudo_json: jsonState,
          atualizado_em: new Date().toISOString()
        }, {
          onConflict: 'pauta_id'
        });

      console.log('Estado Yjs salvo no Supabase');
    } catch (error) {
      console.error('Erro ao salvar estado Yjs:', error);
    }
  }

  // Snapshot manual
  async createSnapshot(descricao?: string) {
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc);
      const base64String = btoa(String.fromCharCode(...state));
      
      const { error } = await supabase
        .from('yjs_snapshots')
        .insert({
          document_id: this.pautaId,
          block_id: 'full-document',
          snapshot_data: base64String,
          description: descricao || 'Snapshot manual',
          version: Date.now()
        });

      if (error) throw error;
      console.log('Snapshot criado com sucesso');
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

      // Converter base64 de volta para Uint8Array
      const base64String = data.snapshot_data as string;
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Limpar documento atual
      const newDoc = new Y.Doc();
      
      // Aplicar snapshot
      Y.applyUpdate(newDoc, bytes);
      
      // Salvar novo estado
      await this.saveState();
      
      console.log('Snapshot restaurado');
      return true;
    } catch (error) {
      console.error('Erro ao restaurar snapshot:', error);
      return false;
    }
  }

  destroy() {
    // Salvar antes de destruir
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveState();
    }

    this.ydoc.off('update', this.updateHandler);
    this.channel.unsubscribe();
    supabase.removeChannel(this.channel);
  }
}
