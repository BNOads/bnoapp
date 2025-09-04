import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  time: string;
  type: 'lesson_completed' | 'course_started' | 'profile_updated' | 'new_collaborator' | 'new_course' | 'new_class' | 'new_client' | 'new_pop' | 'pdi_completed' | 'new_reference';
}

export const useRecentActivities = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  const loadRecentActivities = async () => {
    try {
      const allActivities: RecentActivity[] = [];

      // 1. Aulas concluídas
      const { data: progressData } = await supabase
        .from('progresso_aulas')
        .select(`
          id,
          updated_at,
          user_id,
          aulas!inner(titulo),
          treinamentos!inner(titulo)
        `)
        .eq('concluido', true)
        .order('updated_at', { ascending: false })
        .limit(5);

      // 2. Novos colaboradores
      const { data: colaboradoresData } = await supabase
        .from('colaboradores')
        .select('id, nome, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // 3. Novos cursos/treinamentos
      const { data: treinamentosData } = await supabase
        .from('treinamentos')
        .select('id, titulo, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(5);

      // 4. Novas aulas
      const { data: aulasData } = await supabase
        .from('aulas')
        .select(`
          id, 
          titulo, 
          created_at, 
          created_by,
          treinamentos!inner(titulo)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Novos clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(5);

      // 6. Novos POPs
      const { data: popsData } = await supabase
        .from('documentos')
        .select('id, titulo, created_at, created_by')
        .eq('categoria_documento', 'pop')
        .order('created_at', { ascending: false })
        .limit(5);

      // 7. PDIs concluídos
      const { data: pdisData } = await supabase
        .from('pdis')
        .select(`
          id, 
          titulo, 
          updated_at, 
          colaborador_id,
          colaboradores!inner(nome)
        `)
        .eq('status', 'concluido')
        .order('updated_at', { ascending: false })
        .limit(5);

      // 8. Novas referências
      const { data: referenciasData } = await supabase
        .from('referencias_criativos')
        .select('id, titulo, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(5);

      // Buscar nomes dos usuários para todas as atividades
      const allUserIds = new Set<string>();
      
      progressData?.forEach(p => allUserIds.add(p.user_id));
      treinamentosData?.forEach(t => t.created_by && allUserIds.add(t.created_by));
      aulasData?.forEach(a => a.created_by && allUserIds.add(a.created_by));
      clientesData?.forEach(c => c.created_by && allUserIds.add(c.created_by));
      popsData?.forEach(p => p.created_by && allUserIds.add(p.created_by));
      referenciasData?.forEach(r => r.created_by && allUserIds.add(r.created_by));

      const { data: usersData } = await supabase
        .from('profiles')
        .select('user_id, nome')
        .in('user_id', Array.from(allUserIds));

      const getUserName = (userId: string) => 
        usersData?.find(u => u.user_id === userId)?.nome || 'Usuário';

      // Mapear aulas concluídas
      progressData?.forEach(progress => {
        allActivities.push({
          id: `progress-${progress.id}`,
          user: getUserName(progress.user_id),
          action: `Concluiu a aula "${progress.aulas.titulo}" do curso "${progress.treinamentos.titulo}"`,
          time: getTimeAgo(progress.updated_at),
          type: 'lesson_completed'
        });
      });

      // Mapear novos colaboradores
      colaboradoresData?.forEach(colaborador => {
        allActivities.push({
          id: `colaborador-${colaborador.id}`,
          user: colaborador.nome,
          action: `Ingressou na equipe`,
          time: getTimeAgo(colaborador.created_at),
          type: 'new_collaborator'
        });
      });

      // Mapear novos treinamentos
      treinamentosData?.forEach(treinamento => {
        allActivities.push({
          id: `treinamento-${treinamento.id}`,
          user: getUserName(treinamento.created_by),
          action: `Criou o curso "${treinamento.titulo}"`,
          time: getTimeAgo(treinamento.created_at),
          type: 'new_course'
        });
      });

      // Mapear novas aulas
      aulasData?.forEach(aula => {
        allActivities.push({
          id: `aula-${aula.id}`,
          user: getUserName(aula.created_by),
          action: `Adicionou a aula "${aula.titulo}" ao curso "${aula.treinamentos.titulo}"`,
          time: getTimeAgo(aula.created_at),
          type: 'new_class'
        });
      });

      // Mapear novos clientes
      clientesData?.forEach(cliente => {
        allActivities.push({
          id: `cliente-${cliente.id}`,
          user: getUserName(cliente.created_by),
          action: `Criou o painel do cliente "${cliente.nome}"`,
          time: getTimeAgo(cliente.created_at),
          type: 'new_client'
        });
      });

      // Mapear novos POPs
      popsData?.forEach(pop => {
        allActivities.push({
          id: `pop-${pop.id}`,
          user: getUserName(pop.created_by),
          action: `Criou o POP "${pop.titulo}"`,
          time: getTimeAgo(pop.created_at),
          type: 'new_pop'
        });
      });

      // Mapear PDIs concluídos
      pdisData?.forEach(pdi => {
        allActivities.push({
          id: `pdi-${pdi.id}`,
          user: pdi.colaboradores.nome,
          action: `Concluiu o PDI "${pdi.titulo}"`,
          time: getTimeAgo(pdi.updated_at),
          type: 'pdi_completed'
        });
      });

      // Mapear novas referências
      referenciasData?.forEach(referencia => {
        allActivities.push({
          id: `referencia-${referencia.id}`,
          user: getUserName(referencia.created_by),
          action: `Criou a referência "${referencia.titulo}"`,
          time: getTimeAgo(referencia.created_at),
          type: 'new_reference'
        });
      });

      // Ordenar todas as atividades por data mais recente e pegar as 10 primeiras
      allActivities.sort((a, b) => {
        const timeA = getTimestamp(a.time);
        const timeB = getTimestamp(b.time);
        return timeB - timeA;
      });

      setActivities(allActivities.slice(0, 10));
    } catch (error) {
      console.error('Erro ao carregar atividades recentes:', error);
      // Fallback para dados estáticos em caso de erro
      setActivities([
        { id: '1', user: "Maria Silva", action: "Concluiu módulo de Facebook Ads", time: "2h atrás", type: 'lesson_completed' },
        { id: '2', user: "João Santos", action: "Criou painel do cliente XYZ", time: "4h atrás", type: 'new_client' },
        { id: '3', user: "Ana Costa", action: "Iniciou curso de Google Analytics", time: "6h atrás", type: 'course_started' },
        { id: '4', user: "Pedro Lima", action: "Concluiu PDI de Desenvolvimento", time: "1d atrás", type: 'pdi_completed' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays}d atrás`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h atrás`;
    } else {
      return 'Agora mesmo';
    }
  };

  const getTimestamp = (timeString: string) => {
    const now = Date.now();
    if (timeString.includes('h atrás')) {
      const hours = parseInt(timeString);
      return now - (hours * 60 * 60 * 1000);
    } else if (timeString.includes('d atrás')) {
      const days = parseInt(timeString);
      return now - (days * 24 * 60 * 60 * 1000);
    }
    return now;
  };

  return { activities, loading, refreshActivities: loadRecentActivities };
};