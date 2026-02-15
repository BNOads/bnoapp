import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // List all ad accounts with client associations
      const { data: accounts, error } = await supabase
        .from('meta_ad_accounts')
        .select(`
          *,
          meta_connections (id, status, expires_at, last_validated_at),
          meta_client_ad_accounts (
            id,
            cliente_id,
            is_primary,
            primary_action_type,
            clientes (id, nome, slug)
          )
        `)
        .order('name');

      if (error) throw error;

      return new Response(
        JSON.stringify({ accounts: accounts || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST actions
    const body = await req.json();
    const { action } = body;

    if (action === 'associate') {
      const { ad_account_id, cliente_id, is_primary, primary_action_type } = body;

      if (!ad_account_id || !cliente_id) {
        return new Response(
          JSON.stringify({ error: 'ad_account_id and cliente_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('meta_client_ad_accounts')
        .insert({
          ad_account_id,
          cliente_id,
          is_primary: is_primary || false,
          primary_action_type: primary_action_type || null,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, association: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'dissociate') {
      const { ad_account_id, cliente_id } = body;

      if (!ad_account_id || !cliente_id) {
        return new Response(
          JSON.stringify({ error: 'ad_account_id and cliente_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('meta_client_ad_accounts')
        .delete()
        .eq('ad_account_id', ad_account_id)
        .eq('cliente_id', cliente_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'auto_associate') {
      // Fetch all ad accounts without client associations
      const { data: accounts } = await supabase
        .from('meta_ad_accounts')
        .select('id, name, meta_account_id, business_name');

      const { data: clients } = await supabase
        .from('clientes')
        .select('id, nome, slug')
        .eq('ativo', true);

      // Fetch existing associations to skip
      const { data: existing } = await supabase
        .from('meta_client_ad_accounts')
        .select('ad_account_id, cliente_id');

      const existingSet = new Set(
        (existing || []).map(e => `${e.ad_account_id}_${e.cliente_id}`)
      );

      const suggestions: Array<{
        ad_account_id: string;
        ad_account_name: string;
        cliente_id: string;
        cliente_nome: string;
        confidence: string;
      }> = [];

      const created: typeof suggestions = [];

      for (const account of accounts || []) {
        const accountNameLower = (account.name || '').toLowerCase();
        const businessNameLower = (account.business_name || '').toLowerCase();

        for (const client of clients || []) {
          const clientNameLower = (client.nome || '').toLowerCase();
          const key = `${account.id}_${client.id}`;

          if (existingSet.has(key)) continue;

          // Check substring similarity
          const nameMatch = accountNameLower.includes(clientNameLower) ||
                            clientNameLower.includes(accountNameLower);
          const businessMatch = businessNameLower.includes(clientNameLower) ||
                               clientNameLower.includes(businessNameLower);

          if (nameMatch || businessMatch) {
            const confidence = nameMatch && businessMatch ? 'high' : 'medium';

            if (body.apply) {
              // Auto-apply association
              const { error } = await supabase
                .from('meta_client_ad_accounts')
                .insert({
                  ad_account_id: account.id,
                  cliente_id: client.id,
                  is_primary: false,
                });

              if (!error) {
                created.push({
                  ad_account_id: account.id,
                  ad_account_name: account.name,
                  cliente_id: client.id,
                  cliente_nome: client.nome,
                  confidence,
                });
              }
            } else {
              suggestions.push({
                ad_account_id: account.id,
                ad_account_name: account.name,
                cliente_id: client.id,
                cliente_nome: client.nome,
                confidence,
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          suggestions: body.apply ? undefined : suggestions,
          created: body.apply ? created : undefined,
          count: body.apply ? created.length : suggestions.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List accounts for a specific client
    if (action === 'list_for_client') {
      const { cliente_id } = body;

      const { data, error } = await supabase
        .from('meta_client_ad_accounts')
        .select(`
          *,
          meta_ad_accounts (
            id, meta_account_id, name, account_status, business_name,
            currency, timezone, is_active, last_synced_at, sync_error
          )
        `)
        .eq('cliente_id', cliente_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ accounts: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meta-ads-accounts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
