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
    await supabase.auth.setSession({ access_token: token, refresh_token: '' });

    const url = new URL(req.url);
    const method = req.method;

    if (method === 'GET') {
      console.log('Fetching clients assignments...');
      
      // GET all clients with their assignments
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

      console.log(`Found ${clientes?.length || 0} clients`);
      return new Response(JSON.stringify({ data: clientes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PATCH') {
      console.log('Processing PATCH request for client assignment...');
      
      const body = await req.json();
      console.log('Request body:', body);
      
      const { client_id, traffic_manager_id, cs_id } = body;

      if (!client_id) {
        console.log('Missing client_id in request');
        return new Response(JSON.stringify({ error: 'client_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Updating client ${client_id} with TM: ${traffic_manager_id || 'none'}, CS: ${cs_id || 'none'}`);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (traffic_manager_id === null || traffic_manager_id === 'none' || traffic_manager_id === '') {
        updateData.traffic_manager_id = null;
      } else {
        updateData.traffic_manager_id = traffic_manager_id;
      }

      if (cs_id === null || cs_id === 'none' || cs_id === '') {
        updateData.cs_id = null;
      } else {
        updateData.cs_id = cs_id;
      }

      console.log('Update data:', updateData);
      const { data, error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', client_id)
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

      console.log(`Client assignment updated successfully: ${data.nome}`);

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