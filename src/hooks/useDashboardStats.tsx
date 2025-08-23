import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  colaboradoresAtivos: number;
  clientesAtivos: number;
  treinamentosConcluidos: number;
  taxaProgresso: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    colaboradoresAtivos: 0,
    clientesAtivos: 0,
    treinamentosConcluidos: 0,
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

        // Buscar progresso total de treinamentos
        const { data: progressoData } = await supabase
          .from('progresso_aulas')
          .select('concluido');

        const treinamentosConcluidos = progressoData?.filter(p => p.concluido).length || 0;
        const totalProgresso = progressoData?.length || 1;
        const taxaProgresso = Math.round((treinamentosConcluidos / totalProgresso) * 100);

        setStats({
          colaboradoresAtivos: colaboradores || 0,
          clientesAtivos: clientes || 0,
          treinamentosConcluidos,
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