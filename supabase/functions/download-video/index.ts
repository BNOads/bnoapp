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
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');

    switch (platform) {
      case 'youtube':
        try {
          const videoId = extractYouTubeId(url);
          if (!videoId) throw new Error('ID do YouTube inválido');

          fileName = `youtube_${videoId}.mp4`;
          console.log('📹 Baixando vídeo do YouTube via RapidAPI...');

          // 1) Tentar RapidAPI primeiro (se configurado)
          if (rapidApiKey) {
            try {
              console.log('🔄 Tentando RapidAPI YouTube Downloader...');
              const rapidResponse = await fetch(
                `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
                {
                  headers: {
                    'X-RapidAPI-Key': rapidApiKey,
                    'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
                  }
                }
              );

              if (rapidResponse.ok) {
                const rapidData = await rapidResponse.json();
                console.log('📥 RapidAPI response:', rapidData);
                
                // Procurar link MP4
                if (rapidData.link) {
                  downloadUrl = rapidData.link;
                  console.log('✅ URL obtida via RapidAPI');
                } else if (rapidData.formats) {
                  // Procurar formato MP4 na lista
                  const mp4Format = rapidData.formats.find((f: any) => 
                    f.mimeType?.includes('video/mp4') && f.hasAudio
                  ) || rapidData.formats[0];
                  
                  if (mp4Format?.url) {
                    downloadUrl = mp4Format.url;
                    console.log('✅ URL obtida via RapidAPI (formats)');
                  }
                }
              } else {
                console.log('⚠️ RapidAPI retornou:', rapidResponse.status);
              }
            } catch (err: any) {
              console.log('⚠️ RapidAPI falhou:', err.message);
            }
          }

          // 2) Fallback: Piped API (múltiplas instâncias públicas)
          if (!downloadUrl) {
            console.log('🔄 Fallback para Piped API...');
            const pipedInstances = [
              'https://piped.video',
              'https://pipedapi.kavin.rocks',
              'https://piped-api.garudalinux.org',
              'https://piped.projectsegfau.lt',
            ];

            for (const base of pipedInstances) {
              try {
                console.log(`🔄 Tentando ${base}...`);
                const res = await fetch(`${base}/streams/${videoId}`, {
                  headers: { 'Accept': 'application/json' }
                });
                
                if (!res.ok) {
                  console.log(`⚠️ ${base} retornou ${res.status}`);
                  continue;
                }

                const data = await res.json();
                
                // Procurar stream com vídeo+áudio
                const streams = [
                  ...(data.videoStreams || []),
                  ...(data.formatStreams || []),
                ];

                const mp4Stream = streams.find((s: any) => 
                  (s.mimeType?.includes('video/mp4') || s.format === 'MPEG_4') &&
                  (s.videoOnly === false || s.quality?.includes('720'))
                );

                if (mp4Stream?.url) {
                  downloadUrl = mp4Stream.url;
                  console.log(`✅ URL obtida via ${base}`);
                  break;
                }
              } catch (err) {
                console.log(`⚠️ ${base} falhou:`, (err as Error).message);
                continue;
              }
            }
          }

          if (!downloadUrl) {
            throw new Error('Não foi possível obter o vídeo do YouTube. Verifique se o vídeo é público.');
          }
        } catch (error: any) {
          console.error('❌ Erro ao processar YouTube:', error);
          throw new Error(`Erro ao baixar do YouTube: ${error.message}`);
        }
        break;

      case 'instagram':
        try {
          fileName = `instagram_${Date.now()}.mp4`;
          console.log('📸 Baixando vídeo do Instagram...');

          // 1) Tentar RapidAPI primeiro (se configurado)
          if (rapidApiKey) {
            try {
              console.log('🔄 Tentando RapidAPI Instagram Downloader...');
              const rapidResponse = await fetch(
                'https://instagram-scraper-api2.p.rapidapi.com/v1/post_info',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-RapidAPI-Key': rapidApiKey,
                    'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
                  },
                  body: JSON.stringify({ code_or_id_or_url: url })
                }
              );

              if (rapidResponse.ok) {
                const rapidData = await rapidResponse.json();
                console.log('📥 RapidAPI response:', rapidData);
                
                // Extrair URL do vídeo da resposta
                if (rapidData.data?.video_url) {
                  downloadUrl = rapidData.data.video_url;
                  console.log('✅ URL obtida via RapidAPI');
                } else if (rapidData.video_url) {
                  downloadUrl = rapidData.video_url;
                  console.log('✅ URL obtida via RapidAPI (direto)');
                }
              } else {
                console.log('⚠️ RapidAPI retornou:', rapidResponse.status);
              }
            } catch (err: any) {
              console.log('⚠️ RapidAPI falhou:', err.message);
            }
          }

          // 2) Fallback: Scraping direto
          if (!downloadUrl) {
            console.log('🔄 Fallback para scraping...');
            
            async function fetchHTML(target: string): Promise<string | null> {
              try {
                const res = await fetch(target, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                  }
                });
                if (!res.ok) return null;
                return await res.text();
              } catch {
                return null;
              }
            }

            const igUrl = url.replace(/^http:\/\//, 'https://');
            let html = await fetchHTML(igUrl);

            // Tentar via proxy se falhar
            if (!html) {
              console.log('⚠️ Tentando via proxy r.jina.ai...');
              const proxied = `https://r.jina.ai/${igUrl}`;
              html = await fetchHTML(proxied);
            }

            if (!html) {
              throw new Error('Não foi possível carregar a página do Instagram');
            }

            // Extrair URL do vídeo
            const patterns = [
              /property="og:video" content="([^"]+)"/,
              /"video_url":"([^"]+)"/,
              /(https:\\/\\/scontent[^\"\\\s]+?mp4[^\"\\\s]*)/,
              /(https:\/\/scontent[^"'\s]+?\.mp4[^"'\s]*)/
            ];

            for (const pattern of patterns) {
              const match = html.match(pattern);
              if (match && match[1]) {
                downloadUrl = match[1]
                  .replace(/&amp;/g, '&')
                  .replace(/\\u002F/g, '/')
                  .replace(/\\/g, '');
                console.log('✅ URL extraída via scraping');
                break;
              }
            }

            if (!downloadUrl) {
              throw new Error('Não foi possível extrair URL do vídeo. Verifique se o post contém vídeo.');
            }
          }
        } catch (error: any) {
          console.error('❌ Erro ao processar Instagram:', error);
          throw new Error(`Erro ao baixar do Instagram: ${error.message}`);
        }
        break;

      case 'meta':
        try {
          fileName = `meta_ads_${Date.now()}.mp4`;
          console.log('🎯 Baixando vídeo da Meta Ad Library (scraping)...');
          
          async function fetchMetaHTML(target: string): Promise<string | null> {
            try {
              const r = await fetch(target, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept-Language': 'en-US,en;q=0.9'
                }
              });
              if (!r.ok) return null;
              return await r.text();
            } catch {
              return null;
            }
          }

          const targets = [
            url,
            `https://r.jina.ai/${url}`
          ];

          let html: string | null = null;
          for (const t of targets) {
            console.log('🔄 Carregando HTML Meta Ads:', t);
            html = await fetchMetaHTML(t);
            if (html) break;
          }

          if (!html) throw new Error('Não foi possível carregar a página da Meta Ad Library');

          // Padrões para encontrar URLs de vídeo do Facebook
          const patterns = [
            /"playable_url":"([^"]+)"/,
            /"playable_url_quality_hd":"([^"]+)"/,
            /"video_url":"([^"]+)"/,
            /(https:\\/\\/video[^\"\\\s]+?\.mp4[^\"\\\s]*)/,
            /(https:\/\/video[^"'\s]+?\.mp4[^"'\s]*)/
          ];

          for (const pattern of patterns) {
            const m = html.match(pattern);
            if (m && m[1]) {
              downloadUrl = m[1]
                .replace(/&amp;/g, '&')
                .replace(/\\u002F/g, '/')
                .replace(/\\/g, '');
              console.log('✅ URL de vídeo encontrada via scraping');
              break;
            } else if (m && m[0] && m[0].startsWith('http')) {
              downloadUrl = m[0];
              console.log('✅ URL de vídeo encontrada via scraping');
              break;
            }
          }

          if (!downloadUrl) {
            throw new Error('Não foi possível extrair URL do vídeo. Verifique se o anúncio contém vídeo.');
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

    console.log('✅ URL de download obtida:', downloadUrl.substring(0, 100) + '...');

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
    
    // Retornar 200 com success:false para permitir mensagem clara no cliente
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar vídeo. Tente novamente.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função auxiliar para extrair ID do YouTube
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/,
    /youtube\.com\/shorts\/([^&\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}
