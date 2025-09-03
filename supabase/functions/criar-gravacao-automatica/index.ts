import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestData {
  nome: string;
  link: string;
  titulo?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the forwarded JWT (not service role)
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nivel_acesso')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.nivel_acesso !== 'admin') {
      console.error('Admin check failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { nome, link, titulo }: RequestData = await req.json()

    if (!nome || !link) {
      return new Response(
        JSON.stringify({ error: 'Nome e link são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Buscar cliente pelo nome ou aliases
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nome')
      .or(`nome.ilike.%${nome}%,aliases.cs.{${nome}}`)
      .maybeSingle()

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

    // Usar título fornecido ou criar título automático
    const tituloFinal = titulo || (() => {
      const agora = new Date()
      const dataFormatada = agora.toLocaleDateString('pt-BR')
      return `Reunião ${cliente.nome} - ${dataFormatada}`
    })()

    // Criar gravação usando authenticated user's context (RLS will apply)
    const { data: gravacao, error: gravacaoError } = await supabase
      .from('gravacoes')
      .insert({
        titulo: tituloFinal,
        url_gravacao: link,
        cliente_id: cliente.id,
        descricao: `Gravação de reunião criada automaticamente`,
        tags: ['reuniao', 'automatico'],
        created_by: user.id, // Use authenticated user instead of system placeholder
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

    console.log('Recording created successfully by admin:', user.id);

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