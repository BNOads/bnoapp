import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Clients-assignments function called ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
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
      
      // GET all clients with their assignments - using simple approach without joins
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
          status_cliente,
          data_inicio,
          traffic_manager_id,
          cs_id
        `)
        .order('nome');

      if (error) {
        console.error('Error fetching clients:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get colaboradores separately to avoid relationship conflicts
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, nome, nivel_acesso')
        .eq('ativo', true);

      if (colabError) {
        console.error('Error fetching colaboradores:', colabError);
        return new Response(JSON.stringify({ error: colabError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Map colaboradores data to clients
      const clientesWithCollaborators = clientes?.map(cliente => ({
        ...cliente,
        traffic_manager: colaboradores?.find(c => c.id === cliente.traffic_manager_id) || null,
        cs: colaboradores?.find(c => c.id === cliente.cs_id) || null
      })) || [];
      
      console.log(`Found ${clientesWithCollaborators?.length || 0} clients`);
      return new Response(JSON.stringify({ data: clientesWithCollaborators }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PATCH') {
      console.log('Processing PATCH request for client assignment...');
      
      try {
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
            cs_id
          `)
          .single();

        if (error) {
          console.error('Error updating client assignment:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          console.error('Update data that caused error:', updateData);
          return new Response(JSON.stringify({ 
            error: (error as any).message,
            details: error.details || error.hint || 'Unknown error',
            code: error.code
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get colaboradores data for the response
        const { data: colaboradores } = await supabase
          .from('colaboradores')
          .select('id, nome')
          .in('id', [data.traffic_manager_id, data.cs_id].filter(Boolean));

        const responseData = {
          ...data,
          traffic_manager: colaboradores?.find(c => c.id === data.traffic_manager_id) || null,
          cs: colaboradores?.find(c => c.id === data.cs_id) || null
        };

        console.log(`Client assignment updated successfully: ${data.nome}`);

        return new Response(JSON.stringify({ data: responseData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (patchError) {
        console.error('Error in PATCH processing:', patchError);
        return new Response(JSON.stringify({ 
          error: 'Error processing PATCH request',
          details: (patchError as Error).message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('=== METHOD NOT ALLOWED ===');
    console.log('Received method:', req.method);
    console.log('Allowed methods: GET, PATCH');
    console.log('==========================');
    
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      received: req.method,
      allowed: ['GET', 'PATCH']
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in clients-assignments function:', error);
    console.error('Error stack:', (error as Error).stack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);