import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL="?(.*)"?/)?.[1]?.replace(/"/g, '');
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?(.*)"?/)?.[1]?.replace(/"/g, '');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('clientes').select('id, nome, aliases, slug');
  const found = data.filter(c => JSON.stringify(c).toLowerCase().includes('fernanda') || JSON.stringify(c).toLowerCase().includes('burjato'));
  console.log(JSON.stringify(found, null, 2));
}
run();
