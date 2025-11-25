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
    const { imageBase64, headline, body, cta, notes, dimensions, protectFaces, variationIndex } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Construir prompt detalhado
    const prompt = `Create a professional social media ad creative.

Format: ${dimensions}
Text elements to include:
- Headline (bold, prominent): "${headline}"
- Body text (clear, readable): "${body}"
- CTA button (eye-catching): "${cta}"

Style guidelines:
${notes ? `- ${notes}` : ''}
- Clean, high-conversion design
- Professional layout
- Text should be clearly readable
- Use contrasting colors for text visibility
${protectFaces ? '- Avoid covering faces with text or elements' : ''}
- Modern, professional aesthetic
- Variation ${variationIndex + 1}: Create a unique layout arrangement

Important: This is variation ${variationIndex + 1}, make it visually distinct from other variations while maintaining brand consistency.`;

    console.log('Gerando criativo com prompt:', prompt);

    // Chamar Lovable AI para gerar imagem
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable:', errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error('Nenhuma imagem gerada pela API');
    }

    console.log('Criativo gerado com sucesso');

    return new Response(
      JSON.stringify({
        imageUrl: generatedImageUrl,
        success: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro ao gerar criativo:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao gerar criativo',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
