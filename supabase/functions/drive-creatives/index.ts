import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const clientId = pathParts[pathParts.length - 1];
    
    // Parâmetros de filtro
    const type = url.searchParams.get('type');
    const q = url.searchParams.get('q');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    console.log('Buscando criativos:', { clientId, type, q, from, to, page, limit });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    // Construir query sem join problemático por enquanto
    let query = supabase
      .from('creatives')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .eq('archived', false)
      .order('modified_time', { ascending: false });
    
    // Aplicar filtros
    if (type) {
      const mimeTypeFilters = {
        'imagem': 'image/%',
        'video': 'video/%', 
        'pdf': 'application/pdf',
        'documento': 'application/%'
      };
      
      const mimePattern = mimeTypeFilters[type as keyof typeof mimeTypeFilters];
      if (mimePattern) {
        query = query.like('mime_type', mimePattern);
      }
    }
    
    if (q) {
      query = query.ilike('name', `%${q}%`);
    }
    
    if (from) {
      query = query.gte('modified_time', from);
    }
    
    if (to) {
      query = query.lte('modified_time', to);
    }
    
    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);
    
    const { data: creatives, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    // Buscar informações do cliente para última sincronização
    const { data: cliente } = await supabase
      .from('clientes')
      .select('last_drive_sync, drive_sync_error')
      .eq('id', clientId)
      .single();
    
    // Mapear tipos para exibição
    const processedCreatives = (creatives || []).map((creative: any) => ({
      ...creative,
      type_display: getTypeDisplay(creative.mime_type),
      formatted_size: formatFileSize(creative.file_size),
      formatted_date: new Date(creative.modified_time).toLocaleDateString('pt-BR')
    }));
    
    const result = {
      creatives: processedCreatives,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      lastSync: cliente?.last_drive_sync,
      syncError: cliente?.drive_sync_error
    };
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error: any) {
    console.error('Erro ao buscar criativos:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        creatives: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function getTypeDisplay(mimeType: string): string {
  if (!mimeType) return 'Arquivo';
  
  if (mimeType.startsWith('image/')) return 'Imagem';
  if (mimeType.startsWith('video/')) return 'Vídeo';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('document') || mimeType.includes('text')) return 'Documento';
  if (mimeType.includes('spreadsheet')) return 'Planilha';
  if (mimeType.includes('presentation')) return 'Apresentação';
  
  return 'Arquivo';
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'N/A';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}