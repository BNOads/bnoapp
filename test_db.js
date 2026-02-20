import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('lancamento_links').select('id, nome, cached_data').eq('lancamento_id', '3c8ba072-217c-4b3d-a05b-edbda607f4ac');
  console.log(data?.map(d => ({ id: d.id, nome: d.nome, hasData: Array.isArray(d.cached_data), length: Array.isArray(d.cached_data) ? d.cached_data.length : 0 })));
}
run();
