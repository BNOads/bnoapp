import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  console.log('Assignments-summary function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Setting auth session...');
    // Set auth for the supabase client
    const token = authHeader.replace('Bearer ', '');
    await supabase.auth.setSession({ access_token: token, refresh_token: '' });

    console.log(`Processing ${req.method} request for assignments summary`);
    
    if (req.method === 'GET' || req.method === 'POST') {
      // GET /admin/assignments/summary
      
      // Buscar todos os colaboradores ativos
      const { data: colaboradores, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select('id, nome, nivel_acesso')
        .eq('ativo', true);

      if (colaboradoresError) {
        console.error('Error fetching colaboradores:', colaboradoresError);
        return new Response(JSON.stringify({ error: colaboradoresError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Buscar estatísticas de clientes por gestor de tráfego
      const { data: trafficManagerStats, error: tmError } = await supabase
        .from('clientes')
        .select(`
          traffic_manager_id,
          traffic_manager:colaboradores!traffic_manager_id(nome)
        `)
        .eq('ativo', true)
        .not('traffic_manager_id', 'is', null);

      if (tmError) {
        console.error('Error fetching traffic manager stats:', tmError);
        return new Response(JSON.stringify({ error: tmError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Buscar estatísticas de clientes por CS
      const { data: csStats, error: csError } = await supabase
        .from('clientes')
        .select(`
          cs_id,
          cs:colaboradores!cs_id(nome)
        `)
        .eq('ativo', true)
        .not('cs_id', 'is', null);

      if (csError) {
        console.error('Error fetching CS stats:', csError);
        return new Response(JSON.stringify({ error: csError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Agregar dados por gestor de tráfego
      const trafficManagerCounts = trafficManagerStats.reduce((acc: any, client: any) => {
        const managerId = client.traffic_manager_id;
        const managerName = client.traffic_manager?.nome || 'Não atribuído';
        
        acc[managerId] = {
          id: managerId,
          nome: managerName,
          clientes_count: (acc[managerId]?.clientes_count || 0) + 1,
          tipo: 'gestor_trafego'
        };
        
        return acc;
      }, {});

      // Agregar dados por CS
      const csCounts = csStats.reduce((acc: any, client: any) => {
        const csId = client.cs_id;
        const csName = client.cs?.nome || 'Não atribuído';
        
        acc[csId] = {
          id: csId,
          nome: csName,
          clientes_count: (acc[csId]?.clientes_count || 0) + 1,
          tipo: 'cs'
        };
        
        return acc;
      }, {});

      // Contar clientes sem alocação
      const { count: clientesSemGestor } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .is('traffic_manager_id', null);

      const { count: clientesSemCS } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .is('cs_id', null);

      // Total de clientes ativos
      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);

      const summary = {
        total_clientes: totalClientes || 0,
        clientes_sem_gestor: clientesSemGestor || 0,
        clientes_sem_cs: clientesSemCS || 0,
        distribuicao_gestores: Object.values(trafficManagerCounts),
        distribuicao_cs: Object.values(csCounts),
        colaboradores_disponiveis: colaboradores
      };

      return new Response(JSON.stringify({ data: summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assignments-summary function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);