export type SheetRow = Record<string, unknown>;

export interface MatchedPersonRow {
  key: string;
  nome: string;
  email: string;
  telefone: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  [questionKey: string]: string;
}

export interface ThemeMetric {
  tema: string;
  leads: number;
  responderam: number;
  taxa_resposta: number;
}

export interface CampaignMetric {
  utm_campaign: string;
  leads: number;
  responderam: number;
  taxa_resposta: number;
}

export interface ProfileMetric {
  fieldKey: string;
  fieldLabel: string;
  totalAnswers: number;
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export interface SourceMetric {
  name: string;
  value: number;
  percentage: number;
}

export interface LaunchSheetCrossingResult {
  leadsUniqueCount: number;
  pesquisaUniqueCount: number;
  intersectionCount: number;
  responseRate: number;
  nonResponseRate: number;
  matchedPeople: MatchedPersonRow[];
  questionColumns: string[];
  themeMetrics: ThemeMetric[];
  campaignMetrics: CampaignMetric[];
  profileMetrics: ProfileMetric[];
  sourceMetrics: SourceMetric[];
}

interface ExtractedPerson {
  email: string;
  phone: string;
  nome: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
}

interface LeadPerson extends ExtractedPerson {
  key: string;
}

interface PesquisaPerson extends ExtractedPerson {
  key: string;
  matchedLeadKey: string | null;
  answers: Record<string, string>;
}

const DEFAULT_SOURCE = '(sem origem)';
const DEFAULT_MEDIUM = '(sem meio)';
const DEFAULT_CAMPAIGN = '(sem campanha)';
const DEFAULT_TERM = '(sem termo)';

const isObjectRecord = (value: unknown): value is SheetRow => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const stripDiacritics = (value: string) => {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const normalizeHeaderKey = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return stripDiacritics(String(value))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const normalizeEmail = (value: unknown): string => {
  return normalizeText(value).toLowerCase();
};

export const normalizePhone = (value: unknown): string => {
  let digits = normalizeText(value).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  if (digits.length > 11) {
    digits = digits.slice(-11);
  }

  return digits.length >= 8 ? digits : '';
};

const getFieldValue = (
  row: SheetRow,
  exactAliases: string[],
  includeHints: string[] = [],
  excludeHints: string[] = []
): string => {
  const entries = Object.entries(row).map(([key, value]) => ({
    key,
    normalizedKey: normalizeHeaderKey(key),
    value: normalizeText(value),
  }));

  const exactNormalized = new Set(exactAliases.map((alias) => normalizeHeaderKey(alias)));
  for (const entry of entries) {
    if (!entry.value) continue;
    if (exactNormalized.has(entry.normalizedKey)) {
      return entry.value;
    }
  }

  if (includeHints.length === 0) return '';

  const includeNormalized = includeHints.map((hint) => normalizeHeaderKey(hint));
  const excludeNormalized = excludeHints.map((hint) => normalizeHeaderKey(hint));

  for (const entry of entries) {
    if (!entry.value) continue;

    const hasIncludeHint = includeNormalized.some((hint) => entry.normalizedKey.includes(hint));
    if (!hasIncludeHint) continue;

    const hasExcludeHint = excludeNormalized.some((hint) => entry.normalizedKey.includes(hint));
    if (hasExcludeHint) continue;

    return entry.value;
  }

  return '';
};

const isMetadataField = (rawKey: string): boolean => {
  const key = normalizeHeaderKey(rawKey);
  if (!key) return true;

  if (key.startsWith('utm_')) return true;

  const exactBlocked = new Set([
    'id',
    'nome',
    'name',
    'email',
    'e_mail',
    'telefone',
    'phone',
    'celular',
    'whatsapp',
    'data',
    'date',
    'created_at',
    'updated_at',
    'carimbo',
    'carimbo_de_data_hora',
    'timestamp',
  ]);

  if (exactBlocked.has(key)) return true;

  const blockedContains = [
    'email',
    'telefone',
    'phone',
    'celular',
    'whatsapp',
    'timestamp',
    'carimbo',
    'created',
    'updated',
    'utm',
  ];

  return blockedContains.some((token) => key.includes(token));
};

const toRows = (rows: unknown[]): SheetRow[] => {
  return rows.filter(isObjectRecord);
};

const extractPerson = (row: SheetRow): ExtractedPerson => {
  const emailRaw = getFieldValue(
    row,
    ['email', 'e-mail', 'e_mail', 'mail', 'endereco_de_email'],
    ['email', 'e_mail', 'mail']
  );

  const phoneRaw = getFieldValue(
    row,
    ['telefone', 'phone', 'celular', 'whatsapp'],
    ['telefone', 'phone', 'celular', 'whatsapp', 'whats', 'wpp']
  );

  const nome = getFieldValue(
    row,
    ['nome', 'name'],
    ['nome', 'name'],
    ['campaign_name', 'utm_name']
  );

  const utm_source = getFieldValue(
    row,
    ['utm_source', 'utm source', 'source', 'fonte'],
    ['utm_source']
  );
  const utm_medium = getFieldValue(
    row,
    ['utm_medium', 'utm medium', 'medium', 'meio'],
    ['utm_medium']
  );
  const utm_campaign = getFieldValue(
    row,
    ['utm_campaign', 'utm campaign', 'campaign', 'campanha'],
    ['utm_campaign', 'campanha']
  );
  const utm_term = getFieldValue(
    row,
    ['utm_term', 'utm term', 'term', 'termo', 'tema'],
    ['utm_term', 'termo', 'tema']
  );

  return {
    email: normalizeEmail(emailRaw),
    phone: normalizePhone(phoneRaw),
    nome,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
  };
};

const preferDefined = (currentValue: string, nextValue: string): string => {
  if (currentValue && currentValue.trim() !== '') return currentValue;
  return nextValue || '';
};

const percent = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return (value / total) * 100;
};

const sortDescByCount = <T extends { value: number }>(rows: T[]): T[] => {
  return [...rows].sort((a, b) => b.value - a.value);
};

export const formatSheetColumnLabel = (key: string): string => {
  const cleaned = key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return key;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const buildLaunchSheetCrossing = (
  rawLeadsRows: unknown[],
  rawPesquisaRows: unknown[]
): LaunchSheetCrossingResult => {
  const leadsRows = toRows(rawLeadsRows);
  const pesquisaRows = toRows(rawPesquisaRows);

  const leadsByKey = new Map<string, LeadPerson>();
  const leadKeyByEmail = new Map<string, string>();
  const leadKeyByPhone = new Map<string, string>();

  for (const row of leadsRows) {
    const extracted = extractPerson(row);
    if (!extracted.email && !extracted.phone) continue;

    let key = '';
    if (extracted.email && leadKeyByEmail.has(extracted.email)) {
      key = leadKeyByEmail.get(extracted.email) || '';
    } else if (extracted.phone && leadKeyByPhone.has(extracted.phone)) {
      key = leadKeyByPhone.get(extracted.phone) || '';
    } else if (extracted.email) {
      key = `email:${extracted.email}`;
    } else {
      key = `phone:${extracted.phone}`;
    }

    if (!key) continue;

    const existing = leadsByKey.get(key);
    if (existing) {
      existing.nome = preferDefined(existing.nome, extracted.nome);
      existing.email = preferDefined(existing.email, extracted.email);
      existing.phone = preferDefined(existing.phone, extracted.phone);
      existing.utm_source = preferDefined(existing.utm_source, extracted.utm_source);
      existing.utm_medium = preferDefined(existing.utm_medium, extracted.utm_medium);
      existing.utm_campaign = preferDefined(existing.utm_campaign, extracted.utm_campaign);
      existing.utm_term = preferDefined(existing.utm_term, extracted.utm_term);
    } else {
      leadsByKey.set(key, {
        key,
        ...extracted,
      });
    }

    if (extracted.email && !leadKeyByEmail.has(extracted.email)) {
      leadKeyByEmail.set(extracted.email, key);
    }

    if (extracted.phone && !leadKeyByPhone.has(extracted.phone)) {
      leadKeyByPhone.set(extracted.phone, key);
    }
  }

  const questionCandidateSet = new Set<string>();
  for (const row of pesquisaRows) {
    for (const key of Object.keys(row)) {
      if (!isMetadataField(key)) {
        questionCandidateSet.add(key);
      }
    }
  }
  const questionCandidates = Array.from(questionCandidateSet);

  const pesquisaByKey = new Map<string, PesquisaPerson>();

  for (const row of pesquisaRows) {
    const extracted = extractPerson(row);
    if (!extracted.email && !extracted.phone) continue;

    const matchedByEmail = extracted.email ? leadKeyByEmail.get(extracted.email) || null : null;
    const matchedByPhone = extracted.phone ? leadKeyByPhone.get(extracted.phone) || null : null;
    const matchedLeadKey = matchedByEmail || matchedByPhone;

    const key = matchedLeadKey || (extracted.email ? `email:${extracted.email}` : `phone:${extracted.phone}`);
    if (!key) continue;

    const existing = pesquisaByKey.get(key);
    if (existing) {
      existing.nome = preferDefined(existing.nome, extracted.nome);
      existing.email = preferDefined(existing.email, extracted.email);
      existing.phone = preferDefined(existing.phone, extracted.phone);
      existing.utm_source = preferDefined(existing.utm_source, extracted.utm_source);
      existing.utm_medium = preferDefined(existing.utm_medium, extracted.utm_medium);
      existing.utm_campaign = preferDefined(existing.utm_campaign, extracted.utm_campaign);
      existing.utm_term = preferDefined(existing.utm_term, extracted.utm_term);
      existing.matchedLeadKey = existing.matchedLeadKey || matchedLeadKey;
    } else {
      pesquisaByKey.set(key, {
        key,
        ...extracted,
        matchedLeadKey,
        answers: {},
      });
    }

    const target = pesquisaByKey.get(key);
    if (!target) continue;

    for (const questionKey of questionCandidates) {
      const value = normalizeText(row[questionKey]);
      if (!value) continue;
      target.answers[questionKey] = target.answers[questionKey] || value;
    }
  }

  const intersectionKeys = new Set<string>();
  for (const person of pesquisaByKey.values()) {
    if (person.matchedLeadKey) {
      intersectionKeys.add(person.matchedLeadKey);
    }
  }

  const matchedPeople: MatchedPersonRow[] = [];
  const questionCountByColumn = new Map<string, number>();

  for (const leadKey of intersectionKeys) {
    const lead = leadsByKey.get(leadKey);
    const pesquisa = pesquisaByKey.get(leadKey);
    if (!lead || !pesquisa) continue;

    const row: MatchedPersonRow = {
      key: leadKey,
      nome: preferDefined(lead.nome, pesquisa.nome),
      email: preferDefined(lead.email, pesquisa.email),
      telefone: preferDefined(lead.phone, pesquisa.phone),
      utm_source: preferDefined(lead.utm_source, pesquisa.utm_source) || DEFAULT_SOURCE,
      utm_medium: preferDefined(lead.utm_medium, pesquisa.utm_medium) || DEFAULT_MEDIUM,
      utm_campaign: preferDefined(lead.utm_campaign, pesquisa.utm_campaign) || DEFAULT_CAMPAIGN,
      utm_term: preferDefined(lead.utm_term, pesquisa.utm_term) || DEFAULT_TERM,
    };

    for (const [questionKey, value] of Object.entries(pesquisa.answers)) {
      row[questionKey] = value;
      if (value && value.trim() !== '') {
        questionCountByColumn.set(questionKey, (questionCountByColumn.get(questionKey) || 0) + 1);
      }
    }

    matchedPeople.push(row);
  }

  matchedPeople.sort((a, b) => {
    const nameA = normalizeText(a.nome || a.email || a.telefone || '');
    const nameB = normalizeText(b.nome || b.email || b.telefone || '');
    return nameA.localeCompare(nameB);
  });

  const questionColumns = Array.from(questionCountByColumn.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);

  const themeStats = new Map<string, { leads: number; responderam: number }>();
  const campaignStats = new Map<string, { leads: number; responderam: number }>();

  for (const lead of leadsByKey.values()) {
    const campaign = normalizeText(lead.utm_campaign) || DEFAULT_CAMPAIGN;
    const term = normalizeText(lead.utm_term) || DEFAULT_TERM;
    const theme = `${campaign} | ${term}`;
    const responded = intersectionKeys.has(lead.key);

    const themeEntry = themeStats.get(theme) || { leads: 0, responderam: 0 };
    themeEntry.leads += 1;
    if (responded) themeEntry.responderam += 1;
    themeStats.set(theme, themeEntry);

    const campaignEntry = campaignStats.get(campaign) || { leads: 0, responderam: 0 };
    campaignEntry.leads += 1;
    if (responded) campaignEntry.responderam += 1;
    campaignStats.set(campaign, campaignEntry);
  }

  const themeMetrics: ThemeMetric[] = Array.from(themeStats.entries())
    .map(([tema, stats]) => ({
      tema,
      leads: stats.leads,
      responderam: stats.responderam,
      taxa_resposta: percent(stats.responderam, stats.leads),
    }))
    .sort((a, b) => b.leads - a.leads);

  const campaignMetrics: CampaignMetric[] = Array.from(campaignStats.entries())
    .map(([utm_campaign, stats]) => ({
      utm_campaign,
      leads: stats.leads,
      responderam: stats.responderam,
      taxa_resposta: percent(stats.responderam, stats.leads),
    }))
    .sort((a, b) => {
      if (b.taxa_resposta !== a.taxa_resposta) {
        return b.taxa_resposta - a.taxa_resposta;
      }
      return b.leads - a.leads;
    });

  const profileMetrics: ProfileMetric[] = questionColumns
    .map((questionKey) => {
      const counts: Record<string, number> = {};
      let totalAnswers = 0;

      for (const person of matchedPeople) {
        const value = normalizeText(person[questionKey]);
        if (!value) continue;
        counts[value] = (counts[value] || 0) + 1;
        totalAnswers += 1;
      }

      const uniqueCount = Object.keys(counts).length;
      if (totalAnswers < 2 || uniqueCount < 2 || uniqueCount > 20) {
        return null;
      }

      const data = sortDescByCount(
        Object.entries(counts).map(([name, value]) => ({
          name,
          value,
          percentage: percent(value, totalAnswers),
        }))
      );

      return {
        fieldKey: questionKey,
        fieldLabel: formatSheetColumnLabel(questionKey),
        totalAnswers,
        data,
      };
    })
    .filter((metric): metric is ProfileMetric => metric !== null)
    .sort((a, b) => b.totalAnswers - a.totalAnswers)
    .slice(0, 4);

  const sourceCounts: Record<string, number> = {};
  for (const person of matchedPeople) {
    const source = normalizeText(person.utm_source) || DEFAULT_SOURCE;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }

  const sourceList = sortDescByCount(
    Object.entries(sourceCounts).map(([name, value]) => ({
      name,
      value,
      percentage: percent(value, matchedPeople.length),
    }))
  );

  const topSources = sourceList.slice(0, 8);
  const otherSources = sourceList.slice(8);
  const othersCount = otherSources.reduce((sum, item) => sum + item.value, 0);
  if (othersCount > 0) {
    topSources.push({
      name: 'Outros',
      value: othersCount,
      percentage: percent(othersCount, matchedPeople.length),
    });
  }

  const leadsUniqueCount = leadsByKey.size;
  const pesquisaUniqueCount = pesquisaByKey.size;
  const intersectionCount = intersectionKeys.size;
  const responseRate = percent(intersectionCount, leadsUniqueCount);

  return {
    leadsUniqueCount,
    pesquisaUniqueCount,
    intersectionCount,
    responseRate,
    nonResponseRate: Math.max(0, 100 - responseRate),
    matchedPeople,
    questionColumns,
    themeMetrics,
    campaignMetrics,
    profileMetrics,
    sourceMetrics: topSources,
  };
};
