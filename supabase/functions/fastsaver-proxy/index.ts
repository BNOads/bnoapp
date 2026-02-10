import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { url } = await req.json();

        if (!url) {
            return new Response(JSON.stringify({ error: 'URL is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const apiToken = Deno.env.get('FASTSAVER_API_TOKEN');
        if (!apiToken) {
            console.error("FASTSAVER_API_TOKEN is not set");
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Proxying request for: ${url}`);

        // FastSaverAPI endpoint
        const fastSaverUrl = new URL("https://fastsaverapi.com/get-info");
        fastSaverUrl.searchParams.append("url", url);
        fastSaverUrl.searchParams.append("token", apiToken);

        const response = await fetch(fastSaverUrl.toString(), {
            method: "GET",
        });

        const data = await response.json();
        console.log("FastSaverAPI response:", JSON.stringify(data));

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
