import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  nome: string;
  kickoff?: string;
  pasta_drive_url?: string;
  categoria?: 'infoproduto' | 'e-commerce' | 'lead_gen' | 'branding' | 'outros';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook novo cliente - Iniciando processamento...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: WebhookPayload = await req.json();
    console.log('Payload recebido:', payload);

    // Validate required fields
    if (!payload.nome) {
      console.error('Nome do cliente é obrigatório');
      return new Response(
        JSON.stringify({ error: 'Nome do cliente é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract drive folder ID from URL if provided
    let drive_folder_id = null;
    if (payload.pasta_drive_url) {
      const driveMatch = payload.pasta_drive_url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      if (driveMatch) {
        drive_folder_id = driveMatch[1];
      }
    }

    // Prepare client data
    const clienteData = {
      nome: payload.nome.trim(),
      categoria: payload.categoria || 'infoproduto',
      pasta_drive_url: payload.pasta_drive_url || null,
      drive_folder_id: drive_folder_id,
      status_cliente: 'ativo',
      etapa_atual: 'kickoff',
      data_inicio: new Date().toISOString().split('T')[0],
      observacoes: payload.kickoff || null,
      ativo: true
    };

    console.log('Dados do cliente preparados:', clienteData);

    // Insert new client
    const { data: novoCliente, error: clienteError } = await supabase
      .from('clientes')
      .insert([clienteData])
      .select()
      .single();

    if (clienteError) {
      console.error('Erro ao criar cliente:', clienteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar cliente: ' + clienteError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Cliente criado com sucesso:', novoCliente);

    // Create kickoff content if provided
    if (payload.kickoff && novoCliente) {
      const kickoffData = {
        kickoff_id: novoCliente.id,
        version: 1,
        created_by: novoCliente.id, // Using client ID as creator since this is automated
        content_md: `# Kickoff - ${payload.nome}\n\n${payload.kickoff}`
      };

      const { error: kickoffError } = await supabase
        .from('kickoff_content')
        .insert([kickoffData]);

      if (kickoffError) {
        console.warn('Erro ao criar conteúdo do kickoff:', kickoffError);
        // Don't fail the entire operation if kickoff creation fails
      } else {
        console.log('Conteúdo do kickoff criado com sucesso');
      }
    }

    // Return success response
    const response = {
      success: true,
      message: 'Cliente criado com sucesso',
      cliente: {
        id: novoCliente.id,
        nome: novoCliente.nome,
        link_painel: novoCliente.link_painel,
        categoria: novoCliente.categoria,
        status: novoCliente.status_cliente
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