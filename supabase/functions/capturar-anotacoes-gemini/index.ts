import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeminiNotesRequest {
  meetingUrl?: string;
  documentUrl?: string;
  clienteNome?: string;
  titulo?: string;
  anotacoes: string;
  dataReuniao?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Capturar anotações Gemini function called');
    
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the forwarded JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user is authenticated and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      meetingUrl,
      documentUrl, 
      clienteNome,
      titulo,
      anotacoes,
      dataReuniao
    }: GeminiNotesRequest = await req.json();
    
    if (!anotacoes) {
      return new Response(
        JSON.stringify({ error: 'Anotações são obrigatórias' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processando anotações do Gemini:', { clienteNome, titulo });

    // Buscar cliente se nome fornecido
    let clienteId = null;
    if (clienteNome) {
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('id, nome')
        .or(`nome.ilike.%${clienteNome}%,aliases.cs.{${clienteNome}}`)
        .maybeSingle();

      if (cliente) {
        clienteId = cliente.id;
        console.log(`Cliente encontrado: ${cliente.nome}`);
      } else {
        console.log(`Cliente não encontrado: ${clienteNome}`);
      }
    }

    // Gerar título se não fornecido
    const tituloFinal = titulo || (() => {
      const agora = dataReuniao ? new Date(dataReuniao) : new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR');
      const clienteTexto = clienteNome ? ` - ${clienteNome}` : '';
      return `Anotações Gemini${clienteTexto} - ${dataFormatada}`;
    })();

    // Verificar se já existe uma gravação com URL similar
    let gravacaoExistente = null;
    if (meetingUrl) {
      const { data: existingGravacao } = await supabase
        .from('gravacoes')
        .select('id, titulo')
        .eq('url_gravacao', meetingUrl)
        .maybeSingle();
      
      gravacaoExistente = existingGravacao;
    }

    if (gravacaoExistente) {
      // Atualizar gravação existente com as anotações
      const { error: updateError } = await supabase
        .from('gravacoes')
        .update({
          transcricao: anotacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', gravacaoExistente.id);

      if (updateError) {
        console.error('Erro ao atualizar gravação:', updateError);
        throw updateError;
      }

      console.log(`Anotações adicionadas à gravação existente: ${gravacaoExistente.titulo}`);

      // Processar as anotações com IA
      await processarAnotacoesComIA(gravacaoExistente.id, 'gravacao', anotacoes);

      return new Response(JSON.stringify({
        success: true,
        action: 'updated',
        gravacao: {
          id: gravacaoExistente.id,
          titulo: gravacaoExistente.titulo
        },
        message: 'Anotações adicionadas à gravação existente'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Criar nova gravação com as anotações
      const { data: novaGravacao, error: insertError } = await supabase
        .from('gravacoes')
        .insert({
          titulo: tituloFinal,
          transcricao: anotacoes,
          url_gravacao: meetingUrl || documentUrl || `https://docs.google.com/document/gemini-${Date.now()}`,
          cliente_id: clienteId,
          created_by: user.id,
          descricao: 'Anotações capturadas automaticamente do Gemini',
          tags: ['gemini', 'anotacoes', 'reuniao'],
          visualizacoes: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar gravação:', insertError);
        throw insertError;
      }

      console.log(`Nova gravação criada: ${novaGravacao.titulo}`);

      // Processar as anotações com IA
      await processarAnotacoesComIA(novaGravacao.id, 'gravacao', anotacoes);

      return new Response(JSON.stringify({
        success: true,
        action: 'created',
        gravacao: {
          id: novaGravacao.id,
          titulo: novaGravacao.titulo
        },
        message: 'Nova gravação criada com anotações do Gemini'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Erro ao capturar anotações do Gemini:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função para processar anotações com IA
async function processarAnotacoesComIA(id: string, tipo: string, transcricao: string) {
  try {
    console.log(`Enviando anotações para processamento IA: ${tipo} ${id}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Chamar função de processamento de transcrição
    const response = await fetch(`${supabaseUrl}/functions/v1/processar-transcricao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        tipo,
        transcricao
      })
    });

    if (!response.ok) {
      console.error('Erro ao processar com IA:', await response.text());
    } else {
      console.log('Anotações processadas com IA com sucesso');
    }
  } catch (error) {
    console.error('Erro ao chamar processamento IA:', error);
  }
}