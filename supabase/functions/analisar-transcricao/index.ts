import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnaliseRequest {
  transcricao_id: string;
  tipo: 'gravacao' | 'reuniao';
  transcricao: string;
  titulo?: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    const { transcricao_id, tipo, transcricao, titulo }: AnaliseRequest = await req.json();

    if (!transcricao_id || !tipo || !transcricao) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Parâmetros obrigatórios: transcricao_id, tipo, transcricao' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI API key não configurada' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Analisando ${tipo} ID: ${transcricao_id}`);

    // Análise com OpenAI
    const prompt = `
Analise a seguinte transcrição de reunião e extraia as seguintes informações em formato JSON:

1. Tópicos principais (máximo 5)
2. Decisões tomadas (com responsável quando mencionado)
3. Pendências e tarefas (com responsável e prazo quando mencionados)
4. Participantes identificados

Transcrição:
${transcricao}

Retorne APENAS um JSON válido no seguinte formato:
{
  "topicos_principais": ["tópico 1", "tópico 2"],
  "decisoes_tomadas": [
    {
      "decisao": "descrição da decisão",
      "responsavel": "nome ou null",
      "contexto": "contexto adicional"
    }
  ],
  "pendencias": [
    {
      "tarefa": "descrição da tarefa",
      "responsavel": "nome ou null",
      "prazo": "prazo ou null",
      "prioridade": "alta/media/baixa"
    }
  ],
  "participantes_identificados": ["nome 1", "nome 2"]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise de reuniões. Retorne sempre JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('Erro na API da OpenAI:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Erro ao processar análise com IA' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const openaiData = await openaiResponse.json();
    const analiseTexto = openaiData.choices[0]?.message?.content;

    if (!analiseTexto) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Resposta vazia da IA' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Parse do JSON da análise
    let analise;
    try {
      analise = JSON.parse(analiseTexto);
    } catch (parseError) {
      console.error('Erro ao fazer parse da análise:', parseError);
      console.log('Texto da análise:', analiseTexto);
      
      // Fallback: extrair informações básicas
      analise = {
        topicos_principais: [],
        decisoes_tomadas: [],
        pendencias: [],
        participantes_identificados: []
      };
    }

    // Gerar embedding da transcrição
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: `${titulo || ''} ${transcricao}`.substring(0, 8000), // Limitar tamanho
      }),
    });

    let embedding = null;
    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      embedding = embeddingData.data[0]?.embedding;
    }

    // Atualizar banco de dados
    const tabela = tipo === 'gravacao' ? 'gravacoes' : 'reunioes';
    const updateData: any = {
      topicos_principais: analise.topicos_principais || [],
      decisoes_tomadas: analise.decisoes_tomadas || [],
      pendencias: analise.pendencias || [],
    };

    if (embedding) {
      updateData.embedding = embedding;
    }

    if (tipo === 'gravacao' && analise.participantes_identificados) {
      updateData.participantes_identificados = analise.participantes_identificados;
    }

    const { error: updateError } = await supabaseClient
      .from(tabela)
      .update(updateData)
      .eq('id', transcricao_id);

    if (updateError) {
      console.error('Erro ao atualizar análise:', updateError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Erro ao salvar análise no banco de dados' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Análise concluída para ${tipo} ID: ${transcricao_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      analise: analise,
      embedding_gerado: !!embedding
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função analisar-transcricao:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);