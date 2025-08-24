import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  titulo: string;
  conteudo: string;
  tipo?: 'info' | 'alerta' | 'sucesso' | 'erro';
  prioridade?: 'baixa' | 'normal' | 'alta' | 'critica';
  destinatarios?: string[];
  canais?: {
    painel?: boolean;
    slack?: boolean;
    email?: boolean;
  };
  dataInicio?: string;
  dataFim?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return new Response(JSON.stringify({ error: 'Token de autorização necessário' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      }
    );

    // Verificar se o usuário é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('nivel_acesso')
      .eq('user_id', user.id)
      .single();

    if (profile?.nivel_acesso !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, ...data } = await req.json();

    switch (action) {
      case 'create_notification':
        return await createNotification(supabase, data as NotificationRequest, user.id);

      case 'send_to_slack':
        return await sendToSlack(data.avisoId, data.webhookUrl);

      case 'get_webhooks':
        return await getSlackWebhooks(supabase);

      case 'save_webhook':
        return await saveSlackWebhook(supabase, data);

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Erro nas notificações:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createNotification(supabase: any, data: NotificationRequest, userId: string) {
  const canaisDefault = {
    painel: true,
    slack: false,
    email: false,
    ...data.canais
  };

  // Criar aviso no banco
  const { data: aviso, error: avisoError } = await supabase
    .from('avisos')
    .insert({
      titulo: data.titulo,
      conteudo: data.conteudo,
      tipo: data.tipo || 'info',
      prioridade: data.prioridade || 'normal',
      destinatarios: data.destinatarios || ['all'],
      canais: canaisDefault,
      data_inicio: data.dataInicio,
      data_fim: data.dataFim,
      created_by: userId
    })
    .select()
    .single();

  if (avisoError) throw avisoError;

  // Se configurado para enviar para Slack, enviar automaticamente
  if (canaisDefault.slack) {
    const { data: webhooks } = await supabase
      .from('slack_webhooks')
      .select('*')
      .eq('ativo', true);

    for (const webhook of webhooks || []) {
      if (webhook.tipos_aviso.length === 0 || webhook.tipos_aviso.includes(data.tipo)) {
        await sendToSlackWebhook(webhook.webhook_url, {
          titulo: data.titulo,
          conteudo: data.conteudo,
          tipo: data.tipo || 'info',
          prioridade: data.prioridade || 'normal'
        });
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    aviso,
    message: 'Notificação criada com sucesso'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function sendToSlack(avisoId: string, webhookUrl: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Buscar o aviso
  const { data: aviso, error } = await supabase
    .from('avisos')
    .select('*')
    .eq('id', avisoId)
    .single();

  if (error) throw error;

  await sendToSlackWebhook(webhookUrl, aviso);

  return new Response(JSON.stringify({
    success: true,
    message: 'Notificação enviada para Slack'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function sendToSlackWebhook(webhookUrl: string, aviso: any) {
  const cores = {
    info: '#3498db',
    sucesso: '#2ecc71',
    alerta: '#f39c12',
    erro: '#e74c3c'
  };

  const icones = {
    info: ':information_source:',
    sucesso: ':white_check_mark:',
    alerta: ':warning:',
    erro: ':x:'
  };

  const payload = {
    attachments: [
      {
        color: cores[aviso.tipo as keyof typeof cores] || cores.info,
        title: `${icones[aviso.tipo as keyof typeof icones] || icones.info} ${aviso.titulo}`,
        text: aviso.conteudo,
        fields: [
          {
            title: 'Prioridade',
            value: aviso.prioridade.toUpperCase(),
            short: true
          },
          {
            title: 'Tipo',
            value: aviso.tipo.toUpperCase(),
            short: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar para Slack: ${response.statusText}`);
  }
}

async function getSlackWebhooks(supabase: any) {
  const { data: webhooks, error } = await supabase
    .from('slack_webhooks')
    .select('*')
    .order('nome');

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    webhooks
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function saveSlackWebhook(supabase: any, data: any) {
  const { error } = await supabase
    .from('slack_webhooks')
    .upsert({
      id: data.id,
      nome: data.nome,
      webhook_url: data.webhook_url,
      canal: data.canal,
      tipos_aviso: data.tipos_aviso || [],
      ativo: data.ativo !== false
    });

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    message: 'Webhook salvo com sucesso'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}