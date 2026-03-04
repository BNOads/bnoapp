import { supabase } from './src/integrations/supabase/client';

async function run() {
    const { data } = await supabase.from('arquivo_reuniao').select('conteudo').eq('ano', 2026).single();
    console.log(JSON.stringify(data.conteudo, null, 2).substring(0, 1000));
}

run();
