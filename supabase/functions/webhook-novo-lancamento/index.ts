import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  nome_lancamento: string;
  status_lancamento: 'ativo' | 'iniciado' | 'finalizado';
  data_inicio_captacao: string;
  data_cpls?: string;
  investimento: number;
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

    // Validate required fields
    if (!payload.nome_lancamento || !payload.status_lancamento || !payload.data_inicio_captacao || !payload.investimento) {
      console.error('Campos obrigatórios ausentes');
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: nome_lancamento, status_lancamento, data_inicio_captacao, investimento' }),
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
      .select('id, nome, aliases')
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

    // Search for client name in launch name
    for (const cliente of clientes) {
      const nomeClienteLower = cliente.nome.toLowerCase();
      
      // Check if client name is in launch name
      if (nomeLancamentoLower.includes(nomeClienteLower)) {
        clienteDetectado = cliente;
        console.log(`Cliente detectado pelo nome: ${cliente.nome}`);
        break;
      }
      
      // Check aliases if available
      if (cliente.aliases && Array.isArray(cliente.aliases)) {
        for (const alias of cliente.aliases) {
          if (nomeLancamentoLower.includes(alias.toLowerCase())) {
            clienteDetectado = cliente;
            console.log(`Cliente detectado pelo alias: ${alias} -> ${cliente.nome}`);
            break;
          }
        }
        if (clienteDetectado) break;
      }
    }

    if (!clienteDetectado) {
      console.warn('Nenhum cliente detectado no nome do lançamento');
    }

    // Prepare launch data
    const lancamentoData = {
      nome_lancamento: payload.nome_lancamento.trim(),
      status_lancamento: payload.status_lancamento,
      tipo_lancamento: payload.tipo_lancamento || 'pago',
      data_inicio_captacao: payload.data_inicio_captacao,
      datas_cpls: payload.data_cpls ? [payload.data_cpls] : null,
      investimento_total: payload.investimento,
      cliente_id: clienteDetectado?.id || null,
      descricao: payload.descricao || null,
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
        investimento_total: novoLancamento.investimento_total
      }
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
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});