import { normalizeEmail, normalizePhone, normalizeHeaderKey, buildLaunchSheetCrossing } from './launchSheetCrossing';

export interface BuyerMetric {
    name: string;
    buyers: number;
    total: number;
    conversion_rate: number;
}

export interface QuestionAnalysis {
    question: string;
    options: BuyerMetric[];
}

export interface CompradoresAnalysisResult {
    totalBuyers: number;
    matchedBuyers: number; // Buyers that were found in the Leads/Pesquisa lists
    topCampaigns: BuyerMetric[];
    topSources: BuyerMetric[];
    topTerms: BuyerMetric[]; // Often used for creatives/audiences
    topContents: BuyerMetric[]; // Usually where creatives actually are
    questionsAnalysis: QuestionAnalysis[];
}

// Function to safely get a value from a row regardless of casing
const getFieldValue = (row: Record<string, unknown>, keysToTry: string[]): string => {
    const rawKeys = Object.keys(row);

    // 1. Exact match (ignoring underscores/formatting)
    for (const key of keysToTry) {
        const target = key.replace(/_/g, '');
        const exactMatch = rawKeys.find(rk => normalizeHeaderKey(rk).replace(/_/g, '') === target);
        if (exactMatch && row[exactMatch]) {
            return String(row[exactMatch]).trim();
        }
    }

    // 2. Includes match (ignoring underscores/formatting)
    for (const key of keysToTry) {
        const target = key.replace(/_/g, '');
        const matchingKey = rawKeys.find(rk => normalizeHeaderKey(rk).replace(/_/g, '').includes(target));
        if (matchingKey && row[matchingKey]) {
            return String(row[matchingKey]).trim();
        }
    }
    return '';
};

const extractPerson = (row: Record<string, unknown>) => {
    const email = getFieldValue(row, ['mapped_email', 'email', 'mail']);
    const phone = getFieldValue(row, ['mapped_telefone', 'telefone', 'celular', 'whatsapp', 'phone']);
    const name = getFieldValue(row, ['mapped_nome', 'nome', 'name', 'comprador']);

    return {
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        name,
        raw: row
    };
};

export const buildCompradoresAnalysis = (
    compradoresRows: unknown[],
    leadsRows: unknown[],
    pesquisaRows: unknown[]
): CompradoresAnalysisResult => {

    // 1. Build the base leads/pesquisa crossing map to get the source of truth for UTMs and Answers
    const crossing = buildLaunchSheetCrossing(leadsRows, pesquisaRows);

    // We also need all leads to calculate the denominator for "Total Leads from this Campaign"
    // Since launchSheetCrossing only gives us matchedPeople (intersection), we need to extract raw UTMs from Leads as well.
    // However, matchedPeople from crossing actually only contains people who are in BOTH leads and pesquisa.
    // Wait, let's re-parse leads to have a full map of EVERY lead, since some buyers might be leads but didn't answer the survey.

    const allLeadsMap = new Map<string, Record<string, unknown>>();
    const leadsCountByCampaign = new Map<string, number>();
    const leadsCountBySource = new Map<string, number>();
    const leadsCountByTerm = new Map<string, number>();
    const leadsCountByContent = new Map<string, number>();

    // Answers pool
    const answersTotalCount = new Map<string, Map<string, number>>();
    // questionKey -> Map(answerValue -> count)

    // First, map all Leads and their UTMs
    (leadsRows as Record<string, unknown>[]).forEach(row => {
        if (!row) return;
        const p = extractPerson(row);
        let utm_campaign = getFieldValue(row, ['utm_campaign', 'campaign', 'campanha']);
        let utm_source = getFieldValue(row, ['utm_source', 'source', 'origem']);
        let utm_term = getFieldValue(row, ['utm_term', 'term', 'termo']);
        let utm_content = getFieldValue(row, ['utm_content', 'content', 'conteudo', 'cont']);

        utm_campaign = utm_campaign || '(sem campanha)';
        utm_source = utm_source || '(sem origem)';
        utm_term = utm_term || '(sem termo)';
        utm_content = utm_content || '(sem conteúdo)';

        const leadObj = { ...p, utm_campaign, utm_source, utm_term, utm_content, answers: {} as Record<string, string> };

        if (p.email) allLeadsMap.set(`email:${p.email}`, leadObj);
        if (p.phone) allLeadsMap.set(`phone:${p.phone}`, leadObj);

        leadsCountByCampaign.set(utm_campaign, (leadsCountByCampaign.get(utm_campaign) || 0) + 1);
        leadsCountBySource.set(utm_source, (leadsCountBySource.get(utm_source) || 0) + 1);
        leadsCountByTerm.set(utm_term, (leadsCountByTerm.get(utm_term) || 0) + 1);
        leadsCountByContent.set(utm_content, (leadsCountByContent.get(utm_content) || 0) + 1);
    });

    // Map all Pesquisa to get their answers and attach to leads
    // Identifiy question columns (anything not metadata)
    const questionKeys = new Set<string>();
    (pesquisaRows as Record<string, unknown>[]).forEach(row => {
        if (!row) return;
        Object.keys(row).forEach(k => {
            const nk = normalizeHeaderKey(k);
            if (!nk.includes('email') && !nk.includes('telefone') && !nk.includes('nome') && !nk.includes('utm') && !nk.includes('carimbo') && !nk.includes('data')) {
                questionKeys.add(k);
            }
        });
    });

    (pesquisaRows as Record<string, unknown>[]).forEach(row => {
        if (!row) return;
        const p = extractPerson(row);
        const keyEmail = p.email ? `email:${p.email}` : '';
        const keyPhone = p.phone ? `phone:${p.phone}` : '';

        let targetLead = null;
        if (keyEmail && allLeadsMap.has(keyEmail)) targetLead = allLeadsMap.get(keyEmail);
        else if (keyPhone && allLeadsMap.has(keyPhone)) targetLead = allLeadsMap.get(keyPhone);

        // Let's create a standalone record if not found in leads, because they still answered the survey!
        if (!targetLead) {
            targetLead = { ...p, utm_campaign: '(sem campanha)', utm_source: '(sem origem)', utm_term: '(sem termo)', utm_content: '(sem conteúdo)', answers: {} };
            if (keyEmail) allLeadsMap.set(keyEmail, targetLead);
            if (keyPhone) allLeadsMap.set(keyPhone, targetLead);
        }

        questionKeys.forEach(q => {
            const answer = String(row[q] || '').trim();
            if (answer && targetLead) {
                targetLead.answers[q] = answer;

                if (!answersTotalCount.has(q)) answersTotalCount.set(q, new Map());
                const aMap = answersTotalCount.get(q)!;
                aMap.set(answer, (aMap.get(answer) || 0) + 1);
            }
        });
    });

    // Now, cross with Buyers
    let matchedBuyers = 0;
    const buyersByCampaign = new Map<string, number>();
    const buyersBySource = new Map<string, number>();
    const buyersByTerm = new Map<string, number>();
    const buyersByContent = new Map<string, number>();
    const buyersByAnswer = new Map<string, Map<string, number>>(); // q -> answer -> count

    (compradoresRows as Record<string, unknown>[]).forEach(row => {
        if (!row) return;
        const p = extractPerson(row);
        let foundLead = null;
        if (p.email && allLeadsMap.has(`email:${p.email}`)) foundLead = allLeadsMap.get(`email:${p.email}`);
        else if (p.phone && allLeadsMap.has(`phone:${p.phone}`)) foundLead = allLeadsMap.get(`phone:${p.phone}`);

        if (foundLead) {
            matchedBuyers++;

            const c = foundLead.utm_campaign;
            const s = foundLead.utm_source;
            const t = foundLead.utm_term;
            const cont = foundLead.utm_content;

            buyersByCampaign.set(c, (buyersByCampaign.get(c) || 0) + 1);
            buyersBySource.set(s, (buyersBySource.get(s) || 0) + 1);
            buyersByTerm.set(t, (buyersByTerm.get(t) || 0) + 1);
            buyersByContent.set(cont, (buyersByContent.get(cont) || 0) + 1);

            Object.entries(foundLead.answers).forEach(([q, answer]) => {
                const ansStr = String(answer);
                if (!buyersByAnswer.has(q)) buyersByAnswer.set(q, new Map());
                const am = buyersByAnswer.get(q)!;
                am.set(ansStr, (am.get(ansStr) || 0) + 1);
            });
        }
    });

    // Calculate metrics
    const buildMetrics = (buyerMap: Map<string, number>, totalMap: Map<string, number>): BuyerMetric[] => {
        const arr: BuyerMetric[] = [];
        buyerMap.forEach((buyers, name) => {
            const total = totalMap.get(name) || buyers; // If not in leads, total is at least buyers
            arr.push({
                name,
                buyers,
                total,
                conversion_rate: (buyers / total) * 100
            });
        });
        return arr.sort((a, b) => b.buyers - a.buyers); // Sort by most sales
    };

    const topCampaigns = buildMetrics(buyersByCampaign, leadsCountByCampaign);
    const topSources = buildMetrics(buyersBySource, leadsCountBySource);
    const topTerms = buildMetrics(buyersByTerm, leadsCountByTerm);
    const topContents = buildMetrics(buyersByContent, leadsCountByContent);

    const questionsAnalysis: QuestionAnalysis[] = [];
    buyersByAnswer.forEach((answersMap, qName) => {
        const options: BuyerMetric[] = [];
        const totMap = answersTotalCount.get(qName);

        answersMap.forEach((buyers, ansName) => {
            const total = totMap?.get(ansName) || buyers;
            options.push({
                name: ansName,
                buyers,
                total,
                conversion_rate: (buyers / total) * 100
            });
        });

        options.sort((a, b) => b.conversion_rate - a.conversion_rate); // Sort by highest conversion rate
        questionsAnalysis.push({
            question: qName,
            options
        });
    });

    return {
        totalBuyers: (compradoresRows || []).length,
        matchedBuyers,
        topCampaigns: topCampaigns.slice(0, 15),
        topSources: topSources.slice(0, 10),
        topTerms: topTerms.slice(0, 15),
        topContents: topContents.slice(0, 15),
        questionsAnalysis
    };
};
