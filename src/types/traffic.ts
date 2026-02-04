// Traffic Campaign Types

export interface TrafficCampaign {
  id: string;
  cliente_id?: string;
  lancamento_id?: string;
  nome: string;

  // Raw data inputs
  investimento: number;
  impressoes: number;
  cliques: number;
  page_views: number;
  checkouts: number;
  vendas: number;
  leads: number;
  valor_total: number;

  // Platform info
  plataforma: 'meta_ads' | 'google_ads' | 'tiktok' | 'outros';
  periodo_inicio: string;
  periodo_fim: string;

  // Metadata
  created_at: string;
  updated_at?: string;
  created_by?: string;

  // Joined relations (optional)
  cliente?: {
    id: string;
    nome: string;
  };
  lancamento?: {
    id: string;
    nome_lancamento: string;
  };
  colaborador?: {
    id: string;
    nome: string;
  };
}

export interface TrafficGoal {
  id: string;
  cliente_id?: string;
  meta_cpm?: number;
  meta_ctr?: number;
  meta_cpa?: number;
  meta_roi?: number;
  meta_conversao?: number;
  meta_vendas?: number;
  meta_leads?: number;
  periodo_tipo: 'diario' | 'semanal' | 'mensal';
  created_at: string;
  updated_at?: string;
}

export interface TrafficAlert {
  id: string;
  campaign_id: string;
  tipo: 'ctr_baixo' | 'cpa_alto' | 'roi_baixo' | 'meta_atingida' | 'conversao_baixa';
  mensagem: string;
  severidade: 'info' | 'warning' | 'error';
  lido: boolean;
  created_at: string;
}

export interface TrafficCampaignFormData {
  cliente_id: string;
  lancamento_id?: string;
  nome: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  page_views: number;
  checkouts: number;
  vendas: number;
  leads: number;
  valor_total: number;
  plataforma: string;
  periodo_inicio: string;
  periodo_fim: string;
}

export interface FunnelStageData {
  stageKey: string;
  label: string;
  value: number;
  previousValue: number;
  conversionRate: number;
  status: 'green' | 'yellow' | 'red';
  metrics: Record<string, number>;
}

export type PlataformaOption = {
  value: string;
  label: string;
};

export const PLATAFORMA_OPTIONS: PlataformaOption[] = [
  { value: 'meta_ads', label: 'Meta Ads (Facebook/Instagram)' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok Ads' },
  { value: 'outros', label: 'Outros' },
];
