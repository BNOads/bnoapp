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

Contexto do sistema:
${systemContext}

Instruções:
- Responda sempre em português brasileiro
- Seja útil, profissional e amigável
- Use as informações do sistema quando relevante
- Ajude com questões sobre clientes, treinamentos, PDIs, reuniões e outras funcionalidades da plataforma
- Se não souber algo específico do sistema, seja honesto e sugira onde o usuário pode encontrar a informação
- Mantenha as respostas concisas mas completas`;

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
    let context = "Informações do sistema BNOads:\n\n";

    // Buscar dados do usuário atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile) {
      context += `Usuário: ${profile.nome} (${profile.email})\n`;
      context += `Nível de acesso: ${profile.nivel_acesso}\n\n`;
    }

    // Buscar estatísticas detalhadas de clientes
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nome, status_cliente, categoria, nicho, link_painel')
      .eq('ativo', true);

    if (clientes) {
      context += `=== CLIENTES (${clientes.length} ativos) ===\n`;
      clientes.forEach((cliente: any) => {
        context += `- ${cliente.nome} (${cliente.categoria} - ${cliente.nicho})\n`;
        context += `  Status: ${cliente.status_cliente}\n`;
        context += `  Painel: ${cliente.link_painel}\n`;
      });
      context += `\n`;
      
      const clientesPorCategoria = clientes.reduce((acc: any, cliente: any) => {
        acc[cliente.categoria] = (acc[cliente.categoria] || 0) + 1;
        return acc;
      }, {});
      context += `Clientes por categoria: ${JSON.stringify(clientesPorCategoria)}\n\n`;
    }

    // Buscar colaboradores detalhados
    const { data: colaboradores } = await supabase
      .from('colaboradores')
      .select('id, nome, nivel_acesso, especialidade')
      .eq('ativo', true);

    if (colaboradores) {
      context += `=== COLABORADORES (${colaboradores.length} ativos) ===\n`;
      colaboradores.forEach((colab: any) => {
        context += `- ${colab.nome} (${colab.nivel_acesso})`;
        if (colab.especialidade) context += ` - ${colab.especialidade}`;
        context += `\n`;
      });
      context += `\n`;
    }

    // Buscar treinamentos detalhados
    const { data: treinamentos } = await supabase
      .from('treinamentos')
      .select('id, titulo, categoria, descricao')
      .eq('ativo', true);

    if (treinamentos) {
      context += `=== TREINAMENTOS (${treinamentos.length} disponíveis) ===\n`;
      treinamentos.forEach((treino: any) => {
        context += `- ${treino.titulo} (${treino.categoria})\n`;
        if (treino.descricao) context += `  ${treino.descricao.substring(0, 100)}...\n`;
      });
      context += `\n`;
    }

    // Buscar aulas disponíveis
    const { data: aulas } = await supabase
      .from('aulas')
      .select('id, titulo, treinamento_id, duracao, categoria')
      .eq('ativo', true);

    if (aulas) {
      context += `=== AULAS (${aulas.length} disponíveis) ===\n`;
      aulas.forEach((aula: any) => {
        context += `- ${aula.titulo}`;
        if (aula.duracao) context += ` (${aula.duracao} min)`;
        if (aula.categoria) context += ` - ${aula.categoria}`;
        context += `\n`;
      });
      context += `\n`;
    }

    // Buscar referências de criativos
    const { data: referencias } = await supabase
      .from('referencias_criativos')
      .select('id, titulo, categoria, cliente_id, link_publico')
      .eq('ativo', true)
      .limit(20);

    if (referencias) {
      context += `=== REFERÊNCIAS DE CRIATIVOS (${referencias.length}) ===\n`;
      referencias.forEach((ref: any) => {
        context += `- ${ref.titulo} (${ref.categoria})\n`;
        context += `  Link: ${ref.link_publico}\n`;
      });
      context += `\n`;
    }

    // Buscar PDIs do usuário (se for colaborador)
    const { data: colaborador } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (colaborador) {
      const { data: pdis } = await supabase
        .from('pdis')
        .select('id, titulo, status, data_limite, descricao')
        .eq('colaborador_id', colaborador.id);

      if (pdis && pdis.length > 0) {
        context += `=== SEUS PDIs (${pdis.length}) ===\n`;
        pdis.forEach((pdi: any) => {
          context += `- ${pdi.titulo} (${pdi.status})\n`;
          if (pdi.data_limite) context += `  Prazo: ${new Date(pdi.data_limite).toLocaleDateString('pt-BR')}\n`;
          if (pdi.descricao) context += `  ${pdi.descricao.substring(0, 100)}...\n`;
        });
        context += `\n`;
      }
    }

    // Buscar reuniões recentes com mais detalhes
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7); // Últimos 7 dias

    const { data: reunioes } = await supabase
      .from('reunioes')
      .select('id, titulo, status, data_hora, cliente_id, tipo')
      .gte('data_hora', dataLimite.toISOString())
      .order('data_hora', { ascending: false })
      .limit(10);

    if (reunioes && reunioes.length > 0) {
      context += `=== REUNIÕES RECENTES (${reunioes.length} últimos 7 dias) ===\n`;
      reunioes.forEach((reuniao: any) => {
        context += `- ${reuniao.titulo} (${reuniao.status})\n`;
        context += `  Data: ${new Date(reuniao.data_hora).toLocaleString('pt-BR')}\n`;
        if (reuniao.tipo) context += `  Tipo: ${reuniao.tipo}\n`;
      });
      context += `\n`;
    }

    // Buscar gravações recentes
    const { data: gravacoes } = await supabase
      .from('gravacoes')
      .select('id, titulo, cliente_id, data_gravacao, url_gravacao')
      .gte('data_gravacao', dataLimite.toISOString())
      .order('data_gravacao', { ascending: false })
      .limit(10);

    if (gravacoes && gravacoes.length > 0) {
      context += `=== GRAVAÇÕES RECENTES (${gravacoes.length} últimos 7 dias) ===\n`;
      gravacoes.forEach((grav: any) => {
        context += `- ${grav.titulo}\n`;
        context += `  Data: ${new Date(grav.data_gravacao).toLocaleDateString('pt-BR')}\n`;
        if (grav.url_gravacao) context += `  URL: ${grav.url_gravacao}\n`;
      });
      context += `\n`;
    }

    return context;

  } catch (error) {
    console.error('Erro ao buscar contexto do sistema:', error);
    return "Não foi possível carregar informações do sistema no momento.";
  }
}