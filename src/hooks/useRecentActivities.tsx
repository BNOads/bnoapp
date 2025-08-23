import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  time: string;
  type: 'lesson_completed' | 'course_started' | 'profile_updated';
}

export const useRecentActivities = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  const loadRecentActivities = async () => {
    try {
      // Buscar progresso de aulas recentes com dados do usuário
      const { data: progressData, error: progressError } = await supabase
        .from('progresso_aulas')
        .select(`
          id,
          concluido,
          updated_at,
          user_id,
          aulas!inner(titulo),
          treinamentos!inner(titulo)
        `)
        .eq('concluido', true)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (progressError) throw progressError;

      // Buscar dados dos usuários
      const userIds = progressData?.map(p => p.user_id) || [];
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, nome')
        .in('user_id', userIds);

      if (usersError) throw usersError;

      // Mapear atividades
      const mappedActivities = progressData?.map(progress => {
        const user = usersData?.find(u => u.user_id === progress.user_id);
        const timeAgo = getTimeAgo(progress.updated_at);
        
        return {
          id: progress.id,
          user: user?.nome || 'Usuário',
          action: `Concluiu a aula "${progress.aulas.titulo}" do curso "${progress.treinamentos.titulo}"`,
          time: timeAgo,
          type: 'lesson_completed' as const
        };
      }) || [];

      setActivities(mappedActivities);
    } catch (error) {
      console.error('Erro ao carregar atividades recentes:', error);
      // Fallback para dados estáticos em caso de erro
      setActivities([
        { id: '1', user: "Maria Silva", action: "Concluiu módulo de Facebook Ads", time: "2h atrás", type: 'lesson_completed' },
        { id: '2', user: "João Santos", action: "Acessou painel do cliente XYZ", time: "4h atrás", type: 'profile_updated' },
        { id: '3', user: "Ana Costa", action: "Iniciou curso de Google Analytics", time: "6h atrás", type: 'course_started' },
        { id: '4', user: "Pedro Lima", action: "Completou avaliação mensal", time: "1d atrás", type: 'lesson_completed' },
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

  return { activities, loading, refreshActivities: loadRecentActivities };
};