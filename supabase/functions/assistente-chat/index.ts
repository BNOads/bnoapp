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

    // Buscar estatísticas gerais
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nome, status_cliente, categoria')
      .eq('ativo', true);

    if (clientes) {
      context += `Clientes ativos: ${clientes.length}\n`;
      const clientesPorCategoria = clientes.reduce((acc: any, cliente: any) => {
        acc[cliente.categoria] = (acc[cliente.categoria] || 0) + 1;
        return acc;
      }, {});
      context += `Clientes por categoria: ${JSON.stringify(clientesPorCategoria)}\n\n`;
    }

    // Buscar colaboradores
    const { data: colaboradores } = await supabase
      .from('colaboradores')
      .select('id, nome, nivel_acesso')
      .eq('ativo', true);

    if (colaboradores) {
      context += `Colaboradores ativos: ${colaboradores.length}\n\n`;
    }

    // Buscar treinamentos
    const { data: treinamentos } = await supabase
      .from('treinamentos')
      .select('id, titulo, categoria')
      .eq('ativo', true);

    if (treinamentos) {
      context += `Treinamentos disponíveis: ${treinamentos.length}\n`;
      const treinamentosPorCategoria = treinamentos.reduce((acc: any, treino: any) => {
        acc[treino.categoria] = (acc[treino.categoria] || 0) + 1;
        return acc;
      }, {});
      context += `Treinamentos por categoria: ${JSON.stringify(treinamentosPorCategoria)}\n\n`;
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
        .select('id, titulo, status, data_limite')
        .eq('colaborador_id', colaborador.id);

      if (pdis && pdis.length > 0) {
        context += `PDIs do usuário: ${pdis.length}\n`;
        const pdisPorStatus = pdis.reduce((acc: any, pdi: any) => {
          acc[pdi.status] = (acc[pdi.status] || 0) + 1;
          return acc;
        }, {});
        context += `PDIs por status: ${JSON.stringify(pdisPorStatus)}\n\n`;
      }
    }

    // Buscar reuniões recentes
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7); // Últimos 7 dias

    const { data: reunioes } = await supabase
      .from('reunioes')
      .select('id, titulo, status, data_hora')
      .gte('data_hora', dataLimite.toISOString())
      .order('data_hora', { ascending: false })
      .limit(10);

    if (reunioes && reunioes.length > 0) {
      context += `Reuniões dos últimos 7 dias: ${reunioes.length}\n\n`;
    }

    return context;

  } catch (error) {
    console.error('Erro ao buscar contexto do sistema:', error);
    return "Não foi possível carregar informações do sistema no momento.";
  }
}