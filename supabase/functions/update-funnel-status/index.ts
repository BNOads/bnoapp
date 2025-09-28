import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user from authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authorization.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has permission (admin, gestor_trafego, or cs)
    const { data: profile } = await supabase
      .from('profiles')
      .select('nivel_acesso')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'gestor_trafego', 'cs'].includes(profile.nivel_acesso)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'PATCH') {
      const url = new URL(req.url)
      const clienteId = url.pathname.split('/').pop()
      
      if (!clienteId) {
        return new Response(
          JSON.stringify({ error: 'Cliente ID required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { active } = await req.json()
      if (typeof active !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'Active field must be boolean' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get current status for audit log
      const { data: currentCliente } = await supabase
        .from('clientes')
        .select('funnel_status')
        .eq('id', clienteId)
        .single()

      if (!currentCliente) {
        return new Response(
          JSON.stringify({ error: 'Cliente not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update funnel status
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ funnel_status: active })
        .eq('id', clienteId)

      if (updateError) {
        console.error('Error updating funnel status:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update funnel status' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Log the change
      const { error: logError } = await supabase
        .from('funnel_status_audit_log')
        .insert({
          cliente_id: clienteId,
          user_id: user.id,
          old_status: currentCliente.funnel_status,
          new_status: active
        })

      if (logError) {
        console.error('Error logging change:', logError)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Funnel status updated successfully',
          funnel_status: active
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})