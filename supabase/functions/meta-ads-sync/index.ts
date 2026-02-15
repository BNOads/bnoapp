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

    if (data.error) {
      throw new Error(data.error.message);
    }

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

    const { ad_account_id, date_from, date_to } = await req.json();

    if (!ad_account_id) {
      return new Response(
        JSON.stringify({ error: 'ad_account_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('meta_sync_logs')
      .insert({
        ad_account_id,
        sync_type: 'manual',
        status: 'running',
        date_from: date_from || null,
        date_to: date_to || null,
      })
      .select()
      .single();

    // 1. Get the ad account with connection info
    const { data: adAccount, error: accErr } = await supabase
      .from('meta_ad_accounts')
      .select('*, meta_connections(token_reference)')
      .eq('id', ad_account_id)
      .single();

    if (accErr || !adAccount) {
      throw new Error('Ad account not found');
    }

    const token = adAccount.meta_connections?.token_reference;
    if (!token) {
      throw new Error('No valid token found for this account');
    }

    const metaAccountId = adAccount.meta_account_id;
    let totalRecords = 0;

    // 2. Sync Campaigns
    const campaigns = await fetchAllPages(
      `${META_GRAPH_URL}/${metaAccountId}/campaigns?fields=name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time&limit=100&access_token=${token}`
    );

    for (const campaign of campaigns) {
      await supabase
        .from('meta_campaigns')
        .upsert(
          {
            meta_campaign_id: campaign.id,
            ad_account_id,
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

    // 3. Sync Adsets (for each campaign)
    const campaignRecords = await supabase
      .from('meta_campaigns')
      .select('id, meta_campaign_id')
      .eq('ad_account_id', ad_account_id);

    for (const campaignRec of campaignRecords.data || []) {
      const adsets = await fetchAllPages(
        `${META_GRAPH_URL}/${campaignRec.meta_campaign_id}/adsets?fields=name,status,effective_status,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,start_time,end_time&limit=100&access_token=${token}`
      );

      for (const adset of adsets) {
        await supabase
          .from('meta_adsets')
          .upsert(
            {
              meta_adset_id: adset.id,
              campaign_id: campaignRec.id,
              name: adset.name,
              status: adset.status,
              effective_status: adset.effective_status,
              daily_budget: adset.daily_budget ? Number(adset.daily_budget) / 100 : null,
              lifetime_budget: adset.lifetime_budget ? Number(adset.lifetime_budget) / 100 : null,
              billing_event: adset.billing_event,
              optimization_goal: adset.optimization_goal,
              targeting: adset.targeting || null,
              start_time: adset.start_time || null,
              end_time: adset.end_time || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'meta_adset_id' }
          );
        totalRecords++;
      }
    }

    // 4. Sync Ads (for each adset)
    const adsetRecords = await supabase
      .from('meta_adsets')
      .select('id, meta_adset_id')
      .eq('campaign_id', (campaignRecords.data || []).map(c => c.id));

    // Get adsets via campaigns
    const allAdsetIds = [];
    for (const campaignRec of campaignRecords.data || []) {
      const { data: adsets } = await supabase
        .from('meta_adsets')
        .select('id, meta_adset_id')
        .eq('campaign_id', campaignRec.id);
      allAdsetIds.push(...(adsets || []));
    }

    for (const adsetRec of allAdsetIds) {
      const ads = await fetchAllPages(
        `${META_GRAPH_URL}/${adsetRec.meta_adset_id}/ads?fields=name,status,effective_status,creative{id,thumbnail_url},created_time,updated_time,tracking_specs&limit=100&access_token=${token}`
      );

      for (const ad of ads) {
        await supabase
          .from('meta_ads')
          .upsert(
            {
              meta_ad_id: ad.id,
              adset_id: adsetRec.id,
              name: ad.name,
              status: ad.status,
              effective_status: ad.effective_status,
              creative_id: ad.creative?.id || null,
              creative_thumbnail_url: ad.creative?.thumbnail_url || null,
              tracking_specs: ad.tracking_specs || null,
              created_time: ad.created_time || null,
              updated_time: ad.updated_time || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'meta_ad_id' }
          );
        totalRecords++;
      }
    }

    // 5. Sync Insights (account level, daily)
    const today = new Date();
    const defaultDateFrom = date_from || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultDateTo = date_to || today.toISOString().split('T')[0];

    const insightsUrl = `${META_GRAPH_URL}/${metaAccountId}/insights?fields=spend,impressions,clicks,reach,ctr,cpm,cpc,frequency,actions,action_values,cost_per_action_type,conversions,conversion_values,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_play_actions,unique_clicks&time_range={"since":"${defaultDateFrom}","until":"${defaultDateTo}"}&time_increment=1&level=account&limit=100&access_token=${token}`;

    const insights = await fetchAllPages(insightsUrl);

    for (const insight of insights) {
      const videoViews = insight.video_play_actions?.[0]?.value ? Number(insight.video_play_actions[0].value) : null;

      await supabase
        .from('meta_insights_daily')
        .upsert(
          {
            ad_account_id,
            entity_id: metaAccountId,
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
            conversions: insight.conversions ? Number(insight.conversions) : null,
            conversion_values: insight.conversion_values ? Number(insight.conversion_values) : null,
            video_views: videoViews,
            video_p25_watched: insight.video_p25_watched_actions?.[0]?.value ? Number(insight.video_p25_watched_actions[0].value) : null,
            video_p50_watched: insight.video_p50_watched_actions?.[0]?.value ? Number(insight.video_p50_watched_actions[0].value) : null,
            video_p75_watched: insight.video_p75_watched_actions?.[0]?.value ? Number(insight.video_p75_watched_actions[0].value) : null,
            video_p100_watched: insight.video_p100_watched_actions?.[0]?.value ? Number(insight.video_p100_watched_actions[0].value) : null,
            raw_data: insight,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'ad_account_id,entity_id,level,date' }
        );
      totalRecords++;
    }

    // 6. Update ad account last_synced_at
    await supabase
      .from('meta_ad_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ad_account_id);

    // 7. Update sync log
    const duration = Date.now() - startTime;
    if (syncLog) {
      await supabase
        .from('meta_sync_logs')
        .update({
          status: 'completed',
          records_synced: totalRecords,
          duration_ms: duration,
        })
        .eq('id', syncLog.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        records_synced: totalRecords,
        campaigns_count: campaigns.length,
        insights_count: insights.length,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing Meta Ads:', error);

    // Try to update sync log with error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const body = await req.clone().json().catch(() => ({}));
      if (body.ad_account_id) {
        await supabase
          .from('meta_ad_accounts')
          .update({ sync_error: error.message, updated_at: new Date().toISOString() })
          .eq('id', body.ad_account_id);
      }
    } catch (_) {
      // Ignore cleanup errors
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
