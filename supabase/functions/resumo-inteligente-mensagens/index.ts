import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cliente_nome, mensagens } = await req.json();
    
    console.log('📊 Gerando resumo inteligente para:', cliente_nome);
    console.log('📝 Total de mensagens:', mensagens?.length);

    if (!mensagens || mensagens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma mensagem fornecida para análise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Preparar contexto de mensagens semanais
    const mensagensContexto = mensagens.map((msg: any, idx: number) => {
      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 SEMANA ${idx + 1}: ${msg.data}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${msg.texto}
`;
    }).join('\n\n');

    const systemPrompt = `Você é um analista de marketing digital especializado em Meta Ads, Google Ads e otimização de funis de vendas.

Seu objetivo é analisar mensagens semanais de performance de campanhas e gerar um resumo executivo CONCISO e DIRETO.

**FORMATO DE RESPOSTA OBRIGATÓRIO:**

Você DEVE retornar um JSON válido com esta estrutura exata:

{
  "panorama": "Texto descritivo ENXUTO com overview geral",
  "alertas": "Lista OBJETIVA de pontos de atenção e problemas",
  "proximos_passos": "Lista PRÁTICA de recomendações acionáveis"
}

**DIRETRIZES DE FORMATAÇÃO:**

1. **Use Markdown para destacar informações:**
   - **Negritos** para métricas importantes e valores (ex: **CPL: R$ 27,14**)
   - *Itálicos* para ênfase em tendências (ex: *queda significativa*, *melhoria consistente*)
   - Combine quando necessário (ex: ***muito importante***)

2. **Panorama Geral (2-3 frases máximo):**
   - Resuma APENAS as métricas principais e tendência geral
   - Seja direto: "Investimento estável. **CPL** melhorou. **CTR** aumentou."
   - Use **negritos** para métricas e números

3. **Alertas (3-4 itens bullet máximo):**
   - Liste APENAS problemas reais e urgentes
   - Use • para bullets
   - Formato: "⚠️ **[Problema]:** descrição curta com *ênfase* em tendências"
   - Cite números com **negrito**

4. **Próximos Passos (3-4 itens bullet máximo):**
   - Ações práticas e específicas
   - Use • para bullets
   - Formato: "🎯 **[Ação]:** descrição objetiva"

**REGRAS CRÍTICAS:**
- SEJA EXTREMAMENTE ENXUTO - máximo 2-3 linhas por item
- Use **negritos** para métricas, valores e palavras-chave
- Use *itálicos* para ênfases e tendências
- Remova informações redundantes ou óbvias
- Foque APENAS no que é acionável e relevante
- RETORNE APENAS O JSON, sem markdown ou explicações adicionais`;

    const userPrompt = `Cliente: **${cliente_nome}**

Analise as seguintes mensagens semanais de performance e gere um resumo inteligente:

${mensagensContexto}

---

Gere um resumo executivo seguindo o formato JSON especificado. Lembre-se: retorne APENAS o JSON.`;

    console.log('🤖 Chamando Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.3, // Baixa temperatura para respostas mais consistentes
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API do Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA insuficientes. Por favor, adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro ao chamar API: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Resposta recebida da IA');

    let resumoTexto = data.choices?.[0]?.message?.content || '';
    
    // Remover markdown se existir
    resumoTexto = resumoTexto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('📄 Resposta da IA:', resumoTexto.substring(0, 200));

    let resumo;
    try {
      resumo = JSON.parse(resumoTexto);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('Resposta recebida:', resumoTexto);
      
      // Fallback: tentar extrair JSON do texto
      const jsonMatch = resumoTexto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resumo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Não foi possível extrair JSON da resposta da IA');
      }
    }

    // Validar estrutura
    if (!resumo.panorama || !resumo.alertas || !resumo.proximos_passos) {
      console.error('❌ Estrutura inválida:', resumo);
      throw new Error('Resposta da IA com estrutura inválida');
    }

    console.log('✅ Resumo gerado com sucesso');

    return new Response(
      JSON.stringify(resumo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar resumo:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar resumo'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
