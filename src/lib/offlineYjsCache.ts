import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export class OfflineYjsCache {
  private persistence: IndexeddbPersistence | null = null;

  constructor(pautaId: string, ydoc: Y.Doc) {
    try {
      // Persiste no IndexedDB do navegador
      this.persistence = new IndexeddbPersistence(`pauta-${pautaId}`, ydoc);
      
      this.persistence.on('synced', () => {
        console.log('📦 Cache offline sincronizado');
      });
    } catch (error) {
      console.error('Erro ao inicializar cache offline:', error);
    }
  }

  destroy() {
    this.persistence?.destroy();
  }
}
