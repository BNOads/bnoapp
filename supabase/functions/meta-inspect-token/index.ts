
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
        const { ad_account_id } = await req.json().catch(() => ({}))

        const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN')
        if (!META_ACCESS_TOKEN) {
            throw new Error('META_ACCESS_TOKEN is not set on server')
        }

        const diagnostics: any = {
            steps: []
        }

        // 1. Check Token Debug
        const debugUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${META_ACCESS_TOKEN}&access_token=${META_ACCESS_TOKEN}`
        try {
            const debugRes = await fetch(debugUrl)
            const debugJson = await debugRes.json()
            diagnostics.steps.push({
                name: "Token Debug",
                status: debugJson.data ? "ok" : "error",
                data: debugJson.data ? {
                    app_id: debugJson.data.app_id,
                    is_valid: debugJson.data.is_valid,
                    scopes: debugJson.data.scopes,
                    expires_at: debugJson.data.expires_at
                } : debugJson.error
            })

            if (debugJson.data && !debugJson.data.is_valid) {
                throw new Error("Token marcado como inválido pelo Meta.")
            }
        } catch (e: any) {
            diagnostics.steps.push({ name: "Token Debug Failed", status: "error", error: e.message })
        }

        // 2. Check Ad Account Specifics
        if (ad_account_id) {
            const fields = 'name,account_status,currency'
            const accUrl = `https://graph.facebook.com/v19.0/${ad_account_id}?fields=${fields}&access_token=${META_ACCESS_TOKEN}`

            try {
                const accRes = await fetch(accUrl)
                const accJson = await accRes.json()

                diagnostics.steps.push({
                    name: "Get Ad Account",
                    status: accJson.id ? "ok" : "error",
                    data: accJson
                })

                if (accJson.id) {
                    // 3. Try Insights
                    const insightsUrl = `https://graph.facebook.com/v19.0/${ad_account_id}/insights?date_preset=last_3d&limit=1&access_token=${META_ACCESS_TOKEN}`
                    const insRes = await fetch(insightsUrl)
                    const insJson = await insRes.json()

                    diagnostics.steps.push({
                        name: "Get Insights Sample",
                        status: insJson.data ? "ok" : "error",
                        data: insJson.data ? { count: insJson.data.length, sample: insJson.data[0] } : insJson.error
                    })
                }

            } catch (e: any) {
                diagnostics.steps.push({ name: "Ad Account Check Failed", status: "error", error: e.message })
            }
        } else {
            diagnostics.steps.push({ name: "Ad Account Check", status: "skipped", message: "No ad_account_id provided" })
        }

        return new Response(
            JSON.stringify({ success: true, diagnostics }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
