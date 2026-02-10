import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import ytdl from "npm:@distube/ytdl-core";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

        console.log(`Processing YouTube URL: ${url}`);

        if (!ytdl.validateURL(url)) {
            return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Get video info
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        console.log(`Video Title: ${title}`);

        // Select format: mp4 with audio and video, or fallback
        const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 18 is usually 360p mp4 with audio

        console.log(`Format found: ${format.itag}`);

        const stream = ytdl(url, { format: format });

        // Create a readable stream from the node stream
        const readable = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });
                stream.on('end', () => {
                    controller.close();
                });
                stream.on('error', (err) => {
                    controller.error(err);
                });
            },
        });

        return new Response(readable, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${title}.mp4"`,
            },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
