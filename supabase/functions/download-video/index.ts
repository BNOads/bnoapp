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
        try {
          const videoId = extractYouTubeId(url);
          if (!videoId) throw new Error('ID do YouTube inválido');
          
          fileName = `youtube_${videoId}.mp4`;
          console.log('📹 Tentando baixar vídeo do YouTube...');
          
          // Tentar múltiplos serviços em ordem
          let success = false;
          const services = [
            {
              name: 'Cobalt API v7',
              endpoint: 'https://co.wuk.sh/api/json',
              buildRequest: () => ({
                url: url,
                vCodec: 'h264',
                vQuality: '720',
                aFormat: 'mp3',
                filenamePattern: 'basic',
                isAudioOnly: false,
                isNoTTWatermark: true,
              })
            },
            {
              name: 'Cobalt API (legacy)',
              endpoint: 'https://api.cobalt.tools/api/json',
              buildRequest: () => ({
                url: url,
                vCodec: 'h264',
                vQuality: '720',
              })
            }
          ];

          for (const service of services) {
            try {
              console.log(`🔄 Tentando ${service.name}...`);
              
              const response = await fetch(service.endpoint, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(service.buildRequest())
              });

              const responseText = await response.text();
              console.log(`📥 ${service.name} response (${response.status}):`, responseText);

              if (!response.ok) {
                console.log(`⚠️ ${service.name} retornou ${response.status}, tentando próximo...`);
                continue;
              }

              const data = JSON.parse(responseText);

              if (data.status === 'stream' || data.status === 'redirect') {
                downloadUrl = data.url;
                console.log(`✅ Download URL obtida via ${service.name}`);
                success = true;
                break;
              } else if (data.status === 'picker') {
                downloadUrl = data.picker?.[0]?.url || data.url;
                console.log(`✅ Download URL obtida via ${service.name} (picker)`);
                success = true;
                break;
              } else if (data.status === 'error') {
                console.log(`⚠️ ${service.name} retornou erro:`, data.text);
                continue;
              }
            } catch (err: any) {
              console.log(`⚠️ ${service.name} falhou:`, err.message);
              continue;
            }
          }

          if (!success) {
            throw new Error('Todos os serviços de download falharam. Tente novamente mais tarde.');
          }
        } catch (error: any) {
          console.error('❌ Erro ao processar YouTube:', error);
          throw new Error(`Erro ao baixar do YouTube: ${error.message}`);
        }
        break;

      case 'instagram':
        try {
          fileName = `instagram_${Date.now()}.mp4`;
          console.log('📸 Tentando baixar vídeo do Instagram...');
          
          let success = false;
          const services = [
            {
              name: 'Cobalt API v7',
              endpoint: 'https://co.wuk.sh/api/json'
            },
            {
              name: 'Cobalt API (legacy)',
              endpoint: 'https://api.cobalt.tools/api/json'
            }
          ];

          for (const service of services) {
            try {
              console.log(`🔄 Tentando ${service.name}...`);
              
              const response = await fetch(service.endpoint, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: url,
                  vCodec: 'h264',
                  vQuality: '720',
                })
              });

              const responseText = await response.text();
              console.log(`📥 ${service.name} response (${response.status}):`, responseText);

              if (!response.ok) {
                console.log(`⚠️ ${service.name} retornou ${response.status}, tentando próximo...`);
                continue;
              }

              const data = JSON.parse(responseText);

              if (data.status === 'stream' || data.status === 'redirect') {
                downloadUrl = data.url;
                console.log(`✅ Download URL obtida via ${service.name}`);
                success = true;
                break;
              } else if (data.status === 'picker') {
                downloadUrl = data.picker?.[0]?.url || data.url;
                console.log(`✅ Download URL obtida via ${service.name} (picker)`);
                success = true;
                break;
              }
            } catch (err: any) {
              console.log(`⚠️ ${service.name} falhou:`, err.message);
              continue;
            }
          }

          if (!success) {
            throw new Error('Não foi possível baixar do Instagram. Tente novamente mais tarde.');
          }
        } catch (error: any) {
          console.error('❌ Erro ao processar Instagram:', error);
          throw new Error(`Erro ao baixar do Instagram: ${error.message}`);
        }
        break;

      case 'meta':
        try {
          fileName = `meta_ads_${Date.now()}.mp4`;
          console.log('🎯 Tentando baixar vídeo da Meta Ad Library...');
          
          // Meta Ad Library tem URL específica, vamos tentar usar Cobalt também
          const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: url,
              vCodec: 'h264',
              vQuality: '720',
              aFormat: 'mp3',
              filenamePattern: 'basic',
              isAudioOnly: false,
            })
          });

          if (!cobaltResponse.ok) {
            // Se Cobalt não funcionar, tentar scraping direto
            console.log('⚠️ Cobalt não suportou Meta Ad Library, tentando scraping direto...');
            
            // Fazer scraping do HTML da página
            const pageResponse = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (!pageResponse.ok) {
              throw new Error('Não foi possível acessar a página da Meta Ad Library');
            }

            const html = await pageResponse.text();
            
            // Procurar por URLs de vídeo no HTML (padrões comuns do Facebook)
            const videoPatterns = [
              /"playable_url":"([^"]+)"/,
              /"playable_url_quality_hd":"([^"]+)"/,
              /"video_url":"([^"]+)"/,
              /https:\/\/video[^"'\s]+\.mp4/
            ];

            for (const pattern of videoPatterns) {
              const match = html.match(pattern);
              if (match && match[1]) {
                downloadUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
                console.log('✅ URL de vídeo encontrada via scraping:', downloadUrl);
                break;
              } else if (match && match[0]) {
                downloadUrl = match[0];
                console.log('✅ URL de vídeo encontrada via scraping:', downloadUrl);
                break;
              }
            }

            if (!downloadUrl) {
              throw new Error('Não foi possível extrair URL do vídeo da Meta Ad Library');
            }
          } else {
            const cobaltData = await cobaltResponse.json();
            console.log('✅ Cobalt response:', cobaltData);

            if (cobaltData.status === 'stream' || cobaltData.status === 'redirect') {
              downloadUrl = cobaltData.url;
            } else if (cobaltData.status === 'error') {
              throw new Error(cobaltData.text || 'Erro ao processar vídeo da Meta Ad Library');
            }
          }
        } catch (error: any) {
          console.error('❌ Erro ao processar Meta Ad Library:', error);
          throw new Error(`Erro ao baixar da Meta Ad Library: ${error.message}`);
        }
        break;

      default:
        throw new Error('Plataforma não suportada');
    }

    if (!downloadUrl) {
      throw new Error('Não foi possível obter URL de download');
    }

    console.log('✅ URL de download obtida:', downloadUrl);

    // Retornar URL de download
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
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar vídeo. Tente novamente.',
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
