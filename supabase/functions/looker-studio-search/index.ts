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
    const { clienteNome } = await req.json();
    
    console.log('Buscando dashboards do Looker Studio para cliente:', clienteNome);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const API_KEY = Deno.env.get('LOOKER_STUDIO_API_KEY');
    if (!API_KEY) {
      throw new Error('API Key do Looker Studio não configurada');
    }
    
    // Buscar relatórios usando a API do Google Analytics Reporting
    // A API do Looker Studio usa a mesma infraestrutura do Google Analytics
    const searchParams = new URLSearchParams({
      key: API_KEY,
      q: clienteNome, // Buscar pelo nome do cliente
      fields: 'reports(id,name,url,description)',
      maxResults: '50'
    });
    
    // Endpoint da API do Google Analytics Reporting para buscar relatórios
    const apiUrl = `https://analyticsreporting.googleapis.com/v4/reports:search?${searchParams}`;
    
    console.log('Fazendo requisição para API do Looker Studio:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Status da resposta da API:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API do Looker Studio:', errorText);
      
      // Se der erro 401/403, pode ser que a API key não tenha as permissões certas
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Erro de autenticação com a API do Looker Studio. Verifique se a API key tem as permissões necessárias.',
            dashboards: []
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      throw new Error(`Erro na API do Looker Studio: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Resposta da API do Looker Studio:', JSON.stringify(data, null, 2));
    
    // Processar os resultados
    const dashboards = [];
    if (data.reports && data.reports.length > 0) {
      for (const report of data.reports) {
        // Filtrar apenas relatórios que contenham o nome do cliente
        if (report.name && report.name.toLowerCase().includes(clienteNome.toLowerCase())) {
          dashboards.push({
            titulo: report.name,
            url: report.url || `https://lookerstudio.google.com/reporting/${report.id}`,
            id: report.id,
            description: report.description
          });
        }
      }
    }
    
    console.log(`Encontrados ${dashboards.length} dashboards para o cliente ${clienteNome}`);
    
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
        error: error.message,
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