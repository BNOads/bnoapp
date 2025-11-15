import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sistema de logs estruturado
function log(level: 'INFO' | 'WARN' | 'ERROR', platform: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const emoji = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✅';
  console.log(`${emoji} [${timestamp}] [${level}] [${platform}] ${message}`, data ? JSON.stringify(data) : '');
}

// Sistema de retry com exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  platform = 'UNKNOWN'
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      log('INFO', platform, `Tentativa ${attempt + 1}/${maxRetries}`, { url: url.substring(0, 100) });
      const response = await fetch(url, options);
      
      if (response.ok) {
        log('INFO', platform, `Requisição bem-sucedida na tentativa ${attempt + 1}`);
        return response;
      }
      
      log('WARN', platform, `Tentativa ${attempt + 1} falhou com status ${response.status}`);
      
      // Não retry em erros 4xx (exceto 429 - rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      log('ERROR', platform, `Erro na tentativa ${attempt + 1}`, { error: error.message });
      
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
    
    // Exponential backoff: 200ms, 800ms, 3200ms
    if (attempt < maxRetries - 1) {
      const delay = Math.pow(4, attempt) * 200;
      log('INFO', platform, `Aguardando ${delay}ms antes da próxima tentativa`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries reached');
}

// Validação e sanitização de URLs
function validateAndSanitizeUrl(url: string): { valid: boolean; sanitized: string; error?: string } {
  try {
    // Remove espaços e quebras de linha
    const cleaned = url.trim().replace(/\s+/g, '');
    
    // Tenta criar URL object para validar
    const urlObj = new URL(cleaned);
    
    // Remove parâmetros desnecessários do Instagram
    if (urlObj.hostname.includes('instagram.com')) {
      urlObj.searchParams.delete('utm_source');
      urlObj.searchParams.delete('utm_medium');
      urlObj.searchParams.delete('igshid');
      urlObj.searchParams.delete('igsh');
    }
    
    return {
      valid: true,
      sanitized: urlObj.toString()
    };
  } catch (error) {
    return {
      valid: false,
      sanitized: url,
      error: 'URL inválida. Verifique se copiou corretamente.'
    };
  }
}

// Extrai código do post do Instagram
function extractInstagramPostCode(url: string): string | null {
  // Suporta: /p/, /reel/, /tv/, /stories/
  const patterns = [
    /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/stories\/[^/]+\/([0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Extrai ID do YouTube com validação robusta
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1].length === 11) {
      return match[1];
    }
  }
  
  return null;
}

// ==================== COBALT.TOOLS API (FREE & RELIABLE) ====================
async function downloadViaCobalt(url: string, platform: string): Promise<{ downloadUrl: string; filename: string; method: string } | null> {
  log('INFO', platform, 'Tentando Cobalt.tools API', { url });

  try {
    const response = await fetchWithRetry(
      'https://api.cobalt.tools/api/json',
      {
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
        }),
      },
      2,
      platform
    );

    const data = await response.json();
    log('INFO', platform, 'Resposta Cobalt.tools', { status: data.status });

    // Cobalt retorna status: "redirect" com URL direta
    if (data.status === 'redirect' && data.url) {
      return {
        downloadUrl: data.url,
        filename: data.filename || `video_${Date.now()}.mp4`,
        method: 'Cobalt.tools'
      };
    }

    // Cobalt retorna status: "picker" com múltiplas qualidades
    if (data.status === 'picker' && data.picker && data.picker.length > 0) {
      const bestQuality = data.picker[0]; // Primeira opção geralmente é a melhor
      return {
        downloadUrl: bestQuality.url,
        filename: bestQuality.filename || `video_${Date.now()}.mp4`,
        method: 'Cobalt.tools'
      };
    }

    throw new Error(`Cobalt status inesperado: ${data.status}`);
  } catch (error) {
    log('WARN', platform, 'Falha no Cobalt.tools', { error: error.message });
    return null; // Retorna null para permitir fallback
  }
}

// ==================== UNIVERSAL DOWNLOADER (RAPID API) ====================
async function downloadUniversal(url: string, platform: string): Promise<{ downloadUrl: string; filename: string; method: string }> {
  log('INFO', 'UNIVERSAL', 'Tentando RapidAPI best-all-in-one-video-downloader', { url, platform });
  const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
  
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY não configurada');
  }
  
  try {
    const params = new URLSearchParams();
    params.append('url', url);
    
    const response = await fetchWithRetry(
      'https://best-all-in-one-video-downloader.p.rapidapi.com',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'best-all-in-one-video-downloader.p.rapidapi.com',
        },
        body: params.toString(),
      },
      3,
      'UNIVERSAL'
    );
    
    const data = await response.json();
    log('INFO', 'UNIVERSAL', 'Resposta da API', { data });
    
    // Processa diferentes formatos de resposta da API
    if (data.url || data.downloadUrl || data.download_url) {
      const downloadUrl = data.url || data.downloadUrl || data.download_url;
      const filename = data.filename || data.title || `${platform}_${Date.now()}.mp4`;
      
      log('INFO', 'UNIVERSAL', 'Download bem-sucedido via RapidAPI Universal');
      return {
        downloadUrl,
        filename,
        method: 'RapidAPI (best-all-in-one)'
      };
    }
    
    // Se a API retornou múltiplos formatos
    if (data.formats && Array.isArray(data.formats) && data.formats.length > 0) {
      const bestFormat = data.formats.find((f: any) => f.quality === 'best') || data.formats[0];
      log('INFO', 'UNIVERSAL', 'Download bem-sucedido via RapidAPI Universal (formato múltiplo)');
      return {
        downloadUrl: bestFormat.url || bestFormat.downloadUrl,
        filename: data.title || `${platform}_${Date.now()}.mp4`,
        method: 'RapidAPI (best-all-in-one)'
      };
    }
    
    throw new Error('Formato de resposta não reconhecido');
  } catch (error) {
    log('ERROR', 'UNIVERSAL', 'Falha no RapidAPI Universal', { error: error.message });
    throw error;
  }
}

// ==================== INSTAGRAM ====================
async function downloadInstagram(url: string): Promise<{ downloadUrl: string; filename: string; method: string }> {
  log('INFO', 'INSTAGRAM', 'Iniciando download do Instagram', { url });
  
  // Estratégia 1: Cobalt.tools (gratuito e confiável)
  const cobaltResult = await downloadViaCobalt(url, 'instagram');
  if (cobaltResult) {
    return cobaltResult;
  }
  
  // Estratégia 2: Tenta downloader universal (RapidAPI)
  try {
    return await downloadUniversal(url, 'instagram');
  } catch (error) {
    log('WARN', 'INSTAGRAM', 'Falha no downloader universal, tentando métodos alternativos', { error: error.message });
  }
  
  const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
  
  // Estratégia 1: RapidAPI - instagram-video-downloader13 (com multipart/form-data)
  if (RAPIDAPI_KEY) {
    try {
      log('INFO', 'INSTAGRAM', 'Tentando RapidAPI instagram-video-downloader13');
      
      const formData = new FormData();
      formData.append('url', url);
      
      const response = await fetchWithRetry(
        'https://instagram-video-downloader13.p.rapidapi.com/index.php',
        {
          method: 'POST',
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'instagram-video-downloader13.p.rapidapi.com',
          },
          body: formData,
        },
        3,
        'INSTAGRAM'
      );
      
      const data = await response.json();
      log('INFO', 'INSTAGRAM', 'Resposta da API', { data });
      
      if (data.status === 'success' && data.media && data.media.length > 0) {
        const video = data.media.find((m: any) => m.type === 'video') || data.media[0];
        
        if (video && video.url) {
          log('INFO', 'INSTAGRAM', 'Download bem-sucedido via RapidAPI');
          return {
            downloadUrl: video.url,
            filename: `instagram_${Date.now()}.mp4`,
            method: 'RapidAPI (instagram-video-downloader13)'
          };
        }
      }
      
      throw new Error('Nenhum vídeo encontrado na resposta da API');
    } catch (error) {
      log('WARN', 'INSTAGRAM', 'Falha no RapidAPI', { error: error.message });
    }
  }
  
  // Estratégia 2: API pública alternativa (igram.io)
  try {
    log('INFO', 'INSTAGRAM', 'Tentando API alternativa (igram.io)');
    
    const postCode = extractInstagramPostCode(url);
    if (!postCode) {
      throw new Error('Não foi possível extrair código do post');
    }
    
    const apiUrl = `https://api.igram.io/v1/dl`;
    const response = await fetchWithRetry(
      apiUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
      },
      2,
      'INSTAGRAM'
    );
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const video = data.data.find((item: any) => item.type === 'video') || data.data[0];
      
      if (video && video.url) {
        log('INFO', 'INSTAGRAM', 'Download bem-sucedido via API alternativa');
        return {
          downloadUrl: video.url,
          filename: `instagram_${postCode}.mp4`,
          method: 'API pública (igram.io)'
        };
      }
    }
    
    throw new Error('Nenhum vídeo encontrado');
  } catch (error) {
    log('WARN', 'INSTAGRAM', 'Falha na API alternativa', { error: error.message });
  }
  
  // Estratégia 3: Scraping direto (último recurso)
  try {
    log('INFO', 'INSTAGRAM', 'Tentando scraping direto (último recurso)');
    
    const response = await fetchWithRetry(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Referer': 'https://www.instagram.com/',
        },
      },
      2,
      'INSTAGRAM'
    );
    
    const html = await response.text();
    
    // Procura por URLs de vídeo no HTML
    const videoPatterns = [
      /"video_url":"([^"]+)"/,
      /"playback_url":"([^"]+)"/,
      /contentUrl":"([^"]+\.mp4[^"]*)"/,
    ];
    
    for (const pattern of videoPatterns) {
      const match = html.match(pattern);
      if (match) {
        const videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        log('INFO', 'INSTAGRAM', 'Vídeo encontrado via scraping');
        
        return {
          downloadUrl: videoUrl,
          filename: `instagram_${Date.now()}.mp4`,
          method: 'Scraping direto'
        };
      }
    }
    
    throw new Error('Não foi possível extrair URL do vídeo via scraping');
  } catch (error) {
    log('ERROR', 'INSTAGRAM', 'Todas as estratégias falharam', { error: error.message });
    throw new Error(
      'Não foi possível baixar o vídeo do Instagram. Verifique se: ' +
      '1) A URL está correta, ' +
      '2) O post contém um vídeo, ' +
      '3) O perfil não é privado.'
    );
  }
}

// ==================== YOUTUBE ====================
async function downloadYouTube(url: string): Promise<{ downloadUrl: string; filename: string; method: string }> {
  log('INFO', 'YOUTUBE', 'Iniciando download do YouTube', { url });
  
  // Estratégia 1: Cobalt.tools (gratuito e confiável)
  const cobaltResult = await downloadViaCobalt(url, 'youtube');
  if (cobaltResult) {
    return cobaltResult;
  }
  
  // Estratégia 2: Tenta downloader universal (RapidAPI)
  try {
    return await downloadUniversal(url, 'youtube');
  } catch (error) {
    log('WARN', 'YOUTUBE', 'Falha no downloader universal, tentando métodos alternativos', { error: error.message });
  }
  
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('ID do vídeo inválido. Verifique a URL do YouTube.');
  }
  
  const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
  
  // Estratégia 1: RapidAPI - youtube-to-mp4
  if (RAPIDAPI_KEY) {
    try {
      log('INFO', 'YOUTUBE', 'Tentando RapidAPI youtube-to-mp4');
      
      const response = await fetchWithRetry(
        `https://youtube-to-mp43.p.rapidapi.com/?url=${encodeURIComponent(url)}`,
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'youtube-to-mp43.p.rapidapi.com',
          },
        },
        3,
        'YOUTUBE'
      );
      
      const data = await response.json();
      log('INFO', 'YOUTUBE', 'Resposta da API', { data });
      
      if (data.download_url || data.downloadUrl || data.url) {
        const downloadUrl = data.download_url || data.downloadUrl || data.url;
        const title = data.title || `youtube_${videoId}`;
        
        log('INFO', 'YOUTUBE', 'Download bem-sucedido via RapidAPI');
        return {
          downloadUrl,
          filename: `${title.substring(0, 50)}.mp4`,
          method: 'RapidAPI (youtube-to-mp4)'
        };
      }
      
      throw new Error('URL de download não encontrada na resposta');
    } catch (error) {
      log('WARN', 'YOUTUBE', 'Falha no RapidAPI', { error: error.message });
    }
  }
  
  // Estratégia 2: Piped API (múltiplas instâncias)
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://api.piped.privacydev.net',
    'https://api-piped.mha.fi',
  ];
  
  for (const instance of pipedInstances) {
    try {
      log('INFO', 'YOUTUBE', `Tentando Piped API: ${instance}`);
      
      const response = await fetchWithRetry(
        `${instance}/streams/${videoId}`,
        { method: 'GET' },
        2,
        'YOUTUBE'
      );
      
      const data = await response.json();
      
      if (data.videoStreams && data.videoStreams.length > 0) {
        // Pega a melhor qualidade disponível
        const stream = data.videoStreams.find((s: any) => s.quality === '720p') ||
                      data.videoStreams.find((s: any) => s.quality === '480p') ||
                      data.videoStreams[0];
        
        const title = data.title || `youtube_${videoId}`;
        
        log('INFO', 'YOUTUBE', `Download bem-sucedido via Piped: ${instance}`);
        return {
          downloadUrl: stream.url,
          filename: `${title.substring(0, 50)}.mp4`,
          method: `Piped API (${new URL(instance).hostname})`
        };
      }
      
      throw new Error('Nenhum stream de vídeo encontrado');
    } catch (error) {
      log('WARN', 'YOUTUBE', `Falha no Piped ${instance}`, { error: error.message });
      continue;
    }
  }
  
  log('ERROR', 'YOUTUBE', 'Todas as estratégias falharam');
  throw new Error(
    'Não foi possível baixar o vídeo do YouTube. ' +
    'Verifique se o vídeo não é privado ou restrito por idade.'
  );
}

// ==================== META ADS ====================
async function downloadMetaAds(url: string): Promise<{ downloadUrl: string; filename: string; method: string }> {
  log('INFO', 'META', 'Iniciando download do Meta Ad Library', { url });
  
  // Estratégia 1: Cobalt.tools (gratuito e confiável)
  const cobaltResult = await downloadViaCobalt(url, 'meta');
  if (cobaltResult) {
    return cobaltResult;
  }
  
  // Estratégia 2: Tenta downloader universal (RapidAPI)
  try {
    return await downloadUniversal(url, 'meta');
  } catch (error) {
    log('WARN', 'META', 'Falha no downloader universal, tentando scraping direto', { error: error.message });
  }
  
  try {
    const response = await fetchWithRetry(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      },
      2,
      'META'
    );
    
    const html = await response.text();
    
    // Procura por URLs de vídeo no HTML
    const videoPatterns = [
      /"playable_url":"([^"]+)"/,
      /"playable_url_quality_hd":"([^"]+)"/,
      /"video_url":"([^"]+)"/,
      /src":"([^"]+\.mp4[^"]*)"/,
    ];
    
    for (const pattern of videoPatterns) {
      const match = html.match(pattern);
      if (match) {
        const videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        log('INFO', 'META', 'Vídeo encontrado');
        
        return {
          downloadUrl: videoUrl,
          filename: `meta_ad_${Date.now()}.mp4`,
          method: 'Scraping Meta Ad Library'
        };
      }
    }
    
    throw new Error('Não foi possível extrair URL do vídeo');
  } catch (error) {
    log('ERROR', 'META', 'Erro no download', { error: error.message });
    throw new Error(
      'Não foi possível baixar o anúncio do Meta. ' +
      'Verifique se a URL está correta e o anúncio contém vídeo.'
    );
  }
}

// ==================== SERVIDOR PRINCIPAL ====================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, platform } = await req.json();
    log('INFO', 'SERVER', 'Nova requisição recebida', { url, platform });
    
    // Validação da URL
    const validation = validateAndSanitizeUrl(url);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const sanitizedUrl = validation.sanitized;
    let result;

    // Processa baseado na plataforma
    switch (platform) {
      case 'youtube':
        result = await downloadYouTube(sanitizedUrl);
        break;
        
      case 'instagram':
        result = await downloadInstagram(sanitizedUrl);
        break;
        
      case 'meta':
        result = await downloadMetaAds(sanitizedUrl);
        break;
        
      default:
        throw new Error(`Plataforma não suportada: ${platform}`);
    }

    log('INFO', 'SERVER', 'Download concluído com sucesso', { 
      platform, 
      method: result.method,
      filename: result.filename 
    });

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: result.downloadUrl,
        fileName: result.filename,
        method: result.method,
        platform,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('ERROR', 'SERVER', 'Erro na requisição', { error: error.message });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro desconhecido ao processar o download',
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
