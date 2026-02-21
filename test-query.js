import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: users } = await supabase.auth.admin?.listUsers() || await supabase.from('profiles').select('user_id').limit(1);
  const userId = users?.[0]?.user_id || users?.[0]?.id || '123';
  
  const { data: avisos, error: avisosError } = await supabase
      .from('avisos')
      .select('*')
      .eq('ativo', true)
      .or(`destinatarios.cs.{all}, destinatarios.cs.{${userId}}, destinatarios.cs.{admin}`)
      .lte('data_inicio', new Date().toISOString())
      .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });
      
  console.log("Error:", avisosError);
  console.log("Count:", avisos?.length);
  console.log("Titles:", avisos?.map(a => a.titulo));
}
run();
