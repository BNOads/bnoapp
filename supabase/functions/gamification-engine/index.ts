import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudyLogRequest {
  aulaId?: string;
  treinamentoId?: string;
  tempoEstudado: number; // em minutos
  tipoAtividade: 'video' | 'quiz' | 'leitura';
}

interface MeetingAttendanceRequest {
  reuniaoId: string;
  userId?: string;
  horarioEntrada?: string;
  horarioSaida?: string;
  status: 'presente' | 'ausente' | 'atrasado';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...data } = await req.json();

    switch (action) {
      case 'log_study':
        return await logStudyActivity(supabase, data as StudyLogRequest, req);

      case 'log_meeting_attendance':
        return await logMeetingAttendance(supabase, data as MeetingAttendanceRequest, req);

      case 'update_rankings':
        return await updateRankings(supabase);

      case 'check_achievements':
        return await checkAchievements(supabase, data.userId);

      case 'get_user_stats':
        return await getUserStats(supabase, data.userId);

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Erro no gamification engine:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function logStudyActivity(supabase: any, data: StudyLogRequest, req: Request) {
  const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!authToken) {
    return new Response(JSON.stringify({ error: 'Token de autorização necessário' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Verificar usuário autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Calcular pontos baseado no tempo estudado e tipo de atividade
  const pontosPorMinuto = {
    video: 2,
    quiz: 5,
    leitura: 3
  };
  
  const pontosGanhos = data.tempoEstudado * pontosPorMinuto[data.tipoAtividade];

  // Registrar log de estudo
  const { error: logError } = await supabase
    .from('logs_estudo')
    .insert({
      user_id: user.id,
      aula_id: data.aulaId,
      treinamento_id: data.treinamentoId,
      tempo_estudado: data.tempoEstudado,
      pontos_ganhos: pontosGanhos,
      tipo_atividade: data.tipoAtividade
    });

  if (logError) throw logError;

  // Atualizar streak
  await updateUserStreak(supabase, user.id);

  // Verificar conquistas
  await checkAchievements(supabase, user.id);

  return new Response(JSON.stringify({
    success: true,
    pontosGanhos,
    message: 'Atividade de estudo registrada com sucesso'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function logMeetingAttendance(supabase: any, data: MeetingAttendanceRequest, req: Request) {
  const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!authToken) {
    return new Response(JSON.stringify({ error: 'Token de autorização necessário' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Calcular tempo de presença e pontos
  let tempoPresenca = 0;
  let pontosGanhos = 0;

  if (data.horarioEntrada && data.horarioSaida && data.status === 'presente') {
    const entrada = new Date(data.horarioEntrada);
    const saida = new Date(data.horarioSaida);
    tempoPresenca = Math.floor((saida.getTime() - entrada.getTime()) / (1000 * 60)); // em minutos

    // Pontos: 1 ponto por minuto de presença, bonus para pontualidade
    pontosGanhos = tempoPresenca;
    if (data.status === 'presente') pontosGanhos += 10; // Bonus por estar presente
  }

  // Registrar presença
  const { error: presencaError } = await supabase
    .from('presencas_reunioes')
    .upsert({
      reuniao_id: data.reuniaoId,
      user_id: data.userId || user.id,
      horario_entrada: data.horarioEntrada,
      horario_saida: data.horarioSaida,
      tempo_presenca: tempoPresenca,
      pontos_ganhos: pontosGanhos,
      status: data.status
    });

  if (presencaError) throw presencaError;

  return new Response(JSON.stringify({
    success: true,
    pontosGanhos,
    tempoPresenca,
    message: 'Presença registrada com sucesso'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateUserStreak(supabase: any, userId: string) {
  const hoje = new Date().toISOString().split('T')[0];
  
  // Verificar streak atual
  const { data: streakData, error: streakError } = await supabase
    .from('streaks_estudo')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (streakError && streakError.code !== 'PGRST116') throw streakError;

  if (!streakData) {
    // Criar novo streak
    await supabase
      .from('streaks_estudo')
      .insert({
        user_id: userId,
        streak_atual: 1,
        streak_maximo: 1,
        ultima_atividade: hoje
      });
  } else {
    const ultimaAtividade = new Date(streakData.ultima_atividade);
    const hojeDt = new Date(hoje);
    const diffDays = Math.floor((hojeDt.getTime() - ultimaAtividade.getTime()) / (1000 * 60 * 60 * 24));

    let novoStreak = streakData.streak_atual;
    
    if (diffDays === 0) {
      // Mesmo dia, não alterar streak
      return;
    } else if (diffDays === 1) {
      // Dia consecutivo, incrementar streak
      novoStreak += 1;
    } else {
      // Quebrou o streak
      novoStreak = 1;
    }

    const novoMaximo = Math.max(streakData.streak_maximo, novoStreak);

    await supabase
      .from('streaks_estudo')
      .update({
        streak_atual: novoStreak,
        streak_maximo: novoMaximo,
        ultima_atividade: hoje
      })
      .eq('user_id', userId);
  }
}

async function updateRankings(supabase: any) {
  const agora = new Date();
  const inicioSemana = new Date(agora.setDate(agora.getDate() - agora.getDay()));
  inicioSemana.setHours(0, 0, 0, 0);
  
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  // Ranking semanal
  await calculateRanking(supabase, 'semanal', inicioSemana.toISOString().split('T')[0]);
  
  // Ranking mensal
  await calculateRanking(supabase, 'mensal', inicioMes.toISOString().split('T')[0]);

  return new Response(JSON.stringify({
    success: true,
    message: 'Rankings atualizados com sucesso'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function calculateRanking(supabase: any, periodo: string, dataInicio: string) {
  // Buscar estatísticas de estudo
  const { data: estudoStats } = await supabase
    .from('logs_estudo')
    .select('user_id, pontos_ganhos, tempo_estudado')
    .gte('created_at', dataInicio);

  // Buscar estatísticas de reuniões
  const { data: reuniaoStats } = await supabase
    .from('presencas_reunioes')
    .select('user_id, pontos_ganhos, tempo_presenca, status')
    .gte('created_at', dataInicio);

  // Buscar streaks atuais
  const { data: streakStats } = await supabase
    .from('streaks_estudo')
    .select('user_id, streak_atual');

  // Consolidar dados por usuário
  const userStats = new Map();

  estudoStats?.forEach((log: any) => {
    if (!userStats.has(log.user_id)) {
      userStats.set(log.user_id, {
        pontos_estudo: 0,
        pontos_reunioes: 0,
        tempo_estudo_total: 0,
        tempo_reunioes_total: 0,
        reunioes_participadas: 0,
        streak_estudo: 0
      });
    }
    const stats = userStats.get(log.user_id);
    stats.pontos_estudo += log.pontos_ganhos;
    stats.tempo_estudo_total += log.tempo_estudado;
  });

  reuniaoStats?.forEach((presenca: any) => {
    if (!userStats.has(presenca.user_id)) {
      userStats.set(presenca.user_id, {
        pontos_estudo: 0,
        pontos_reunioes: 0,
        tempo_estudo_total: 0,
        tempo_reunioes_total: 0,
        reunioes_participadas: 0,
        streak_estudo: 0
      });
    }
    const stats = userStats.get(presenca.user_id);
    stats.pontos_reunioes += presenca.pontos_ganhos;
    stats.tempo_reunioes_total += presenca.tempo_presenca;
    if (presenca.status === 'presente') {
      stats.reunioes_participadas += 1;
    }
  });

  streakStats?.forEach((streak: any) => {
    if (userStats.has(streak.user_id)) {
      const stats = userStats.get(streak.user_id);
      stats.streak_estudo = streak.streak_atual;
    }
  });

  // Calcular ranking e salvar
  const rankings = Array.from(userStats.entries()).map(([userId, stats]: [string, any]) => ({
    user_id: userId,
    tipo: 'geral',
    periodo,
    pontos_totais: stats.pontos_estudo + stats.pontos_reunioes,
    pontos_estudo: stats.pontos_estudo,
    pontos_reunioes: stats.pontos_reunioes,
    streak_estudo: stats.streak_estudo,
    reunioes_participadas: stats.reunioes_participadas,
    tempo_estudo_total: stats.tempo_estudo_total,
    tempo_reunioes_total: stats.tempo_reunioes_total,
    data_referencia: dataInicio
  }));

  // Ordenar por pontos totais e atribuir posições
  rankings.sort((a, b) => b.pontos_totais - a.pontos_totais);
  rankings.forEach((ranking: any, index: number) => {
    ranking.posicao = index + 1;
  });

  // Salvar no banco
  for (const ranking of rankings) {
    await supabase
      .from('rankings')
      .upsert(ranking);
  }
}

async function checkAchievements(supabase: any, userId: string) {
  // Buscar conquistas disponíveis
  const { data: conquistas } = await supabase
    .from('conquistas')
    .select('*')
    .eq('ativo', true);

  // Buscar conquistas já obtidas pelo usuário
  const { data: conquistasObtidas } = await supabase
    .from('user_conquistas')
    .select('conquista_id')
    .eq('user_id', userId);

  const idsObtidas = conquistasObtidas?.map((c: any) => c.conquista_id) || [];

  // Verificar cada conquista
  for (const conquista of conquistas || []) {
    if (idsObtidas.includes(conquista.id)) continue;

    const condicao = conquista.condicao;
    let conquistaAtendida = false;

    switch (condicao.tipo) {
      case 'aulas_concluidas':
        const { count: aulasCount } = await supabase
          .from('progresso_aulas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('concluido', true);
        
        conquistaAtendida = aulasCount >= condicao.valor;
        break;

      case 'streak_dias':
        const { data: streakData } = await supabase
          .from('streaks_estudo')
          .select('streak_atual')
          .eq('user_id', userId)
          .maybeSingle();
        
        conquistaAtendida = streakData?.streak_atual >= condicao.valor;
        break;

      case 'reunioes_participadas':
        const { count: reunioesCount } = await supabase
          .from('presencas_reunioes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'presente');
        
        conquistaAtendida = reunioesCount >= condicao.valor;
        break;

      case 'tempo_semanal':
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        inicioSemana.setHours(0, 0, 0, 0);

        const { data: tempoSemanalData } = await supabase
          .from('logs_estudo')
          .select('tempo_estudado')
          .eq('user_id', userId)
          .gte('created_at', inicioSemana.toISOString());

        const tempoTotal = tempoSemanalData?.reduce((total: number, log: any) => total + log.tempo_estudado, 0) || 0;
        conquistaAtendida = tempoTotal >= condicao.valor;
        break;
    }

    if (conquistaAtendida) {
      await supabase
        .from('user_conquistas')
        .insert({
          user_id: userId,
          conquista_id: conquista.id,
          pontos_ganhos: conquista.pontos_bonus || 0
        });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Conquistas verificadas'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getUserStats(supabase: any, userId: string) {
  // Buscar estatísticas do usuário
  const { data: logs } = await supabase
    .from('logs_estudo')
    .select('pontos_ganhos, tempo_estudado')
    .eq('user_id', userId);

  const { data: presencas } = await supabase
    .from('presencas_reunioes')
    .select('pontos_ganhos, tempo_presenca, status')
    .eq('user_id', userId);

  const { data: streak } = await supabase
    .from('streaks_estudo')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: conquistas } = await supabase
    .from('user_conquistas')
    .select('conquista_id, data_obtencao, pontos_ganhos')
    .eq('user_id', userId);

  const pontosEstudo = logs?.reduce((total: number, log: any) => total + log.pontos_ganhos, 0) || 0;
  const tempoEstudo = logs?.reduce((total: number, log: any) => total + log.tempo_estudado, 0) || 0;
  const pontosReunioes = presencas?.reduce((total: number, p: any) => total + p.pontos_ganhos, 0) || 0;
  const tempoReunioes = presencas?.reduce((total: number, p: any) => total + p.tempo_presenca, 0) || 0;
  const reunioesParticipadas = presencas?.filter((p: any) => p.status === 'presente').length || 0;

  return new Response(JSON.stringify({
    success: true,
    stats: {
      pontosEstudo,
      pontosReunioes,
      pontosTotal: pontosEstudo + pontosReunioes,
      tempoEstudo,
      tempoReunioes,
      reunioesParticipadas,
      streakAtual: streak?.streak_atual || 0,
      streakMaximo: streak?.streak_maximo || 0,
      totalConquistas: conquistas?.length || 0
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}