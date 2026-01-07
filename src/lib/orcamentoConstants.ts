// Categorias de funil para orçamentos
export const CATEGORIAS_FUNIL = [
  {
    value: 'distribuicao_conteudo',
    label: 'Distribuição de conteúdo',
    descricao: 'Estratégia focada em distribuir conteúdo orgânico e pago para aumentar alcance e engajamento.',
    cor: '#3b82f6', // blue
    corBg: 'bg-blue-500',
    corText: 'text-blue-600'
  },
  {
    value: 'lancamento',
    label: 'Lançamento',
    descricao: 'Campanhas de lançamento de produtos/serviços com período definido e alta intensidade.',
    cor: '#10b981', // green
    corBg: 'bg-emerald-500',
    corText: 'text-emerald-600'
  },
  {
    value: 'perpetuo',
    label: 'Perpétuo',
    descricao: 'Funil sempre ativo, gerando leads e vendas de forma contínua.',
    cor: '#f59e0b', // amber
    corBg: 'bg-amber-500',
    corText: 'text-amber-600'
  },
  {
    value: 'evento_presencial',
    label: 'Evento presencial',
    descricao: 'Investimento em eventos presenciais, workshops e encontros.',
    cor: '#ef4444', // red
    corBg: 'bg-red-500',
    corText: 'text-red-600'
  },
  {
    value: 'high_ticket',
    label: 'High ticket',
    descricao: 'Estratégia para vendas de alto valor com funil de qualificação.',
    cor: '#8b5cf6', // purple
    corBg: 'bg-violet-500',
    corText: 'text-violet-600'
  }
];

export const STATUS_ORCAMENTO = [
  { value: 'ativo', label: 'Ativo', color: 'bg-green-500' },
  { value: 'pausado', label: 'Pausado', color: 'bg-yellow-500' },
  { value: 'concluido', label: 'Concluído', color: 'bg-blue-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' }
];

export const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export const CORES_CATEGORIAS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
];

export const getCategoriaLabel = (value: string) => {
  return CATEGORIAS_FUNIL.find(c => c.value === value)?.label || value;
};

export const getCategoriaDescricao = (value: string) => {
  return CATEGORIAS_FUNIL.find(c => c.value === value)?.descricao || '';
};

export const getCategoriaCor = (value: string) => {
  return CATEGORIAS_FUNIL.find(c => c.value === value)?.cor || '#6b7280';
};

export const getCategoriaCorBg = (value: string) => {
  return CATEGORIAS_FUNIL.find(c => c.value === value)?.corBg || 'bg-gray-500';
};

export const getCategoriaCorText = (value: string) => {
  return CATEGORIAS_FUNIL.find(c => c.value === value)?.corText || 'text-gray-600';
};
