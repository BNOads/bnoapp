import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tbdooscfrrkwfutkdjha.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZG9vc2NmcnJrd2Z1dGtkamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQwODIsImV4cCI6MjA3MTUzMDA4Mn0.yd988Fotgc9LIZi83NlGDTaeB4f8BNgr9TYJgye0Cqw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('meta_campaign_insights')
        .select('*')
        .order('date_start', { ascending: false })
        .limit(30);

    console.log("Error:", error);
    console.log("Recent Insights:");
    data.forEach(d => console.log(`${d.date_start} - ${d.campaign_name} - Spend: ${d.spend} - Leads: ${d.actions?.find(a => a.action_type === 'lead')?.value || 0}`));
}

check();
