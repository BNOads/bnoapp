
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

        const { ad_id, status } = await req.json().catch(() => ({}))

        if (!ad_id || !status) {
            throw new Error('Missing ad_id or status')
        }

        if (!['ACTIVE', 'PAUSED'].includes(status)) {
            throw new Error('Invalid status. Must be ACTIVE or PAUSED')
        }

        console.log(`Updating ad ${ad_id} to ${status}...`);

        // 1. Update on Meta
        const url = `https://graph.facebook.com/v24.0/${ad_id}`;
        const formData = new FormData();
        formData.append('status', status);
        formData.append('access_token', META_ACCESS_TOKEN);

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        const json = await response.json();

        if (json.error) {
            throw new Error(json.error.message);
        }

        console.log(`Meta update success: ${JSON.stringify(json)}`);

        // 2. Update Local DB
        // We update all records for this ad_id to reflect the new status immediately
        const { error: dbError } = await supabase
            .from('meta_ad_insights')
            .update({ status: status, effective_status: status })
            .eq('ad_id', ad_id);

        if (dbError) {
            console.error('Error updating local DB:', dbError);
            // We don't throw here because the Meta update was successful
        }

        return new Response(
            JSON.stringify({ success: true, data: json }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Update failed:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
