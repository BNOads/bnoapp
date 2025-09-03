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

    // Get user profile to check admin status and client association
    const { data: profile } = await supabase
      .from('profiles')
      .select('nivel_acesso, nome, email')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.nivel_acesso === 'admin';

    // Check if user is associated with a specific client
    let userClientId = null;
    if (!isAdmin) {
      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (colaborador) {
        // Check if this collaborator is assigned to specific clients
        const { data: clientAssignments } = await supabase
          .from('clientes')
          .select('id, nome')
          .or(`cs_id.eq.${colaborador.id},traffic_manager_id.eq.${colaborador.id}`)
          .limit(1);
        
        if (clientAssignments && clientAssignments.length > 0) {
          userClientId = clientAssignments[0].id;
        }
      }
    }

    // Buscar informações do sistema para contexto (agora com permissões por cliente)
    const systemContext = await getSystemContext(supabase, user.id, isAdmin, userClientId);
    
    // Preparar prompt inteligente para o ChatGPT
    const systemPrompt = `Você é o Assistente IA da BNOads, especializado em marketing digital e gestão de clientes.

PERFIL DO USUÁRIO:
- Nome: ${profile?.nome}
- Email: ${profile?.email}
- Nível: ${profile?.nivel_acesso}
- Acesso: ${isAdmin ? 'Administrador (acesso completo)' : userClientId ? 'Cliente específico' : 'Equipe geral'}

CONTEXTO COMPLETO DO SISTEMA:
${systemContext}

INSTRUÇÕES AVANÇADAS:
- Você tem acesso COMPLETO aos dados do sistema respeitando as permissões do usuário
- Para PAINÉIS: Forneça links diretos, métricas específicas e interpretações dos dados
- Para REFERÊNCIAS: Mencione links públicos, categorias e suggira materiais relevantes
- Para AULAS/CURSOS: Recomende conteúdo específico baseado na dúvida, inclua durações e URLs quando disponível
- Para CLIENTES: Forneça informações detalhadas sobre status, progresso, orçamentos e links de painel
- Para GRAVAÇÕES: Sugira gravações relevantes com links diretos
- Para TAREFAS: Priorize por urgência e relevância para o usuário
- Para PDIS: Acompanhe progressos e prazos

COMPORTAMENTO INTELIGENTE:
- Sempre inclua links diretos e ações práticas
- Sugira próximos passos baseados no contexto
- Para dúvidas sobre métricas, interprete os dados disponíveis
- Para pedidos de material, recomende especificamente do nosso catálogo
- Mantenha respostas organizadas e acionáveis
- Se não tiver informação específica, sugira onde encontrar no sistema
- Para clientes: sempre priorize informações do SEU cliente quando aplicável

FORMATO DE RESPOSTA:
- Use seções organizadas (### Título)
- Inclua links diretos quando disponíveis
- Destaque informações importantes com **negrito**
- Sugira ações práticas sempre que possível`;

    console.log('Enviando requisição para OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_completion_tokens: 1500,
        temperature: 0.3, // Reduzir para respostas mais consistentes
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

async function getSystemContext(supabase: any, userId: string, isAdmin: boolean, userClientId: string | null = null) {
  try {
    let context = "🎯 SISTEMA BNOADS - COPILOTO INTELIGENTE\n\n";

    // Buscar dados do usuário atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile) {
      context += `👤 USUÁRIO ATUAL: ${profile.nome} (${profile.email})\n`;
      context += `🔐 Nível de acesso: ${profile.nivel_acesso}\n\n`;
    }

    // CLIENTES - Informações completas com foco no cliente específico
    let clientesQuery = supabase
      .from('clientes')
      .select(`
        id, nome, status_cliente, categoria, nicho, link_painel, 
        data_inicio, etapa_atual, progresso_etapa, funis_trabalhando,
        observacoes, ultimo_acesso, total_acessos, dashboards_looker,
        pasta_drive_url, whatsapp_grupo_url, aliases
      `)
      .eq('ativo', true);

    // If user has specific client access, prioritize that client
    if (userClientId && !isAdmin) {
      clientesQuery = clientesQuery.eq('id', userClientId);
    }

    const { data: clientes } = await clientesQuery;

    if (clientes && clientes.length > 0) {
      context += `📊 CLIENTES (${clientes.length} ${userClientId ? 'seu cliente' : 'ativos'}) ===\n`;
      clientes.forEach((cliente: any) => {
        context += `\n🏢 **${cliente.nome}** [ID: ${cliente.id}]\n`;
        context += `   📈 Painel: ${cliente.link_painel || 'Não configurado'}\n`;
        context += `   📋 Status: ${cliente.status_cliente} | Categoria: ${cliente.categoria}\n`;
        context += `   🎯 Nicho: ${cliente.nicho} | Etapa: ${cliente.etapa_atual || 'Não definida'}\n`;
        context += `   🚀 Funis: ${cliente.funis_trabalhando?.join(', ') || 'Nenhum'}\n`;
        context += `   📊 Progresso: ${cliente.progresso_etapa || 0}%\n`;
        
        if (isAdmin || userClientId) {
          context += `   💾 Drive: ${cliente.pasta_drive_url || 'Não configurado'}\n`;
          context += `   💬 WhatsApp: ${cliente.whatsapp_grupo_url || 'Não configurado'}\n`;
          if (cliente.dashboards_looker) {
            context += `   📊 Dashboards: ${JSON.stringify(cliente.dashboards_looker)}\n`;
          }
        }
        
        if (cliente.observacoes) context += `   📝 Obs: ${cliente.observacoes.substring(0, 200)}...\n`;
        context += `   📅 Último acesso: ${cliente.ultimo_acesso ? new Date(cliente.ultimo_acesso).toLocaleDateString('pt-BR') : 'Nunca'}\n`;
        context += `   🔢 Total acessos: ${cliente.total_acessos || 0}\n`;
      });
      context += `\n`;
    }

    // ORÇAMENTOS POR FUNIL - Dados específicos do cliente ou gerais
    let orcamentosQuery = supabase
      .from('orcamentos_funil')
      .select(`
        id, nome_funil, valor_investimento, cliente_id, 
        observacoes, ativo, data_atualizacao
      `)
      .eq('ativo', true);

    if (userClientId && !isAdmin) {
      orcamentosQuery = orcamentosQuery.eq('cliente_id', userClientId);
    }

    const { data: orcamentos } = await orcamentosQuery.limit(20);

    if (orcamentos && orcamentos.length > 0) {
      const totalInvestimento = orcamentos.reduce((sum, orc) => sum + (parseFloat(orc.valor_investimento) || 0), 0);
      context += `💰 ORÇAMENTOS POR FUNIL (${orcamentos.length} ativos)\n`;
      context += `💎 **Total investimento: R$ ${totalInvestimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}**\n\n`;
      
      orcamentos.forEach((orc: any) => {
        const clienteNome = clientes?.find(c => c.id === orc.cliente_id)?.nome || 'Cliente não encontrado';
        context += `🎯 **${orc.nome_funil}** (${clienteNome})\n`;
        context += `   💵 Valor: R$ ${parseFloat(orc.valor_investimento).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
        context += `   📅 Atualizado: ${new Date(orc.data_atualizacao).toLocaleDateString('pt-BR')}\n`;
        if (orc.observacoes) context += `   📝 Obs: ${orc.observacoes.substring(0, 100)}...\n`;
        context += `\n`;
      });
    }

    // TREINAMENTOS E AULAS - Catálogo completo
    const { data: treinamentos } = await supabase
      .from('treinamentos')
      .select(`
        id, titulo, categoria, tipo, nivel, descricao, 
        duracao, visualizacoes, tags, url_conteudo, thumbnail_url
      `)
      .eq('ativo', true);

    const { data: aulas } = await supabase
      .from('aulas')
      .select(`
        id, titulo, treinamento_id, tipo_conteudo, duracao, 
        ordem, descricao, url_youtube
      `)
      .eq('ativo', true);

    if (treinamentos && treinamentos.length > 0) {
      context += `🎓 CATÁLOGO DE TREINAMENTOS (${treinamentos.length} disponíveis)\n\n`;
      treinamentos.forEach((treino: any) => {
        const aulasDoTreino = aulas?.filter(a => a.treinamento_id === treino.id) || [];
        context += `📚 **${treino.titulo}** [${treino.categoria}]\n`;
        context += `   🎯 Tipo: ${treino.tipo} | Nível: ${treino.nivel}\n`;
        context += `   ⏱️ Duração: ${treino.duracao || 'N/A'} min | 👁️ Views: ${treino.visualizacoes || 0}\n`;
        context += `   📖 Aulas: ${aulasDoTreino.length}\n`;
        if (treino.url_conteudo) context += `   🔗 URL: ${treino.url_conteudo}\n`;
        if (treino.tags) context += `   🏷️ Tags: ${treino.tags.join(', ')}\n`;
        if (treino.descricao) context += `   📄 Desc: ${treino.descricao.substring(0, 150)}...\n`;
        
        // Listar principais aulas
        if (aulasDoTreino.length > 0) {
          context += `   📋 Principais aulas:\n`;
          aulasDoTreino.slice(0, 3).forEach((aula: any) => {
            context += `      ${aula.ordem}. ${aula.titulo} (${aula.duracao || 'N/A'} min)\n`;
            if (aula.url_youtube) context += `         🎥 ${aula.url_youtube}\n`;
          });
          if (aulasDoTreino.length > 3) {
            context += `      ... e mais ${aulasDoTreino.length - 3} aulas\n`;
          }
        }
        context += `\n`;
      });
    }

    // REFERÊNCIAS DE CRIATIVOS - Com links e materiais
    const { data: referencias } = await supabase
      .from('referencias_criativos')
      .select(`
        id, titulo, categoria, is_template, link_publico, 
        conteudo, links_externos, data_expiracao, cliente_id
      `)
      .eq('ativo', true)
      .limit(30);

    if (referencias && referencias.length > 0) {
      context += `🎨 REFERÊNCIAS DE CRIATIVOS (${referencias.length})\n\n`;
      referencias.forEach((ref: any) => {
        context += `🖼️ **${ref.titulo}** [${ref.categoria}]\n`;
        context += `   📋 Template: ${ref.is_template ? 'Sim' : 'Não'}\n`;
        if (ref.link_publico) {
          context += `   🔗 Link público: ${ref.link_publico}\n`;
        }
        if (ref.links_externos && ref.links_externos.length > 0) {
          context += `   🌐 Links externos: ${ref.links_externos.length} disponíveis\n`;
        }
        if (ref.conteudo && ref.conteudo.length > 0) {
          context += `   📁 Arquivos: ${ref.conteudo.length} itens\n`;
        }
        if (ref.cliente_id) {
          const clienteRef = clientes?.find(c => c.id === ref.cliente_id);
          if (clienteRef) context += `   👤 Cliente: ${clienteRef.nome}\n`;
        }
        context += `\n`;
      });
    }

    // GRAVAÇÕES DE REUNIÕES - Últimas gravações
    const { data: gravacoes } = await supabase
      .from('gravacoes')
      .select(`
        id, titulo, cliente_id, url_gravacao, duracao,
        visualizacoes, tags, thumbnail_url, created_at, descricao
      `)
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 60 dias
      .order('created_at', { ascending: false })
      .limit(20);

    if (gravacoes && gravacoes.length > 0) {
      context += `🎥 GRAVAÇÕES DE REUNIÕES (${gravacoes.length} recentes)\n\n`;
      gravacoes.forEach((grav: any) => {
        const clienteGrav = clientes?.find(c => c.id === grav.cliente_id);
        context += `📹 **${grav.titulo}**\n`;
        if (clienteGrav) context += `   👤 Cliente: ${clienteGrav.nome}\n`;
        context += `   ⏱️ Duração: ${grav.duracao || 'N/A'} min\n`;
        context += `   👁️ Views: ${grav.visualizacoes || 0}\n`;
        context += `   🔗 URL: ${grav.url_gravacao}\n`;
        context += `   📅 Data: ${new Date(grav.created_at).toLocaleDateString('pt-BR')}\n`;
        if (grav.tags) context += `   🏷️ Tags: ${grav.tags.join(', ')}\n`;
        if (grav.descricao) context += `   📄 Desc: ${grav.descricao.substring(0, 100)}...\n`;
        context += `\n`;
      });
    }

    // TAREFAS ATIVAS - Priorizadas por relevância
    let tarefasQuery = supabase
      .from('tarefas')
      .select(`
        id, titulo, status, prioridade, tipo, cliente_id,
        atribuido_para, data_vencimento, descricao, created_at
      `)
      .in('status', ['pendente', 'em_andamento']);

    if (userClientId && !isAdmin) {
      tarefasQuery = tarefasQuery.eq('cliente_id', userClientId);
    }

    const { data: tarefas } = await tarefasQuery.limit(15);

    if (tarefas && tarefas.length > 0) {
      context += `✅ TAREFAS ATIVAS (${tarefas.length})\n\n`;
      // Ordenar por prioridade
      const tarefasOrdenadas = tarefas.sort((a: any, b: any) => {
        const prioridades = { 'alta': 3, 'media': 2, 'baixa': 1 };
        return prioridades[b.prioridade] - prioridades[a.prioridade];
      });

      tarefasOrdenadas.forEach((tarefa: any) => {
        const clienteTarefa = clientes?.find(c => c.id === tarefa.cliente_id);
        const prioEmoji = { 'alta': '🔴', 'media': '🟡', 'baixa': '🟢' };
        
        context += `${prioEmoji[tarefa.prioridade]} **${tarefa.titulo}** [${tarefa.status}]\n`;
        context += `   📋 Prioridade: ${tarefa.prioridade} | Tipo: ${tarefa.tipo}\n`;
        if (clienteTarefa) context += `   👤 Cliente: ${clienteTarefa.nome}\n`;
        if (tarefa.data_vencimento) {
          const vencimento = new Date(tarefa.data_vencimento);
          const hoje = new Date();
          const dias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
          context += `   ⏰ Vencimento: ${vencimento.toLocaleDateString('pt-BR')} (${dias} dias)\n`;
        }
        if (tarefa.descricao) context += `   📄 Desc: ${tarefa.descricao.substring(0, 120)}...\n`;
        context += `\n`;
      });
    }

    // PDIs (Planos de Desenvolvimento Individual)
    const { data: pdis } = await supabase
      .from('pdis')
      .select(`
        id, titulo, status, data_limite, descricao, 
        colaborador_id, created_by, created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (pdis && pdis.length > 0) {
      context += `🎯 PDIs - PLANOS DE DESENVOLVIMENTO (${pdis.length})\n\n`;
      pdis.forEach((pdi: any) => {
        context += `📊 **${pdi.titulo}** [${pdi.status}]\n`;
        context += `   📅 Prazo: ${pdi.data_limite ? new Date(pdi.data_limite).toLocaleDateString('pt-BR') : 'Indefinido'}\n`;
        if (pdi.descricao) context += `   📄 Desc: ${pdi.descricao.substring(0, 120)}...\n`;
        context += `\n`;
      });
    }

    // ESTATÍSTICAS E RESUMO EXECUTIVO
    context += `📈 ESTATÍSTICAS DO SISTEMA\n`;
    context += `├── 🏢 Clientes ativos: ${clientes?.length || 0}\n`;
    context += `├── 🎓 Treinamentos: ${treinamentos?.length || 0}\n`;
    context += `├── 📚 Aulas: ${aulas?.length || 0}\n`;
    context += `├── 🎨 Referências: ${referencias?.length || 0}\n`;
    context += `├── 🎥 Gravações: ${gravacoes?.length || 0}\n`;
    context += `├── 💰 Orçamentos: ${orcamentos?.length || 0}\n`;
    context += `├── ✅ Tarefas ativas: ${tarefas?.length || 0}\n`;
    context += `└── 🎯 PDIs: ${pdis?.length || 0}\n\n`;

    if (userClientId && !isAdmin) {
      context += `🔒 NOTA: Dados filtrados para o seu cliente específico.\n`;
    } else if (!isAdmin) {
      context += `🔒 NOTA: Dados sensíveis limitados ao seu nível de acesso.\n`;
    }

    return context;

  } catch (error) {
    console.error('Erro ao buscar contexto do sistema:', error);
    return "❌ Erro ao carregar informações do sistema. Dados filtrados por permissões de usuário.";
  }
}