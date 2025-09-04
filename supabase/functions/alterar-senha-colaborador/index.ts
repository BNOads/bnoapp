import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlterarSenhaRequest {
  user_id: string;
  email: string;
  nova_senha: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Obter o token de autorização do header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Token de autorização não fornecido' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Criar cliente com o token do usuário para verificar permissões
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            authorization: authHeader
          }
        }
      }
    );

    const { user_id, email, nova_senha }: AlterarSenhaRequest = await req.json();

    console.log('Alterando senha do colaborador:', { user_id, email });

    if (!user_id || !email || !nova_senha) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'user_id, email e nova_senha são obrigatórios' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verificar se o usuário que está fazendo a requisição é admin
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Usuário não autenticado' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Usuário autenticado:', user.id);

    // Verificar se é admin
    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('nivel_acesso')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Erro ao buscar perfil:', profileError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Erro ao verificar permissões do usuário' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (profile.nivel_acesso !== 'admin') {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Acesso negado - apenas administradores podem alterar senhas' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Usuário autorizado, alterando senha...');

    // Alterar a senha do usuário usando o service role key
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user_id,
      { password: nova_senha }
    );

    if (updateError) {
      console.error('Erro ao alterar senha:', updateError);
      throw new Error(`Erro ao alterar senha: ${updateError.message}`);
    }

    console.log('Senha alterada com sucesso para:', email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Senha alterada com sucesso'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função alterar-senha-colaborador:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);