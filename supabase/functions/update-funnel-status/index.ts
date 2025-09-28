import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização não fornecido');
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se o usuário tem permissão (admin ou pode criar conteúdo)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nivel_acesso')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil do usuário não encontrado');
    }

    const canEdit = ['admin', 'dono', 'gestor_trafego', 'gestor_projetos', 'cs', 'webdesigner', 'editor_video'].includes(profile.nivel_acesso);
    if (!canEdit) {
      throw new Error('Usuário não tem permissão para alterar status do funil');
    }

    // Obter dados da requisição
    const { cliente_id, funnel_status } = await req.json();

    if (!cliente_id || typeof funnel_status !== 'boolean') {
      throw new Error('Dados inválidos fornecidos');
    }

    // Buscar status atual do cliente
    const { data: currentClient, error: fetchError } = await supabase
      .from('clientes')
      .select('funnel_status')
      .eq('id', cliente_id)
      .single();

    if (fetchError) {
      throw new Error('Cliente não encontrado');
    }

    const oldStatus = currentClient.funnel_status;

    // Atualizar status do funil
    const { error: updateError } = await supabase
      .from('clientes')
      .update({ funnel_status })
      .eq('id', cliente_id);

    if (updateError) {
      throw new Error('Erro ao atualizar status do funil');
    }

    // Registrar no audit log
    const { error: auditError } = await supabase
      .from('funnel_status_audit_log')
      .insert({
        cliente_id,
        user_id: user.id,
        old_status: oldStatus,
        new_status: funnel_status,
      });

    if (auditError) {
      console.error('Erro ao registrar audit log:', auditError);
      // Não falhar a operação se o audit log falhar
    }

    console.log(`Status do funil alterado para cliente ${cliente_id}: ${oldStatus} -> ${funnel_status} por ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Status do funil atualizado com sucesso',
        old_status: oldStatus,
        new_status: funnel_status
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Erro na function update-funnel-status:', error);
    
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Erro interno do servidor' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});