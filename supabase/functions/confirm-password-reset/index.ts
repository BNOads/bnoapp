import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmResetRequest {
  token: string;
  newPassword: string;
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
    
    const { token, newPassword }: ConfirmResetRequest = await req.json();

    console.log('Confirmação de reset de senha com token:', token);

    // Verificar token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('Token inválido ou expirado:', tokenError);
      return new Response(JSON.stringify({ 
        error: 'Token inválido ou expirado' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Buscar usuário pelo email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    if (userError) {
      throw new Error('Erro ao verificar usuário');
    }

    const user = userData.users.find(u => u.email === tokenData.email);
    
    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'Usuário não encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Atualizar senha do usuário
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError);
      throw new Error('Erro ao atualizar senha');
    }

    // Marcar token como usado
    const { error: markUsedError } = await supabaseClient
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    if (markUsedError) {
      console.error('Erro ao marcar token como usado:', markUsedError);
    }

    console.log('Senha redefinida com sucesso para:', tokenData.email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Senha redefinida com sucesso' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função confirm-password-reset:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);