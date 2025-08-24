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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set auth for the supabase client
    const token = authHeader.replace('Bearer ', '');
    supabase.auth.setSession({ access_token: token, refresh_token: '' });

    const url = new URL(req.url);
    const method = req.method;

    if (method === 'GET') {
      // GET /admin/clients/assignments
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
          status_cliente,
          data_inicio,
          traffic_manager_id,
          cs_id,
          traffic_manager:colaboradores!traffic_manager_id(id, nome, nivel_acesso),
          cs:colaboradores!cs_id(id, nome, nivel_acesso)
        `)
        .order('nome');

      if (error) {
        console.error('Error fetching clients:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: clientes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PATCH') {
      // PATCH /admin/clients/:id/assignment
      const pathParts = url.pathname.split('/');
      const clientId = pathParts[pathParts.length - 2]; // gets ID from /admin/clients/:id/assignment

      const body = await req.json();
      const { traffic_manager_id, cs_id } = body;

      const { data, error } = await supabase
        .from('clientes')
        .update({
          traffic_manager_id,
          cs_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select(`
          id,
          nome,
          traffic_manager_id,
          cs_id,
          traffic_manager:colaboradores!traffic_manager_id(id, nome),
          cs:colaboradores!cs_id(id, nome)
        `)
        .single();

      if (error) {
        console.error('Error updating client assignment:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the assignment change
      console.log(`Client assignment updated: ${data.nome} - TM: ${data.traffic_manager?.nome || 'None'}, CS: ${data.cs?.nome || 'None'}`);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in clients-assignments function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);