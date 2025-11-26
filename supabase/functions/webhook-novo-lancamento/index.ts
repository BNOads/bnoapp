import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  nome_lancamento: string;
  status_lancamento?: string;
  data_inicio_captacao?: string;
  data_cpls?: string;
  investimento?: number;
  descricao?: string;
  tipo_lancamento?: 'orgânico' | 'pago' | 'híbrido';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook novo lançamento - Iniciando processamento...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: WebhookPayload = await req.json();
    console.log('Payload recebido:', payload);

    // Validate required fields - apenas nome_lancamento é obrigatório
    if (!payload.nome_lancamento) {
      console.error('Campo obrigatório ausente: nome_lancamento');
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: nome_lancamento' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Try to detect client by launch name
    console.log('Detectando cliente pelo nome do lançamento...');
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome, aliases, primary_gestor_user_id')
      .eq('ativo', true);

    if (clientesError) {
      console.error('Erro ao buscar clientes:', clientesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar clientes: ' + clientesError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let clienteDetectado = null;
    const nomeLancamentoLower = payload.nome_lancamento.toLowerCase();
    
    console.log(`Buscando cliente para lançamento: "${payload.nome_lancamento}"`);
    console.log(`Total de clientes ativos: ${clientes.length}`);

    // Search for client name in launch name
    for (const cliente of clientes) {
      const nomeClienteLower = cliente.nome.toLowerCase();
      
      console.log(`Verificando cliente: ${cliente.nome}`);
      console.log(`  - Aliases: ${cliente.aliases ? JSON.stringify(cliente.aliases) : 'nenhum'}`);
      
      // Check if client name is in launch name
      if (nomeLancamentoLower.includes(nomeClienteLower)) {
        clienteDetectado = cliente;
        console.log(`✅ Cliente detectado pelo nome: ${cliente.nome}`);
        break;
      }
      
      // Check aliases if available
      if (cliente.aliases && Array.isArray(cliente.aliases)) {
        for (const alias of cliente.aliases) {
          const aliasLower = alias.toLowerCase();
          console.log(`  - Testando alias: "${alias}" em "${payload.nome_lancamento}"`);
          
          if (nomeLancamentoLower.includes(aliasLower)) {
            clienteDetectado = cliente;
            console.log(`✅ Cliente detectado pelo alias: ${alias} -> ${cliente.nome}`);
            break;
          }
        }
        if (clienteDetectado) break;
      }
    }

    if (!clienteDetectado) {
      console.warn('❌ Nenhum cliente detectado no nome do lançamento');
      console.warn('Para detectar automaticamente, adicione aliases ao cliente ou inclua o nome do cliente no nome do lançamento');
    }

    // Map incoming status to database enum values
    const statusMapping: Record<string, string> = {
      'ativo': 'em_captacao',
      'iniciado': 'cpl', 
      'finalizado': 'finalizado',
      'pausado': 'pausado',
      'cancelado': 'cancelado',
      'remarketing': 'remarketing'
    };

    const mappedStatus = statusMapping[(payload.status_lancamento || 'ativo').toLowerCase()] || 'em_captacao';
    console.log(`Status mapeado: ${payload.status_lancamento || 'ativo'} -> ${mappedStatus}`);

    // Prepare launch data with optional fields
    const lancamentoData = {
      nome_lancamento: payload.nome_lancamento.trim(),
      status_lancamento: mappedStatus,
      tipo_lancamento: payload.tipo_lancamento || 'pago',
      data_inicio_captacao: payload.data_inicio_captacao || null,
      datas_cpls: payload.data_cpls ? [payload.data_cpls] : null,
      investimento_total: payload.investimento || 0,
      cliente_id: clienteDetectado?.id || null,
      gestor_responsavel_id: clienteDetectado?.primary_gestor_user_id || null,
      descricao: payload.descricao || null,
      created_by: null, // Webhook criado automaticamente
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Dados do lançamento preparados:', lancamentoData);

    // Insert new launch
    const { data: novoLancamento, error: lancamentoError } = await supabase
      .from('lancamentos')
      .insert([lancamentoData])
      .select()
      .single();

    if (lancamentoError) {
      console.error('Erro ao criar lançamento:', lancamentoError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar lançamento: ' + lancamentoError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Lançamento criado com sucesso:', novoLancamento);

    // Buscar gestor para incluir na notificação
    let gestorInfo = null;
    let gestorUserId = null;
    
    if (clienteDetectado?.primary_gestor_user_id) {
      const { data: gestor, error: gestorError } = await supabase
        .from('colaboradores')
        .select('id, nome, user_id')
        .eq('user_id', clienteDetectado.primary_gestor_user_id)
        .eq('ativo', true)
        .single();
      
      if (gestorError) {
        console.error('Erro ao buscar gestor:', gestorError);
      }
      
      if (gestor) {
        gestorInfo = { id: gestor.id, nome: gestor.nome };
        gestorUserId = gestor.user_id;
        console.log('Gestor encontrado:', gestor.nome);
      }
    }

    // Criar notificação para alertar equipe
    console.log('Criando notificação de novo lançamento...');
    
    // Buscar primeiro admin para ser o created_by da notificação
    const { data: adminUser } = await supabase
      .from('colaboradores')
      .select('user_id')
      .eq('nivel_acesso', 'admin')
      .eq('ativo', true)
      .limit(1)
      .single();

    // Construir destinatários corretamente
    let destinatarios: string[];
    if (gestorUserId) {
      // Se tem gestor, notificar o gestor (user_id)
      destinatarios = [gestorUserId];
      console.log('Notificação será enviada para gestor:', gestorUserId);
    } else {
      // Senão, notificar todos gestores de tráfego
      destinatarios = ['gestor_trafego'];
      console.log('Notificação será enviada para nível: gestor_trafego');
    }

    const notificacaoData = {
      titulo: `🚀 Novo Lançamento: ${payload.nome_lancamento.trim()}`,
      conteudo: `Um novo lançamento foi criado via webhook${clienteDetectado ? ` para o cliente **${clienteDetectado.nome}**` : ' mas **nenhum cliente foi detectado**'}.\n\n` +
                `📊 Investimento: ${payload.investimento ? `R$ ${payload.investimento.toLocaleString('pt-BR')}` : 'Não informado'}\n` +
                `📅 Status: ${mappedStatus}\n\n` +
                `${!clienteDetectado ? '⚠️ **ATENÇÃO:** Associe manualmente um cliente ao lançamento.\n' : ''}` +
                `⚙️ Configure as datas e detalhes do lançamento.`,
      tipo: 'warning',
      prioridade: 'alta',
      destinatarios: destinatarios,
      ativo: true,
      created_by: adminUser?.user_id || null,
      canais: { sistema: true, email: false }
    };

    console.log('Dados da notificação:', JSON.stringify(notificacaoData, null, 2));

    const { data: notificacao, error: notifError } = await supabase
      .from('avisos')
      .insert([notificacaoData])
      .select()
      .single();

    if (notifError) {
      console.error('Erro ao criar notificação:', notifError);
      console.error('Detalhes do erro:', JSON.stringify(notifError, null, 2));
      // Não falha o webhook se a notificação falhar
    } else {
      console.log('Notificação criada com sucesso:', notificacao?.id);
    }

    // Return success response
    const response = {
      success: true,
      message: 'Lançamento criado com sucesso',
      lancamento: {
        id: novoLancamento.id,
        nome_lancamento: novoLancamento.nome_lancamento,
        status_lancamento: novoLancamento.status_lancamento,
        cliente_detectado: clienteDetectado ? {
          id: clienteDetectado.id,
          nome: clienteDetectado.nome
        } : null,
        gestor_associado: gestorInfo,
        investimento_total: novoLancamento.investimento_total,
        data_inicio_captacao: novoLancamento.data_inicio_captacao
      },
      notificacao_criada: !!notificacao,
      aviso: !payload.data_inicio_captacao ? 'Configure as datas do lançamento' : null
    };

    console.log('Webhook processado com sucesso:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});