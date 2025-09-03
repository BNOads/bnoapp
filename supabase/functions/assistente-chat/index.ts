import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Assistente chat function called');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

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

    const { message } = await req.json();
    console.log('Mensagem recebida:', message);
    console.log('User ID:', user.id);

    // Get user profile to check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('nivel_acesso, nome, email')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.nivel_acesso === 'admin';

    // Buscar informações do sistema para contexto (agora usando RLS)
    const systemContext = await getSystemContext(supabase, user.id, isAdmin);
    
    // Preparar prompt para o ChatGPT
    const systemPrompt = `Você é um assistente inteligente da BNOads, uma agência de marketing digital especializada em tráfego pago e gestão de clientes.

CONTEXTO DO SISTEMA (filtrado por permissões):
${systemContext}

INSTRUÇÕES PARA O ASSISTENTE:
- Responda sempre em português brasileiro
- Seja útil, profissional e amigável
- Use as informações do sistema quando relevante
- Você pode responder sobre: clientes, colaboradores, treinamentos, aulas, PDIs, reuniões, gravações, criativos, referências, orçamentos, tarefas, avisos
- Forneça informações específicas quando solicitado (IDs, links, datas, valores, etc.)
- Quando mencionar clientes, sempre inclua o link do painel quando disponível
- Para treinamentos e aulas, mencione detalhes como duração, categoria e progresso
- Para PDIs, informe status e prazos
- Para reuniões, inclua datas e participantes
- Se precisar de informações mais específicas, sugira onde encontrar na plataforma
- Mantenha as respostas informativas mas organizadas
- Sempre que possível, ofereça ações práticas ou próximos passos
- IMPORTANTE: Respeite as permissões do usuário - nem todos têm acesso a todos os dados`;

    console.log('Enviando requisição para OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro da OpenAI:', errorData);
      throw new Error(`Erro da OpenAI: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da OpenAI recebida');

    const assistantResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no assistente chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getSystemContext(supabase: any, userId: string, isAdmin: boolean) {
  try {
    let context = "SISTEMA BNOADS - BASE DE CONHECIMENTO (com permissões aplicadas):\n\n";

    // Buscar dados do usuário atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile) {
      context += `Usuário logado: ${profile.nome} (${profile.email})\n`;
      context += `Nível de acesso: ${profile.nivel_acesso}\n\n`;
    }

    // CLIENTES - Informações filtradas por RLS
    const { data: clientes } = await supabase
      .from('clientes')
      .select(`
        id, nome, status_cliente, categoria, nicho, link_painel, 
        data_inicio, etapa_atual, progresso_etapa, funis_trabalhando,
        observacoes, ultimo_acesso, total_acessos
        ${isAdmin ? ', pasta_drive_url, whatsapp_grupo_url, aliases, dashboards_looker' : ''}
      `)
      .eq('ativo', true);

    if (clientes && clientes.length > 0) {
      context += `=== CLIENTES (${clientes.length} ativos) ===\n`;
      clientes.forEach((cliente: any) => {
        context += `• ${cliente.nome} [ID: ${cliente.id}]\n`;
        context += `  - Categoria: ${cliente.categoria} | Nicho: ${cliente.nicho}\n`;
        context += `  - Status: ${cliente.status_cliente}\n`;
        context += `  - Etapa atual: ${cliente.etapa_atual || 'Não definida'}\n`;
        context += `  - Funis: ${cliente.funis_trabalhando?.join(', ') || 'Nenhum'}\n`;
        context += `  - Painel: ${cliente.link_painel}\n`;
        
        // Sensitive data only for admins
        if (isAdmin) {
          context += `  - Drive: ${cliente.pasta_drive_url || 'Não configurado'}\n`;
          if (cliente.whatsapp_grupo_url) {
            context += `  - WhatsApp: [LINK DISPONÍVEL - acesso admin]\n`;
          }
        }
        
        if (cliente.observacoes) context += `  - Obs: ${cliente.observacoes.substring(0, 150)}...\n`;
        context += `\n`;
      });
    }

    // COLABORADORES - Only for admins or limited info
    if (isAdmin) {
      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select(`
          id, nome, email, nivel_acesso, data_admissao, 
          progresso_treinamentos, tempo_plataforma
        `)
        .eq('ativo', true);

      if (colaboradores && colaboradores.length > 0) {
        context += `=== COLABORADORES (${colaboradores.length} ativos) ===\n`;
        colaboradores.forEach((colab: any) => {
          context += `• ${colab.nome} (${colab.email})\n`;
          context += `  - Acesso: ${colab.nivel_acesso}\n`;
          context += `  - Admissão: ${colab.data_admissao ? new Date(colab.data_admissao).toLocaleDateString('pt-BR') : 'Não informado'}\n`;
          context += `  - Tempo na plataforma: ${colab.tempo_plataforma || 0} horas\n`;
          context += `\n`;
        });
      }
    }

    // TREINAMENTOS E AULAS - Available to all authenticated users
    const { data: treinamentos } = await supabase
      .from('treinamentos')
      .select(`
        id, titulo, categoria, tipo, nivel, descricao, 
        duracao, visualizacoes, tags
      `)
      .eq('ativo', true);

    const { data: aulas } = await supabase
      .from('aulas')
      .select(`
        id, titulo, treinamento_id, tipo_conteudo, duracao, 
        ordem, descricao
      `)
      .eq('ativo', true);

    if (treinamentos && treinamentos.length > 0) {
      context += `=== TREINAMENTOS (${treinamentos.length} disponíveis) ===\n`;
      treinamentos.forEach((treino: any) => {
        const aulasDoTreino = aulas?.filter(a => a.treinamento_id === treino.id) || [];
        context += `• ${treino.titulo} [${treino.categoria}]\n`;
        context += `  - Tipo: ${treino.tipo} | Nível: ${treino.nivel}\n`;
        context += `  - Duração: ${treino.duracao || 'N/A'} min | Views: ${treino.visualizacoes || 0}\n`;
        context += `  - Aulas: ${aulasDoTreino.length}\n`;
        if (treino.tags) context += `  - Tags: ${treino.tags.join(', ')}\n`;
        if (treino.descricao) context += `  - Desc: ${treino.descricao.substring(0, 100)}...\n`;
        context += `\n`;
      });
    }

    // REFERÊNCIAS - Limited data without sensitive URLs
    const { data: referencias } = await supabase
      .from('referencias_criativos')
      .select(`
        id, titulo, categoria, is_template, link_publico
      `)
      .eq('ativo', true)
      .limit(20);

    if (referencias && referencias.length > 0) {
      context += `=== REFERÊNCIAS DE CRIATIVOS (${referencias.length}) ===\n`;
      referencias.forEach((ref: any) => {
        context += `• ${ref.titulo} [${ref.categoria}]\n`;
        context += `  - Template: ${ref.is_template ? 'Sim' : 'Não'}\n`;
        if (ref.link_publico) {
          context += `  - Link público: ${ref.link_publico}\n`;
        }
        context += `\n`;
      });
    }

    // ORÇAMENTOS - Only totals for non-admins
    const { data: orcamentos } = await supabase
      .from('orcamentos_funil')
      .select(isAdmin ? `
        id, nome_funil, valor_investimento, cliente_id, 
        observacoes, ativo, data_atualizacao
      ` : 'valor_investimento')
      .eq('ativo', true)
      .limit(20);

    if (orcamentos && orcamentos.length > 0) {
      const totalInvestimento = orcamentos.reduce((sum, orc) => sum + (parseFloat(orc.valor_investimento) || 0), 0);
      context += `=== ORÇAMENTOS ===\n`;
      context += `Total em investimentos: R$ ${totalInvestimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
      
      if (isAdmin) {
        context += `Detalhes (${orcamentos.length} ativos):\n`;
        orcamentos.forEach((orc: any) => {
          context += `• ${orc.nome_funil}\n`;
          context += `  - Valor: R$ ${parseFloat(orc.valor_investimento).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
          context += `  - Atualizado: ${new Date(orc.data_atualizacao).toLocaleDateString('pt-BR')}\n`;
          context += `\n`;
        });
      }
      context += `\n`;
    }

    // ESTATÍSTICAS GERAIS
    context += `=== ESTATÍSTICAS GERAIS ===\n`;
    context += `- Total de clientes ativos: ${clientes?.length || 0}\n`;
    context += `- Total de treinamentos: ${treinamentos?.length || 0}\n`;
    context += `- Total de aulas: ${aulas?.length || 0}\n`;
    context += `- Total de referências: ${referencias?.length || 0}\n`;
    context += `- Orçamentos ativos: ${orcamentos?.length || 0}\n`;

    if (!isAdmin) {
      context += `\nNOTA: Dados sensíveis (URLs, contatos) estão limitados ao seu nível de acesso.\n`;
    }

    return context;

  } catch (error) {
    console.error('Erro ao buscar contexto do sistema:', error);
    return "Erro ao carregar informações do sistema. Dados filtrados por permissões de usuário.";
  }
}