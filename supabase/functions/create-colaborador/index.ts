import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
// Resend client removed - using fetch helper

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to send emails via Resend API without npm dependency
async function sendResendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.log('RESEND_API_KEY não configurada, pulando envio de email');
    return { ok: false, skipped: true } as const;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BNOads <noreply@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Erro ao enviar email via Resend:', json);
    throw new Error(typeof json?.message === 'string' ? json.message : `Resend error ${res.status}`);
  }

  return { ok: true, result: json } as const;
}

interface CreateColaboradorRequest {
  nome: string;
  email: string;
  nivel_acesso: string;
  data_nascimento?: string;
  estado_civil?: string;
  tamanho_camisa?: string;
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

// Using fetch-based Resend helper instead of SDK

    const { nome, email, nivel_acesso, data_nascimento, estado_civil, tamanho_camisa }: CreateColaboradorRequest = await req.json();

    console.log('Criando colaborador:', { nome, email, nivel_acesso });

    // Gerar senha inicial (email do usuário)
    const senhaInicial = email;

    let authUserId: string;
    let isNewUser = false;

    // Primeiro tentar buscar o usuário por email com paginação
    try {
      console.log('Buscando usuários existentes...');
      
      let existingUser = null;
      let page = 1;
      let hasMore = true;
      
      while (hasMore && !existingUser) {
        const { data: usersPage, error: listError } = await supabaseClient.auth.admin.listUsers({
          page,
          perPage: 1000
        });
        
        if (listError) {
          console.error('Erro ao listar usuários:', listError);
          throw new Error(`Erro ao verificar usuários existentes: ${listError.message}`);
        }

        existingUser = usersPage.users.find(user => user.email === email);
        
        hasMore = usersPage.users.length === 1000;
        page++;
      }

      if (existingUser) {
        console.log('Usuário encontrado no auth:', existingUser.id);
        authUserId = existingUser.id;
        isNewUser = false;
        console.log('Usuário existe no auth, verificando perfil...');
      } else {
        console.log('Usuário não encontrado, criando novo...');
        
        // Criar novo usuário
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email,
          password: senhaInicial,
          email_confirm: true,
          user_metadata: {
            nome: nome,
            primeiro_login: true
          }
        });

        if (authError) {
          console.error('Erro ao criar usuário auth:', authError);
          throw new Error(`Erro ao criar usuário: ${authError.message}`);
        }

        authUserId = authUser.user.id;
        isNewUser = true;
        console.log('Novo usuário criado:', authUserId);
      }
    } catch (error: any) {
      console.error('Erro no processo de verificação/criação de usuário:', error);
      throw error;
    }

    // Verificar se já existe perfil e criar apenas se necessário
    let needsProfile = false;
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', authUserId)
      .single();

    if (!existingProfile) {
      needsProfile = true;
      console.log('Criando perfil para o usuário...');
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          user_id: authUserId,
          nome,
          email,
          nivel_acesso,
          primeiro_login: true
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }
    } else {
      console.log('Perfil já existe para este usuário');
    }

    // Criar colaborador
    const colaboradorData: any = {
      user_id: authUserId,
      nome,
      email,
      nivel_acesso,
      primeiro_login: true
    };

    if (data_nascimento) colaboradorData.data_nascimento = data_nascimento;
    if (estado_civil) colaboradorData.estado_civil = estado_civil;
    if (tamanho_camisa) colaboradorData.tamanho_camisa = tamanho_camisa;

    const { error: colaboradorError } = await supabaseClient
      .from('colaboradores')
      .insert(colaboradorData);

    if (colaboradorError) {
      console.error('Erro ao criar colaborador:', colaboradorError);
      throw new Error(`Erro ao criar colaborador: ${colaboradorError.message}`);
    }

    // Sempre enviar email com credenciais para novos colaboradores
    let emailSent = false;
    try {
      console.log('Enviando email para:', email);
      const emailResult = await sendResendEmail(
        email,
        "Bem-vindo ao Sistema BNOads - Acesso Criado",
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Bem-vindo ao Sistema BNOads!</h1>
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Sua conta foi ${isNewUser ? 'criada' : 'configurada'} com sucesso no Sistema BNOads. Abaixo estão suas credenciais de acesso:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Senha:</strong> ${senhaInicial}</p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p><strong>⚠️ IMPORTANTE:</strong> ${isNewUser ? 'Por segurança, você será obrigado a alterar sua senha no primeiro login.' : 'Use suas credenciais para acessar o sistema.'}</p>
            </div>
            
            <p>Para acessar o sistema, visite: <a href="https://app.bnoads.com.br/auth" style="color: #2563eb;">https://app.bnoads.com.br/auth</a></p>
            
            <p>Se você tiver alguma dúvida, entre em contato com nossa equipe.</p>
            
            <p>Bem-vindo à equipe!<br>
            <strong>Equipe BNOads</strong></p>
          </div>
        `
      );

      console.log('Email enviado com sucesso:', emailResult);
      emailSent = !!emailResult?.ok;

      console.log('Email enviado com sucesso:', emailResult);
      emailSent = !!emailResult?.ok;
      
      if (!emailResult.ok && !emailResult.skipped) {
        console.error('Erro do Resend:', emailResult);
        throw new Error('Erro ao enviar email');
      }
    } catch (emailError: any) {
      console.error('Erro ao enviar email:', emailError);
      console.log('Colaborador criado mas email não foi enviado devido ao erro:', emailError.message);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: isNewUser ? 'Colaborador criado com sucesso' : 'Colaborador adicionado ao sistema (usuário já existia)',
      user_id: authUserId,
      is_new_user: isNewUser,
      email_sent: emailSent,
      debug_info: {
        existing_user_found: !isNewUser,
        profile_created: needsProfile,
        colaborador_created: true
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função create-colaborador:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);