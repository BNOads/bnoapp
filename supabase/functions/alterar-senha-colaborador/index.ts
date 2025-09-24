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
    console.log('=== INÍCIO DA FUNÇÃO alterar-senha-colaborador ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Cliente Supabase criado com service role');

    // Obter o token de autorização do header
    const authHeader = req.headers.get('authorization');
    console.log('Auth header presente:', !!authHeader);
    
    if (!authHeader) {
      console.error('Token de autorização não encontrado');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Token de autorização não fornecido' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

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

    // Extrair o token JWT do header
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extraído, tamanho:', token.length);

    // Usar o service role para verificar se o usuário é admin
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Erro ao verificar usuário:', userError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Token de autorização inválido' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Usuário autenticado:', userData.user.id);

    // Verificar se é admin usando service role
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nivel_acesso')
      .eq('user_id', userData.user.id)
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

    console.log('Nível de acesso do usuário:', profile.nivel_acesso);

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
      return new Response(JSON.stringify({ 
        success: false,
        error: `Erro ao alterar senha: ${updateError.message}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
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
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);