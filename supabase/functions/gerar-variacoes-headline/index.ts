import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🎯 Iniciando geração de variações de headline...');

  try {
    const { headline, quantidade } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    if (!headline || !quantidade) {
      throw new Error('Headline e quantidade são obrigatórios');
    }

    console.log(`📝 Headline original: "${headline}"`);
    console.log(`🔢 Gerando ${quantidade} variações`);

    const prompt = `Você é um copywriter especialista em criar headlines impactantes para anúncios de redes sociais.

HEADLINE ORIGINAL: "${headline}"

Gere ${quantidade} variações CRIATIVAS e ÚNICAS desta headline, mantendo o tom e objetivo, mas explorando diferentes ângulos, palavras e estruturas.

REGRAS:
- Cada variação deve ser diferente e criativa
- Mantenha o mesmo tamanho aproximado (máximo 120 caracteres)
- Mantenha o mesmo tom de voz
- Não repita palavras demais
- Seja persuasivo e impactante
- Retorne APENAS as headlines, uma por linha, sem numeração ou marcadores

Exemplo de formato de resposta:
Descubra o segredo que ninguém te contou
A mudança que você estava esperando chegou
Transforme sua vida em apenas 30 dias`;

    console.log('🤖 Chamando Lovable AI...');
    const startTime = Date.now();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um copywriter especialista em headlines para redes sociais. Seja criativo e persuasivo.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ API respondeu em ${duration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Lovable:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições atingido. Aguarde alguns minutos.');
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';
    
    // Processar as variações
    const variacoes = result
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && line.length <= 120)
      .slice(0, quantidade);

    console.log(`✅ ${variacoes.length} variações geradas com sucesso`);

    return new Response(
      JSON.stringify({ variacoes }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Erro ao gerar variações:', error.message || error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro desconhecido ao gerar variações',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
