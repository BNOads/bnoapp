import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { token } = await req.json()

        if (!token) {
            return new Response(
                JSON.stringify({ valid: false }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data, error } = await supabaseClient
            .from('crm_access_sessions')
            .select('expires_at')
            .eq('session_token', token)
            .maybeSingle()

        if (error) throw error

        if (!data) {
            return new Response(
                JSON.stringify({ valid: false }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const isExpired = new Date(data.expires_at) < new Date()

        return new Response(
            JSON.stringify({ valid: !isExpired }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
