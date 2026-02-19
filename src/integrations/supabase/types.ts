export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      acessos_logins: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          created_by: string
          id: string
          link_acesso: string | null
          login_usuario: string | null
          nome_acesso: string
          notas_adicionais: string | null
          senha_criptografada: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          created_by: string
          id?: string
          link_acesso?: string | null
          login_usuario?: string | null
          nome_acesso: string
          notas_adicionais?: string | null
          senha_criptografada?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string
          id?: string
          link_acesso?: string | null
          login_usuario?: string | null
          nome_acesso?: string
          notas_adicionais?: string | null
          senha_criptografada?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          data: Json | null
          first_seen_at: string
          id: string
          lancamento_id: string | null
          last_seen_at: string
          message: string
          rule: string
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          first_seen_at?: string
          id?: string
          lancamento_id?: string | null
          last_seen_at?: string
          message: string
          rule: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          first_seen_at?: string
          id?: string
          lancamento_id?: string | null
          last_seen_at?: string
          message?: string
          rule?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      anexos_tarefas: {
        Row: {
          created_at: string
          id: string
          nome_arquivo: string
          tamanho_arquivo: number | null
          tarefa_id: string
          tipo_arquivo: string | null
          uploaded_by: string
          url_arquivo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho_arquivo?: number | null
          tarefa_id: string
          tipo_arquivo?: string | null
          uploaded_by: string
          url_arquivo: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho_arquivo?: number | null
          tarefa_id?: string
          tipo_arquivo?: string | null
          uploaded_by?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_tarefas_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_tarefas_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivo_reuniao: {
        Row: {
          ano: number
          atualizado_em: string | null
          atualizado_por: string | null
          clientes_relacionados: Json | null
          conteudo: Json
          criado_em: string | null
          criado_por: string | null
          id: string
        }
        Insert: {
          ano: number
          atualizado_em?: string | null
          atualizado_por?: string | null
          clientes_relacionados?: Json | null
          conteudo?: Json
          criado_em?: string | null
          criado_por?: string | null
          id?: string
        }
        Update: {
          ano?: number
          atualizado_em?: string | null
          atualizado_por?: string | null
          clientes_relacionados?: Json | null
          conteudo?: Json
          criado_em?: string | null
          criado_por?: string | null
          id?: string
        }
        Relationships: []
      }
      arquivo_reuniao_backup: {
        Row: {
          ano: number
          conteudo: Json
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          id: string
        }
        Insert: {
          ano: number
          conteudo: Json
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
        }
        Update: {
          ano?: number
          conteudo?: Json
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
        }
        Relationships: []
      }
      arquivo_reuniao_colaboracao: {
        Row: {
          arquivo_id: string
          atualizado_em: string | null
          atualizado_por: string | null
          conteudo_json: Json | null
          conteudo_yjs: string | null
          created_at: string | null
          id: string
          versao: number | null
        }
        Insert: {
          arquivo_id: string
          atualizado_em?: string | null
          atualizado_por?: string | null
          conteudo_json?: Json | null
          conteudo_yjs?: string | null
          created_at?: string | null
          id?: string
          versao?: number | null
        }
        Update: {
          arquivo_id?: string
          atualizado_em?: string | null
          atualizado_por?: string | null
          conteudo_json?: Json | null
          conteudo_yjs?: string | null
          created_at?: string | null
          id?: string
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivo_reuniao_colaboracao_arquivo_id_fkey"
            columns: ["arquivo_id"]
            isOneToOne: true
            referencedRelation: "arquivo_reuniao"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivo_reuniao_historico: {
        Row: {
          arquivo_id: string
          autor: string
          autor_nome: string
          conteudo: Json
          created_at: string
          data_hora: string
          id: string
          observacoes: string | null
          tipo: string
          versao: number
        }
        Insert: {
          arquivo_id: string
          autor: string
          autor_nome: string
          conteudo: Json
          created_at?: string
          data_hora?: string
          id?: string
          observacoes?: string | null
          tipo: string
          versao: number
        }
        Update: {
          arquivo_id?: string
          autor?: string
          autor_nome?: string
          conteudo?: Json
          created_at?: string
          data_hora?: string
          id?: string
          observacoes?: string | null
          tipo?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "arquivo_reuniao_historico_arquivo_id_fkey"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "arquivo_reuniao"
            referencedColumns: ["id"]
          },
        ]
      }
      assistente_conversas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          titulo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          titulo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          titulo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistente_mensagens: {
        Row: {
          content: string
          conversa_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversa_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversa_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistente_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "assistente_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_dados_sensíveis: {
        Row: {
          acao: string
          campos_acessados: string[] | null
          colaborador_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          motivo: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acao: string
          campos_acessados?: string[] | null
          colaborador_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          motivo?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acao?: string
          campos_acessados?: string[] | null
          colaborador_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          motivo?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_dados_sensíveis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          duracao: number | null
          id: string
          ordem: number
          tipo_conteudo: string | null
          titulo: string
          treinamento_id: string
          updated_at: string
          url_youtube: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao?: number | null
          id?: string
          ordem?: number
          tipo_conteudo?: string | null
          titulo: string
          treinamento_id: string
          updated_at?: string
          url_youtube?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao?: number | null
          id?: string
          ordem?: number
          tipo_conteudo?: string | null
          titulo?: string
          treinamento_id?: string
          updated_at?: string
          url_youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          ativo: boolean
          canais: Json | null
          conteudo: string
          created_at: string
          created_by: string
          data_fim: string | null
          data_inicio: string | null
          destinatarios: string[] | null
          id: string
          prioridade: string
          recorrencia_intervalo: number | null
          recorrencia_tipo: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          canais?: Json | null
          conteudo: string
          created_at?: string
          created_by: string
          data_fim?: string | null
          data_inicio?: string | null
          destinatarios?: string[] | null
          id?: string
          prioridade?: string
          recorrencia_intervalo?: number | null
          recorrencia_tipo?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          canais?: Json | null
          conteudo?: string
          created_at?: string
          created_by?: string
          data_fim?: string | null
          data_inicio?: string | null
          destinatarios?: string[] | null
          id?: string
          prioridade?: string
          recorrencia_intervalo?: number | null
          recorrencia_tipo?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      avisos_leitura: {
        Row: {
          aviso_id: string
          id: string
          lido_em: string
          user_id: string
        }
        Insert: {
          aviso_id: string
          id?: string
          lido_em?: string
          user_id: string
        }
        Update: {
          aviso_id?: string
          id?: string
          lido_em?: string
          user_id?: string
        }
        Relationships: []
      }
      benchmarks_funil: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          label: string
          unidade: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          label: string
          unidade: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          label?: string
          unidade?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      campaign_stage_mappings: {
        Row: {
          campaign_name: string
          cliente_id: string | null
          created_at: string
          id: string
          stage: string
          updated_at: string
        }
        Insert: {
          campaign_name: string
          cliente_id?: string | null
          created_at?: string
          id?: string
          stage: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          cliente_id?: string | null
          created_at?: string
          id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stage_mappings_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_criativos: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          created_by: string
          funil: string
          id: string
          progresso_percentual: number | null
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          created_by: string
          funil: string
          id?: string
          progresso_percentual?: number | null
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          created_by?: string
          funil?: string
          id?: string
          progresso_percentual?: number | null
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_criativos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_criativos_itens: {
        Row: {
          checklist_id: string
          concluido: boolean
          created_at: string
          especificacoes: string | null
          formato: string | null
          id: string
          ordem: number
          referencias: Json | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          concluido?: boolean
          created_at?: string
          especificacoes?: string | null
          formato?: string | null
          id?: string
          ordem?: number
          referencias?: Json | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          concluido?: boolean
          created_at?: string
          especificacoes?: string | null
          formato?: string | null
          id?: string
          ordem?: number
          referencias?: Json | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_criativos_itens_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklist_criativos"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_config: {
        Row: {
          clickup_api_key: string
          clickup_team_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clickup_api_key: string
          clickup_team_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clickup_api_key?: string
          clickup_team_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clickup_user_mappings: {
        Row: {
          clickup_api_key: string | null
          clickup_email: string
          clickup_profile_picture: string | null
          clickup_team_id: string
          clickup_user_id: string
          clickup_username: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clickup_api_key?: string | null
          clickup_email: string
          clickup_profile_picture?: string | null
          clickup_team_id: string
          clickup_user_id: string
          clickup_username: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clickup_api_key?: string | null
          clickup_email?: string
          clickup_profile_picture?: string | null
          clickup_team_id?: string
          clickup_user_id?: string
          clickup_username?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_budget_plan: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          planned_budget: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          planned_budget: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          planned_budget?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_budget_plan_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ad_account_id: string | null
          avatar_url: string | null
          cliente_desde: string | null
          cnpj_cpf: string | null
          clickup_folder_id: string | null
          created_at: string
          email_contato: string | null
          empresa: string
          funil_tipo: string
          gestor_trafego_id: string | null
          id: string
          nome_responsavel: string | null
          segmento_mercado: string | null
          slug: string | null
          status: string
          telefone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ad_account_id?: string | null
          avatar_url?: string | null
          cliente_desde?: string | null
          cnpj_cpf?: string | null
          clickup_folder_id?: string | null
          created_at?: string
          email_contato?: string | null
          empresa: string
          funil_tipo?: string
          gestor_trafego_id?: string | null
          id?: string
          nome_responsavel?: string | null
          segmento_mercado?: string | null
          slug?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ad_account_id?: string | null
          avatar_url?: string | null
          cliente_desde?: string | null
          cnpj_cpf?: string | null
          clickup_folder_id?: string | null
          created_at?: string
          email_contato?: string | null
          empresa?: string
          funil_tipo?: string
          gestor_trafego_id?: string | null
          id?: string
          nome_responsavel?: string | null
          segmento_mercado?: string | null
          slug?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_gestor_trafego_id_fkey"
            columns: ["gestor_trafego_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          active: boolean
          avatar_url: string | null
          cargo: string
          created_at: string
          email: string
          funcao: string
          habilidades: string[] | null
          id: string
          linkedin: string | null
          nome: string
          role: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          cargo: string
          created_at?: string
          email: string
          funcao: string
          habilidades?: string[] | null
          id?: string
          linkedin?: string | null
          nome: string
          role?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          cargo?: string
          created_at?: string
          email?: string
          funcao?: string
          habilidades?: string[] | null
          id?: string
          linkedin?: string | null
          nome?: string
          role?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          cliente_id: string | null
          setor: string | null
          concluida_por: string | null
          created_at: string
          created_by: string
          data_conclusao: string | null
          data_vencimento: string | null
          descricao: string | null
          eh_tarefa_bnoapp: boolean
          id: string
          prioridade: Database["public"]["Enums"]["prioridade_tarefa"]
          recorrencia: Database["public"]["Enums"]["recorrencia_tarefa"] | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          setor?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by: string
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          eh_tarefa_bnoapp?: boolean
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          recorrencia?: Database["public"]["Enums"]["recorrencia_tarefa"] | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          setor?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          eh_tarefa_bnoapp?: boolean
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          recorrencia?: Database["public"]["Enums"]["recorrencia_tarefa"] | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_severity: "info" | "warning" | "error" | "critical"
      alert_status: "active" | "acknowledged" | "resolved" | "ignored"
      prioridade_tarefa: "copa_mundo" | "libertadores" | "brasileirao"
      recorrencia_tarefa: "diaria" | "semanal" | "quinzenal" | "mensal"
      status_tarefa: "pendente" | "em_andamento" | "concluida" | "adiada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
