import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  TesteLaboratorio,
  TesteFormData,
  TesteFilters,
  TesteEvidencia,
  TesteComentario,
  TesteAuditLog,
  TesteTemplate,
} from '@/types/laboratorio-testes';

export const useLaboratorioTestes = (
  filters: TesteFilters,
  currentUserId?: string,
  currentColaboradorId?: string,
) => {
  const [testes, setTestes] = useState<TesteLaboratorio[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTestes = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('testes_laboratorio')
        .select(`
          *,
          cliente:clientes!cliente_id(id, nome),
          gestor:gestor_responsavel_id(id, user_id, nome, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Archive filter
      if (!filters.show_archived) {
        query = query.eq('arquivado', false);
      }

      // Filters
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }
      if (filters.funil) {
        query = query.eq('funil', filters.funil);
      }
      if (filters.gestor_id) {
        query = query.eq('gestor_responsavel_id', filters.gestor_id);
      }
      if (filters.tipo_teste) {
        query = query.eq('tipo_teste', filters.tipo_teste);
      }
      if (filters.canal) {
        query = query.eq('canal', filters.canal);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.validacao) {
        query = query.eq('validacao', filters.validacao);
      }
      if (filters.data_inicio) {
        query = query.gte('created_at', filters.data_inicio);
      }
      if (filters.data_fim) {
        query = query.lte('created_at', filters.data_fim + 'T23:59:59');
      }

      // Quick filters
      if (filters.quick_filter === 'meus' && currentColaboradorId) {
        query = query.eq('gestor_responsavel_id', currentColaboradorId);
      }
      if (filters.quick_filter === 'vencedores') {
        query = query.eq('validacao', 'deu_bom');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side search filter
      let results = (data || []) as TesteLaboratorio[];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(t =>
          t.nome.toLowerCase().includes(searchLower) ||
          t.hipotese?.toLowerCase().includes(searchLower) ||
          t.cliente?.nome?.toLowerCase().includes(searchLower) ||
          t.funil?.toLowerCase().includes(searchLower)
        );
      }

      setTestes(results);
    } catch (error: any) {
      console.error('Erro ao buscar testes:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar testes: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, currentUserId, currentColaboradorId, toast]);

  useEffect(() => {
    fetchTestes();
  }, [fetchTestes]);

  const createTeste = async (formData: TesteFormData): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const insertData = {
        cliente_id: formData.cliente_id || null,
        funil: formData.funil || null,
        nome: formData.nome,
        gestor_responsavel_id: formData.gestor_responsavel_id || null,
        tipo_teste: formData.tipo_teste,
        canal: formData.canal,
        status: formData.status,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        validacao: 'em_teste' as const,
        metrica_principal: formData.metrica_principal || null,
        meta_metrica: formData.meta_metrica ? parseFloat(formData.meta_metrica) : null,
        resultado_observado: formData.resultado_observado ? parseFloat(formData.resultado_observado) : null,
        hipotese: formData.hipotese || null,
        o_que_foi_alterado: formData.o_que_foi_alterado || null,
        observacao_equipe: formData.observacao_equipe || null,
        anotacoes: formData.anotacoes || null,
        aprendizados: formData.aprendizados || null,
        proximos_testes_sugeridos: formData.proximos_testes_sugeridos || null,
        link_anuncio: formData.link_anuncio || null,
        link_campanha: formData.link_campanha || null,
        link_experimento: formData.link_experimento || null,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('testes_laboratorio')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      // Log creation
      await supabase.from('testes_laboratorio_audit_log').insert({
        teste_id: data.id,
        acao: 'criado',
        user_id: user.id,
      });

      toast({ title: 'Teste criado com sucesso!' });
      await fetchTestes();
      return data.id;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar teste: ' + error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTeste = async (id: string, formData: Partial<TesteFormData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const updateData: any = {};
      if (formData.nome !== undefined) updateData.nome = formData.nome;
      if (formData.cliente_id !== undefined) updateData.cliente_id = formData.cliente_id || null;
      if (formData.funil !== undefined) updateData.funil = formData.funil || null;
      if (formData.gestor_responsavel_id !== undefined) updateData.gestor_responsavel_id = formData.gestor_responsavel_id || null;
      if (formData.tipo_teste !== undefined) updateData.tipo_teste = formData.tipo_teste;
      if (formData.canal !== undefined) updateData.canal = formData.canal;
      if (formData.status !== undefined) updateData.status = formData.status;
      if (formData.data_inicio !== undefined) updateData.data_inicio = formData.data_inicio || null;
      if (formData.data_fim !== undefined) updateData.data_fim = formData.data_fim || null;
      if (formData.metrica_principal !== undefined) updateData.metrica_principal = formData.metrica_principal || null;
      if (formData.meta_metrica !== undefined) updateData.meta_metrica = formData.meta_metrica ? parseFloat(formData.meta_metrica) : null;
      if (formData.resultado_observado !== undefined) updateData.resultado_observado = formData.resultado_observado ? parseFloat(formData.resultado_observado) : null;
      if (formData.hipotese !== undefined) updateData.hipotese = formData.hipotese || null;
      if (formData.o_que_foi_alterado !== undefined) updateData.o_que_foi_alterado = formData.o_que_foi_alterado || null;
      if (formData.observacao_equipe !== undefined) updateData.observacao_equipe = formData.observacao_equipe || null;
      if (formData.anotacoes !== undefined) updateData.anotacoes = formData.anotacoes || null;
      if (formData.aprendizados !== undefined) updateData.aprendizados = formData.aprendizados || null;
      if (formData.proximos_testes_sugeridos !== undefined) updateData.proximos_testes_sugeridos = formData.proximos_testes_sugeridos || null;
      if (formData.link_anuncio !== undefined) updateData.link_anuncio = formData.link_anuncio || null;
      if (formData.link_campanha !== undefined) updateData.link_campanha = formData.link_campanha || null;
      if (formData.link_experimento !== undefined) updateData.link_experimento = formData.link_experimento || null;

      const { error } = await supabase
        .from('testes_laboratorio')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Log edit
      await supabase.from('testes_laboratorio_audit_log').insert({
        teste_id: id,
        acao: 'editado',
        user_id: user.id,
      });

      toast({ title: 'Teste atualizado com sucesso!' });
      await fetchTestes();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar teste: ' + error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const archiveTeste = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('testes_laboratorio')
        .update({ arquivado: true })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('testes_laboratorio_audit_log').insert({
        teste_id: id,
        acao: 'arquivado',
        user_id: user.id,
      });

      toast({ title: 'Teste arquivado com sucesso!' });
      await fetchTestes();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao arquivar teste: ' + error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const duplicateTeste = async (teste: TesteLaboratorio): Promise<string | null> => {
    const formData: TesteFormData = {
      cliente_id: teste.cliente_id || '',
      funil: teste.funil || '',
      nome: `${teste.nome} (cópia)`,
      gestor_responsavel_id: teste.gestor_responsavel_id,
      tipo_teste: teste.tipo_teste,
      canal: teste.canal,
      status: 'planejado',
      data_inicio: '',
      data_fim: '',
      metrica_principal: teste.metrica_principal || '',
      meta_metrica: teste.meta_metrica?.toString() || '',
      resultado_observado: '',
      hipotese: teste.hipotese || '',
      o_que_foi_alterado: teste.o_que_foi_alterado || '',
      observacao_equipe: '',
      anotacoes: '',
      aprendizados: '',
      proximos_testes_sugeridos: '',
      link_anuncio: '',
      link_campanha: '',
      link_experimento: '',
    };
    return createTeste(formData);
  };

  return {
    testes,
    loading,
    refetch: fetchTestes,
    createTeste,
    updateTeste,
    archiveTeste,
    duplicateTeste,
  };
};

// Separate hooks for detail-page data
export const useTesteEvidencias = (testeId: string) => {
  const [evidencias, setEvidencias] = useState<TesteEvidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!testeId) return;
    try {
      const { data, error } = await supabase
        .from('testes_laboratorio_evidencias')
        .select('*')
        .eq('teste_id', testeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvidencias((data || []) as TesteEvidencia[]);
    } catch (error: any) {
      console.error('Erro ao buscar evidências:', error);
    } finally {
      setLoading(false);
    }
  }, [testeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addEvidencia = async (tipo: 'imagem' | 'link', url: string, descricao?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('testes_laboratorio_evidencias')
        .insert({
          teste_id: testeId,
          tipo,
          url,
          descricao: descricao || null,
          uploaded_by: user.id,
        });

      if (error) throw error;
      toast({ title: 'Evidência adicionada!' });
      await fetch();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar evidência: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const removeEvidencia = async (evidenciaId: string) => {
    try {
      const { error } = await supabase
        .from('testes_laboratorio_evidencias')
        .delete()
        .eq('id', evidenciaId);

      if (error) throw error;
      toast({ title: 'Evidência removida!' });
      await fetch();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover evidência: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  return { evidencias, loading, refetch: fetch, addEvidencia, removeEvidencia };
};

export const useTesteComentarios = (testeId: string) => {
  const [comentarios, setComentarios] = useState<TesteComentario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!testeId) return;
    try {
      const { data, error } = await supabase
        .from('testes_laboratorio_comentarios')
        .select('*')
        .eq('teste_id', testeId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author names separately (no FK for join)
      const rows = data || [];
      if (rows.length > 0) {
        const userIds = [...new Set(rows.map((c: any) => c.autor_user_id))];
        const { data: autores } = await supabase
          .from('colaboradores')
          .select('user_id, nome, avatar_url')
          .in('user_id', userIds);

        const autoresMap = new Map((autores || []).map((a: any) => [a.user_id, a]));
        const withAuthors = rows.map((c: any) => ({
          ...c,
          autor: autoresMap.get(c.autor_user_id) || undefined,
        }));
        setComentarios(withAuthors as TesteComentario[]);
      } else {
        setComentarios([]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar comentários:', error);
    } finally {
      setLoading(false);
    }
  }, [testeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addComentario = async (comentario: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('testes_laboratorio_comentarios')
        .insert({
          teste_id: testeId,
          autor_user_id: user.id,
          comentario,
        });

      if (error) throw error;

      await supabase.from('testes_laboratorio_audit_log').insert({
        teste_id: testeId,
        acao: 'comentario_adicionado',
        user_id: user.id,
      });

      await fetch();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar comentário: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  return { comentarios, loading, refetch: fetch, addComentario };
};

export const useTesteAuditLog = (testeId: string) => {
  const [logs, setLogs] = useState<TesteAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!testeId) return;
    try {
      const { data, error } = await supabase
        .from('testes_laboratorio_audit_log')
        .select('*')
        .eq('teste_id', testeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names separately (no FK for join)
      const rows = data || [];
      if (rows.length > 0) {
        const userIds = [...new Set(rows.map((l: any) => l.user_id))];
        const { data: usuarios } = await supabase
          .from('colaboradores')
          .select('user_id, nome')
          .in('user_id', userIds);

        const usuariosMap = new Map((usuarios || []).map((u: any) => [u.user_id, u]));
        const withUsers = rows.map((l: any) => ({
          ...l,
          usuario: usuariosMap.get(l.user_id) || undefined,
        }));
        setLogs(withUsers as TesteAuditLog[]);
      } else {
        setLogs([]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar audit log:', error);
    } finally {
      setLoading(false);
    }
  }, [testeId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, loading, refetch: fetch };
};

export const useTesteTemplates = () => {
  const [templates, setTemplates] = useState<TesteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('testes_laboratorio_templates')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setTemplates((data || []) as TesteTemplate[]);
    } catch (error: any) {
      console.error('Erro ao buscar templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createTemplate = async (template: Omit<TesteTemplate, 'id' | 'created_at' | 'updated_at' | 'ativo' | 'created_by'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('testes_laboratorio_templates')
        .insert({
          ...template,
          created_by: user.id,
        });

      if (error) throw error;
      toast({ title: 'Template criado com sucesso!' });
      await fetch();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar template: ' + error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<TesteTemplate>) => {
    try {
      const { error } = await supabase
        .from('testes_laboratorio_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Template atualizado!' });
      await fetch();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar template: ' + error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return { templates, loading, refetch: fetch, createTemplate, updateTemplate };
};
