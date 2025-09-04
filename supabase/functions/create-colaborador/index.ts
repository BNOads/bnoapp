import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const { nome, email, nivel_acesso, data_nascimento, estado_civil, tamanho_camisa }: CreateColaboradorRequest = await req.json();

    console.log('Criando colaborador:', { nome, email, nivel_acesso });

    // Gerar senha inicial (email do usuário)
    const senhaInicial = email;

    let authUserId: string;
    let isNewUser = false;

    // Verificar se o usuário já existe no auth
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError);
      throw new Error(`Erro ao verificar usuários existentes: ${listError.message}`);
    }

    const existingUser = existingUsers.users.find(user => user.email === email);

    if (existingUser) {
      console.log('Usuário já existe no auth:', existingUser.id);
      authUserId = existingUser.id;
      
      // Verificar se já tem perfil
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', authUserId)
        .single();

      if (existingProfile) {
        throw new Error('Este usuário já está cadastrado como colaborador.');
      }
    } else {
      console.log('Criando novo usuário no auth...');
      
      // Criar usuário no auth
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
      console.log('Usuário auth criado:', authUserId);
    }

    // Criar perfil
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

    // Enviar email com senha inicial apenas para novos usuários
    if (isNewUser) {
      const emailResponse = await resend.emails.send({
        from: "BNOads <noreply@resend.dev>",
        to: [email],
        subject: "Bem-vindo ao Sistema BNOads - Acesso Criado",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Bem-vindo ao Sistema BNOads!</h1>
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Sua conta foi criada com sucesso no Sistema BNOads. Abaixo estão suas credenciais de acesso:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Senha inicial:</strong> ${senhaInicial}</p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p><strong>⚠️ IMPORTANTE:</strong> Por segurança, você será obrigado a alterar sua senha no primeiro login.</p>
            </div>
            
            <p>Para acessar o sistema, visite: <a href="https://app.bnoads.com.br/auth" style="color: #2563eb;">https://app.bnoads.com.br/auth</a></p>
            
            <p>Se você tiver alguma dúvida, entre em contato com nossa equipe.</p>
            
            <p>Bem-vindo à equipe!<br>
            <strong>Equipe BNOads</strong></p>
          </div>
        `,
      });

      console.log('Email enviado:', emailResponse);
    } else {
      console.log('Usuário já existia, email não enviado');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: isNewUser ? 'Colaborador criado com sucesso' : 'Colaborador adicionado ao sistema (usuário já existia)',
      user_id: authUserId,
      is_new_user: isNewUser
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função create-colaborador:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);