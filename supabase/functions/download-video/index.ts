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
    const { url, platform } = await req.json();

    if (!url || !platform) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL e plataforma são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎥 Processando download de ${platform}:`, url);

    let downloadUrl: string | null = null;
    let fileName = `video_${Date.now()}.mp4`;

    switch (platform) {
      case 'youtube':
        // Usar API pública do YouTube (yt-dlp proxy ou similar)
        // Por simplicidade, vamos usar um serviço público como y2mate API alternativa
        try {
          // Exemplo usando API pública (você pode substituir por outra API)
          const videoId = extractYouTubeId(url);
          if (!videoId) throw new Error('ID do YouTube inválido');
          
          fileName = `youtube_${videoId}.mp4`;
          
          // Aqui você pode integrar com serviços como:
          // - cobalt.tools API
          // - yt-dlp.org
          // - ou qualquer outro serviço público
          
          // Por enquanto, retornamos um erro informativo
          throw new Error('YouTube download requer integração com serviço externo (yt-dlp, cobalt.tools, etc.)');
        } catch (error) {
          console.error('Erro ao processar YouTube:', error);
          throw error;
        }
        break;

      case 'instagram':
        try {
          // Instagram requer scraping ou API de terceiros
          // Você pode usar serviços como:
          // - instaloader API
          // - instagram-downloader API
          
          fileName = `instagram_${Date.now()}.mp4`;
          throw new Error('Instagram download requer integração com serviço externo (instaloader, etc.)');
        } catch (error) {
          console.error('Erro ao processar Instagram:', error);
          throw error;
        }
        break;

      case 'meta':
        try {
          // Meta Ad Library requer scraping específico
          fileName = `meta_ads_${Date.now()}.mp4`;
          throw new Error('Meta Ad Library download requer scraping customizado');
        } catch (error) {
          console.error('Erro ao processar Meta Ad Library:', error);
          throw error;
        }
        break;

      default:
        throw new Error('Plataforma não suportada');
    }

    // Se chegou aqui com sucesso, retornar URL de download
    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl,
        fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro no download:', error);
    
    // Retornar erro amigável para o usuário
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar vídeo. Tente novamente.',
        details: 'Esta funcionalidade requer integração com serviços de download de vídeo (yt-dlp, cobalt.tools, etc.). Por favor, configure uma API key ou serviço externo.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função auxiliar para extrair ID do YouTube
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}
