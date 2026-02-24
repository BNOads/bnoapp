import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOW_BALANCE_THRESHOLD = 10; // R$ 10,00
const META_MAX_DAILY_WINDOW_DAYS = 35;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseISODateOnlyUTC = (value: string): Date => {
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        throw new Error(`Invalid ISO date: ${value}`);
    }

    return new Date(Date.UTC(year, month - 1, day));
};

const toISODateOnlyUTC = (value: Date): string => value.toISOString().split('T')[0];

const buildDateWindows = (start: string, end: string, maxWindowDays: number): Array<{ since: string; until: string }> => {
    const windows: Array<{ since: string; until: string }> = [];
    const maxDays = Math.max(1, maxWindowDays);
    const maxWindowMs = (maxDays - 1) * MS_PER_DAY;

    let cursor = parseISODateOnlyUTC(start);
    const finalDate = parseISODateOnlyUTC(end);

    if (cursor.getTime() > finalDate.getTime()) {
        return windows;
    }

    while (cursor.getTime() <= finalDate.getTime()) {
        const maxUntil = new Date(cursor.getTime() + maxWindowMs);
        const until = maxUntil.getTime() < finalDate.getTime() ? maxUntil : finalDate;

        windows.push({
            since: toISODateOnlyUTC(cursor),
            until: toISODateOnlyUTC(until),
        });

        cursor = new Date(until.getTime() + MS_PER_DAY);
    }

    return windows;
};

const parseMetaMoney = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;

    const raw = String(value).trim();
    if (!raw) return 0;

    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return 0;

    // Meta often returns money in cents for some fields.
    return raw.includes('.') ? numeric : numeric / 100;
};

const formatCurrencyBRL = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const uniqueDestinatarios = (values: Array<string | null | undefined>): string[] => {
    return Array.from(new Set(values.filter((v): v is string => Boolean(v))));
};

const VALID_TRIGGER_SOURCES = new Set(['manual', 'automatic_daily']);

const getSyncScope = (adAccountId?: string | null, clientId?: string | null): 'single_account' | 'client_scope' | 'all_linked_accounts' => {
    if (adAccountId) return 'single_account';
    if (clientId) return 'client_scope';
    return 'all_linked_accounts';
};

const safeNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (status?: string | null): 'success' | 'error' | 'partial' | 'running' => {
    if (!status) return 'error';

    const normalized = status.toLowerCase();
    if (['running', 'processando', 'em_andamento', 'in_progress'].includes(normalized)) return 'running';
    if (['success', 'sucesso', 'completed', 'concluido', 'done'].includes(normalized)) return 'success';
    if (['partial'].includes(normalized)) return 'partial';
    return 'error';
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const requestStartedAt = Date.now();
    const requestStartedAtIso = new Date(requestStartedAt).toISOString();
    let logSyncId: string | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;
    let triggerSource: string = 'manual';
    let syncScope: 'single_account' | 'client_scope' | 'all_linked_accounts' = 'all_linked_accounts';
    let accountDetailsForLog: any[] = [];
    let recordsSyncedForLog = 0;
    let accountsSuccessForLog = 0;
    let accountsErrorForLog = 0;

    try {
        supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN')
        if (!META_ACCESS_TOKEN) {
            throw new Error('META_ACCESS_TOKEN is not set')
        }

        let { ad_account_id, client_id, date_start, date_stop, trigger_source, campaign_ids } = await req.json().catch(() => ({}))

        triggerSource = VALID_TRIGGER_SOURCES.has(trigger_source) ? trigger_source : 'manual';
        syncScope = getSyncScope(ad_account_id, client_id);

        const { data: logSync, error: logError } = await supabase
            .from('meta_sync_logs')
            .insert({
                ad_account_id: ad_account_id || null, // Best effort logging
                status: 'running',
                sync_type: 'meta_ads',
                started_at: requestStartedAtIso,
                trigger_source: triggerSource,
                scope: syncScope,
                date_from: date_start || null,
                date_to: date_stop || null,
                details: []
            })
            .select()
            .single()

        if (logError && logError.code !== '42P01') {
            console.error('Error logging start:', logError)
        } else if (logSync?.id) {
            logSyncId = logSync.id;
        }

        // 2. Fetch Accounts
        let query = supabase
            .from('meta_client_ad_accounts')
            .select(`
                *,
                meta_ad_accounts(meta_account_id),
                clientes(id, nome, traffic_manager_id, primary_gestor_user_id)
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
        const accountDetails: any[] = []

        // Select a system author for creating notifications
        const { data: adminAuthor } = await supabase
            .from('colaboradores')
            .select('user_id')
            .eq('ativo', true)
            .in('nivel_acesso', ['admin', 'dono'])
            .not('user_id', 'is', null)
            .limit(1)
            .maybeSingle();

        // Build traffic manager map (colaborador.id -> user_id)
        const trafficManagerIds = Array.from(new Set(
            (accounts || [])
                .map((acc: any) => acc?.clientes?.traffic_manager_id)
                .filter(Boolean)
        ));

        const trafficManagerUserMap = new Map<string, string>();
        if (trafficManagerIds.length > 0) {
            const { data: trafficManagers } = await supabase
                .from('colaboradores')
                .select('id, user_id')
                .in('id', trafficManagerIds)
                .eq('ativo', true);

            (trafficManagers || []).forEach((tm: any) => {
                if (tm?.id && tm?.user_id) {
                    trafficManagerUserMap.set(tm.id, tm.user_id);
                }
            });
        }

        // Common Fields
        const campaignFields = 'account_id,campaign_name,campaign_id,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,action_values,date_start,date_stop'
        const adFields = 'account_id,ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,status,effective_status,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,action_values,date_start,date_stop'

        // 3. Loop and Fetch
        for (const account of accounts || []) {
            // @ts-ignore
            const metaId = account.meta_ad_accounts?.meta_account_id

            const accountSummary: any = {
                ad_account_id: account.id,
                meta_account_id: metaId || null,
                account_name: account.account_name || account.meta_ad_accounts?.name || metaId || 'Conta sem nome',
                client_id: account.cliente_id || null,
                client_name: account?.clientes?.nome || null,
                date_start: null,
                date_stop: null,
                campaign: { status: 'pending', count: 0, error: null },
                ad: { status: 'pending', count: 0, error: null },
                total_records: 0,
                status: 'running'
            };

            if (!metaId) {
                console.error(`Skipping account ${account.id}: No Meta ID found.`)
                accountSummary.status = 'error';
                accountSummary.campaign = { status: 'error', count: 0, error: 'No Meta ID found for linked account.' };
                accountSummary.ad = { status: 'error', count: 0, error: 'No Meta ID found for linked account.' };
                accountDetails.push(accountSummary);
                results.push({
                    accountId: account.id,
                    type: 'account',
                    status: 'error',
                    error: 'No Meta ID found for linked account.'
                });
                continue
            }

            let effectiveStart = date_start;
            let effectiveEnd = date_stop;
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            if (!effectiveStart || !effectiveEnd) {
                if (triggerSource === 'automatic_daily') {
                    // Fetch latest date from DB
                    const { data: latest } = await supabase
                        .from('meta_campaign_insights')
                        .select('date_start')
                        .eq('ad_account_id', account.id)
                        .order('date_start', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (latest?.date_start) {
                        const lastSyncDate = new Date(latest.date_start);
                        lastSyncDate.setDate(lastSyncDate.getDate() - 8);
                        effectiveStart = lastSyncDate.toISOString().split('T')[0];
                        console.log(`[Smart Sync] Incremental: ${effectiveStart} to ${todayStr}`);
                    } else {
                        const last30 = new Date();
                        last30.setDate(today.getDate() - 29);
                        effectiveStart = last30.toISOString().split('T')[0];
                        console.log(`[Smart Sync] Initial: ${effectiveStart} to ${todayStr}`);
                    }
                } else {
                    // Manual sem datas fallback -> Puxa ultimos 30 dias pra evitar buracos
                    const last30 = new Date();
                    last30.setDate(today.getDate() - 29);
                    effectiveStart = last30.toISOString().split('T')[0];
                    console.log(`[Manual Sync Global] No dates: ${effectiveStart} to ${todayStr}`);
                }
                effectiveEnd = todayStr;
            } else {
                console.log(`[Manual Sync] Using provided range ${effectiveStart} to ${effectiveEnd}`);
            }

            const dateWindows = buildDateWindows(effectiveStart, effectiveEnd, META_MAX_DAILY_WINDOW_DAYS);
            if (dateWindows.length === 0) {
                const rangeError = `Invalid date range for sync: ${effectiveStart} to ${effectiveEnd}`;
                console.error(rangeError);
                accountSummary.status = 'error';
                accountSummary.campaign = { status: 'error', count: 0, error: rangeError };
                accountSummary.ad = { status: 'error', count: 0, error: rangeError };
                accountDetails.push(accountSummary);
                results.push({ accountId: account.id, type: 'account', status: 'error', error: rangeError });
                continue;
            }
            console.log(`[Sync Windows] ${dateWindows.length} window(s) for ${metaId}: ${effectiveStart} to ${effectiveEnd}`);

            accountSummary.date_start = effectiveStart;
            accountSummary.date_stop = effectiveEnd;

            // --- 0. Sync Account Details (is_prepay_account & balance) ---
            try {
                const accountUrl = new URL(`https://graph.facebook.com/v24.0/${metaId}`);
                accountUrl.searchParams.append('fields', 'name,account_status,is_prepay_account,currency,timezone_name,balance,amount_spent,spend_cap');
                accountUrl.searchParams.append('access_token', META_ACCESS_TOKEN);

                const accRes = await fetch(accountUrl);
                const accJson = await accRes.json();

                if (accJson.id) {
                    let isPrepay = accJson.is_prepay_account || false;
                    const accountStatus = Number(accJson.account_status || account?.account_status || 0);

                    const balanceRaw = parseMetaMoney(accJson.balance);
                    const amountSpent = parseMetaMoney(accJson.amount_spent);
                    const spendCap = parseMetaMoney(accJson.spend_cap);

                    // Fallback for cases where balance comes as 0 in postpaid/capped accounts.
                    let balance = balanceRaw;
                    if ((balance === 0) && spendCap > 0) {
                        balance = Math.max(spendCap - amountSpent, 0);
                    }

                    // If Meta says it's NOT prepay, but there is a positive balance, assume it MIGHT be prepay
                    // (User requested this heuristic for "CA - Val Justo")
                    if (!isPrepay && balance !== 0) {
                        isPrepay = true;
                    }

                    // Update meta_ad_accounts
                    const { error: accUpdateError } = await supabase
                        .from('meta_ad_accounts')
                        .update({
                            is_prepay_account: isPrepay,
                            balance: balance,
                            account_status: Number.isFinite(accountStatus) ? accountStatus : null,
                            last_synced_at: new Date().toISOString()
                        })
                        .eq('meta_account_id', metaId);

                    if (accUpdateError) {
                        console.error(`Failed to update account details for ${metaId}:`, accUpdateError);
                    } else {
                        console.log(`Updated account details for ${metaId}: is_prepay_account=${isPrepay}, balance=${balance}`);
                    }

                    // --- 0.1 Low Balance Notification (prepaid active accounts) ---
                    try {
                        const isActiveAccount = accountStatus === 1;
                        const isLowBalance = balance <= LOW_BALANCE_THRESHOLD;
                        const lowBalanceKey = `meta_low_balance:${metaId}`;

                        const clientData = (account as any)?.clientes;
                        const clientName = clientData?.nome || 'Cliente sem nome';
                        const accountName = accJson.name || account?.account_name || metaId;

                        // Resolve traffic manager user_id:
                        // 1) clientes.traffic_manager_id -> colaboradores.user_id
                        // 2) fallback clientes.primary_gestor_user_id (already user_id)
                        const tmUserFromId = clientData?.traffic_manager_id
                            ? trafficManagerUserMap.get(clientData.traffic_manager_id)
                            : null;
                        const trafficManagerUserId = tmUserFromId || clientData?.primary_gestor_user_id || null;

                        const { data: openLowBalanceAvisos, error: openLowBalanceError } = await supabase
                            .from('avisos')
                            .select('id')
                            .eq('ativo', true)
                            .eq('canais->>meta_low_balance_key', lowBalanceKey)
                            .limit(1);

                        if (openLowBalanceError) {
                            console.error(`Error checking open low-balance notice for ${metaId}:`, openLowBalanceError);
                        }

                        const hasOpenLowBalanceNotice = (openLowBalanceAvisos || []).length > 0;

                        if (isActiveAccount && isPrepay && isLowBalance) {
                            if (!hasOpenLowBalanceNotice) {
                                const notificationAuthor = adminAuthor?.user_id || trafficManagerUserId;

                                if (!notificationAuthor) {
                                    console.warn(`Skipping low-balance notice for ${metaId}: no valid created_by user_id found.`);
                                } else {
                                    const destinatarios = uniqueDestinatarios([
                                        trafficManagerUserId,
                                        'admin'
                                    ]);

                                    if (destinatarios.length > 0) {
                                        const conteudo =
                                            `O cliente **${clientName}** na conta **${accountName}** está com saldo baixo.\n\n` +
                                            `Saldo atual: **${formatCurrencyBRL(balance)}**\n` +
                                            `Limite de alerta: **${formatCurrencyBRL(LOW_BALANCE_THRESHOLD)}**\n\n` +
                                            `Recomendação: recarregar a conta para evitar interrupção de campanhas.`;

                                        const { error: avisoError } = await supabase
                                            .from('avisos')
                                            .insert({
                                                titulo: `⚠️ Saldo baixo Meta Ads - ${clientName}`,
                                                conteudo,
                                                tipo: 'warning',
                                                prioridade: 'alta',
                                                destinatarios,
                                                ativo: true,
                                                created_by: notificationAuthor,
                                                canais: {
                                                    sistema: true,
                                                    email: false,
                                                    meta_low_balance_key: lowBalanceKey,
                                                    meta_account_id: metaId,
                                                    meta_client_id: account?.cliente_id || null
                                                },
                                                data_inicio: new Date().toISOString()
                                            });

                                        if (avisoError) {
                                            console.error(`Failed to create low-balance notice for ${metaId}:`, avisoError);
                                        } else {
                                            console.log(`Low-balance notice created for ${metaId} (${clientName})`);
                                        }
                                    }
                                }
                            }
                        } else if (hasOpenLowBalanceNotice) {
                            // If recovered (or account stopped/prepay disabled), close previous low-balance notice.
                            const { error: closeAvisoError } = await supabase
                                .from('avisos')
                                .update({
                                    ativo: false,
                                    data_fim: new Date().toISOString(),
                                    updated_at: new Date().toISOString()
                                })
                                .eq('ativo', true)
                                .eq('canais->>meta_low_balance_key', lowBalanceKey);

                            if (closeAvisoError) {
                                console.error(`Failed to close low-balance notice for ${metaId}:`, closeAvisoError);
                            } else {
                                console.log(`Low-balance notice closed for ${metaId}`);
                            }
                        }
                    } catch (notifyError: any) {
                        console.error(`Error handling low-balance notifications for ${metaId}:`, notifyError);
                    }
                }
            } catch (e: any) {
                console.error(`Error syncing account details for ${metaId}:`, e);
            }

            // --- A. Campaign Insights ---
            let totalCampaignsSynced = 0;

            try {
                for (const dateWindow of dateWindows) {
                    const urlCampaign = new URL(`https://graph.facebook.com/v24.0/${metaId}/insights`);
                    urlCampaign.searchParams.append('level', 'campaign');
                    urlCampaign.searchParams.append('fields', campaignFields);
                    urlCampaign.searchParams.append('access_token', META_ACCESS_TOKEN);
                    urlCampaign.searchParams.append('time_increment', '1');
                    urlCampaign.searchParams.append('limit', '200');
                    urlCampaign.searchParams.append('time_range', JSON.stringify({ since: dateWindow.since, until: dateWindow.until }));
                    if (campaign_ids && Array.isArray(campaign_ids) && campaign_ids.length > 0) {
                        // Determine valid filtering for campaigns.
                        // Meta API allows filtering by campaign.id.
                        urlCampaign.searchParams.append('filtering', JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: campaign_ids }]));
                    }

                    let currentUrl = urlCampaign.toString();

                    while (currentUrl) {
                        console.log(`Fetching campaigns (${dateWindow.since}..${dateWindow.until}): ${currentUrl}`);
                        const response = await fetch(currentUrl);
                        const json = await response.json(); // Parse JSON once

                        if (json.error) {
                            // Throw specific error to be caught
                            throw new Error(json.error.message);
                        }

                        if (!json.data) {
                            // Safely handle cases where data is missing but no error field
                            throw new Error("Invalid response from Meta API");
                        }

                        const insights = json.data || []; // Access data from parsed JSON

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
                            }));

                            const { error } = await supabase
                                .from('meta_campaign_insights')
                                .upsert(upsertData, { onConflict: 'ad_account_id,campaign_id,date_start' });

                            if (error) throw error;
                            totalCampaignsSynced += upsertData.length;
                        }

                        currentUrl = json.paging?.next || null;
                    }
                }

                accountSummary.campaign = { status: 'success', count: totalCampaignsSynced, error: null };
                results.push({ accountId: account.id, type: 'campaign', count: totalCampaignsSynced, status: 'success' })

            } catch (err: any) {
                console.error(`Campaign sync error for ${account.id}:`, err)
                accountSummary.campaign = { status: 'error', count: totalCampaignsSynced, error: err.message || 'Campaign sync failed' };
                results.push({ accountId: account.id, type: 'campaign', status: 'error', error: err.message })
            }

            // --- B. Ad Insights ---
            let totalAdsSynced = 0;
            let adDebugInfo: any = null;

            try {
                for (const dateWindow of dateWindows) {
                    const urlAd = new URL(`https://graph.facebook.com/v24.0/${metaId}/insights`);
                    urlAd.searchParams.append('level', 'ad');
                    urlAd.searchParams.append('fields', adFields);
                    urlAd.searchParams.append('access_token', META_ACCESS_TOKEN);
                    urlAd.searchParams.append('time_increment', '1');
                    urlAd.searchParams.append('limit', '200');
                    urlAd.searchParams.append('time_range', JSON.stringify({ since: dateWindow.since, until: dateWindow.until }));
                    if (campaign_ids && Array.isArray(campaign_ids) && campaign_ids.length > 0) {
                        urlAd.searchParams.append('filtering', JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: campaign_ids }]));
                    }

                    let currentUrl = urlAd.toString();

                    while (currentUrl) {
                        console.log(`Fetching ads (${dateWindow.since}..${dateWindow.until}): ${currentUrl}`);
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

                        // 2. Fetch Ad Metadata individually (creative{thumbnail_url})
                        let metadataError: string | null = null;
                        if (uniqueAdIds.length > 0) {
                            console.log(`Fetching metadata for ${uniqueAdIds.length} ads...`);

                            // Fetch each ad individually to avoid batch permission issues
                            const metaPromises = uniqueAdIds.map(async (adId) => {
                                try {
                                    const metadataUrl = new URL(`https://graph.facebook.com/v24.0/${adId}`);
                                    metadataUrl.searchParams.append('fields', 'name,creative{id,thumbnail_url,image_url,title,instagram_permalink_url,object_story_spec,asset_feed_spec,object_type}');
                                    metadataUrl.searchParams.append('thumbnail_width', '400');
                                    metadataUrl.searchParams.append('thumbnail_height', '400');
                                    metadataUrl.searchParams.append('access_token', META_ACCESS_TOKEN);

                                    const metaRes = await fetch(metadataUrl);
                                    const metaJson = await metaRes.json();

                                    if (metaJson.error) {
                                        if (!metadataError) metadataError = metaJson.error.message;
                                        console.warn(`Metadata error for ad ${adId}: ${metaJson.error.message}`);
                                    } else {
                                        adMetadataMap.set(adId, metaJson);
                                    }
                                } catch (e: any) {
                                    if (!metadataError) metadataError = e.message;
                                }
                            });

                            // Process in batches of 10 to avoid rate limiting
                            for (let i = 0; i < metaPromises.length; i += 10) {
                                await Promise.all(metaPromises.slice(i, i + 10));
                            }

                            console.log(`Metadata fetched: ${adMetadataMap.size}/${uniqueAdIds.length} ads`);
                            if (adMetadataMap.size > 0) {
                                const firstKey = adMetadataMap.keys().next().value;
                                const firstData = adMetadataMap.get(firstKey);
                                console.log('RAW Meta API response (first ad):', JSON.stringify({
                                    ad_id: firstKey,
                                    has_creative: !!firstData?.creative,
                                    creative_keys: firstData?.creative ? Object.keys(firstData.creative) : [],
                                    creative_thumbnail_url: firstData?.creative?.thumbnail_url || null,
                                    creative_image_url: firstData?.creative?.image_url || null,
                                    effective_object_story_id: firstData?.effective_object_story_id || null,
                                    object_type: firstData?.creative?.object_type || null
                                }));
                            }
                        }

                        // 3. Log creative data for debugging
                        let adsWithCreativeThumb = 0;
                        uniqueAdIds.forEach(adId => {
                            const meta = adMetadataMap.get(adId);
                            if (meta?.creative?.thumbnail_url) adsWithCreativeThumb++;
                        });
                        console.log(`Creative thumbnail_url found for ${adsWithCreativeThumb}/${uniqueAdIds.length} ads`);

                        // 4. Fetch Ad Previews for ads still missing thumbnails
                        const previewMap = new Map<string, string>();
                        const adsMissingThumb = new Set<string>();

                        uniqueAdIds.forEach(adId => {
                            const meta = adMetadataMap.get(adId);
                            const creative = meta?.creative || {};

                            // Check all possible sources for a thumbnail
                            let hasThumb = creative.thumbnail_url || creative.image_url;

                            // Check object_story_spec
                            if (!hasThumb && creative.object_story_spec) {
                                hasThumb = creative.object_story_spec.link_data?.picture
                                    || creative.object_story_spec.video_data?.image_url
                                    || creative.object_story_spec.template_data?.link_data?.picture
                                    || creative.object_story_spec.link_data?.child_attachments?.[0]?.picture;
                            }

                            // Check asset_feed_spec (Dynamic Creative)
                            if (!hasThumb && creative.asset_feed_spec) {
                                const assets = creative.asset_feed_spec;
                                hasThumb = assets.images?.[0]?.url
                                    || assets.videos?.[0]?.thumbnail_url;
                            }

                            if (!hasThumb) {
                                adsMissingThumb.add(adId as string);
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
                                        const srcMatch = iframeHtml.match(/src="([^"]+)"/);
                                        if (srcMatch?.[1]) {
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

                        console.log(`Thumbnail resolution: ${adsWithCreativeThumb} from creative, ${previewMap.size} from preview`);

                        // 5. Upsert Ad Data
                        const upsertAdData = adInsights.map((item: any) => {
                            const meta = adMetadataMap.get(item.ad_id)
                            const creative = meta?.creative || {}

                            // A. Link Logic
                            let creativeLink = creative.instagram_permalink_url || null;

                            // Fallback to call_to_action link or link_data link
                            if (!creativeLink && creative.object_story_spec) {
                                const spec = creative.object_story_spec;
                                creativeLink = spec.link_data?.link
                                    || spec.video_data?.call_to_action?.value?.link
                                    || spec.template_data?.link_data?.link
                                    || spec.link_data?.child_attachments?.[0]?.link;
                            }

                            // Fallback to asset_feed_spec (Dynamic Creative)
                            if (!creativeLink && creative.asset_feed_spec) {
                                const assets = creative.asset_feed_spec;
                                creativeLink = assets.link_urls?.[0]?.website_url;
                            }

                            // DEBUG: Log creative link finding
                            if (!creativeLink) {
                                console.log(`[DEBUG] No link found for ad ${item.ad_id}. Creative keys: ${Object.keys(creative).join(',')}`);
                                if (creative.object_story_spec) console.log(`[DEBUG] object_story_spec: ${JSON.stringify(creative.object_story_spec)}`);
                                if (creative.asset_feed_spec) console.log(`[DEBUG] asset_feed_spec: ${JSON.stringify(creative.asset_feed_spec)}`);
                            } else {
                                // console.log(`[DEBUG] Found link for ad ${item.ad_id}: ${creativeLink}`);
                            }

                            // B. Thumbnail Logic - from creative{thumbnail_url}
                            let thumbnailUrl = creative.thumbnail_url || creative.image_url;

                            if (!thumbnailUrl && creative.object_story_spec) {
                                const spec = creative.object_story_spec;
                                if (spec.link_data?.picture) {
                                    thumbnailUrl = spec.link_data.picture;
                                } else if (spec.video_data?.image_url) {
                                    thumbnailUrl = spec.video_data.image_url;
                                } else if (spec.template_data?.link_data?.picture) {
                                    thumbnailUrl = spec.template_data.link_data.picture;
                                } else if (spec.link_data?.child_attachments?.[0]?.picture) {
                                    thumbnailUrl = spec.link_data.child_attachments[0].picture;
                                }
                            }

                            // Check asset_feed_spec (Dynamic Creative)
                            if (!thumbnailUrl && creative.asset_feed_spec) {
                                const assets = creative.asset_feed_spec;
                                if (assets.images && assets.images.length > 0) {
                                    thumbnailUrl = assets.images[0].url;
                                } else if (assets.videos && assets.videos.length > 0) {
                                    thumbnailUrl = assets.videos[0].thumbnail_url;
                                }
                            }

                            // C. Fallback to Ad Preview (iframe src)
                            if (!thumbnailUrl && previewMap.has(item.ad_id)) {
                                thumbnailUrl = previewMap.get(item.ad_id);
                            }

                            // D. Media Type Logic
                            let mediaType = 'image';
                            if (creative.object_type === 'VIDEO') mediaType = 'video';
                            else if (creative.object_story_spec?.video_data) mediaType = 'video';
                            else if (creative.asset_feed_spec?.videos && creative.asset_feed_spec.videos.length > 0) mediaType = 'video';
                            else if (creative.object_story_spec?.link_data?.child_attachments && creative.object_story_spec.link_data.child_attachments.length > 1) mediaType = 'carousel';

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
                                status: item.status,
                                effective_status: item.effective_status,
                                creative_thumbnail_url: thumbnailUrl,
                                creative_url: creativeLink,
                                media_type: mediaType
                            }
                        })

                        // Save debug info
                        const firstKey = adMetadataMap.keys().next().value;
                        const firstMeta = firstKey ? adMetadataMap.get(firstKey) : null;
                        adDebugInfo = {
                            total_unique_ads: adMetadataMap.size,
                            metadata_error: metadataError,
                            ads_with_creative_thumbnail: Array.from(adMetadataMap.values()).filter((m: any) => m?.creative?.thumbnail_url).length,
                            ads_with_creative_image: Array.from(adMetadataMap.values()).filter((m: any) => m?.creative?.image_url).length,
                            ads_with_story_id: Array.from(adMetadataMap.values()).filter((m: any) => m?.effective_object_story_id).length,
                            preview_map_size: previewMap?.size || 0,
                            sample_ad: firstMeta ? {
                                ad_id: firstKey,
                                raw_creative: firstMeta.creative || null,
                                effective_object_story_id: firstMeta.effective_object_story_id || null,
                            } : null,
                        };

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
                }

                accountSummary.ad = {
                    status: 'success',
                    count: totalAdsSynced,
                    error: null,
                    debug: adDebugInfo,
                };
                results.push({
                    accountId: account.id,
                    type: 'ad',
                    count: totalAdsSynced,
                    status: 'success',
                    debug: adDebugInfo,
                })

            } catch (err: any) {
                console.error(`Ad sync error for ${account.id}:`, err)
                accountSummary.ad = {
                    status: 'error',
                    count: totalAdsSynced,
                    error: err.message || 'Ad sync failed',
                    debug: adDebugInfo,
                };
                results.push({ accountId: account.id, type: 'ad', status: 'error', error: err.message })
            }

            accountSummary.total_records =
                safeNumber(accountSummary.campaign?.count) +
                safeNumber(accountSummary.ad?.count);

            const campaignStatus = normalizeStatus(accountSummary.campaign?.status);
            const adStatus = normalizeStatus(accountSummary.ad?.status);

            if (campaignStatus === 'success' && adStatus === 'success') {
                accountSummary.status = 'success';
            } else if (campaignStatus === 'error' && adStatus === 'error') {
                accountSummary.status = 'error';
            } else {
                accountSummary.status = 'partial';
            }

            accountDetails.push(accountSummary);
        }

        accountDetailsForLog = accountDetails;
        const accountsTotal = accountDetails.length;
        const accountsSuccess = accountDetails.filter((item: any) => normalizeStatus(item?.status) === 'success').length;
        const accountsWithErrors = accountDetails.filter((item: any) => normalizeStatus(item?.status) !== 'success').length;
        const totalRecordsSynced = accountDetails.reduce((sum: number, item: any) => sum + safeNumber(item?.total_records), 0);

        accountsSuccessForLog = accountsSuccess;
        accountsErrorForLog = accountsWithErrors;
        recordsSyncedForLog = totalRecordsSynced;

        let finalStatus: 'success' | 'error' | 'partial' = 'success';
        if (accountsTotal > 0) {
            if (accountsWithErrors === 0) finalStatus = 'success';
            else if (accountsSuccess === 0) finalStatus = 'error';
            else finalStatus = 'partial';
        }

        if (logSyncId) {
            const { error: finalLogError } = await supabase
                .from('meta_sync_logs')
                .update({
                    status: finalStatus,
                    completed_at: new Date().toISOString(),
                    duration_ms: Math.max(0, Date.now() - requestStartedAt),
                    records_synced: totalRecordsSynced,
                    accounts_total: accountsTotal,
                    accounts_success: accountsSuccess,
                    accounts_error: accountsWithErrors,
                    details: accountDetails,
                    trigger_source: triggerSource,
                    scope: syncScope,
                    date_from: date_start || null,
                    date_to: date_stop || null,
                    error_message: finalStatus === 'error' || finalStatus === 'partial'
                        ? accountDetails
                            .filter((item: any) => normalizeStatus(item?.status) !== 'success')
                            .map((item: any) => `${item?.account_name || item?.meta_account_id || item?.ad_account_id}: ${item?.campaign?.error || item?.ad?.error || 'Erro na sincronização da conta'}`)
                            .join(' | ')
                        : null,
                })
                .eq('id', logSyncId);

            if (finalLogError) {
                console.error('Error updating final sync log:', finalLogError);
            }
        }

        return new Response(
            JSON.stringify({
                success: finalStatus !== 'error',
                status: finalStatus,
                summary: {
                    trigger_source: triggerSource,
                    scope: syncScope,
                    accounts_total: accountsTotal,
                    accounts_success: accountsSuccess,
                    accounts_error: accountsError,
                    records_synced: totalRecordsSynced,
                    duration_ms: Math.max(0, Date.now() - requestStartedAt),
                },
                account_details: accountDetails,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Sync failed:', error)
        const completedAt = new Date().toISOString();
        const accountsTotal = accountDetailsForLog.length;
        const fallbackAccountsError = accountsErrorForLog || (accountsTotal > 0 ? accountsTotal : 0);

        if (supabase && logSyncId) {
            const { error: logUpdateError } = await supabase
                .from('meta_sync_logs')
                .update({
                    status: 'error',
                    completed_at: completedAt,
                    duration_ms: Math.max(0, Date.now() - requestStartedAt),
                    records_synced: recordsSyncedForLog,
                    accounts_total: accountsTotal,
                    accounts_success: accountsSuccessForLog,
                    accounts_error: fallbackAccountsError,
                    details: accountDetailsForLog,
                    trigger_source: triggerSource,
                    scope: syncScope,
                    error_message: error?.message || 'Unexpected sync error',
                })
                .eq('id', logSyncId);

            if (logUpdateError) {
                console.error('Failed to update error sync log:', logUpdateError);
            }
        }

        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
