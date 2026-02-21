import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: users } = await supabase.from('profiles').select('user_id').limit(1);
    const userId = users?.[0]?.user_id || '123';

    console.log("Testing avisos_leitura query...");
    const { data: leituras, error: leiturasError } = await supabase
        .from('avisos_leitura')
        .select('aviso_id, created_at')
        .eq('user_id', userId);

    console.log("Leituras Error:", leiturasError);
    console.log("Leituras Data length:", leituras?.length);

    console.log("Testing avisos_leitura query without created_at...");
    const { data: leituras2, error: leiturasError2 } = await supabase
        .from('avisos_leitura')
        .select('aviso_id')
        .eq('user_id', userId);

    console.log("Leituras2 Error:", leiturasError2);
    console.log("Leituras2 Data length:", leituras2?.length);
}
run();
