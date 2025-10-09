import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Assistente chat function called');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
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

    const { message, conversaId } = await req.json();
    console.log('Mensagem recebida:', message);
    console.log('User ID:', user.id);
    console.log('Conversa ID:', conversaId);

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
    
    // Verificar se a mensagem solicita informações específicas sobre reuniões/transcrições
    const isTranscriptionQuery = detectTranscriptionQuery(message);
    let transcriptionContext = '';
    
    if (isTranscriptionQuery) {
      console.log('Detectada consulta sobre transcrições, buscando...');
      transcriptionContext = await searchTranscriptions(supabase, user.id, message);
    }
    
    // Preparar prompt inteligente e contextual
    const systemPrompt = `Você é a IA Interna do MenuApp, uma ASSISTENTE DE NEGÓCIOS CONTEXTUAL especializada em marketing digital, gestão de clientes e análise de performance.

🎯 SUA MISSÃO:
Fornecer respostas precisas, insights acionáveis e recomendações estratégicas baseadas nos dados reais do sistema.

👤 PERFIL DO USUÁRIO:
- Nome: ${profile?.nome}
- Email: ${profile?.email}
- Nível: ${profile?.nivel_acesso}
- Permissões: ${isAdmin ? 'Administrador (acesso total)' : userClientId ? 'Acesso ao cliente específico' : 'Equipe geral'}

📊 DADOS DISPONÍVEIS (CONTEXTO COMPLETO):
${systemContext}

${transcriptionContext ? `
🎥 TRANSCRIÇÕES E REUNIÕES RELEVANTES:
${transcriptionContext}

IMPORTANTE: Use estas transcrições para responder sobre decisões, tarefas, próximos passos e contexto histórico.
` : ''}

🧠 CAPACIDADES AVANÇADAS:

1. **ANÁLISE CONTEXTUAL**:
   - Entenda perguntas complexas relacionando múltiplas fontes de dados
   - Compare períodos (ex: "CPL do mês passado vs. atual")
   - Detecte padrões (ex: "cliente com CPL sempre alto em remarketing")

2. **INSIGHTS PROATIVOS**:
   - Identifique gargalos e oportunidades automaticamente
   - Alerte sobre prazos críticos e urgências
   - Sugira otimizações baseadas em performance histórica
   - Detecte anomalias (ex: "ROI caiu 20% vs. lançamento anterior")

3. **RECOMENDAÇÕES ACIONÁVEIS**:
   - Sempre que possível, sugira ações práticas específicas
   - Cite fontes de dados (reuniões, lançamentos, métricas)
   - Priorize por impacto e urgência

4. **MEMÓRIA TEMPORAL**:
   - Compare dados históricos quando relevante
   - Identifique tendências ao longo do tempo
   - Relacione eventos passados com situação atual

5. **APRENDIZADO CONTÍNUO**:
   - Considere todo o histórico de reuniões, mensagens semanais e diários de bordo
   - Aprenda com padrões de sucesso/erro
   - Adapte respostas baseado em contexto acumulado

📋 COMPORTAMENTO ESPERADO:

**Para Lançamentos**:
- Forneça status detalhado, datas de fases (Captação, CPL, Remarketing)
- Calcule métricas (CPL, ROI, ROAS) quando disponível
- Alerte sobre verbas subutilizadas ou prazos críticos
- Compare com lançamentos anteriores do mesmo cliente

**Para Clientes**:
- Resuma histórico, status de funis, orçamentos ativos
- Identifique padrões de performance
- Sugira próximas ações baseadas em etapa atual

**Para Reuniões/Transcrições/Documentos de Reunião**:
- Analise tanto as GRAVAÇÕES quanto os DOCUMENTOS DE REUNIÕES (pautas)
- Extraia decisões, tarefas atribuídas, responsáveis e prazos mencionados
- Relacione com cliente/projeto específico sempre que possível
- Identifique compromissos não cumpridos comparando com tarefas atuais
- Use o conteúdo completo das anotações para responder perguntas detalhadas
- Cite a data específica da reunião ao referenciar informações

**Para Financeiro**:
- Calcule métricas consolidadas (faturamento, despesas, lucro)
- Identifique tendências de receita e churn
- Compare performance entre clientes

**Para Orçamentos**:
- Mostre distribuição de verba por canal/fase
- Alerte sobre desequilíbrios
- Sugira realocações baseadas em performance

🎨 FORMATO DE RESPOSTA:

1. **Estruturação**:
   - Use ### para seções principais
   - Use - para listas e bullet points
   - Use **negrito** para destacar informações críticas
   - Use 🔴 🟡 🟢 para indicar urgência/status

2. **Citação de Fontes**:
   - Sempre cite a fonte dos dados (ex: "Reunião de 02/10", "Lançamento X")
   - Indique datas e responsáveis quando relevante
   - Forneça links quando disponível

3. **Insights Acionáveis**:
   - Termine com "💡 **Próximas Ações Recomendadas**" quando aplicável
   - Seja específico (não genérico)
   - Priorize por impacto

4. **Clareza**:
   - Evite jargão desnecessário
   - Explique termos técnicos quando usar
   - Seja direto e objetivo

⚠️ REGRAS CRÍTICAS:

1. **Privacidade**: Respeite sempre as permissões do usuário. Não revele dados de clientes aos quais o usuário não tem acesso.

2. **Precisão**: Use APENAS dados reais do sistema. Não invente métricas ou informações.

3. **Contexto**: Sempre relacione a resposta com o contexto do negócio (cliente, lançamento, etc).

4. **Proatividade**: Vá além da pergunta - ofereça insights adicionais relevantes.

5. **Tempo Real**: Considere a data atual (${new Date().toLocaleDateString('pt-BR')}) para calcular urgências e prazos.`;

    // Buscar histórico da conversa se conversaId foi fornecido
    let conversationHistory: Array<{role: string, content: string}> = [];
    
    if (conversaId) {
      console.log('Carregando histórico da conversa:', conversaId);
      const { data: messages, error: historyError } = await supabase
        .from('assistente_mensagens')
        .select('role, content')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true });
      
      if (!historyError && messages) {
        conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        console.log(`Histórico carregado: ${conversationHistory.length} mensagens`);
      }
    }

    // Construir array de mensagens com histórico completo
    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log(`Enviando requisição para Lovable AI com ${allMessages.length} mensagens...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: allMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro da Lovable AI Status:', response.status);
      console.error('Erro da Lovable AI Body:', errorData);
      throw new Error(`Erro da Lovable AI: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Resposta da Lovable AI recebida');

    const assistantResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro no assistente chat:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Erro interno',
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

    // 💰 ORÇAMENTOS POR FUNIL - Investimentos ativos detalhados
    let orcamentosQuery = supabase
      .from('orcamentos_funil')
      .select(`
        id, nome_funil, valor_investimento, cliente_id, 
        observacoes, ativo, active, data_atualizacao, created_at
      `)
      .eq('ativo', true)
      .eq('active', true);

    if (userClientId && !isAdmin) {
      orcamentosQuery = orcamentosQuery.eq('cliente_id', userClientId);
    }

    const { data: orcamentos } = await orcamentosQuery.limit(50);

    if (orcamentos && orcamentos.length > 0) {
      // Agrupar por cliente para análise
      const orcamentosPorCliente = orcamentos.reduce((acc: any, orc: any) => {
        const clienteId = orc.cliente_id;
        if (!acc[clienteId]) {
          acc[clienteId] = { total: 0, funis: [] };
        }
        acc[clienteId].total += parseFloat(orc.valor_investimento) || 0;
        acc[clienteId].funis.push(orc);
        return acc;
      }, {});

      const totalGeral = orcamentos.reduce((sum: number, orc: any) => sum + (parseFloat(orc.valor_investimento) || 0), 0);
      
      context += `💰 ORÇAMENTOS POR FUNIL ATIVOS (${orcamentos.length} funis | Total: R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})})\n\n`;
      
      // Detalhar por cliente
      for (const [clienteId, dados] of Object.entries(orcamentosPorCliente) as any) {
        const clienteNome = clientes?.find((c: any) => c.id === clienteId)?.nome || 'Cliente não encontrado';
        context += `📌 **${clienteNome}**\n`;
        context += `   💵 Total investindo: R$ ${dados.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
        context += `   🎯 Funis ativos (${dados.funis.length}):\n`;
        
        dados.funis.forEach((orc: any) => {
          const percentual = ((parseFloat(orc.valor_investimento) / dados.total) * 100).toFixed(1);
          context += `      • ${orc.nome_funil}: R$ ${parseFloat(orc.valor_investimento).toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentual}%)`;
          if (orc.observacoes) context += ` - ${orc.observacoes}`;
          context += `\n`;
        });
        context += `\n`;
      }
    }

    // 📨 MENSAGENS SEMANAIS - Histórico de performance com métricas
    let mensagensQuery = supabase
      .from('mensagens_semanais')
      .select('id, cliente_id, semana_referencia, mensagem, enviado, created_at, updated_at')
      .order('semana_referencia', { ascending: false });

    if (userClientId && !isAdmin) {
      mensagensQuery = mensagensQuery.eq('cliente_id', userClientId);
    }

    const { data: mensagens } = await mensagensQuery.limit(60);

    if (mensagens && mensagens.length > 0) {
      // Agrupar por cliente e pegar últimas 3-4 mensagens de cada
      const mensagensPorCliente = mensagens.reduce((acc: any, msg: any) => {
        const clienteId = msg.cliente_id;
        if (!acc[clienteId]) {
          acc[clienteId] = [];
        }
        if (acc[clienteId].length < 4) {
          acc[clienteId].push(msg);
        }
        return acc;
      }, {});

      context += `📨 MENSAGENS SEMANAIS COM MÉTRICAS (Histórico recente de ${Object.keys(mensagensPorCliente).length} clientes)\n\n`;
      
      for (const [clienteId, msgs] of Object.entries(mensagensPorCliente) as any) {
        const clienteNome = clientes?.find((c: any) => c.id === clienteId)?.nome || 'Cliente não encontrado';
        context += `📌 **${clienteNome}**\n`;
        
        msgs.forEach((msg: any) => {
          const data = new Date(msg.semana_referencia).toLocaleDateString('pt-BR');
          context += `   📅 Semana ${data}:\n`;
          
          // Extrair métricas da mensagem (ROI, ROAS, CPL, CPA, vendas, leads, etc)
          const metricas = extrairMetricasDaMensagem(msg.mensagem);
          if (metricas.length > 0) {
            context += `      📊 **Métricas detectadas**: ${metricas.join(' | ')}\n`;
          }
          
          // Resumo da mensagem (primeiras 200 caracteres, limpando quebras de linha)
          if (msg.mensagem) {
            const resumo = msg.mensagem.substring(0, 200).replace(/\n+/g, ' ').trim();
            context += `      💬 "${resumo}${msg.mensagem.length > 200 ? '...' : ''}"\n`;
          }
          context += `\n`;
        });
      }
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
        const aulasDoTreino = aulas?.filter((a: any) => a.treinamento_id === treino.id) || [];
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
          const clienteRef = clientes?.find((c: any) => c.id === ref.cliente_id);
          if (clienteRef) context += `   👤 Cliente: ${clienteRef.nome}\n`;
        }
        context += `\n`;
      });
    }

    // DOCUMENTOS DE REUNIÕES - Pautas e anotações (últimas 15 mais importantes)
    let reunioesDocsQuery = supabase
      .from('reunioes_documentos')
      .select(`
        id, ano, mes, dia, titulo_reuniao, conteudo_texto, 
        cliente_id, status, created_at, participantes
      `)
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 60 dias
      .order('created_at', { ascending: false });

    if (userClientId && !isAdmin) {
      reunioesDocsQuery = reunioesDocsQuery.eq('cliente_id', userClientId);
    }

    const { data: reunioesDocumentos } = await reunioesDocsQuery.limit(15);

    if (reunioesDocumentos && reunioesDocumentos.length > 0) {
      context += `📋 DOCUMENTOS DE REUNIÕES (${reunioesDocumentos.length} recentes - últimos 60 dias)\n\n`;
      
      reunioesDocumentos.forEach((doc: any) => {
        // Tentar identificar cliente pelos aliases se não houver cliente_id definido
        let clienteReunioes = 'Reuniões gerais';
        
        if (doc.cliente_id) {
          const clienteEncontrado = clientes?.find((c: any) => c.id === doc.cliente_id);
          if (clienteEncontrado) {
            clienteReunioes = clienteEncontrado.nome;
          }
        } else {
          // Buscar no título por aliases de clientes
          const clienteEncontrado = clientes?.find((c: any) => {
            const nomeUpper = c.nome.toUpperCase();
            const tituloUpper = doc.titulo_reuniao.toUpperCase();
            if (tituloUpper.includes(nomeUpper)) return true;
            if (c.aliases && Array.isArray(c.aliases)) {
              return c.aliases.some((alias: string) => tituloUpper.includes(alias.toUpperCase()));
            }
            return false;
          });
          
          if (clienteEncontrado) {
            clienteReunioes = clienteEncontrado.nome;
          }
        }
        
        const dataReuniao = `${String(doc.dia).padStart(2, '0')}/${String(doc.mes).padStart(2, '0')}/${doc.ano}`;
        context += `📅 **${dataReuniao}** - ${doc.titulo_reuniao} (${clienteReunioes})\n`;
        
        if (doc.participantes && doc.participantes.length > 0) {
          context += `   👥 Participantes: ${doc.participantes.slice(0, 3).join(', ')}${doc.participantes.length > 3 ? '...' : ''}\n`;
        }
        
        // Incluir apenas resumo do conteúdo (primeiros 200 caracteres)
        if (doc.conteudo_texto && doc.conteudo_texto.length > 0) {
          const conteudoLimpo = doc.conteudo_texto
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .substring(0, 200); // Primeiros 200 caracteres
          
          context += `   📝 ${conteudoLimpo}...\n`;
        }
        
        context += `\n`;
      });
    }

    // GRAVAÇÕES DE REUNIÕES - Últimas gravações com transcrições (reduzido para 10)
    let gravacoesQuery = supabase
      .from('gravacoes')
      .select(`
        id, titulo, cliente_id, url_gravacao, created_at,
        resumo_ia, palavras_chave
      `)
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (userClientId && !isAdmin) {
      gravacoesQuery = gravacoesQuery.eq('cliente_id', userClientId);
    }

    const { data: gravacoes } = await gravacoesQuery.limit(10);

    if (gravacoes && gravacoes.length > 0) {
      context += `🎥 GRAVAÇÕES DE REUNIÕES (${gravacoes.length} recentes)\n\n`;
      gravacoes.forEach((grav: any) => {
        // Tentar identificar cliente pelos aliases se não houver cliente_id definido
        let clienteNome = null;
        
        if (grav.cliente_id) {
          const clienteEncontrado = clientes?.find((c: any) => c.id === grav.cliente_id);
          if (clienteEncontrado) {
            clienteNome = clienteEncontrado.nome;
          }
        } else {
          // Buscar no título por aliases de clientes
          const clienteEncontrado = clientes?.find((c: any) => {
            const nomeUpper = c.nome.toUpperCase();
            const tituloUpper = grav.titulo.toUpperCase();
            if (tituloUpper.includes(nomeUpper)) return true;
            if (c.aliases && Array.isArray(c.aliases)) {
              return c.aliases.some((alias: string) => tituloUpper.includes(alias.toUpperCase()));
            }
            return false;
          });
          
          if (clienteEncontrado) {
            clienteNome = clienteEncontrado.nome;
          }
        }
        
        context += `📹 **${grav.titulo}**`;
        if (clienteNome) context += ` (${clienteNome})`;
        context += `\n`;
        context += `   📅 ${new Date(grav.created_at).toLocaleDateString('pt-BR')}\n`;
        
        if (grav.resumo_ia) {
          context += `   🤖 ${grav.resumo_ia.substring(0, 150)}...\n`;
        }
        
        if (grav.palavras_chave && grav.palavras_chave.length > 0) {
          context += `   🔑 ${grav.palavras_chave.slice(0, 5).join(', ')}\n`;
        }
        
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
        const prioridades: Record<string, number> = { 'alta': 3, 'media': 2, 'baixa': 1 };
        return (prioridades[b.prioridade] || 0) - (prioridades[a.prioridade] || 0);
      });

      tarefasOrdenadas.forEach((tarefa: any) => {
        const clienteTarefa = clientes?.find((c: any) => c.id === tarefa.cliente_id);
        const prioEmoji: Record<string, string> = { 'alta': '🔴', 'media': '🟡', 'baixa': '🟢' };
        
        context += `${prioEmoji[tarefa.prioridade] || '⚪'} **${tarefa.titulo}** [${tarefa.status}]\n`;
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

    // KICKOFFS - Documentos de início de projeto
    let kickoffsQuery = supabase
      .from('kickoffs')
      .select(`
        id, client_id, status, created_at, updated_at,
        kickoff_content (
          id, content_md, version, created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (userClientId && !isAdmin) {
      kickoffsQuery = kickoffsQuery.eq('client_id', userClientId);
    }

    const { data: kickoffs } = await kickoffsQuery.limit(20);

    if (kickoffs && kickoffs.length > 0) {
      context += `🚀 KICKOFFS - DOCUMENTOS DE INÍCIO (${kickoffs.length})\n\n`;
      kickoffs.forEach((kickoff: any) => {
        const clienteKickoff = clientes?.find((c: any) => c.id === kickoff.client_id);
        const statusEmoji: Record<string, string> = { 'draft': '📝', 'published': '✅', 'archived': '📁' };
        
        context += `${statusEmoji[kickoff.status] || '📄'} **Kickoff ${clienteKickoff?.nome || 'Cliente não encontrado'}** [${kickoff.status}]\n`;
        context += `   📅 Criado: ${new Date(kickoff.created_at).toLocaleDateString('pt-BR')}\n`;
        context += `   🔄 Atualizado: ${new Date(kickoff.updated_at).toLocaleDateString('pt-BR')}\n`;
        
        if (kickoff.kickoff_content && kickoff.kickoff_content.length > 0) {
          const latestContent = kickoff.kickoff_content[kickoff.kickoff_content.length - 1];
          context += `   📄 Versão: ${latestContent.version}\n`;
          
          // Extrair informações principais do conteúdo markdown
          if (latestContent.content_md) {
            const contentPreview = extractKickoffSummary(latestContent.content_md);
            if (contentPreview) {
              context += `   📋 Conteúdo:\n${contentPreview}\n`;
            }
          }
        }
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
    context += `├── 📋 Documentos de reuniões: ${reunioesDocumentos?.length || 0}\n`;
    context += `├── 🎥 Gravações: ${gravacoes?.length || 0}\n`;
    context += `├── 💰 Orçamentos: ${orcamentos?.length || 0}\n`;
    context += `├── 📨 Mensagens semanais: ${mensagens?.length || 0}\n`;
    context += `├── ✅ Tarefas ativas: ${tarefas?.length || 0}\n`;
    context += `├── 🚀 Kickoffs: ${kickoffs?.length || 0}\n`;
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

// Função auxiliar para extrair métricas de mensagens semanais
function extrairMetricasDaMensagem(mensagem: string): string[] {
  if (!mensagem) return [];
  
  const metricas: string[] = [];
  const texto = mensagem.toLowerCase();
  
  // Padrões de métricas comuns em mensagens semanais
  const padroes = [
    { regex: /roas[:\s]+([0-9,.]+)/i, nome: 'ROAS' },
    { regex: /roi[:\s]+([0-9,.]+)%?/i, nome: 'ROI' },
    { regex: /cpl[:\s]+r?\$?\s*([0-9,.]+)/i, nome: 'CPL' },
    { regex: /cpa[:\s]+r?\$?\s*([0-9,.]+)/i, nome: 'CPA' },
    { regex: /ctr[:\s]+([0-9,.]+)%/i, nome: 'CTR' },
    { regex: /cpc[:\s]+r?\$?\s*([0-9,.]+)/i, nome: 'CPC' },
    { regex: /cpm[:\s]+r?\$?\s*([0-9,.]+)/i, nome: 'CPM' },
    { regex: /([0-9]+)\s*vendas?/i, nome: 'Vendas' },
    { regex: /([0-9]+)\s*leads?/i, nome: 'Leads' },
    { regex: /([0-9]+)\s*conversões?/i, nome: 'Conversões' },
    { regex: /investimento[:\s]+r?\$?\s*([0-9,.]+)/i, nome: 'Investimento' },
    { regex: /faturamento[:\s]+r?\$?\s*([0-9,.]+)/i, nome: 'Faturamento' },
    { regex: /ticket\s*médio[:\s]+r?\$?\s*([0-9,.]+)/i, nome: 'Ticket Médio' },
    { regex: /conversão[:\s]+([0-9,.]+)%/i, nome: 'Taxa Conversão' },
  ];
  
  padroes.forEach(({ regex, nome }) => {
    const match = texto.match(regex);
    if (match && match[1]) {
      metricas.push(`${nome}: ${match[1]}`);
    }
  });
  
  return metricas;
}

// Função para detectar se a consulta é sobre transcrições ou reuniões
function detectTranscriptionQuery(message: string): boolean {
  const transcriptionKeywords = [
    'reunião', 'reuniões', 'meeting', 'encontro', 'call', 'pauta',
    'transcrição', 'transcricao', 'ata', 'gravação', 'gravacao',
    'resumo', 'resumir', 'prometemos', 'compromisso', 'acordo',
    'decidimos', 'combinamos', 'falamos sobre', 'discutimos',
    'última reunião', 'ultima reunião', 'reunião passada', 'reunião com',
    'o que foi dito', 'que foi decidido', 'próximos passos',
    'proximos passos', 'ação', 'prazo', 'deadline', 'pendência',
    'qual foi a', 'quando foi', 'anotações', 'anotacoes', 'documento',
    'tratado', 'mencionado', 'falado', 'discutido', 'conversamos',
    // Nomes de clientes comuns para detectar perguntas específicas
    'cliente', 'jucinones', 'paloma', 'gislene', 'isquierdo', 'mateco'
  ];
  
  const messageLower = message.toLowerCase();
  return transcriptionKeywords.some(keyword => messageLower.includes(keyword));
}

// Função para buscar e processar transcrições relevantes
async function searchTranscriptions(supabase: any, userId: string, query: string) {
  try {
    console.log('Buscando transcrições para:', query);
    
    // Extrair informações da query
    const extractedInfo = extractQueryInfo(query);
    
    // Chamar a função SQL de busca em transcrições
    const { data: results, error } = await supabase.rpc('buscar_transcricoes_reunioes', {
      _user_id: userId,
      _query: extractedInfo.searchTerms,
      _limit: 5
    });
    
    if (error) {
      console.error('Erro ao buscar transcrições:', error);
      return '';
    }
    
    if (!results || results.length === 0) {
      return '⚠️ Nenhuma transcrição encontrada para a consulta especificada.';
    }
    
    // Formatear resultados
    let context = `📋 TRANSCRIÇÕES ENCONTRADAS (${results.length} relevantes):\n\n`;
    
    results.forEach((result: any, index: number) => {
      context += `### ${index + 1}. ${result.titulo} (${result.tipo})\n`;
      context += `**Cliente:** ${result.cliente_nome}\n`;
      context += `**Data:** ${new Date(result.data_reuniao).toLocaleDateString('pt-BR')}\n`;
      
      if (result.url_gravacao) {
        context += `**Link:** ${result.url_gravacao}\n`;
      }
      
      // Mostrar informações estruturadas da IA
      if (result.topicos_principais && result.topicos_principais.length > 0) {
        context += `**Tópicos Principais:** ${result.topicos_principais.join(', ')}\n`;
      }
      
      if (result.decisoes_tomadas && result.decisoes_tomadas.length > 0) {
        context += `**Decisões Tomadas:**\n`;
        result.decisoes_tomadas.slice(0, 3).forEach((decisao: any) => {
          context += `  • ${decisao.decisao}${decisao.responsavel ? ` (${decisao.responsavel})` : ''}\n`;
        });
      }
      
      if (result.pendencias && result.pendencias.length > 0) {
        context += `**Pendências/Tarefas:**\n`;
        result.pendencias.slice(0, 3).forEach((pendencia: any) => {
          context += `  • ${pendencia.tarefa}${pendencia.responsavel ? ` - ${pendencia.responsavel}` : ''}${pendencia.prazo ? ` (${pendencia.prazo})` : ''}\n`;
        });
      }
      
      if (result.resumo_ia) {
        context += `**Resumo IA:** ${result.resumo_ia.substring(0, 200)}...\n`;
      }
      
      if (result.palavras_chave && result.palavras_chave.length > 0) {
        context += `**Palavras-chave:** ${result.palavras_chave.join(', ')}\n`;
      }
      
      if (result.transcricao) {
        // Extrair trechos relevantes da transcrição
        const relevantExcerpts = extractRelevantExcerpts(result.transcricao, query);
        if (relevantExcerpts) {
          context += `**Trechos relevantes:**\n${relevantExcerpts}\n`;
        }
      }
      
      context += `**Relevância:** ${(result.relevancia * 100).toFixed(1)}%\n\n`;
    });
    
    return context;
    
  } catch (error) {
    console.error('Erro ao buscar transcrições:', error);
    return '❌ Erro ao buscar transcrições. Tente novamente.';
  }
}

// Função para extrair informações específicas da query
function extractQueryInfo(query: string) {
  const queryLower = query.toLowerCase();
  
  // Extrair cliente - incluir nomes compostos como GISLENEISQUIERDO
  let clienteId = null;
  const clientePatterns = [
    /(?:cliente|para|pra|com)\s+([A-Z]{2,})/gi,
    /([A-Z]{2,})(?:\s+na|última|ultima)/gi,
    /(gislene|isquierdo|gisleneisquierdo|paloma)/gi
  ];
  
  // Extrair datas
  let dataInicio = null;
  let dataFim = null;
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /(\d{1,2}\/\d{1,2})/g,
    /(hoje|ontem|semana passada|mês passado)/gi
  ];
  
  // Extrair responsável
  let responsavel = null;
  if (queryLower.includes('paloma')) {
    responsavel = 'paloma';
  }
  
  // Termos de busca - manter nomes de clientes para busca
  let searchTerms = query;
  
  // Se detectar um nome específico de cliente, priorizar na busca
  if (queryLower.includes('gislene') || queryLower.includes('isquierdo')) {
    searchTerms = 'GISLENEISQUIERDO ' + searchTerms;
  }
  
  return {
    searchTerms: searchTerms || query,
    clienteId,
    dataInicio,
    dataFim,
    responsavel
  };
}

// Função para extrair trechos relevantes da transcrição
function extractRelevantExcerpts(transcricao: string, query: string, maxLength: number = 400): string {
  if (!transcricao) return '';
  
  const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
  const sentences = transcricao.split(/[.!?]+/);
  
  // Encontrar sentenças mais relevantes
  const relevantSentences = sentences
    .map(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const score = queryWords.reduce((acc, word) => {
        return acc + (lowerSentence.includes(word) ? 1 : 0);
      }, 0);
      return { sentence: sentence.trim(), score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => `"${item.sentence}"`);
  
  const result = relevantSentences.join('\n');
  return result.length > maxLength ? result.substring(0, maxLength) + '...' : result;
}

// Função para extrair resumo do conteúdo do kickoff
function extractKickoffSummary(contentMd: string): string {
  if (!contentMd) return '';
  
  try {
    // Extrair seções principais do markdown
    const lines = contentMd.split('\n');
    let summary = '';
    let currentSection = '';
    
    for (const line of lines) {
      // Detectar headers principais
      if (line.startsWith('##') && !line.startsWith('###')) {
        currentSection = line.replace(/^##\s*/, '').trim();
        summary += `      • ${currentSection}\n`;
      }
      // Extrair informações importantes de listas
      else if (line.match(/^\s*[-*+]\s+/) && currentSection) {
        const item = line.replace(/^\s*[-*+]\s+/, '').trim();
        if (item.length > 10 && item.length < 100) {
          summary += `        - ${item}\n`;
        }
      }
      // Extrair objetivos ou metas se houver
      else if (line.toLowerCase().includes('objetivo') || line.toLowerCase().includes('meta')) {
        const objective = line.trim();
        if (objective.length < 150) {
          summary += `        🎯 ${objective}\n`;
        }
      }
    }
    
    // Limitar tamanho do resumo
    if (summary.length > 500) {
      summary = summary.substring(0, 500) + '...\n';
    }
    
    return summary || '        (Conteúdo estruturado disponível)';
    
  } catch (error) {
    console.error('Erro ao extrair resumo do kickoff:', error);
    return '        (Erro ao processar conteúdo)';
  }
}