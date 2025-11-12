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
          console.log('📹 Tentando baixar vídeo do YouTube via Piped API (fallback múltiplo)...');

          const pipedInstances = [
            'https://piped.video',
            'https://piped.projectsegfau.lt',
            'https://piped.jotoma.de',
            'https://watch.leptons.xyz',
            'https://piped.hadwiger.dev'
          ];

          let success = false;

          for (const base of pipedInstances) {
            try {
              console.log(`🔄 Buscando streams em ${base}...`);
              const res = await fetch(`${base}/api/v1/streams/${videoId}`, {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
                }
              });
              const body = await res.text();
              console.log(`📥 ${base} status ${res.status}`);
              if (!res.ok) continue;

              const data = JSON.parse(body);
              // Tentar encontrar stream MP4 com áudio
              const streams = [
                ...(data.formatStreams || []),
                ...(data.videoStreams || []),
              ];

              const mp4Candidates = streams
                .filter((s: any) =>
                  (s.container?.includes('mp4') || s.mimeType?.includes('mp4')) && (s.url || s.proxyUrl)
                );

              let chosen: any = mp4Candidates.find((s: any) =>
                (s.quality?.includes('720') || s.qualityLabel?.includes('720'))
              ) || mp4Candidates[0];

              if (!chosen && data.hls) {
                // Fallback para HLS (o navegador baixa como arquivo m3u8)
                downloadUrl = data.hls;
                success = true;
              } else if (chosen) {
                downloadUrl = chosen.url || chosen.proxyUrl;
                success = true;
              }

              if (success && downloadUrl) {
                console.log('✅ URL obtida via Piped:', downloadUrl.substring(0, 80) + '...');
                break;
              }
            } catch (err) {
              console.log('⚠️ Falha na instância Piped:', (err as Error).message);
              continue;
            }
          }

          if (!success || !downloadUrl) {
            throw new Error('Não foi possível obter o stream do YouTube (todas as instâncias falharam)');
          }
        } catch (error: any) {
          console.error('❌ Erro ao processar YouTube:', error);
          throw new Error(`Erro ao baixar do YouTube: ${error.message}`);
        }
        break;

      case 'instagram':
        try {
          fileName = `instagram_${Date.now()}.mp4`;
          console.log('📸 Tentando baixar vídeo do Instagram (scraping)...');

          // Normalizar URL (garantir https)
          const igUrl = url.replace(/^http:\/\//, 'https://');

          // 1) Tentar obter HTML direto
          async function fetchHTML(target: string): Promise<string | null> {
            try {
              const res = await fetch(target, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9'
                }
              });
              if (!res.ok) return null;
              return await res.text();
            } catch {
              return null;
            }
          }

          let html = await fetchHTML(igUrl);

          // 2) Fallback por proxy de leitura (r.jina.ai) para evitar bloqueios
          if (!html) {
            console.log('⚠️ HTML direto falhou, tentando via r.jina.ai proxy...');
            const proxied = `https://r.jina.ai/http://${igUrl.replace(/^https?:\/\//, '')}`;
            html = await fetchHTML(proxied);
          }

          if (!html) {
            throw new Error('Não foi possível carregar a página do Instagram');
          }

          // 3) Extrair URL do vídeo via diferentes padrões
          const patterns = [
            /property="og:video" content="([^"]+)"/,
            /property='og:video' content='([^']+)'/,
            /"video_url":"([^"]+)"/,
            /(https:\\u002F\\u002Fscontent[^"\\\s]+?mp4[^"\\\s]*)/,
            /(https:\/\/scontent[^"'\s]+?\.mp4[^"'\s]*)/
          ];

          for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
              downloadUrl = match[1]
                .replace(/&amp;/g, '&')
                .replace(/\\u002F/g, '/')
                .replace(/\\/g, '');
              break;
            }
          }

          if (!downloadUrl) {
            console.log('⚠️ Extração direta falhou, tentando via ddinstagram...');
            // 4) Fallback: ddinstagram (espelha conteúdo público)
            try {
              const igPath = igUrl.replace(/^https?:\/\/[^/]+/, '');
              const ddUrl = `https://ddinstagram.com${igPath}`;
              let ddHtml = await fetchHTML(ddUrl);
              if (!ddHtml) {
                const ddProxy = `https://r.jina.ai/http://ddinstagram.com${igPath}`;
                ddHtml = await fetchHTML(ddProxy);
              }
              if (ddHtml) {
                const ddPatterns = [
                  /property="og:video" content="([^"]+)"/,
                  /"video_url":"([^"]+)"/,
                  /(https:\\/\\/scontent[^"\\\s]+?mp4[^"\\\s]*)/,
                  /(https:\/\/scontent[^"'\s]+?\.mp4[^"'\s]*)/
                ];
                for (const pattern of ddPatterns) {
                  const match = ddHtml.match(pattern);
                  if (match && match[1]) {
                    downloadUrl = match[1]
                      .replace(/&amp;/g, '&')
                      .replace(/\\u002F/g, '/')
                      .replace(/\\/g, '');
                    break;
                  }
                }
              }
            } catch {}
          }

          if (!downloadUrl) {
            throw new Error('Não foi possível extrair a URL do vídeo do Instagram');
          }

          console.log('✅ URL do Instagram encontrada:', downloadUrl.substring(0, 120) + '...');
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
              /"playable_url":"([^\"]+)"/,
              /"playable_url_quality_hd":"([^\"]+)"/,
              /"video_url":"([^\"]+)"/,
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
    /youtube\.com\/v\/([^&\s]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}
