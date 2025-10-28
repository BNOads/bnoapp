import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { periodo_inicio, periodo_fim } = await req.json();

    console.log('📊 Analisando respostas NPS do período:', periodo_inicio, 'até', periodo_fim);

    // Buscar todas as respostas do período
    const { data: respostas, error: respostasError } = await supabaseClient
      .from('nps_respostas')
      .select(`
        *,
        cliente:clientes(nome)
      `)
      .gte('data_resposta', periodo_inicio)
      .lte('data_resposta', periodo_fim)
      .order('data_resposta', { ascending: false });

    if (respostasError) throw respostasError;

    if (!respostas || respostas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma resposta encontrada no período' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular estatísticas
    const totalRespostas = respostas.length;
    const nps_medio = respostas.reduce((sum, r) => sum + r.nota_nps, 0) / totalRespostas;
    const total_detratores = respostas.filter(r => r.tipo_respondente === 'detrator').length;
    const total_neutros = respostas.filter(r => r.tipo_respondente === 'neutro').length;
    const total_promotores = respostas.filter(r => r.tipo_respondente === 'promotor').length;

    // Preparar contexto para IA
    const motivosDetratores = respostas
      .filter(r => r.tipo_respondente === 'detrator' && r.motivo_nps)
      .map(r => `- Cliente: ${r.cliente?.nome || 'N/A'} | Nota: ${r.nota_nps} | Motivo: ${r.motivo_nps}`);

    const motivosSatisfacaoBaixa = respostas
      .filter(r => r.satisfacao_semanal && r.satisfacao_semanal <= 3 && r.motivo_satisfacao_baixa)
      .map(r => `- ${r.cliente?.nome || 'N/A'}: ${r.motivo_satisfacao_baixa}`);

    const motivosPromotores = respostas
      .filter(r => r.tipo_respondente === 'promotor' && r.motivo_nps)
      .map(r => `- Cliente: ${r.cliente?.nome || 'N/A'} | Nota: ${r.nota_nps} | Destaque: ${r.motivo_nps}`);

    const systemPrompt = `Você é um analista de CX (Customer Experience) especializado em NPS e satisfação de clientes.
Sua missão é analisar feedbacks de clientes de uma agência de marketing digital (BNOads) e gerar insights acionáveis.

RETORNE APENAS UM JSON com esta estrutura:
{
  "principais_problemas": ["problema 1", "problema 2", "problema 3"],
  "pontos_fortes": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "recomendacoes": ["ação recomendada 1", "ação recomendada 2", "ação recomendada 3"],
  "tendencia": "positiva" | "negativa" | "estavel"
}

DIRETRIZES:
- Agrupe problemas similares
- Seja específico e acionável
- Priorize o que tem maior impacto
- Considere tanto detratores quanto promotores`;

    const userPrompt = `Analise os seguintes feedbacks de NPS:

ESTATÍSTICAS GERAIS:
- Total de respostas: ${totalRespostas}
- NPS médio: ${nps_medio.toFixed(1)}
- Detratores: ${total_detratores} (${((total_detratores/totalRespostas)*100).toFixed(1)}%)
- Neutros: ${total_neutros} (${((total_neutros/totalRespostas)*100).toFixed(1)}%)
- Promotores: ${total_promotores} (${((total_promotores/totalRespostas)*100).toFixed(1)}%)

FEEDBACKS DE DETRATORES (notas 0-6):
${motivosDetratores.length > 0 ? motivosDetratores.join('\n') : 'Nenhum feedback de detrator com motivo'}

FEEDBACKS DE SATISFAÇÃO SEMANAL BAIXA:
${motivosSatisfacaoBaixa.length > 0 ? motivosSatisfacaoBaixa.join('\n') : 'Nenhum feedback de satisfação baixa'}

FEEDBACKS DE PROMOTORES (notas 9-10):
${motivosPromotores.length > 0 ? motivosPromotores.join('\n') : 'Nenhum feedback de promotor com destaque'}

Gere insights acionáveis em formato JSON.`;

    console.log('🤖 Chamando IA para análise...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na API da IA:', aiResponse.status, errorText);
      throw new Error(`Erro ao chamar IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let insightsTexto = aiData.choices?.[0]?.message?.content || '{}';
    
    // Limpar markdown se existir
    insightsTexto = insightsTexto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('📄 Resposta da IA:', insightsTexto.substring(0, 200));

    let insights;
    try {
      insights = JSON.parse(insightsTexto);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      const jsonMatch = insightsTexto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Não foi possível extrair JSON da resposta da IA');
      }
    }

    // Salvar insights no banco
    const { data: insightSalvo, error: insightError } = await supabaseClient
      .from('nps_insights_ia')
      .insert({
        periodo_inicio,
        periodo_fim,
        nps_medio: nps_medio.toFixed(2),
        total_respostas: totalRespostas,
        total_detratores,
        total_neutros,
        total_promotores,
        principais_problemas: insights.principais_problemas || [],
        pontos_fortes: insights.pontos_fortes || [],
        recomendacoes: insights.recomendacoes || [],
        tendencia: insights.tendencia || 'estavel'
      })
      .select()
      .single();

    if (insightError) throw insightError;

    console.log('✅ Insights gerados e salvos com sucesso');

    return new Response(
      JSON.stringify(insightSalvo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar insights NPS:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
