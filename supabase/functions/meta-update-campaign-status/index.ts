
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

        const { campaign_id, status } = await req.json().catch(() => ({}))

        if (!campaign_id || !status) {
            throw new Error('Missing campaign_id or status')
        }

        if (!['ACTIVE', 'PAUSED'].includes(status)) {
            throw new Error('Invalid status. Must be ACTIVE or PAUSED')
        }

        console.log(`Updating campaign ${campaign_id} to ${status}...`);

        // 1. Update on Meta
        const url = `https://graph.facebook.com/v24.0/${campaign_id}?access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });

        const json = await response.json();
        console.log(`Meta API raw response:`, JSON.stringify(json));

        if (json.error) {
            console.error('Meta API Error Details:', JSON.stringify(json.error));
            throw new Error(json.error.error_user_msg || json.error.message);
        }

        console.log(`Meta update success: ${JSON.stringify(json)}`);

        // 2. Update Local DB
        // Determine the effective_status column if it exists in your schema or just ignore local update if not critical
        // For campaign insights, generally we don't store mutable status there, but if we do, we update it.
        // Let's check if we can update effective_status in meta_campaign_insights if it exists, or just log success.
        // Assuming we might want to track this, but insights are time-series usually.
        // Actually, pausing a campaign might not reflect in "insights" table immediately which is historical data.
        // But if we have a campaigns table, we'd update there. 
        // For now, let's just update effective_status if the column exists to keep UI in sync if it uses it.
        // If the table doesn't have it, valid to just skip or wrap in try/catch.

        /* 
        const { error: dbError } = await supabase
            .from('meta_campaign_insights')
            .update({ effective_status: status }) // Check if this column exists first!
            .eq('campaign_id', campaign_id);
        */

        return new Response(
            JSON.stringify({ success: true, data: json }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Update failed:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
