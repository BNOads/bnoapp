import { normalizeEmail, normalizePhone, normalizeHeaderKey, buildLaunchSheetCrossing } from './launchSheetCrossing';

export interface BuyerMetric {
    name: string;
    buyers: number;
    total: number;
    conversion_rate: number;
    revenue: number;
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

const extractNumberFromStr = (val: string): number => {
    if (!val) return 0;
    let str = val.replace(/R\$\s?/gi, '').trim();
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
        const lastCommaIndex = str.lastIndexOf(',');
        const lastDotIndex = str.lastIndexOf('.');
        if (lastCommaIndex > lastDotIndex) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        str = str.replace(',', '.');
    }
    const num = Number(str);
    return isNaN(num) ? 0 : num;
};

const extractPerson = (row: Record<string, unknown>) => {
    const email = getFieldValue(row, ['mapped_email', 'email', 'mail']);
    const phone = getFieldValue(row, ['mapped_telefone', 'telefone', 'celular', 'whatsapp', 'phone']);
    const name = getFieldValue(row, ['mapped_nome', 'nome', 'name', 'comprador']);
    const value = getFieldValue(row, ['mapped_valor', 'valor', 'price', 'preço', 'preco', 'faturamento']);

    return {
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        name,
        value: extractNumberFromStr(value),
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
        // O usuário pediu que o ranking de públicos use "utm_medium"
        let utm_term = getFieldValue(row, ['utm_medium', 'medium', 'mídia', 'midia']);
        let utm_content = getFieldValue(row, ['utm_content', 'content', 'conteudo', 'cont']);

        utm_campaign = utm_campaign || '(sem campanha)';
        utm_source = utm_source || '(sem origem)';
        utm_term = utm_term || '(sem público)'; // Trocando o texto padrão também
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
    const buyersByCampaign = new Map<string, { count: number; revenue: number }>();
    const buyersBySource = new Map<string, { count: number; revenue: number }>();
    const buyersByTerm = new Map<string, { count: number; revenue: number }>();
    const buyersByContent = new Map<string, { count: number; revenue: number }>();
    const buyersByAnswer = new Map<string, Map<string, { count: number; revenue: number }>>(); // q -> answer -> { count, revenue }

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
            const rev = p.value || 0;

            const updateMap = (map: Map<string, { count: number; revenue: number }>, key: string) => {
                const current = map.get(key) || { count: 0, revenue: 0 };
                map.set(key, { count: current.count + 1, revenue: current.revenue + rev });
            };

            updateMap(buyersByCampaign, c);
            updateMap(buyersBySource, s);
            updateMap(buyersByTerm, t);
            updateMap(buyersByContent, cont);

            Object.entries(foundLead.answers).forEach(([q, answer]) => {
                const ansStr = String(answer);
                if (!buyersByAnswer.has(q)) buyersByAnswer.set(q, new Map());
                const am = buyersByAnswer.get(q)!;
                const current = am.get(ansStr) || { count: 0, revenue: 0 };
                am.set(ansStr, { count: current.count + 1, revenue: current.revenue + rev });
            });
        }
    });

    // Calculate metrics
    const buildMetrics = (buyerMap: Map<string, { count: number; revenue: number }>, totalMap: Map<string, number>): BuyerMetric[] => {
        const arr: BuyerMetric[] = [];
        buyerMap.forEach((data, name) => {
            const total = totalMap.get(name) || data.count; // If not in leads, total is at least buyers
            arr.push({
                name,
                buyers: data.count,
                total,
                conversion_rate: (data.count / total) * 100,
                revenue: data.revenue
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
            const buyersCount = buyers.count;
            const total = totMap?.get(ansName) || buyersCount;
            options.push({
                name: ansName,
                buyers: buyersCount,
                total,
                conversion_rate: (buyersCount / total) * 100,
                revenue: buyers.revenue
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
