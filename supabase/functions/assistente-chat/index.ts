import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const { message, userId } = await req.json();
    console.log('Mensagem recebida:', message);
    console.log('User ID:', userId);

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar informações do sistema para contexto
    const systemContext = await getSystemContext(supabase, userId);
    
    // Preparar prompt para o ChatGPT
    const systemPrompt = `Você é um assistente inteligente da BNOads, uma agência de marketing digital especializada em tráfego pago e gestão de clientes.

CONTEXTO COMPLETO DO SISTEMA:
${systemContext}

INSTRUÇÕES PARA O ASSISTENTE:
- Responda sempre em português brasileiro
- Seja útil, profissional e amigável
- Use TODAS as informações do sistema quando relevante - você tem acesso completo aos dados
- Você pode responder sobre: clientes, colaboradores, treinamentos, aulas, PDIs, reuniões, gravações, criativos, referências, orçamentos, tarefas, avisos
- Forneça informações específicas quando solicitado (IDs, links, datas, valores, etc.)
- Quando mencionar clientes, sempre inclua o link do painel quando disponível
- Para treinamentos e aulas, mencione detalhes como duração, categoria e progresso
- Para PDIs, informe status e prazos
- Para reuniões, inclua datas e participantes
- Se precisar de informações mais específicas, sugira onde encontrar na plataforma
- Mantenha as respostas informativas mas organizadas
- Sempre que possível, ofereça ações práticas ou próximos passos`;

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

async function getSystemContext(supabase: any, userId: string) {
  try {
    let context = "SISTEMA BNOADS - BASE DE CONHECIMENTO COMPLETA:\n\n";

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

    // CLIENTES - Informações completas
    const { data: clientes } = await supabase
      .from('clientes')
      .select(`
        id, nome, status_cliente, categoria, nicho, link_painel, 
        data_inicio, etapa_atual, progresso_etapa, funis_trabalhando,
        observacoes, ultimo_acesso, total_acessos, pasta_drive_url,
        whatsapp_grupo_url, aliases, dashboards_looker
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
        context += `  - Drive: ${cliente.pasta_drive_url || 'Não configurado'}\n`;
        context += `  - WhatsApp: ${cliente.whatsapp_grupo_url || 'Não configurado'}\n`;
        if (cliente.observacoes) context += `  - Obs: ${cliente.observacoes.substring(0, 150)}...\n`;
        context += `\n`;
      });

      // Estatísticas de clientes
      const stats = {
        porCategoria: clientes.reduce((acc: any, c: any) => { acc[c.categoria] = (acc[c.categoria] || 0) + 1; return acc; }, {}),
        porStatus: clientes.reduce((acc: any, c: any) => { acc[c.status_cliente] = (acc[c.status_cliente] || 0) + 1; return acc; }, {}),
        porNicho: clientes.reduce((acc: any, c: any) => { acc[c.nicho] = (acc[c.nicho] || 0) + 1; return acc; }, {})
      };
      context += `Estatísticas:\n`;
      context += `- Por categoria: ${JSON.stringify(stats.porCategoria)}\n`;
      context += `- Por status: ${JSON.stringify(stats.porStatus)}\n`;
      context += `- Por nicho: ${JSON.stringify(stats.porNicho)}\n\n`;
    }

    // COLABORADORES - Informações completas
    const { data: colaboradores } = await supabase
      .from('colaboradores')
      .select(`
        id, nome, email, nivel_acesso, data_admissao, 
        progresso_treinamentos, tamanho_camisa, estado_civil,
        data_nascimento, tempo_plataforma, avatar_url
      `)
      .eq('ativo', true);

    if (colaboradores && colaboradores.length > 0) {
      context += `=== COLABORADORES (${colaboradores.length} ativos) ===\n`;
      colaboradores.forEach((colab: any) => {
        context += `• ${colab.nome} (${colab.email})\n`;
        context += `  - Acesso: ${colab.nivel_acesso}\n`;
        context += `  - Admissão: ${colab.data_admissao ? new Date(colab.data_admissao).toLocaleDateString('pt-BR') : 'Não informado'}\n`;
        context += `  - Tempo na plataforma: ${colab.tempo_plataforma || 0} horas\n`;
        if (colab.progresso_treinamentos) {
          const progresso = typeof colab.progresso_treinamentos === 'object' ? 
            Object.keys(colab.progresso_treinamentos).length : 0;
          context += `  - Treinamentos: ${progresso} em andamento\n`;
        }
        context += `\n`;
      });
    }

    // TREINAMENTOS E AULAS - Informações detalhadas
    const { data: treinamentos } = await supabase
      .from('treinamentos')
      .select(`
        id, titulo, categoria, tipo, nivel, descricao, 
        duracao, visualizacoes, tags, thumbnail_url, created_by
      `)
      .eq('ativo', true);

    const { data: aulas } = await supabase
      .from('aulas')
      .select(`
        id, titulo, treinamento_id, tipo_conteudo, duracao, 
        ordem, url_youtube, descricao, created_by
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
        
        // Listar aulas do treinamento
        if (aulasDoTreino.length > 0) {
          context += `  Aulas:\n`;
          aulasDoTreino.slice(0, 5).forEach((aula: any) => {
            context += `    ${aula.ordem}. ${aula.titulo} (${aula.duracao || 'N/A'} min)\n`;
          });
          if (aulasDoTreino.length > 5) {
            context += `    ... e mais ${aulasDoTreino.length - 5} aulas\n`;
          }
        }
        context += `\n`;
      });
    }

    // CRIATIVOS E REFERÊNCIAS
    const { data: referencias } = await supabase
      .from('referencias_criativos')
      .select(`
        id, titulo, categoria, cliente_id, link_publico, 
        is_template, conteudo, links_externos, data_expiracao
      `)
      .eq('ativo', true)
      .limit(50);

    const { data: criativos } = await supabase
      .from('criativos')
      .select(`
        id, nome, tipo_criativo, cliente_id, link_externo,
        tags, descricao, created_at
      `)
      .eq('ativo', true)
      .limit(30);

    if (referencias && referencias.length > 0) {
      context += `=== REFERÊNCIAS DE CRIATIVOS (${referencias.length}) ===\n`;
      referencias.forEach((ref: any) => {
        context += `• ${ref.titulo} [${ref.categoria}]\n`;
        context += `  - Template: ${ref.is_template ? 'Sim' : 'Não'}\n`;
        context += `  - Link: ${ref.link_publico}\n`;
        if (ref.links_externos && ref.links_externos.length > 0) {
          context += `  - Links externos: ${ref.links_externos.length}\n`;
        }
        context += `\n`;
      });
    }

    if (criativos && criativos.length > 0) {
      context += `=== CRIATIVOS (${criativos.length}) ===\n`;
      const criativosPorTipo = criativos.reduce((acc: any, c: any) => {
        acc[c.tipo_criativo] = (acc[c.tipo_criativo] || 0) + 1;
        return acc;
      }, {});
      context += `Por tipo: ${JSON.stringify(criativosPorTipo)}\n\n`;
    }

    // PDIS E PROGRESSOS
    const { data: pdis } = await supabase
      .from('pdis')
      .select(`
        id, titulo, status, data_limite, descricao, 
        colaborador_id, created_by, created_at
      `);

    const { data: pdiAulas } = await supabase
      .from('pdi_aulas')
      .select('pdi_id, aula_id, concluida, data_conclusao');

    if (pdis && pdis.length > 0) {
      context += `=== PDIs (${pdis.length} total) ===\n`;
      pdis.forEach((pdi: any) => {
        const aulasAssociadas = pdiAulas?.filter(pa => pa.pdi_id === pdi.id) || [];
        const aulasConcluidas = aulasAssociadas.filter(pa => pa.concluida).length;
        
        context += `• ${pdi.titulo} [${pdi.status}]\n`;
        context += `  - Prazo: ${pdi.data_limite ? new Date(pdi.data_limite).toLocaleDateString('pt-BR') : 'Indefinido'}\n`;
        context += `  - Progresso: ${aulasConcluidas}/${aulasAssociadas.length} aulas\n`;
        if (pdi.descricao) context += `  - Desc: ${pdi.descricao.substring(0, 100)}...\n`;
        context += `\n`;
      });
    }

    // REUNIÕES E GRAVAÇÕES
    const { data: reunioes } = await supabase
      .from('reunioes')
      .select(`
        id, titulo, status, data_hora, cliente_id, duracao,
        participantes, link_meet, link_gravacao, resumo_ia
      `)
      .gte('data_hora', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('data_hora', { ascending: false })
      .limit(20);

    const { data: gravacoes } = await supabase
      .from('gravacoes')
      .select(`
        id, titulo, cliente_id, url_gravacao, duracao,
        visualizacoes, tags, thumbnail_url, created_at
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(15);

    if (reunioes && reunioes.length > 0) {
      context += `=== REUNIÕES (${reunioes.length} últimos 30 dias) ===\n`;
      reunioes.forEach((reuniao: any) => {
        context += `• ${reuniao.titulo} [${reuniao.status}]\n`;
        context += `  - Data: ${new Date(reuniao.data_hora).toLocaleString('pt-BR')}\n`;
        context += `  - Duração: ${reuniao.duracao || 'N/A'} min\n`;
        context += `  - Participantes: ${reuniao.participantes?.length || 0}\n`;
        if (reuniao.link_gravacao) context += `  - Gravação disponível\n`;
        if (reuniao.resumo_ia) context += `  - Resumo IA: ${reuniao.resumo_ia.substring(0, 100)}...\n`;
        context += `\n`;
      });
    }

    if (gravacoes && gravacoes.length > 0) {
      context += `=== GRAVAÇÕES (${gravacoes.length} recentes) ===\n`;
      gravacoes.forEach((grav: any) => {
        context += `• ${grav.titulo}\n`;
        context += `  - Duração: ${grav.duracao || 'N/A'} min\n`;
        context += `  - Views: ${grav.visualizacoes || 0}\n`;
        context += `  - Tags: ${grav.tags?.join(', ') || 'Nenhuma'}\n`;
        context += `\n`;
      });
    }

    // ORÇAMENTOS E FINANCEIRO
    const { data: orcamentos } = await supabase
      .from('orcamentos_funil')
      .select(`
        id, nome_funil, valor_investimento, cliente_id, 
        observacoes, ativo, data_atualizacao
      `)
      .eq('ativo', true)
      .limit(20);

    if (orcamentos && orcamentos.length > 0) {
      context += `=== ORÇAMENTOS (${orcamentos.length} ativos) ===\n`;
      const totalInvestimento = orcamentos.reduce((sum, orc) => sum + (parseFloat(orc.valor_investimento) || 0), 0);
      context += `Total em investimentos: R$ ${totalInvestimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;
      
      orcamentos.forEach((orc: any) => {
        context += `• ${orc.nome_funil}\n`;
        context += `  - Valor: R$ ${parseFloat(orc.valor_investimento).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
        context += `  - Atualizado: ${new Date(orc.data_atualizacao).toLocaleDateString('pt-BR')}\n`;
        if (orc.observacoes) context += `  - Obs: ${orc.observacoes.substring(0, 100)}...\n`;
        context += `\n`;
      });
    }

    // TAREFAS E ATIVIDADES
    const { data: tarefas } = await supabase
      .from('tarefas')
      .select(`
        id, titulo, status, prioridade, tipo, cliente_id,
        atribuido_para, data_vencimento, descricao, created_at
      `)
      .in('status', ['pendente', 'em_andamento'])
      .limit(20);

    if (tarefas && tarefas.length > 0) {
      context += `=== TAREFAS ATIVAS (${tarefas.length}) ===\n`;
      tarefas.forEach((tarefa: any) => {
        context += `• ${tarefa.titulo} [${tarefa.status}]\n`;
        context += `  - Prioridade: ${tarefa.prioridade} | Tipo: ${tarefa.tipo}\n`;
        if (tarefa.data_vencimento) {
          context += `  - Vencimento: ${new Date(tarefa.data_vencimento).toLocaleDateString('pt-BR')}\n`;
        }
        if (tarefa.descricao) context += `  - Desc: ${tarefa.descricao.substring(0, 100)}...\n`;
        context += `\n`;
      });
    }

    // AVISOS E NOTIFICAÇÕES
    const { data: avisos } = await supabase
      .from('avisos')
      .select(`
        id, titulo, tipo, prioridade, conteudo, 
        data_inicio, data_fim, ativo
      `)
      .eq('ativo', true)
      .gte('data_fim', new Date().toISOString())
      .limit(10);

    if (avisos && avisos.length > 0) {
      context += `=== AVISOS ATIVOS (${avisos.length}) ===\n`;
      avisos.forEach((aviso: any) => {
        context += `• ${aviso.titulo} [${aviso.tipo} - ${aviso.prioridade}]\n`;
        context += `  - ${aviso.conteudo.substring(0, 150)}...\n`;
        context += `\n`;
      });
    }

    // ESTATÍSTICAS GERAIS DO SISTEMA
    context += `=== ESTATÍSTICAS GERAIS ===\n`;
    context += `- Total de clientes ativos: ${clientes?.length || 0}\n`;
    context += `- Total de colaboradores: ${colaboradores?.length || 0}\n`;
    context += `- Total de treinamentos: ${treinamentos?.length || 0}\n`;
    context += `- Total de aulas: ${aulas?.length || 0}\n`;
    context += `- Total de PDIs: ${pdis?.length || 0}\n`;
    context += `- Total de referências: ${referencias?.length || 0}\n`;
    context += `- Total de criativos: ${criativos?.length || 0}\n`;
    context += `- Reuniões recentes: ${reunioes?.length || 0}\n`;
    context += `- Gravações disponíveis: ${gravacoes?.length || 0}\n`;
    context += `- Orçamentos ativos: ${orcamentos?.length || 0}\n`;
    context += `- Tarefas pendentes: ${tarefas?.length || 0}\n`;

    return context;

  } catch (error) {
    console.error('Erro ao buscar contexto do sistema:', error);
    return "Erro ao carregar informações do sistema. Verifique as permissões de acesso.";
  }
}