import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { alerta_id } = await req.json();

    console.log('📋 Criando tarefa para alerta NPS:', alerta_id);

    // Buscar detalhes do alerta
    const { data: alerta, error: alertaError } = await supabaseClient
      .from('nps_alertas')
      .select(`
        *,
        resposta:nps_respostas(*),
        cliente:clientes(
          id,
          nome,
          primary_gestor_id,
          cs_id
        )
      `)
      .eq('id', alerta_id)
      .single();

    if (alertaError) throw alertaError;
    if (!alerta || !alerta.cliente) {
      throw new Error('Alerta ou cliente não encontrado');
    }

    // Definir responsável (gestor primário ou CS)
    const responsavelId = alerta.cliente.primary_gestor_id || alerta.cliente.cs_id;
    
    if (!responsavelId) {
      throw new Error('Nenhum gestor ou CS atribuído ao cliente');
    }

    // Buscar colaborador responsável
    const { data: responsavel, error: responsavelError } = await supabaseClient
      .from('colaboradores')
      .select('user_id')
      .eq('id', responsavelId)
      .single();

    if (responsavelError || !responsavel) {
      throw new Error('Responsável não encontrado');
    }

    // Definir título e descrição da tarefa baseado no tipo de alerta
    let titulo = '';
    let descricao = '';
    let prioridade: 'baixa' | 'media' | 'alta' | 'urgente' = 'alta';

    if (alerta.tipo_alerta === 'nota_baixa') {
      titulo = `🚨 Cliente ${alerta.cliente.nome} - NPS Baixo (${alerta.resposta?.nota_nps}/10)`;
      descricao = `O cliente ${alerta.cliente.nome} avaliou nosso serviço com nota ${alerta.resposta?.nota_nps}/10.

**Motivo informado:**
${alerta.resposta?.motivo_nps || 'Não informado'}

**Ação necessária:**
- Entre em contato com o cliente nas próximas 48h
- Entenda as causas da insatisfação
- Elabore plano de ação para reverter situação
- Atualize o alerta após contato`;
      prioridade = 'urgente';
    } else if (alerta.tipo_alerta === 'satisfacao_baixa') {
      titulo = `⚠️ Cliente ${alerta.cliente.nome} - Satisfação Semanal Baixa (${alerta.resposta?.satisfacao_semanal}/5)`;
      descricao = `O cliente ${alerta.cliente.nome} avaliou a entrega desta semana com ${alerta.resposta?.satisfacao_semanal}/5 estrelas.

**Motivo informado:**
${alerta.resposta?.motivo_satisfacao_baixa || 'Não informado'}

**Ação necessária:**
- Revisar entregas da semana
- Agendar call de alinhamento
- Identificar pontos de melhoria imediata
- Acompanhar próxima semana de perto`;
      prioridade = 'alta';
    }

    // Criar tarefa
    const { data: tarefa, error: tarefaError } = await supabaseClient
      .from('tarefas')
      .insert({
        titulo,
        descricao,
        prioridade,
        status: 'pendente',
        tipo: 'cliente',
        cliente_id: alerta.cliente.id,
        data_vencimento: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0], // 48h
        created_by: responsavel.user_id,
        assigned_to: responsavel.user_id,
        categoria: 'atendimento'
      })
      .select()
      .single();

    if (tarefaError) throw tarefaError;

    // Atualizar alerta com ID da tarefa criada
    const { error: updateError } = await supabaseClient
      .from('nps_alertas')
      .update({ tarefa_id: tarefa.id })
      .eq('id', alerta_id);

    if (updateError) throw updateError;

    console.log('✅ Tarefa criada com sucesso:', tarefa.id);

    return new Response(
      JSON.stringify({
        success: true,
        tarefa_id: tarefa.id,
        alerta_id: alerta_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao criar tarefa:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
