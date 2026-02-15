import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Validate token by calling /me
    const meResponse = await fetch(`${META_GRAPH_URL}/me?access_token=${token}`);
    const meData = await meResponse.json();

    if (meData.error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: meData.error.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get token debug info for expiration
    const debugResponse = await fetch(
      `${META_GRAPH_URL}/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData = await debugResponse.json();
    const expiresAt = debugData.data?.expires_at
      ? new Date(debugData.data.expires_at * 1000).toISOString()
      : null;

    // 3. Fetch ad accounts
    const accountsResponse = await fetch(
      `${META_GRAPH_URL}/me/adaccounts?fields=name,account_status,business{name},currency,timezone_name,account_id&limit=100&access_token=${token}`
    );
    const accountsData = await accountsResponse.json();

    if (accountsData.error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch ad accounts',
          details: accountsData.error.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Upsert connection in meta_connections
    const { data: connection, error: connError } = await supabase
      .from('meta_connections')
      .upsert(
        {
          token_reference: token,
          auth_type: 'long_lived_token',
          status: 'active',
          business_id: meData.id,
          last_validated_at: new Date().toISOString(),
          expires_at: expiresAt,
          error_message: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token_reference' }
      )
      .select()
      .single();

    if (connError) {
      // If upsert fails on conflict, try insert
      const { data: newConn, error: insertErr } = await supabase
        .from('meta_connections')
        .insert({
          token_reference: token,
          auth_type: 'long_lived_token',
          status: 'active',
          business_id: meData.id,
          last_validated_at: new Date().toISOString(),
          expires_at: expiresAt,
          error_message: null,
        })
        .select()
        .single();

      if (insertErr) {
        // Update existing
        const { data: existing } = await supabase
          .from('meta_connections')
          .select('id')
          .eq('token_reference', token)
          .single();

        if (existing) {
          await supabase
            .from('meta_connections')
            .update({
              status: 'active',
              business_id: meData.id,
              last_validated_at: new Date().toISOString(),
              expires_at: expiresAt,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }
      }
    }

    // 5. Get the connection ID
    const { data: connRecord } = await supabase
      .from('meta_connections')
      .select('id')
      .eq('token_reference', token)
      .single();

    const connectionId = connRecord?.id || connection?.id;

    // 6. Upsert discovered ad accounts
    const accounts = accountsData.data || [];
    const upsertedAccounts = [];

    for (const account of accounts) {
      const metaAccountId = account.account_id || account.id?.replace('act_', '');

      const { data: upserted, error: accErr } = await supabase
        .from('meta_ad_accounts')
        .upsert(
          {
            meta_account_id: `act_${metaAccountId}`,
            name: account.name,
            account_status: account.account_status,
            business_name: account.business?.name || null,
            currency: account.currency,
            timezone: account.timezone_name,
            connection_id: connectionId,
            is_active: account.account_status === 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'meta_account_id' }
        )
        .select()
        .single();

      if (!accErr && upserted) {
        upsertedAccounts.push(upserted);
      } else if (accErr) {
        // Try update if insert fails
        const { data: existingAcc } = await supabase
          .from('meta_ad_accounts')
          .select('id')
          .eq('meta_account_id', `act_${metaAccountId}`)
          .single();

        if (existingAcc) {
          await supabase
            .from('meta_ad_accounts')
            .update({
              name: account.name,
              account_status: account.account_status,
              business_name: account.business?.name || null,
              currency: account.currency,
              timezone: account.timezone_name,
              connection_id: connectionId,
              is_active: account.account_status === 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingAcc.id);

          upsertedAccounts.push({ ...existingAcc, name: account.name, meta_account_id: `act_${metaAccountId}` });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: meData.id, name: meData.name },
        expires_at: expiresAt,
        accounts: upsertedAccounts,
        accounts_count: upsertedAccounts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating Meta token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
