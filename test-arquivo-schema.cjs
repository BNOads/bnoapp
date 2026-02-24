const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const envPath = fs.existsSync(path.resolve(__dirname, '.env.local'))
    ? path.resolve(__dirname, '.env.local')
    : path.resolve(__dirname, '.env');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching arquivo_reuniao schema data...");
    const { data, error } = await supabase.from('arquivo_reuniao').select('*').limit(1);
    if (error) {
        console.error("Error fetching arquivo_reuniao:", error);
    } else {
        // Print exactly what columns we get
        if (data && data.length > 0) {
            console.log("Arquivo de Reuniao columns:", Object.keys(data[0]));
        } else {
            console.log("Table is empty, but we can't see the exact columns this way.");
            // Try an insert that fails to get schema or just assume standard fields based on ArquivoReuniaoView
        }
        console.log("Data sample:", JSON.stringify(data[0], null, 2));
    }
}

run();
