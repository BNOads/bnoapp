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
        const { password } = await req.json()
        const CRM_PASS = Deno.env.get('CRM_ACCESS_PASS')

        if (!CRM_PASS) {
            console.error('CRM_ACCESS_PASS environment variable is not set.')
            return new Response(
                JSON.stringify({ error: 'Passphrase not configured on server' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        if (password !== CRM_PASS) {
            return new Response(
                JSON.stringify({ error: 'Invalid password' }),
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

        const token = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

        const { error } = await supabaseClient
            .from('crm_access_sessions')
            .insert({ session_token: token, expires_at: expiresAt })

        if (error) throw error

        return new Response(
            JSON.stringify({ token, expires_at: expiresAt }),
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
