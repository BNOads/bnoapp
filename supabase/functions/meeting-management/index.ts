import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    
    console.log('Meeting management action:', action);

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

    switch (action) {
      case 'get_daily_meetings':
        return await getDailyMeetings(supabase, body.date);
      
      case 'sync_google_calendar':
        return await syncGoogleCalendar(supabase, body.date);
      
      case 'create_meeting':
        return await createMeeting(supabase, body);
      
      case 'add_participants':
        return await addParticipants(supabase, body.reuniaoId, body.participantes);
      
      case 'mark_individual_attendance':
        return await markIndividualAttendance(supabase, body.reuniaoId, body.userId, body.status);
      
      case 'mark_attendance':
        return await markAttendance(supabase, body.reuniaoId, user.id, body.status);
      
      case 'start_meeting':
        return await startMeeting(supabase, body.reuniaoId);
      
      case 'end_meeting':
        return await endMeeting(supabase, body.reuniaoId);
      
      default:
        return new Response(JSON.stringify({ error: 'Ação não reconhecida: ' + action }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Error in meeting-management function:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

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

async function syncGoogleCalendar(supabase: any, date: string) {
  try {
    console.log('Starting Google Calendar sync for date:', date);
    
    const apiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    if (!apiKey) {
      console.log('Google Calendar API key not configured, skipping sync');
      return new Response(JSON.stringify({
        success: true,
        message: 'Google Calendar não configurado',
        reunioesInseridas: 0,
        totalEventos: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ID do calendário principal (pode ser configurado)
    const calendarId = 'primary';
    
    const timeMin = `${date}T00:00:00.000Z`;
    const timeMax = `${date}T23:59:59.999Z`;
    
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    
    console.log('Fetching from Google Calendar API...');
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Google Calendar API error:', data);
      throw new Error(`Google Calendar API error: ${data.error?.message || 'Unknown error'}`);
    }

    console.log(`Google Calendar sync: found ${data.items?.length || 0} events`);

    // Inserir reuniões no banco se não existirem
    const reunioesInseridas = [];
    
    if (data.items && data.items.length > 0) {
      for (const event of data.items) {
        if (!event.start?.dateTime) continue; // Pular eventos de dia inteiro
        
        console.log(`Processing event: ${event.summary}`);
        
        // Verificar se já existe uma reunião com este título e horário
        const { data: existingMeeting } = await supabase
          .from('reunioes_agendadas')
          .select('id')
          .eq('titulo', event.summary || 'Reunião sem título')
          .eq('data_hora', event.start.dateTime)
          .maybeSingle();

        if (!existingMeeting) {
          // Criar nova reunião
          const novaReuniao = {
            titulo: event.summary || 'Reunião sem título',
            descricao: event.description || null,
            data_hora: event.start.dateTime,
            duracao_prevista: event.end?.dateTime ? 
              Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / (1000 * 60)) : 60,
            tipo: 'reuniao',
            status: 'agendada',
            link_meet: event.hangoutLink || null,
            organizador_id: '4759b9d5-8e40-41f2-a994-f609fb62b9c2', // ID do usuário atual (temporário)
            participantes_obrigatorios: [],
            participantes_opcionais: []
          };

          const { data: insertedMeeting, error: insertError } = await supabase
            .from('reunioes_agendadas')
            .insert(novaReuniao)
            .select()
            .single();

          if (!insertError && insertedMeeting) {
            reunioesInseridas.push(insertedMeeting);
            console.log(`Reunião inserida: ${insertedMeeting.titulo}`);
          } else {
            console.error('Error inserting meeting:', insertError);
          }
        } else {
          console.log(`Event already exists: ${event.summary}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Sincronizado com Google Calendar`,
      reunioesInseridas: reunioesInseridas.length,
      totalEventos: data.items?.length || 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to sync Google Calendar',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function createMeeting(supabase: any, meetingData: any) {
  try {
    const { data: newMeeting, error } = await supabase
      .from('reunioes_agendadas')
      .insert({
        titulo: meetingData.titulo,
        descricao: meetingData.descricao || null,
        data_hora: meetingData.data_hora,
        duracao_prevista: meetingData.duracao_prevista || 60,
        tipo: meetingData.tipo || 'reuniao',
        cliente_id: meetingData.cliente_id || null,
        status: 'agendada',
        link_meet: meetingData.link_meet || null,
        organizador_id: meetingData.organizador_id,
        participantes_obrigatorios: meetingData.participantes_obrigatorios || [],
        participantes_opcionais: meetingData.participantes_opcionais || []
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      meeting: newMeeting
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create meeting',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function markAttendance(supabase: any, reuniaoId: string, userId: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('presencas_reunioes')
      .upsert({
        reuniao_id: reuniaoId,
        user_id: userId,
        status: status,
        horario_entrada: status === 'presente' || status === 'atrasado' ? new Date().toISOString() : null
      }, {
        onConflict: 'reuniao_id,user_id'
      })
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to mark attendance',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function startMeeting(supabase: any, reuniaoId: string) {
  try {
    const { data, error } = await supabase
      .from('reunioes_agendadas')
      .update({ status: 'em_andamento' })
      .eq('id', reuniaoId)
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error starting meeting:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to start meeting',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function endMeeting(supabase: any, reuniaoId: string) {
  try {
    const { data, error } = await supabase
      .from('reunioes_agendadas')
      .update({ status: 'finalizada' })
      .eq('id', reuniaoId)
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error ending meeting:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to end meeting',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function addParticipants(supabase: any, reuniaoId: string, participantes: string[]) {
  try {
    // Inserir registros de presença para cada participante
    const presencasData = participantes.map(participanteId => ({
      reuniao_id: reuniaoId,
      user_id: participanteId,
      status: 'ausente',
      horario_entrada: null,
      horario_saida: null,
      pontos_ganhos: 0,
      tempo_presenca: 0
    }));

    const { data, error } = await supabase
      .from('presencas_reunioes')
      .upsert(presencasData, {
        onConflict: 'reuniao_id,user_id'
      })
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: `${participantes.length} participantes adicionados`,
      data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error adding participants:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to add participants',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function markIndividualAttendance(supabase: any, reuniaoId: string, userId: string, status: string) {
  try {
    const updateData: any = {
      status,
      horario_entrada: status === 'presente' || status === 'atrasado' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('presencas_reunioes')
      .update(updateData)
      .eq('reuniao_id', reuniaoId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    // Se marcado como presente, log para gamificação
    if (status === 'presente') {
      try {
        await supabase.functions.invoke('gamification-engine', {
          body: {
            action: 'log_meeting_attendance',
            userId,
            reuniaoId,
            status
          }
        });
      } catch (gamificationError) {
        console.error('Error logging to gamification:', gamificationError);
        // Não falhar a operação principal por erro na gamificação
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error marking individual attendance:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to mark individual attendance',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}