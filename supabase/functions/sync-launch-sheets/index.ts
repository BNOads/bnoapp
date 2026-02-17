
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Custom Lenient CSV Parser
// This parser mimics the permissiveness of the original frontend implementation
// to ensure it handles malformed rows (e.g. fewer columns than headers) gracefully.
const parseCSV = (text: string) => {
    // 1. Split lines (handle \r\n and \n)
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    // Helper to split a line by comma, respecting quotes
    const splitLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                result.push(current.trim().replace(/^"|"$/g, '')); // Trim and remove surrounding quotes
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
    };

    // 2. Extract Headers
    // Header row is assumed to be the first non-empty line
    const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/"/g, ''));

    // Safety check: if no headers found
    if (headers.length === 0) return [];

    const results = [];

    // 3. Process Rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Skip completely empty rows (extra check)
        if (!line.trim()) continue;

        const values = splitLine(line);

        // Skip rows that resolve to empty or single empty value erroneously
        if (values.length === 1 && values[0] === '') continue;

        const row: any = {};

        // Map values to headers
        // Crucial: We iterate through HEADERS. 
        // If a value is missing (index out of bounds), we assign empty string.
        // If there are extra values, they are ignored.
        // This prevents "Error number of fields" mismatch.
        headers.forEach((header, index) => {
            if (header) { // Only map if header name is valid
                row[header] = values[index] !== undefined ? values[index] : '';
            }
        });

        results.push(row);
    }

    return results;
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let filterLaunchId = null;
        let filterLinkId = null;

        try {
            const body = await req.json();
            if (body.lancamento_id) filterLaunchId = body.lancamento_id;
            if (body.link_id) filterLinkId = body.link_id;
        } catch (e) {
            // Body might be empty
        }

        let query = supabaseClient
            .from('lancamento_links')
            .select('id, url, nome, lancamento_id')
            .neq('url', null);

        if (filterLaunchId) query = query.eq('lancamento_id', filterLaunchId);
        if (filterLinkId) query = query.eq('id', filterLinkId);

        const { data: links, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (!links || links.length === 0) {
            return new Response(JSON.stringify({ message: 'No links to sync' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const results = [];

        for (const link of links) {
            if (!link.url) continue;

            try {
                // Extract Sheet ID
                const match = link.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                const sheetId = match ? match[1] : null;

                if (!sheetId) throw new Error('URL inválida do Google Sheets');

                console.log(`Syncing Link: ${link.id}, Sheet: ${sheetId}`);

                // Fetch CSV
                const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
                const response = await fetch(csvUrl);

                if (!response.ok) {
                    throw new Error(`Falha ao baixar CSV: ${response.status} ${response.statusText}`);
                }

                const csvText = await response.text();

                // Security Check
                if (csvText.trim().startsWith('<!DOCTYPE') || csvText.includes('<html')) {
                    throw new Error('A planilha parece ser privada. Certifique-se de que o compartilhamento está como "Qualquer pessoa com o link".');
                }

                // Remove BOM
                const cleanCsv = csvText.replace(/^\uFEFF/, '');

                // Parse with custom lenient parser
                const jsonData = parseCSV(cleanCsv);

                // Update DB
                const { error: updateError } = await supabaseClient
                    .from('lancamento_links')
                    .update({
                        cached_data: jsonData,
                        last_sync_at: new Date().toISOString()
                    })
                    .eq('id', link.id);

                if (updateError) throw updateError;

                results.push({ id: link.id, status: 'success', rows: jsonData.length });

            } catch (err: any) {
                console.error(`Error syncing link ${link.id}:`, err);
                results.push({ id: link.id, status: 'error', message: err.message });
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
