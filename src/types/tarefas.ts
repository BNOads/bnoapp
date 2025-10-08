// Tipos temporários até que o Supabase regenere os types.ts
export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  cliente_id?: string;
  responsavel_id?: string;
  data_vencimento: string;
  prioridade: 'copa_mundo' | 'libertadores' | 'brasileirao';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'adiada';
  recorrencia: 'diaria' | 'semanal' | 'mensal' | 'personalizada' | 'nenhuma';
  recorrencia_config?: any;
  concluida_em?: string;
  concluida_por?: string;
  created_at: string;
  updated_at: string;
  eh_tarefa_bnoapp: boolean;
  cliente?: { nome: string };
  responsavel?: { nome: string; avatar_url?: string };
  subtarefas?: Subtarefa[];
}

export interface Subtarefa {
  id: string;
  tarefa_id: string;
  titulo: string;
  concluida: boolean;
  ordem: number;
  created_at: string;
}

export interface ComentarioTarefa {
  id: string;
  tarefa_id: string;
  autor_id: string;
  conteudo: string;
  created_at: string;
  updated_at: string;
  autor?: { nome: string; avatar_url?: string };
}

export interface AnexoTarefa {
  id: string;
  tarefa_id?: string;
  comentario_id?: string;
  nome_arquivo: string;
  url_arquivo: string;
  tipo_arquivo?: string;
  tamanho_bytes?: number;
  uploaded_by: string;
  created_at: string;
}
