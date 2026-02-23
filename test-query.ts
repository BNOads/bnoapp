import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);

async function test() {
  const { data: d1, error: e1 } = await supabase
    .from("clientes")
    .select(`
        id,
        nome,
        primary_cs_user_id,
        primary_cs:colaboradores!clientes_primary_cs_user_id_fkey(id, nome, avatar_url)
    `)
    .limit(1);
    
  if (e1) {
    console.error("ERROR CLIENTES:", e1);
  } else {
    console.log("SUCCESS CLIENTES:", JSON.stringify(d1, null, 2));
  }

  const { data: d2, error: e2 } = await supabase.from("alocacoes").select(`
        cliente_id,
        gestor:gestor_id(id, nome, avatar_url),
        cs:cs_id(id, nome, avatar_url)
    `).limit(1);

  if (e2) {
    console.error("ERROR ALOCACOES:", e2);
  } else {
    console.log("SUCCESS ALOCACOES:", JSON.stringify(d2, null, 2));
  }
}
test();
