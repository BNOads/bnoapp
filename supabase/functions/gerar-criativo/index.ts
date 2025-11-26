import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🎨 Iniciando geração de criativo...');

  try {
    const startTime = Date.now();
    const { imageBase64, headline, body, cta, notes, dimensions, protectFaces, variationIndex } = await req.json();

    console.log(`📝 Parâmetros recebidos: ${dimensions}, variação ${variationIndex + 1}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Validar tamanho da imagem base64
    const imageSizeKB = (imageBase64.length * 3) / 4 / 1024;
    console.log(`📊 Tamanho da imagem recebida: ${imageSizeKB.toFixed(2)}KB`);

    if (imageSizeKB > 250) {
      console.error(`❌ Imagem muito grande: ${imageSizeKB.toFixed(2)}KB`);
      throw new Error(`Imagem muito grande (${imageSizeKB.toFixed(0)}KB). A imagem deve ser menor que 250KB após otimização.`);
    }

    // Construir prompt mais conciso para reduzir processamento
    const prompt = `Create ${dimensions} social media ad.

TEXT TO ADD:
- Headline: "${headline}"
- Body: "${body}"  
- CTA: "${cta}"

STYLE: Professional, clean, readable text with strong contrast. ${notes || ''}
${protectFaces ? 'Avoid covering faces.' : ''}
Variation ${variationIndex + 1}.`;

    console.log('🤖 Chamando Lovable AI...');
    const apiStartTime = Date.now();

    // Chamar Lovable AI para gerar imagem com timeout de 55s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64,
                  },
                },
              ],
            },
          ],
          modalities: ['image', 'text'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const apiDuration = Date.now() - apiStartTime;
      console.log(`⏱️ API respondeu em ${apiDuration}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na API Lovable:', response.status, errorText);
        
        if (response.status === 429) {
          throw new Error('Limite de requisições atingido. Aguarde alguns minutos.');
        }
        
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        console.error('❌ Resposta da API sem imagem:', JSON.stringify(data));
        throw new Error('API não retornou imagem');
      }

      const totalDuration = Date.now() - startTime;
      console.log(`✅ Criativo gerado com sucesso em ${totalDuration}ms`);

      return new Response(
        JSON.stringify({
          imageUrl: generatedImageUrl,
          success: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏰ Timeout na API (55s)');
        throw new Error('Timeout: geração demorou muito. Tente com imagens menores.');
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('❌ Erro ao gerar criativo:', error.message || error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro desconhecido ao gerar criativo',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
