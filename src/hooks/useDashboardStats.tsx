import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  colaboradoresAtivos: number;
  clientesAtivos: number;
  pdisFinalizados: number;
  taxaProgresso: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    colaboradoresAtivos: 0,
    clientesAtivos: 0,
    pdisFinalizados: 0,
    taxaProgresso: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Buscar colaboradores ativos
        const { count: colaboradores } = await supabase
          .from('colaboradores')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true);

        // Buscar clientes ativos
        const { count: clientes } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true);

        // Buscar PDIs concluídos do usuário atual
        const { count: pdisFinalizados } = await supabase
          .from('pdis')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'concluido')
          .eq('colaborador_id', (await supabase.from('colaboradores').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single()).data?.id);

        // Buscar progresso total de aulas do usuário
        const { data: progressoData } = await supabase
          .from('progresso_aulas')
          .select('concluido')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        const aulasCompletas = progressoData?.filter(p => p.concluido).length || 0;
        const totalAulas = progressoData?.length || 1;
        const taxaProgresso = Math.round((aulasCompletas / totalAulas) * 100);

        setStats({
          colaboradoresAtivos: colaboradores || 0,
          clientesAtivos: clientes || 0,
          pdisFinalizados: pdisFinalizados || 0,
          taxaProgresso,
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return { stats, loading };
};