import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ArquivoVersion {
  id: string;
  arquivo_id: string;
  versao: number;
  autor: string;
  autor_nome: string;
  data_hora: string;
  conteudo: any;
  tipo: 'criacao' | 'autosave' | 'manual' | 'restaurada';
  observacoes: string | null;
}

export const useArquivoVersioning = (arquivoId: string, userId: string, userName: string) => {
  const [versions, setVersions] = useState<ArquivoVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentHashRef = useRef<string>('');

  // Função para criar hash simples do conteúdo
  const hashContent = useCallback((content: any): string => {
    return JSON.stringify(content);
  }, []);

  // Criar nova versão
  const createVersion = useCallback(async (
    content: any,
    tipo: ArquivoVersion['tipo'],
    observacoes?: string
  ): Promise<boolean> => {
    try {
      const contentHash = hashContent(content);
      
      // Para autosave, evitar duplicatas
      if (tipo === 'autosave' && contentHash === lastContentHashRef.current) {
        return false;
      }

      // Buscar próximo número de versão
      const { data: lastVersion } = await supabase
        .from('arquivo_reuniao_historico')
        .select('versao')
        .eq('arquivo_id', arquivoId)
        .order('versao', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (lastVersion?.versao || 0) + 1;

      // Criar nova versão
      const { error } = await supabase
        .from('arquivo_reuniao_historico')
        .insert({
          arquivo_id: arquivoId,
          versao: nextVersion,
          autor: userId,
          autor_nome: userName,
          conteudo: content,
          tipo,
          observacoes
        });

      if (error) throw error;

      lastContentHashRef.current = contentHash;

      return true;
    } catch (error) {
      console.error('Erro ao criar versão:', error);
      toast.error('Erro ao salvar versão');
      return false;
    }
  }, [arquivoId, userId, userName, hashContent]);

  // Agendar autosave
  const scheduleAutosave = useCallback((content: any) => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      createVersion(content, 'autosave');
    }, 5 * 60 * 1000); // 5 minutos
  }, [createVersion]);

  // Salvar versão manual
  const saveManualVersion = useCallback(async (
    content: any,
    observacoes?: string
  ): Promise<boolean> => {
    // Cancelar autosave pendente
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    const success = await createVersion(content, 'manual', observacoes);
    
    if (success) {
      toast.success('Versão salva com sucesso!');
    }
    
    return success;
  }, [createVersion]);

  // Carregar histórico de versões
  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('arquivo_reuniao_historico')
        .select('*')
        .eq('arquivo_id', arquivoId)
        .order('versao', { ascending: false });

      if (error) throw error;

      setVersions((data || []) as ArquivoVersion[]);
    } catch (error) {
      console.error('Erro ao carregar versões:', error);
      toast.error('Erro ao carregar histórico de versões');
    } finally {
      setLoading(false);
    }
  }, [arquivoId]);

  // Restaurar versão anterior
  const restoreVersion = useCallback(async (
    version: ArquivoVersion,
    currentContent: any
  ): Promise<any | null> => {
    try {
      // Criar backup da versão atual
      await createVersion(
        currentContent,
        'manual',
        `Backup antes de restaurar versão ${version.versao}`
      );

      // Criar entrada de restauração
      await createVersion(
        version.conteudo,
        'restaurada',
        `Restaurada da versão ${version.versao}`
      );

      toast.success(`Versão ${version.versao} restaurada com sucesso!`);
      
      return version.conteudo;
    } catch (error) {
      console.error('Erro ao restaurar versão:', error);
      toast.error('Erro ao restaurar versão');
      return null;
    }
  }, [createVersion]);

  // Limpar timeout ao desmontar
  const cleanup = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
  }, []);

  return {
    versions,
    loading,
    createVersion,
    scheduleAutosave,
    saveManualVersion,
    loadVersions,
    restoreVersion,
    cleanup
  };
};
