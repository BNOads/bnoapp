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
    console.log(`📊 Tamanho da imagem: ${imageSizeKB.toFixed(2)}KB`);

    if (imageSizeKB > 5000) {
      throw new Error('Imagem muito grande. Use imagens menores que 5MB.');
    }

    // Construir prompt detalhado
    const prompt = `Create a professional social media ad creative for ${dimensions}.

CRITICAL REQUIREMENTS:
1. Add this exact headline text (bold, prominent, top 20% of image): "${headline}"
2. Add this exact body text (clear, readable, middle section): "${body}"
3. Add this exact CTA (button or prominent text, bottom 20%): "${cta}"

LAYOUT RULES:
- Text must be HIGHLY READABLE with strong contrast
- Use professional typography and spacing
- Create balanced composition
${protectFaces ? '- DO NOT cover faces with text or graphics' : ''}
- This is variation #${variationIndex + 1} - make it visually DISTINCT

STYLE NOTES: ${notes || 'Modern, clean, professional'}

Output: High-quality ${dimensions} social media ad with all text clearly visible.`;

    console.log('🤖 Chamando Lovable AI...');
    const apiStartTime = Date.now();

    // Chamar Lovable AI para gerar imagem com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout

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
        console.error('⏰ Timeout na API (50s)');
        throw new Error('Geração demorou muito tempo. Tente com imagens menores ou menos variações.');
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
