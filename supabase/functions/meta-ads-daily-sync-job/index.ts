import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

async function fetchAllPages(url: string): Promise<any[]> {
  const results: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    results.push(...(data.data || []));
    nextUrl = data.paging?.next || null;
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active ad accounts
    const { data: accounts, error: accErr } = await supabase
      .from('meta_ad_accounts')
      .select('id, meta_account_id, name, meta_connections(token_reference, status)')
      .eq('is_active', true);

    if (accErr) throw accErr;

    const results: Array<{ account: string; status: string; records?: number; error?: string }> = [];

    // Sync last 3 days for each account (to catch delayed attribution)
    const today = new Date();
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    const dateFrom = threeDaysAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];

    for (const account of accounts || []) {
      const token = account.meta_connections?.token_reference;

      if (!token || account.meta_connections?.status !== 'active') {
        results.push({ account: account.name, status: 'skipped', error: 'No active token' });
        continue;
      }

      try {
        const startTime = Date.now();

        // Create sync log
        const { data: syncLog } = await supabase
          .from('meta_sync_logs')
          .insert({
            ad_account_id: account.id,
            sync_type: 'daily_cron',
            status: 'running',
            date_from: dateFrom,
            date_to: dateTo,
          })
          .select()
          .single();

        let totalRecords = 0;

        // Sync campaigns
        const campaigns = await fetchAllPages(
          `${META_GRAPH_URL}/${account.meta_account_id}/campaigns?fields=name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time&limit=100&access_token=${token}`
        );

        for (const campaign of campaigns) {
          await supabase
            .from('meta_campaigns')
            .upsert(
              {
                meta_campaign_id: campaign.id,
                ad_account_id: account.id,
                name: campaign.name,
                status: campaign.status,
                effective_status: campaign.effective_status,
                objective: campaign.objective,
                daily_budget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
                lifetime_budget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
                start_time: campaign.start_time || null,
                stop_time: campaign.stop_time || null,
                created_time: campaign.created_time || null,
                updated_time: campaign.updated_time || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'meta_campaign_id' }
            );
          totalRecords++;
        }

        // Sync insights (account level, daily, last 3 days)
        const insightsUrl = `${META_GRAPH_URL}/${account.meta_account_id}/insights?fields=spend,impressions,clicks,reach,ctr,cpm,cpc,frequency,actions,action_values,cost_per_action_type,conversions,conversion_values,unique_clicks,video_play_actions&time_range={"since":"${dateFrom}","until":"${dateTo}"}&time_increment=1&level=account&limit=100&access_token=${token}`;

        const insights = await fetchAllPages(insightsUrl);

        for (const insight of insights) {
          const videoViews = insight.video_play_actions?.[0]?.value ? Number(insight.video_play_actions[0].value) : null;

          await supabase
            .from('meta_insights_daily')
            .upsert(
              {
                ad_account_id: account.id,
                entity_id: account.meta_account_id,
                level: 'account',
                date: insight.date_start,
                spend: insight.spend ? Number(insight.spend) : null,
                impressions: insight.impressions ? Number(insight.impressions) : null,
                clicks: insight.clicks ? Number(insight.clicks) : null,
                reach: insight.reach ? Number(insight.reach) : null,
                ctr: insight.ctr ? Number(insight.ctr) : null,
                cpm: insight.cpm ? Number(insight.cpm) : null,
                cpc: insight.cpc ? Number(insight.cpc) : null,
                frequency: insight.frequency ? Number(insight.frequency) : null,
                unique_clicks: insight.unique_clicks ? Number(insight.unique_clicks) : null,
                actions: insight.actions || null,
                action_values: insight.action_values || null,
                cost_per_action: insight.cost_per_action_type || null,
                video_views: videoViews,
                raw_data: insight,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'ad_account_id,entity_id,level,date' }
            );
          totalRecords++;
        }

        // Update account sync timestamp
        await supabase
          .from('meta_ad_accounts')
          .update({ last_synced_at: new Date().toISOString(), sync_error: null, updated_at: new Date().toISOString() })
          .eq('id', account.id);

        // Update sync log
        if (syncLog) {
          await supabase
            .from('meta_sync_logs')
            .update({ status: 'completed', records_synced: totalRecords, duration_ms: Date.now() - startTime })
            .eq('id', syncLog.id);
        }

        results.push({ account: account.name, status: 'success', records: totalRecords });
      } catch (err) {
        // Update account with error
        await supabase
          .from('meta_ad_accounts')
          .update({ sync_error: err.message, updated_at: new Date().toISOString() })
          .eq('id', account.id);

        results.push({ account: account.name, status: 'error', error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accounts_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in daily sync job:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
