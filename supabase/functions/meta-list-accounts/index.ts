
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN')
        if (!META_ACCESS_TOKEN) {
            throw new Error('META_ACCESS_TOKEN is not set')
        }

        // Fetch Ad Accounts from Meta
        const fields = 'name,account_status,currency,amount_spent,business,owner'
        const url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=${fields}&access_token=${META_ACCESS_TOKEN}&limit=500`

        const response = await fetch(url)
        const json = await response.json()

        if (json.error) {
            throw new Error(json.error.message)
        }

        const accounts = json.data || []

        return new Response(
            JSON.stringify({ success: true, data: accounts }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
