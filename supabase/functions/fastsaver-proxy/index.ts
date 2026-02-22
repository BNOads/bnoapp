import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FastSaverResponse {
    url?: string;
    download_url?: string;
    hosting?: string;
    error?: boolean;
    message?: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { url } = await req.json();

        if (!url || typeof url !== 'string') {
            return new Response(JSON.stringify({ error: true, message: 'URL é obrigatória e deve ser uma string válida' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const apiKey = Deno.env.get('FASTSAVER_API_KEY');
        if (!apiKey) {
            console.error("FASTSAVER_API_KEY is not set");
            return new Response(JSON.stringify({ error: true, message: 'Configuração do servidor incompleta: FASTSAVER_API_KEY não definida' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Proxying request for: ${url}`);

        const fastSaverUrl = new URL("https://fastsaverapi.com/get");
        fastSaverUrl.searchParams.append("url", url);

        const response = await fetch(fastSaverUrl.toString(), {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`FastSaverAPI error (${response.status}):`, errorText);
            return new Response(JSON.stringify({ error: true, message: `Erro na FastSaverAPI: ${response.status} - ${errorText}` }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const data: FastSaverResponse = await response.json();
        console.log("FastSaverAPI response:", JSON.stringify(data));

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: true, message: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
