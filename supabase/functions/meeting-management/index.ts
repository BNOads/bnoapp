import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MeetingRequest {
  titulo: string;
  descricao?: string;
  dataHora: string;
  duracaoPrevista?: number;
  tipo?: string;
  clienteId?: string;
  participantesObrigatorios?: string[];
  participantesOpcionais?: string[];
  linkMeet?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(JSON.stringify({ error: 'Token de autorização necessário' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, ...data } = await req.json();

    switch (action) {
      case 'create_meeting':
        return await createMeeting(supabase, data as MeetingRequest, user.id);

      case 'get_daily_meetings':
        return await getDailyMeetings(supabase, data.date);

      case 'mark_attendance':
        return await markAttendance(supabase, data.reuniaoId, data.userId || user.id, data.status);

      case 'get_meeting_history':
        return await getMeetingHistory(supabase, data.userId, data.filters);

      case 'start_meeting':
        return await startMeeting(supabase, data.reuniaoId);

      case 'end_meeting':
        return await endMeeting(supabase, data.reuniaoId);

      case 'auto_attendance':
        return await autoAttendance(supabase, data.reuniaoId);

      case 'add_participants':
        return await addParticipants(supabase, data.reuniaoId, data.participantes);

      case 'mark_individual_attendance':
        return await markIndividualAttendance(supabase, data.reuniaoId, data.userId, data.status);

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Erro na gestão de reuniões:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createMeeting(supabase: any, data: MeetingRequest, userId: string) {
  const { data: reuniao, error } = await supabase
    .from('reunioes_agendadas')
    .insert({
      titulo: data.titulo,
      descricao: data.descricao,
      data_hora: data.dataHora,
      duracao_prevista: data.duracaoPrevista,
      tipo: data.tipo || 'reuniao',
      cliente_id: data.clienteId,
      organizador_id: userId,
      participantes_obrigatorios: data.participantesObrigatorios || [],
      participantes_opcionais: data.participantesOpcionais || [],
      link_meet: data.linkMeet
    })
    .select()
    .single();

  if (error) throw error;

  // Criar registros de presença para participantes obrigatórios
  const participantes = [...(data.participantesObrigatorios || []), ...(data.participantesOpcionais || [])];
  
  for (const participanteId of participantes) {
    await supabase
      .from('presencas_reunioes')
      .insert({
        reuniao_id: reuniao.id,
        user_id: participanteId,
        status: 'ausente'
      });
  }

  return new Response(JSON.stringify({
    success: true,
    reuniao,
    message: 'Reunião agendada com sucesso'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getDailyMeetings(supabase: any, date: string) {
  try {
    const inicioData = `${date}T00:00:00.000Z`;
    const fimData = `${date}T23:59:59.999Z`;

    console.log(`Buscando reuniões para: ${date}, período: ${inicioData} - ${fimData}`);

    // Buscar reuniões sem joins problemáticos
    const { data: reunioes, error } = await supabase
      .from('reunioes_agendadas')
      .select(`
        id,
        titulo,
        descricao,
        data_hora,
        duracao_prevista,
        tipo,
        cliente_id,
        status,
        link_meet,
        organizador_id,
        participantes_obrigatorios,
        participantes_opcionais
      `)
      .gte('data_hora', inicioData)
      .lte('data_hora', fimData)
      .order('data_hora');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Encontradas ${reunioes?.length || 0} reuniões`);

    // Buscar presenças separadamente se houver reuniões
    let reunioesComPresencas = reunioes || [];
    
    if (reunioes && reunioes.length > 0) {
      const reuniaoIds = reunioes.map(r => r.id);
      
      const { data: presencas, error: presencasError } = await supabase
        .from('presencas_reunioes')
        .select(`
          reuniao_id,
          user_id,
          status,
          horario_entrada,
          horario_saida,
          profiles:user_id(nome, avatar_url)
        `)
        .in('reuniao_id', reuniaoIds);

      if (!presencasError && presencas) {
        // Agrupar presenças por reunião
        const presencasPorReuniao = presencas.reduce((acc, presenca) => {
          if (!acc[presenca.reuniao_id]) {
            acc[presenca.reuniao_id] = [];
          }
          acc[presenca.reuniao_id].push(presenca);
          return acc;
        }, {});

        // Adicionar presenças às reuniões
        reunioesComPresencas = reunioes.map(reuniao => ({
          ...reuniao,
          presencas_reunioes: presencasPorReuniao[reuniao.id] || []
        }));
      }

      // Buscar nomes dos clientes se houver cliente_id
      const clienteIds = reunioes.map(r => r.cliente_id).filter(Boolean);
      if (clienteIds.length > 0) {
        const { data: clientes, error: clientesError } = await supabase
          .from('clientes')
          .select('id, nome')
          .in('id', clienteIds);

        if (!clientesError && clientes) {
          const clientesPorId = clientes.reduce((acc, cliente) => {
            acc[cliente.id] = cliente;
            return acc;
          }, {});

          reunioesComPresencas = reunioesComPresencas.map(reuniao => ({
            ...reuniao,
            clientes: reuniao.cliente_id ? clientesPorId[reuniao.cliente_id] : null
          }));
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reunioes: reunioesComPresencas
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting daily meetings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get meetings',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function markAttendance(supabase: any, reuniaoId: string, userId: string, status: string) {
  const agora = new Date().toISOString();

  const updateData: any = {
    status,
    updated_at: agora
  };

  if (status === 'presente' && !updateData.horario_entrada) {
    updateData.horario_entrada = agora;
  }

  const { data, error } = await supabase
    .from('presencas_reunioes')
    .update(updateData)
    .eq('reuniao_id', reuniaoId)
    .eq('user_id', userId)
    .select();

  if (error) throw error;

  // Se marcou como presente, registrar no sistema de gamificação
  if (status === 'presente') {
    const gamificationPayload = {
      action: 'log_meeting_attendance',
      reuniaoId,
      userId,
      horarioEntrada: agora,
      status
    };

    // Chamar função de gamificação
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/gamification-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify(gamificationPayload)
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Presença marcada com sucesso'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getMeetingHistory(supabase: any, userId: string, filters: any = {}) {
  let query = supabase
    .from('presencas_reunioes')
    .select(`
      *,
      reunioes_agendadas(
        titulo,
        data_hora,
        tipo,
        clientes(nome)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.tipo) {
    query = query.eq('reunioes_agendadas.tipo', filters.tipo);
  }

  const { data: historico, error } = await query;

  if (error) throw error;

  // Calcular estatísticas
  const stats = {
    totalReunioes: historico.length,
    reunioesPresentes: historico.filter((p: any) => p.status === 'presente').length,
    reunioesAusentes: historico.filter((p: any) => p.status === 'ausente').length,
    reunioesAtrasado: historico.filter((p: any) => p.status === 'atrasado').length,
    tempoTotalPresenca: historico.reduce((total: number, p: any) => total + (p.tempo_presenca || 0), 0),
    pontosGanhos: historico.reduce((total: number, p: any) => total + (p.pontos_ganhos || 0), 0)
  };

  return new Response(JSON.stringify({
    success: true,
    historico,
    stats
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function startMeeting(supabase: any, reuniaoId: string) {
  const { error } = await supabase
    .from('reunioes_agendadas')
    .update({
      status: 'em_andamento'
    })
    .eq('id', reuniaoId);

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    message: 'Reunião iniciada'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function endMeeting(supabase: any, reuniaoId: string) {
  const agora = new Date().toISOString();

  // Finalizar reunião
  const { error: reuniaoError } = await supabase
    .from('reunioes_agendadas')
    .update({
      status: 'finalizada'
    })
    .eq('id', reuniaoId);

  if (reuniaoError) throw reuniaoError;

  // Marcar saída para todos que estavam presentes e ainda não saíram
  const { data: presencas } = await supabase
    .from('presencas_reunioes')
    .select('*')
    .eq('reuniao_id', reuniaoId)
    .eq('status', 'presente')
    .is('horario_saida', null);

  for (const presenca of presencas || []) {
    const horarioEntrada = new Date(presenca.horario_entrada);
    const horarioSaida = new Date(agora);
    const tempoPresenca = Math.floor((horarioSaida.getTime() - horarioEntrada.getTime()) / (1000 * 60));

    await supabase
      .from('presencas_reunioes')
      .update({
        horario_saida: agora,
        tempo_presenca: tempoPresenca,
        pontos_ganhos: presenca.pontos_ganhos + tempoPresenca
      })
      .eq('id', presenca.id);

    // Atualizar gamificação
    const gamificationPayload = {
      action: 'log_meeting_attendance',
      reuniaoId,
      userId: presenca.user_id,
      horarioEntrada: presenca.horario_entrada,
      horarioSaida: agora,
      status: 'presente'
    };

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/gamification-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify(gamificationPayload)
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Reunião finalizada'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function autoAttendance(supabase: any, reuniaoId: string) {
  // Marcar automaticamente como presente todos os participantes obrigatórios
  const { data: reuniao } = await supabase
    .from('reunioes_agendadas')
    .select('participantes_obrigatorios')
    .eq('id', reuniaoId)
    .single();

  if (!reuniao) {
    throw new Error('Reunião não encontrada');
  }

  const agora = new Date().toISOString();

  for (const userId of reuniao.participantes_obrigatorios || []) {
    await supabase
      .from('presencas_reunioes')
      .update({
        status: 'presente',
        horario_entrada: agora
      })
      .eq('reuniao_id', reuniaoId)
      .eq('user_id', userId);
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Presença automática registrada'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function addParticipants(supabase: any, reuniaoId: string, participantes: string[]) {
  try {
    // Adicionar participantes à reunião
    for (const participanteId of participantes) {
      // Verificar se já existe registro de presença
      const { data: existingPresenca } = await supabase
        .from('presencas_reunioes')
        .select('id')
        .eq('reuniao_id', reuniaoId)
        .eq('user_id', participanteId)
        .single();

      if (!existingPresenca) {
        await supabase
          .from('presencas_reunioes')
          .insert({
            reuniao_id: reuniaoId,
            user_id: participanteId,
            status: 'ausente'
          });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Participantes adicionados com sucesso'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao adicionar participantes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Falha ao adicionar participantes'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function markIndividualAttendance(supabase: any, reuniaoId: string, userId: string, status: string) {
  try {
    const agora = new Date().toISOString();

    const updateData: any = {
      status,
      updated_at: agora
    };

    if (status === 'presente' && !updateData.horario_entrada) {
      updateData.horario_entrada = agora;
    }

    const { error } = await supabase
      .from('presencas_reunioes')
      .update(updateData)
      .eq('reuniao_id', reuniaoId)
      .eq('user_id', userId);

    if (error) throw error;

    // Se marcou como presente, registrar no sistema de gamificação
    if (status === 'presente') {
      const gamificationPayload = {
        action: 'log_meeting_attendance',
        reuniaoId,
        userId,
        horarioEntrada: agora,
        status
      };

      // Chamar função de gamificação (não bloquear se falhar)
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/gamification-engine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify(gamificationPayload)
        });
      } catch (gamificationError) {
        console.error('Erro na gamificação:', gamificationError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Presença individual marcada como ${status}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao marcar presença individual:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Falha ao marcar presença individual'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}