import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

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
    const { clienteNome, clienteId } = await req.json();
    
    console.log('Buscando dashboards do Looker Studio para cliente:', clienteNome || clienteId);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Buscar dashboards salvos na tabela de clientes
    let query = supabase
      .from('clientes')
      .select('id, nome, dashboards_looker');
    
    if (clienteId) {
      query = query.eq('id', clienteId);
    } else if (clienteNome) {
      query = query.ilike('nome', `%${clienteNome}%`);
    }
    
    const { data: clientes, error } = await query;
    
    if (error) {
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }
    
    const dashboards: Array<{titulo: string, url: string, id?: string}> = [];
    
    if (clientes && clientes.length > 0) {
      for (const cliente of clientes) {
        if (cliente.dashboards_looker && Array.isArray(cliente.dashboards_looker)) {
          for (const dashboard of cliente.dashboards_looker) {
            if (dashboard && typeof dashboard === 'object') {
              dashboards.push({
                titulo: dashboard.titulo || dashboard.name || 'Dashboard sem título',
                url: dashboard.url || dashboard.link || '',
                id: dashboard.id || undefined
              });
            }
          }
        }
      }
    }
    
    console.log(`Encontrados ${dashboards.length} dashboards para o cliente ${clienteNome || clienteId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        dashboards,
        total: dashboards.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error: any) {
    console.error('Erro ao buscar dashboards do Looker Studio:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message,
        dashboards: []
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
})
