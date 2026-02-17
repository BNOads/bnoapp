
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN')
        if (!META_ACCESS_TOKEN) {
            throw new Error('META_ACCESS_TOKEN is not set')
        }

        let { ad_account_id, client_id, date_start, date_stop, trigger_source } = await req.json().catch(() => ({}))

        // Default source
        if (!trigger_source) trigger_source = 'manual';

        // 1. Log start
        const { data: logSync, error: logError } = await supabase
            .from('meta_sync_logs')
            .insert({
                ad_account_id: ad_account_id || null, // Best effort logging
                status: 'running',
                started_at: new Date().toISOString(),
                trigger_source: trigger_source
            })
            .select()
            .single()

        if (logError && logError.code !== '42P01') {
            console.error('Error logging start:', logError)
        }

        // 2. Fetch Accounts
        let query = supabase
            .from('meta_client_ad_accounts')
            .select(`
                *,
                meta_ad_accounts (
                    meta_account_id
                )
            `)

        if (ad_account_id) {
            query = query.eq('ad_account_id', ad_account_id)
        } else if (client_id) {
            query = query.eq('cliente_id', client_id)
        }

        const { data: accounts, error: accountsError } = await query

        if (accountsError) throw accountsError

        console.log(`Found ${accounts?.length} accounts to sync.`)

        const results = []

        // Common Fields
        const campaignFields = 'account_id,campaign_name,campaign_id,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,action_values,date_start,date_stop'
        const adFields = 'account_id,ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,action_values,video_play_actions,video_3_sec_watched_actions,video_p75_watched_actions,video_thruplay_watched_actions,date_start,date_stop'

        // 3. Loop and Fetch
        for (const account of accounts || []) {
            // @ts-ignore
            const metaId = account.meta_ad_accounts?.meta_account_id

            if (!metaId) {
                console.error(`Skipping account ${account.id}: No Meta ID found.`)
                continue
            }

            // --- Determine Date Range for this Account ---
            let effectiveStart = date_start;
            let effectiveEnd = date_stop;

            if (!effectiveStart || !effectiveEnd) {
                // Automatic mode: Smart Sync
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                // Fetch latest date from DB
                const { data: latest } = await supabase
                    .from('meta_campaign_insights')
                    .select('date_start')
                    .eq('ad_account_id', account.id)
                    .order('date_start', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (latest?.date_start) {
                    // Incremental: Start from the last synced date (to update it)
                    effectiveStart = latest.date_start;
                    console.log(`[Smart Sync] Account ${account.account_name}: Found existing data. Syncing from ${effectiveStart} to ${todayStr}`);
                } else {
                    // Initial Sync: Last 30 days
                    const last30 = new Date();
                    last30.setDate(today.getDate() - 29);
                    effectiveStart = last30.toISOString().split('T')[0];
                    console.log(`[Smart Sync] Account ${account.account_name}: No data found. Syncing last 30 days (${effectiveStart} to ${todayStr})`);
                }
                effectiveEnd = todayStr;
            } else {
                console.log(`[Manual Sync] Account ${account.account_name}: Using provided range ${effectiveStart} to ${effectiveEnd}`);
            }


            // --- A. Campaign Insights ---
            const urlCampaign = new URL(`https://graph.facebook.com/v24.0/${metaId}/insights`)
            urlCampaign.searchParams.append('level', 'campaign')
            urlCampaign.searchParams.append('fields', campaignFields)
            urlCampaign.searchParams.append('access_token', META_ACCESS_TOKEN)
            urlCampaign.searchParams.append('time_increment', '1')
            urlCampaign.searchParams.append('limit', '200')
            urlCampaign.searchParams.append('time_range', JSON.stringify({ since: effectiveStart, until: effectiveEnd }))

            let totalCampaignsSynced = 0;

            try {
                let currentUrl = urlCampaign.toString();

                while (currentUrl) {
                    console.log(`Fetching campaigns: ${currentUrl}`);
                    const response = await fetch(currentUrl)
                    const json = await response.json() // Parse JSON once

                    if (json.error) {
                        // Throw specific error to be caught
                        throw new Error(json.error.message);
                    }

                    if (!json.data) {
                        // Safely handle cases where data is missing but no error field
                        throw new Error("Invalid response from Meta API");
                    }

                    const insights = json.data || [] // Access data from parsed JSON

                    if (insights.length > 0) {
                        const upsertData = insights.map((item: any) => ({
                            ad_account_id: account.id,
                            campaign_id: item.campaign_id,
                            campaign_name: item.campaign_name,
                            date_start: item.date_start,
                            date_stop: item.date_stop,
                            spend: item.spend,
                            impressions: item.impressions,
                            clicks: item.clicks,
                            reach: item.reach,
                            cpc: item.cpc,
                            cpm: item.cpm,
                            ctr: item.ctr,
                            frequency: item.frequency,
                            actions: item.actions || [],
                            action_values: item.action_values || []
                        }))

                        const { error } = await supabase
                            .from('meta_campaign_insights')
                            .upsert(upsertData, { onConflict: 'ad_account_id,campaign_id,date_start' })

                        if (error) throw error;
                        totalCampaignsSynced += upsertData.length;
                    }

                    currentUrl = json.paging?.next || null;
                }

                results.push({ accountId: account.id, type: 'campaign', count: totalCampaignsSynced, status: 'success' })

            } catch (err: any) {
                console.error(`Campaign sync error for ${account.id}:`, err)
                results.push({ accountId: account.id, type: 'campaign', status: 'error', error: err.message })
            }

            // --- B. Ad Insights ---
            const urlAd = new URL(`https://graph.facebook.com/v24.0/${metaId}/insights`)
            urlAd.searchParams.append('level', 'ad')
            urlAd.searchParams.append('fields', adFields)
            urlAd.searchParams.append('access_token', META_ACCESS_TOKEN)
            urlAd.searchParams.append('time_increment', '1')
            urlAd.searchParams.append('limit', '200')
            urlAd.searchParams.append('time_range', JSON.stringify({ since: effectiveStart, until: effectiveEnd }))

            let totalAdsSynced = 0;

            try {
                let currentUrl = urlAd.toString();

                while (currentUrl) {
                    console.log(`Fetching ads: ${currentUrl}`);
                    const responseAd = await fetch(currentUrl)
                    const jsonAd = await responseAd.json()

                    if (jsonAd.error) {
                        throw new Error(jsonAd.error.message)
                    }

                    const adInsights = jsonAd.data || []

                    if (adInsights.length > 0) {
                        // 1. Collect Unique Ad IDs
                        // @ts-ignore
                        const uniqueAdIds = [...new Set(adInsights.map((i: any) => i.ad_id))]
                        const adMetadataMap = new Map()

                        // 2. Batch Fetch Ad Metadata (Creative & Story ID)
                        if (uniqueAdIds.length > 0) {
                            const chunks = []
                            for (let i = 0; i < uniqueAdIds.length; i += 50) {
                                chunks.push(uniqueAdIds.slice(i, i + 50))
                            }

                            for (const chunk of chunks) {
                                const metadataUrl = new URL(`https://graph.facebook.com/v24.0/`)
                                metadataUrl.searchParams.append('ids', chunk.join(','))
                                metadataUrl.searchParams.append('fields', 'name,creative{id,thumbnail_url,image_url,title,instagram_permalink_url,object_story_spec},preview_shareable_link,effective_object_story_id')
                                metadataUrl.searchParams.append('thumbnail_width', '400')
                                metadataUrl.searchParams.append('thumbnail_height', '400')
                                metadataUrl.searchParams.append('access_token', META_ACCESS_TOKEN)

                                const metaRes = await fetch(metadataUrl)
                                const metaJson = await metaRes.json()

                                if (metaJson.error) {
                                    console.error('Ad metadata fetch error:', metaJson.error);
                                } else {
                                    const entries = Object.entries(metaJson);
                                    // Log first entry raw response for debugging
                                    if (entries.length > 0) {
                                        const [firstId, firstData] = entries[0] as [string, any];
                                        console.log('RAW Meta API response (first ad):', JSON.stringify({
                                            ad_id: firstId,
                                            has_creative: !!firstData.creative,
                                            creative_keys: firstData.creative ? Object.keys(firstData.creative) : [],
                                            creative_thumbnail_url: firstData.creative?.thumbnail_url || null,
                                            creative_image_url: firstData.creative?.image_url || null,
                                            effective_object_story_id: firstData.effective_object_story_id || null,
                                        }));
                                    }
                                    entries.forEach(([id, data]: [string, any]) => {
                                        adMetadataMap.set(id, data)
                                    })
                                }
                            }
                        }

                        // 3. Log creative data for debugging
                        let adsWithCreativeThumb = 0;
                        uniqueAdIds.forEach(adId => {
                            const meta = adMetadataMap.get(adId);
                            if (meta?.creative?.thumbnail_url) adsWithCreativeThumb++;
                        });
                        console.log(`Creative thumbnail_url found for ${adsWithCreativeThumb}/${uniqueAdIds.length} ads`);
                        // Log sample creative data for first ad
                        const sampleMeta = adMetadataMap.get(uniqueAdIds[0]);
                        if (sampleMeta) {
                            console.log('Sample ad creative data:', JSON.stringify({
                                ad_id: uniqueAdIds[0],
                                creative_id: sampleMeta.creative?.id,
                                thumbnail_url: sampleMeta.creative?.thumbnail_url,
                                image_url: sampleMeta.creative?.image_url,
                                has_object_story_spec: !!sampleMeta.creative?.object_story_spec,
                                effective_object_story_id: sampleMeta.effective_object_story_id,
                            }));
                        }

                        // 4. Identify Missing Images/Links and Fetch from Post (effective_object_story_id)
                        const storyIdsToFetch = new Set<string>();

                        uniqueAdIds.forEach(adId => {
                            const meta = adMetadataMap.get(adId);
                            if (meta) {
                                const creative = meta.creative || {};
                                // Check if we found a direct thumbnail first
                                const hasMainThumb = creative.thumbnail_url || creative.image_url;
                                // Check deep fields
                                const hasDeepThumb = creative.object_story_spec?.link_data?.picture || creative.object_story_spec?.video_data?.image_url || creative.object_story_spec?.template_data?.link_data?.picture;
                                // Check link
                                const hasLink = creative.instagram_permalink_url;

                                // If missing thumbnail or link, and we have a story ID, fetch the post
                                if ((!hasMainThumb && !hasDeepThumb || !hasLink) && meta.effective_object_story_id) {
                                    storyIdsToFetch.add(meta.effective_object_story_id);
                                }
                            }
                        });


                        const postMetadataMap = new Map();

                        if (storyIdsToFetch.size > 0) {
                            const storyIdArray = Array.from(storyIdsToFetch);
                            const chunks = [];
                            console.log(`Fetching supplementary data for ${storyIdArray.length} ads (Post ID)...`);
                            for (let i = 0; i < storyIdArray.length; i += 50) {
                                chunks.push(storyIdArray.slice(i, i + 50));
                            }

                            for (const chunk of chunks) {
                                const postUrl = new URL(`https://graph.facebook.com/v24.0/`)
                                postUrl.searchParams.append('ids', chunk.join(','))
                                postUrl.searchParams.append('fields', 'full_picture,picture,permalink_url') // Added permalink_url
                                postUrl.searchParams.append('access_token', META_ACCESS_TOKEN)

                                const postRes = await fetch(postUrl)
                                const postJson = await postRes.json()

                                if (postJson.error) {
                                    console.error('Post metadata fetch error:', postJson.error);
                                } else {
                                    Object.entries(postJson).forEach(([id, data]: [string, any]) => {
                                        postMetadataMap.set(id, data);
                                    });
                                }
                            }
                        }

                        // 5. Fetch Ad Previews for ads still missing thumbnails
                        const previewMap = new Map<string, string>();
                        const adsMissingThumb = new Set<string>();

                        uniqueAdIds.forEach(adId => {
                            const meta = adMetadataMap.get(adId);
                            const creative = meta?.creative || {};
                            const hasThumb = creative.thumbnail_url || creative.image_url
                                || creative.object_story_spec?.link_data?.picture
                                || creative.object_story_spec?.video_data?.image_url
                                || creative.object_story_spec?.template_data?.link_data?.picture;

                            if (!hasThumb) {
                                const post = meta?.effective_object_story_id ? postMetadataMap.get(meta.effective_object_story_id) : null;
                                if (!post?.full_picture && !post?.picture) {
                                    adsMissingThumb.add(adId as string);
                                }
                            }
                        });

                        if (adsMissingThumb.size > 0) {
                            console.log(`Fetching previews for ${adsMissingThumb.size} ads without thumbnails...`);
                            const previewPromises = Array.from(adsMissingThumb).map(async (adId) => {
                                try {
                                    const previewUrl = new URL(`https://graph.facebook.com/v24.0/${adId}/previews`);
                                    previewUrl.searchParams.append('ad_format', 'MOBILE_FEED_STANDARD');
                                    previewUrl.searchParams.append('access_token', META_ACCESS_TOKEN);

                                    const pRes = await fetch(previewUrl);
                                    const pJson = await pRes.json();

                                    if (pJson.data?.[0]?.body) {
                                        const iframeHtml = pJson.data[0].body;
                                        // Extract iframe src URL
                                        const srcMatch = iframeHtml.match(/src="([^"]+)"/);
                                        if (srcMatch?.[1]) {
                                            // Decode HTML entities
                                            const iframeSrc = srcMatch[1].replace(/&amp;/g, '&');
                                            previewMap.set(adId, iframeSrc);
                                        }
                                    } else if (pJson.error) {
                                        console.warn(`Preview error for ad ${adId}:`, pJson.error.message);
                                    }
                                } catch (e: any) {
                                    console.warn(`Preview fetch failed for ad ${adId}:`, e.message);
                                }
                            });
                            await Promise.all(previewPromises);
                            console.log(`Got ${previewMap.size} previews from ${adsMissingThumb.size} ads`);
                        }

                        // Log thumbnail resolution summary
                        console.log(`Thumbnail resolution: ${adsWithCreativeThumb} from creative.thumbnail_url, ${postMetadataMap.size} post fallbacks, ${previewMap.size} preview fallbacks`);

                        // 6. Upsert Ad Data
                        const upsertAdData = adInsights.map((item: any) => {
                            const meta = adMetadataMap.get(item.ad_id)
                            const creative = meta?.creative || {}

                            // A. Link Logic - Prioritize Instagram Permalink, then Post Permalink
                            let creativeLink = creative.instagram_permalink_url;

                            if (!creativeLink && meta?.effective_object_story_id) {
                                // Try fallback post fetch
                                const post = postMetadataMap.get(meta.effective_object_story_id);
                                if (post?.permalink_url) {
                                    creativeLink = post.permalink_url;
                                }
                            }

                            if (!creativeLink) {
                                creativeLink = meta?.preview_shareable_link
                            }

                            if (!creativeLink && meta?.effective_object_story_id) {
                                const parts = meta.effective_object_story_id.split('_')
                                if (parts.length === 2) {
                                    creativeLink = `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`
                                }
                            }

                            // B. Thumbnail Logic - directly from creative{thumbnail_url}
                            let thumbnailUrl = creative.thumbnail_url || creative.image_url;

                            if (!thumbnailUrl && creative.object_story_spec) {
                                const spec = creative.object_story_spec;
                                if (spec.link_data?.picture) {
                                    thumbnailUrl = spec.link_data.picture;
                                } else if (spec.video_data?.image_url) {
                                    thumbnailUrl = spec.video_data.image_url;
                                } else if (spec.template_data?.link_data?.picture) {
                                    thumbnailUrl = spec.template_data.link_data.picture;
                                }
                            }

                            // C. Fallback to Post Picture
                            if (!thumbnailUrl && meta?.effective_object_story_id) {
                                let post = postMetadataMap.get(meta.effective_object_story_id);

                                if (post?.full_picture) {
                                    thumbnailUrl = post.full_picture;
                                } else if (post?.picture) {
                                    thumbnailUrl = post.picture;
                                }
                            }

                            // D. Fallback to Ad Preview (iframe src)
                            if (!thumbnailUrl && previewMap.has(item.ad_id)) {
                                thumbnailUrl = previewMap.get(item.ad_id);
                            }

                            return {
                                ad_account_id: account.id,
                                ad_id: item.ad_id,
                                ad_name: item.ad_name,
                                campaign_id: item.campaign_id,
                                campaign_name: item.campaign_name,
                                adset_id: item.adset_id,
                                adset_name: item.adset_name,
                                date_start: item.date_start,
                                date_stop: item.date_stop,
                                spend: item.spend,
                                impressions: item.impressions,
                                clicks: item.clicks,
                                reach: item.reach,
                                cpc: item.cpc,
                                cpm: item.cpm,
                                ctr: item.ctr,
                                frequency: item.frequency,
                                actions: item.actions || [],
                                action_values: item.action_values || [],
                                video_metrics: {
                                    video_play_actions: item.video_play_actions || [],
                                    video_3_sec_watched_actions: item.video_3_sec_watched_actions || [],
                                    video_p75_watched_actions: item.video_p75_watched_actions || [],
                                    video_thruplay_watched_actions: item.video_thruplay_watched_actions || []
                                },
                                creative_thumbnail_url: thumbnailUrl,
                                creative_url: creativeLink
                            }
                        })

                        // Log thumbnail coverage
                        const withThumb = upsertAdData.filter((d: any) => d.creative_thumbnail_url).length;
                        const withoutThumb = upsertAdData.filter((d: any) => !d.creative_thumbnail_url).length;
                        console.log(`Ad thumbnail coverage: ${withThumb}/${upsertAdData.length} with thumbnail, ${withoutThumb} missing`);
                        if (withoutThumb > 0) {
                            const missing = upsertAdData.filter((d: any) => !d.creative_thumbnail_url).slice(0, 5);
                            console.log('Sample ads without thumbnail:', missing.map((d: any) => ({ ad_id: d.ad_id, ad_name: d.ad_name })));
                        }

                        const { error } = await supabase
                            .from('meta_ad_insights')
                            .upsert(upsertAdData, { onConflict: 'ad_account_id,ad_id,date_start' })

                        if (error) throw error;
                        totalAdsSynced += upsertAdData.length;
                    }

                    // Pagination
                    currentUrl = jsonAd.paging?.next || null;
                }

                results.push({ accountId: account.id, type: 'ad', count: totalAdsSynced, status: 'success' })

            } catch (err: any) {
                console.error(`Ad sync error for ${account.id}:`, err)
                results.push({ accountId: account.id, type: 'ad', status: 'error', error: err.message })
            }
        }

        // 5. Update Log
        if (logSync) {
            await supabase
                .from('meta_sync_logs')
                .update({
                    status: 'success',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', logSync.id)
        }

        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Sync failed:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
