import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.from('colaboradores').select('nome, email').limit(5);
  console.log("Colaboradores:", users);
  
  const { data: tasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(10);
  console.log("Recent Tasks:", tasks);
}
run();
