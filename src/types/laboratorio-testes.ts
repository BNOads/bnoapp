// Enum types matching database enums
export type StatusTesteLab = 'planejado' | 'rodando' | 'pausado' | 'concluido' | 'cancelado';
export type ValidacaoTesteLab = 'em_teste' | 'deu_bom' | 'deu_ruim' | 'inconclusivo';
export type TipoTesteLab = 'criativo' | 'publico' | 'estrategia' | 'pagina' | 'oferta' | 'evento';
export type CanalTesteLab = 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'youtube' | 'outro';
export type MetricaPrincipalLab = 'ctr' | 'cpl' | 'cpa' | 'roas' | 'conversao_lp';

export interface TesteLaboratorio {
  id: string;
  cliente_id?: string;
  funil?: string;
  nome: string;
  gestor_responsavel_id: string;
  tipo_teste: TipoTesteLab;
  canal: CanalTesteLab;
  status: StatusTesteLab;
  data_inicio?: string;
  data_fim?: string;
  validacao: ValidacaoTesteLab;
  metrica_principal?: MetricaPrincipalLab;
  meta_metrica?: number;
  resultado_observado?: number;
  hipotese?: string;
  o_que_foi_alterado?: string;
  observacao_equipe?: string;
  anotacoes?: string;
  aprendizados?: string;
  proximos_testes_sugeridos?: string;
  link_anuncio?: string;
  link_campanha?: string;
  link_experimento?: string;
  template_id?: string;
  arquivado: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  cliente?: { id: string; nome: string };
  gestor?: { id: string; user_id: string; nome: string; avatar_url?: string };
  evidencias_count?: number;
}

export interface TesteEvidencia {
  id: string;
  teste_id: string;
  tipo: 'imagem' | 'link';
  url: string;
  descricao?: string;
  uploaded_by: string;
  created_at: string;
}

export interface TesteComentario {
  id: string;
  teste_id: string;
  autor_user_id: string;
  comentario: string;
  created_at: string;
  autor?: { nome: string; avatar_url?: string };
}

export interface TesteAuditLog {
  id: string;
  teste_id: string;
  acao: string;
  campo_alterado?: string;
  valor_anterior?: string;
  valor_novo?: string;
  user_id: string;
  created_at: string;
  usuario?: { nome: string };
}

export interface TesteTemplate {
  id: string;
  nome: string;
  tipo_teste: TipoTesteLab;
  canal?: CanalTesteLab;
  hipotese?: string;
  metrica_principal?: MetricaPrincipalLab;
  meta_metrica?: number;
  checklist: { item: string; checked: boolean }[];
  created_by: string;
  created_at: string;
  updated_at: string;
  ativo: boolean;
}

export interface TesteFormData {
  cliente_id: string;
  funil: string;
  nome: string;
  gestor_responsavel_id: string;
  tipo_teste: TipoTesteLab;
  canal: CanalTesteLab;
  status: StatusTesteLab;
  data_inicio: string;
  data_fim: string;
  metrica_principal: MetricaPrincipalLab | '';
  meta_metrica: string;
  resultado_observado: string;
  hipotese: string;
  o_que_foi_alterado: string;
  observacao_equipe: string;
  anotacoes: string;
  aprendizados: string;
  proximos_testes_sugeridos: string;
  link_anuncio: string;
  link_campanha: string;
  link_experimento: string;
}

export interface TesteFilters {
  search: string;
  cliente_id: string;
  funil: string;
  gestor_id: string;
  tipo_teste: TipoTesteLab | '';
  canal: CanalTesteLab | '';
  status: StatusTesteLab | '';
  validacao: ValidacaoTesteLab | '';
  data_inicio: string;
  data_fim: string;
  quick_filter: 'todos' | 'meus' | 'time' | 'vencedores';
  show_archived: boolean;
}

export const DEFAULT_FILTERS: TesteFilters = {
  search: '',
  cliente_id: '',
  funil: '',
  gestor_id: '',
  tipo_teste: '',
  canal: '',
  status: '',
  validacao: '',
  data_inicio: '',
  data_fim: '',
  quick_filter: 'todos',
  show_archived: false,
};

export const DEFAULT_FORM_DATA: TesteFormData = {
  cliente_id: '',
  funil: '',
  nome: '',
  gestor_responsavel_id: '',
  tipo_teste: 'criativo',
  canal: 'meta_ads',
  status: 'planejado',
  data_inicio: '',
  data_fim: '',
  metrica_principal: '',
  meta_metrica: '',
  resultado_observado: '',
  hipotese: '',
  o_que_foi_alterado: '',
  observacao_equipe: '',
  anotacoes: '',
  aprendizados: '',
  proximos_testes_sugeridos: '',
  link_anuncio: '',
  link_campanha: '',
  link_experimento: '',
};

// Label mappings
export const STATUS_LABELS: Record<StatusTesteLab, string> = {
  planejado: 'Planejado',
  rodando: 'Rodando',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const STATUS_COLORS: Record<StatusTesteLab, string> = {
  planejado: 'bg-slate-100 text-slate-700 border-slate-200',
  rodando: 'bg-emerald-100 text-emerald-700 border-emerald-300 badge-rodando',
  pausado: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  concluido: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
};

export const VALIDACAO_LABELS: Record<ValidacaoTesteLab, string> = {
  em_teste: 'Em Teste',
  deu_bom: 'Deu Bom',
  deu_ruim: 'Deu Ruim',
  inconclusivo: 'Inconclusivo',
};

export const VALIDACAO_COLORS: Record<ValidacaoTesteLab, string> = {
  em_teste: 'bg-blue-100 text-blue-700 border-blue-200',
  deu_bom: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  deu_ruim: 'bg-red-100 text-red-700 border-red-200',
  inconclusivo: 'bg-orange-100 text-orange-700 border-orange-200',
};

export const TIPO_LABELS: Record<TipoTesteLab, string> = {
  criativo: 'Criativo',
  publico: 'Público',
  estrategia: 'Estratégia',
  pagina: 'Página',
  oferta: 'Oferta',
  evento: 'Evento',
};

export const CANAL_LABELS: Record<CanalTesteLab, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok_ads: 'TikTok Ads',
  youtube: 'YouTube',
  outro: 'Outro',
};

export const METRICA_LABELS: Record<MetricaPrincipalLab, string> = {
  ctr: 'CTR',
  cpl: 'CPL',
  cpa: 'CPA',
  roas: 'ROAS',
  conversao_lp: 'Conversão LP',
};
