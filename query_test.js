import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const accountId = '2a95d71c-f230-4e44-ab5f-d5b7a77e8f52'; // we don't know the exact ID, let's just query meta_campaign_insights
  const { data, error } = await supabase.from('meta_campaign_insights').select('date_start').order('date_start', {ascending: true}).limit(5);
  console.log({data, error});
}
run();
