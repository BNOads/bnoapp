import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
// Resend SDK removed - using fetch helper

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to send email via Resend REST API
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
    body: JSON.stringify({ from: 'BNOads <noreply@resend.dev>', to: [to], subject, html }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Erro ao enviar email via Resend:', json);
    throw new Error(typeof json?.message === 'string' ? json.message : `Resend error ${res.status}`);
  }
  return { ok: true, result: json } as const;
}

interface ResetPasswordRequest {
  email: string;
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

// Using fetch-based helper for Resend emails

    const { email }: ResetPasswordRequest = await req.json();

    console.log('Solicitação de reset de senha para:', email);

    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    if (userError) {
      throw new Error('Erro ao verificar usuário');
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      // Por segurança, não revelamos se o email existe ou não
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Se o email existir, um link de redefinição será enviado.' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Gerar token único
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token no banco
    const { error: tokenError } = await supabaseClient
      .from('password_reset_tokens')
      .insert({
        email,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) {
      console.error('Erro ao salvar token:', tokenError);
      throw new Error('Erro interno do servidor');
    }

    // Enviar email com link de reset
    const resetUrl = `https://app.bnoads.com.br/auth/reset-password?token=${token}`;
    
    const emailResult = await sendResendEmail(
      email,
      "Redefinição de Senha - Sistema BNOads",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Redefinição de Senha</h1>
          <p>Você solicitou a redefinição de sua senha no Sistema BNOads.</p>
          
          <p>Clique no link abaixo para criar uma nova senha:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Este link expira em 1 hora.</p>
          <p style="color: #666; font-size: 14px;">Se você não solicitou esta redefinição, ignore este email.</p>
          
          <p>Atenciosamente,<br>
          <strong>Equipe BNOads</strong></p>
        </div>
      `
    );

    console.log('Email de reset enviado:', emailResult);

    console.log('Email de reset enviado:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Se o email existir, um link de redefinição foi enviado.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função reset-password:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);