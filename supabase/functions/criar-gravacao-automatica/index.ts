import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestData {
  nome: string;
  link: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { nome, link }: RequestData = await req.json()

    if (!nome || !link) {
      return new Response(
        JSON.stringify({ error: 'Nome e link são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Buscar cliente pelo nome
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nome')
      .ilike('nome', `%${nome}%`)
      .single()

    if (clienteError || !cliente) {
      return new Response(
        JSON.stringify({ 
          error: 'Cliente não encontrado',
          nome_procurado: nome 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar título automático
    const agora = new Date()
    const dataFormatada = agora.toLocaleDateString('pt-BR')
    const titulo = `Reunião ${cliente.nome} - ${dataFormatada}`

    // Criar gravação
    const { data: gravacao, error: gravacaoError } = await supabase
      .from('gravacoes')
      .insert({
        titulo,
        url_gravacao: link,
        cliente_id: cliente.id,
        descricao: `Gravação de reunião criada automaticamente`,
        tags: ['reuniao', 'automatico'],
        created_by: null, // Sistema automático
        visualizacoes: 0
      })
      .select()
      .single()

    if (gravacaoError) {
      console.error('Erro ao criar gravação:', gravacaoError)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar gravação',
          details: gravacaoError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        gravacao: {
          id: gravacao.id,
          titulo: gravacao.titulo,
          cliente: cliente.nome,
          url: gravacao.url_gravacao
        },
        message: 'Gravação criada com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})