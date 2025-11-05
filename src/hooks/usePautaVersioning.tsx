import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PautaVersion {
  id: string;
  pauta_id: string;
  versao: number;
  autor: string;
  autor_nome: string;
  data_hora: string;
  conteudo: any;
  tipo: 'criacao' | 'autosave' | 'manual' | 'restaurada';
  observacoes: string | null;
}

export function usePautaVersioning(pautaId: string | null, userId: string | null, userName: string) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<PautaVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastContentHashRef = useRef<string>('');

  // Gerar hash simples do conteúdo
  const generateHash = (content: any) => {
    return JSON.stringify(content);
  };

  // Buscar próximo número de versão
  const getNextVersion = async (): Promise<number> => {
    if (!pautaId) return 1;

    const { data, error } = await supabase
      .from('pauta_historico')
      .select('versao')
      .eq('pauta_id', pautaId)
      .order('versao', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting next version:', error);
      return 1;
    }

    return (data?.versao || 0) + 1;
  };

  // Criar nova versão
  const createVersion = async (
    content: any,
    tipo: PautaVersion['tipo'],
    observacoes?: string
  ): Promise<boolean> => {
    if (!pautaId || !userId) return false;

    try {
      const contentHash = generateHash(content);
      
      // Não criar versão se conteúdo não mudou
      if (tipo === 'autosave' && contentHash === lastContentHashRef.current) {
        return false;
      }

      const nextVersion = await getNextVersion();

      const { error } = await supabase
        .from('pauta_historico')
        .insert({
          pauta_id: pautaId,
          versao: nextVersion,
          autor: userId,
          autor_nome: userName,
          conteudo: content,
          tipo,
          observacoes
        });

      if (error) throw error;

      // Atualizar versão atual na pauta
      await supabase
        .from('reunioes_documentos')
        .update({ versao_atual: nextVersion })
        .eq('id', pautaId);

      lastContentHashRef.current = contentHash;
      
      if (tipo === 'manual') {
        toast({
          title: "✅ Versão salva",
          description: `Versão ${nextVersion} salva com sucesso`,
          duration: 2000
        });
      }

      return true;
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "Erro ao salvar versão",
        description: "Não foi possível criar a versão",
        variant: "destructive"
      });
      return false;
    }
  };

  // Autosave (a cada 3 minutos)
  const scheduleAutosave = useCallback((content: any) => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      createVersion(content, 'autosave');
    }, 3 * 60 * 1000); // 3 minutos
  }, [pautaId, userId, userName]);

  // Salvamento manual
  const saveManualVersion = async (content: any, observacoes?: string) => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    return await createVersion(content, 'manual', observacoes);
  };

  // Buscar histórico de versões
  const loadVersions = async () => {
    if (!pautaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pauta_historico')
        .select('*')
        .eq('pauta_id', pautaId)
        .order('versao', { ascending: false });

      if (error) throw error;

      setVersions((data as PautaVersion[]) || []);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar as versões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Restaurar versão
  const restoreVersion = async (version: PautaVersion, currentContent: any): Promise<any | null> => {
    if (!pautaId || !userId) return null;

    try {
      // Criar versão de backup antes de restaurar
      await createVersion(currentContent, 'manual', `Backup antes de restaurar versão ${version.versao}`);

      // Criar nova versão restaurada
      await createVersion(version.conteudo, 'restaurada', `Restaurada da versão ${version.versao}`);

      toast({
        title: "✅ Versão restaurada",
        description: `Versão ${version.versao} restaurada com sucesso`,
        duration: 3000
      });

      return version.conteudo;
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: "Erro ao restaurar versão",
        description: "Não foi possível restaurar a versão",
        variant: "destructive"
      });
      return null;
    }
  };

  // Cleanup
  const cleanup = () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
  };

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
}
