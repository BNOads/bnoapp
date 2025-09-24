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
    console.log('Processar transcrição function called');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { id, tipo, transcricao } = await req.json();
    
    if (!id || !tipo || !transcricao) {
      return new Response(
        JSON.stringify({ error: 'ID, tipo e transcrição são obrigatórios' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for this processing function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processando transcrição ${tipo} ID: ${id}`);

    // Processar com OpenAI para extrair informações estruturadas
    const analysisPrompt = `Analise a seguinte transcrição de reunião e extraia informações estruturadas:

TRANSCRIÇÃO:
${transcricao.substring(0, 8000)} ${transcricao.length > 8000 ? '...' : ''}

INSTRUÇÕES:
1. RESUMO: Crie um resumo executivo de 3-5 bullet points dos principais tópicos discutidos
2. PALAVRAS-CHAVE: Extraia 5-10 palavras-chave principais (separadas por vírgula)
3. COMPROMISSOS: Liste compromissos específicos feitos, com responsáveis quando mencionados
4. PRÓXIMOS PASSOS: Identifique ações definidas e prazos mencionados
5. TEMAS: Categorize os principais temas discutidos (ex: orçamento, estratégia, cronograma)
6. PARTICIPANTES: Identifique nomes de pessoas mencionadas

FORMATO DE RESPOSTA (JSON):
{
  "resumo": "Resumo executivo em bullet points",
  "palavras_chave": ["palavra1", "palavra2", "palavra3"],
  "compromissos": ["Compromisso 1", "Compromisso 2"],
  "proximos_passos": ["Ação 1", "Ação 2"],
  "temas": ["tema1", "tema2", "tema3"],
  "participantes": ["pessoa1", "pessoa2"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um assistente especializado em análise de transcrições de reuniões. Responda sempre em JSON válido.' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro da OpenAI:', errorData);
      throw new Error(`Erro da OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    console.log('Análise da IA recebida:', analysisText);

    // Tentar fazer parse do JSON retornado
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Erro ao fazer parse da análise:', parseError);
      // Fallback: extrair informações básicas
      analysis = {
        resumo: "Resumo automático não disponível",
        palavras_chave: [],
        compromissos: [],
        proximos_passos: [],
        temas: [],
        participantes: []
      };
    }

    // Atualizar o registro no banco com as informações processadas
    const tableName = tipo === 'gravacao' ? 'gravacoes' : 'reunioes';
    
    const updateData: any = {
      resumo_ia: analysis.resumo,
      palavras_chave: analysis.palavras_chave || [],
      participantes_mencionados: analysis.participantes || []
    };

    // Para reuniões, usar o campo correto
    if (tipo === 'reuniao') {
      updateData.temas_discutidos = analysis.temas || [];
    } else {
      updateData.temas = analysis.temas || [];
    }

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao atualizar registro:', updateError);
      throw updateError;
    }

    console.log(`Transcrição ${tipo} ${id} processada com sucesso`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Transcrição processada com sucesso',
      analysis: analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao processar transcrição:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});