export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      auditoria_dados_sensíveis: {
        Row: {
          acao: string
          campos_acessados: string[] | null
          colaborador_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      clientes: {
        Row: {
          aliases: string[] | null
          ativo: boolean
          auto_permission: boolean | null
          categoria: Database["public"]["Enums"]["categoria_cliente"]
          created_at: string
          created_by: string | null
          cs_id: string | null
          dashboards_looker: Json | null
          data_inicio: string | null
          drive_folder_id: string | null
          drive_sync_error: string | null
          etapa_atual: string | null
          funis_trabalhando: string[] | null
          id: string
          last_drive_sync: string | null
          link_painel: string | null
          nicho: string | null
          nome: string
          observacoes: string | null
          pasta_drive_url: string | null
          progresso_etapa: number | null
          status_cliente: string | null
          total_acessos: number | null
          traffic_manager_id: string | null
          ultimo_acesso: string | null
          updated_at: string
          whatsapp_grupo_url: string | null
        }
        Insert: {
          aliases?: string[] | null
          ativo?: boolean
          auto_permission?: boolean | null
          categoria: Database["public"]["Enums"]["categoria_cliente"]
          created_at?: string
          created_by?: string | null
          cs_id?: string | null
          dashboards_looker?: Json | null
          data_inicio?: string | null
          drive_folder_id?: string | null
          drive_sync_error?: string | null
          etapa_atual?: string | null
          funis_trabalhando?: string[] | null
          id?: string
          last_drive_sync?: string | null
          link_painel?: string | null
          nicho?: string | null
          nome: string
          observacoes?: string | null
          pasta_drive_url?: string | null
          progresso_etapa?: number | null
          status_cliente?: string | null
          total_acessos?: number | null
          traffic_manager_id?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          whatsapp_grupo_url?: string | null
        }
        Update: {
          aliases?: string[] | null
          ativo?: boolean
          auto_permission?: boolean | null
          categoria?: Database["public"]["Enums"]["categoria_cliente"]
          created_at?: string
          created_by?: string | null
          cs_id?: string | null
          dashboards_looker?: Json | null
          data_inicio?: string | null
          drive_folder_id?: string | null
          drive_sync_error?: string | null
          etapa_atual?: string | null
          funis_trabalhando?: string[] | null
          id?: string
          last_drive_sync?: string | null
          link_painel?: string | null
          nicho?: string | null
          nome?: string
          observacoes?: string | null
          pasta_drive_url?: string | null
          progresso_etapa?: number | null
          status_cliente?: string | null
          total_acessos?: number | null
          traffic_manager_id?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          whatsapp_grupo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_cs_id_fkey"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_traffic_manager_id_fkey"
            columns: ["traffic_manager_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clientes_cs"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clientes_traffic_manager"
            columns: ["traffic_manager_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_layout: {
        Row: {
          ativo: boolean
          cliente_id: string
          configuracoes: Json | null
          cor_acento: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          fonte: string | null
          id: string
          logo_url: string | null
          tema: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          configuracoes?: Json | null
          cor_acento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          fonte?: string | null
          id?: string
          logo_url?: string | null
          tema?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          configuracoes?: Json | null
          cor_acento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          fonte?: string | null
          id?: string
          logo_url?: string | null
          tema?: string
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          email: string
          estado_civil: Database["public"]["Enums"]["estado_civil"] | null
          id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          progresso_treinamentos: Json | null
          tamanho_camisa: string | null
          tempo_plataforma: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          email: string
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          progresso_treinamentos?: Json | null
          tamanho_camisa?: string | null
          tempo_plataforma?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome?: string
          progresso_treinamentos?: Json | null
          tamanho_camisa?: string | null
          tempo_plataforma?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      colaboradores_dados_sensíveis: {
        Row: {
          cnpj: string | null
          colaborador_id: string
          conta_bancaria: string | null
          cpf: string | null
          created_at: string
          endereco: string | null
          id: string
          pix: string | null
          razao_social: string | null
          rg: string | null
          telefone_contato: string | null
          telefone_proximo: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          colaborador_id: string
          conta_bancaria?: string | null
          cpf?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          pix?: string | null
          razao_social?: string | null
          rg?: string | null
          telefone_contato?: string | null
          telefone_proximo?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          colaborador_id?: string
          conta_bancaria?: string | null
          cpf?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          pix?: string | null
          razao_social?: string | null
          rg?: string | null
          telefone_contato?: string | null
          telefone_proximo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_dados_sensíveis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      conquistas: {
        Row: {
          ativo: boolean
          condicao: Json
          cor: string | null
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          pontos_bonus: number | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          condicao: Json
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          pontos_bonus?: number | null
          tipo: string
        }
        Update: {
          ativo?: boolean
          condicao?: Json
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          pontos_bonus?: number | null
          tipo?: string
        }
        Relationships: []
      }
      creatives: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          archived: boolean | null
          client_id: string
          created_at: string
          file_id: string
          file_size: number | null
          folder_name: string | null
          folder_path: string | null
          icon_link: string | null
          id: string
          is_active: boolean | null
          link_direct: string | null
          link_web_view: string | null
          mime_type: string | null
          modified_time: string | null
          name: string
          parent_folder_id: string | null
          thumbnail_link: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          archived?: boolean | null
          client_id: string
          created_at?: string
          file_id: string
          file_size?: number | null
          folder_name?: string | null
          folder_path?: string | null
          icon_link?: string | null
          id?: string
          is_active?: boolean | null
          link_direct?: string | null
          link_web_view?: string | null
          mime_type?: string | null
          modified_time?: string | null
          name: string
          parent_folder_id?: string | null
          thumbnail_link?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          archived?: boolean | null
          client_id?: string
          created_at?: string
          file_id?: string
          file_size?: number | null
          folder_name?: string | null
          folder_path?: string | null
          icon_link?: string | null
          id?: string
          is_active?: boolean | null
          link_direct?: string | null
          link_web_view?: string | null
          mime_type?: string | null
          modified_time?: string | null
          name?: string
          parent_folder_id?: string | null
          thumbnail_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      criativos: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          link_externo: string
          nome: string
          tags: string[] | null
          tipo_criativo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          link_externo: string
          nome: string
          tags?: string[] | null
          tipo_criativo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          link_externo?: string
          nome?: string
          tags?: string[] | null
          tipo_criativo?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          cliente_id: string | null
          conteudo: string | null
          created_at: string
          created_by: string
          id: string
          tipo: string
          titulo: string
          updated_at: string
          url_arquivo: string | null
          versao: number | null
        }
        Insert: {
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string
          created_by: string
          id?: string
          tipo: string
          titulo: string
          updated_at?: string
          url_arquivo?: string | null
          versao?: number | null
        }
        Update: {
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string
          created_by?: string
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          url_arquivo?: string | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      gravacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string
          descricao: string | null
          duracao: number | null
          id: string
          reuniao_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          titulo: string
          updated_at: string
          url_gravacao: string
          visualizacoes: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          reuniao_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          titulo: string
          updated_at?: string
          url_gravacao: string
          visualizacoes?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          reuniao_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          titulo?: string
          updated_at?: string
          url_gravacao?: string
          visualizacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gravacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gravacoes_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      interacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string
          data_interacao: string
          descricao: string | null
          documento_id: string | null
          gravacao_id: string | null
          id: string
          metadados: Json | null
          reuniao_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by: string
          data_interacao?: string
          descricao?: string | null
          documento_id?: string | null
          gravacao_id?: string | null
          id?: string
          metadados?: Json | null
          reuniao_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          data_interacao?: string
          descricao?: string | null
          documento_id?: string | null
          gravacao_id?: string | null
          id?: string
          metadados?: Json | null
          reuniao_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_gravacao_id_fkey"
            columns: ["gravacao_id"]
            isOneToOne: false
            referencedRelation: "gravacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      links_importantes: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string
          id: string
          tipo: string
          titulo: string
          updated_at: string
          url: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by: string
          id?: string
          tipo?: string
          titulo: string
          updated_at?: string
          url: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_importantes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_estudo: {
        Row: {
          aula_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          pontos_ganhos: number
          tempo_estudado: number
          tipo_atividade: string
          treinamento_id: string | null
          user_id: string
        }
        Insert: {
          aula_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          pontos_ganhos?: number
          tempo_estudado?: number
          tipo_atividade?: string
          treinamento_id?: string | null
          user_id: string
        }
        Update: {
          aula_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          pontos_ganhos?: number
          tempo_estudado?: number
          tipo_atividade?: string
          treinamento_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      master_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      pdi_aulas: {
        Row: {
          aula_id: string
          concluida: boolean
          created_at: string
          data_conclusao: string | null
          id: string
          pdi_id: string
        }
        Insert: {
          aula_id: string
          concluida?: boolean
          created_at?: string
          data_conclusao?: string | null
          id?: string
          pdi_id: string
        }
        Update: {
          aula_id?: string
          concluida?: boolean
          created_at?: string
          data_conclusao?: string | null
          id?: string
          pdi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_aulas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_aulas_pdi_id_fkey"
            columns: ["pdi_id"]
            isOneToOne: false
            referencedRelation: "pdis"
            referencedColumns: ["id"]
          },
        ]
      }
      pdis: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string
          data_limite: string
          descricao: string | null
          id: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by: string
          data_limite: string
          descricao?: string | null
          id?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string
          data_limite?: string
          descricao?: string | null
          id?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_dados_sensíveis: {
        Row: {
          ativo: boolean
          campos_permitidos: string[] | null
          concedido_por: string | null
          created_at: string
          id: string
          motivo: string | null
          tipo_acesso: Database["public"]["Enums"]["tipo_acesso_dados"]
          user_id: string
          valido_ate: string | null
        }
        Insert: {
          ativo?: boolean
          campos_permitidos?: string[] | null
          concedido_por?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          tipo_acesso?: Database["public"]["Enums"]["tipo_acesso_dados"]
          user_id: string
          valido_ate?: string | null
        }
        Update: {
          ativo?: boolean
          campos_permitidos?: string[] | null
          concedido_por?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          tipo_acesso?: Database["public"]["Enums"]["tipo_acesso_dados"]
          user_id?: string
          valido_ate?: string | null
        }
        Relationships: []
      }
      presencas_reunioes: {
        Row: {
          created_at: string
          horario_entrada: string | null
          horario_saida: string | null
          id: string
          pontos_ganhos: number
          reuniao_id: string
          status: string
          tempo_presenca: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          pontos_ganhos?: number
          reuniao_id: string
          status?: string
          tempo_presenca?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          pontos_ganhos?: number
          reuniao_id?: string
          status?: string
          tempo_presenca?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progresso_aulas: {
        Row: {
          aula_id: string
          concluido: boolean
          created_at: string
          id: string
          tempo_assistido: number | null
          treinamento_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aula_id: string
          concluido?: boolean
          created_at?: string
          id?: string
          tempo_assistido?: number | null
          treinamento_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aula_id?: string
          concluido?: boolean
          created_at?: string
          id?: string
          tempo_assistido?: number | null
          treinamento_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progresso_aulas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_aulas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      rankings: {
        Row: {
          created_at: string
          data_referencia: string
          id: string
          periodo: string
          pontos_estudo: number
          pontos_reunioes: number
          pontos_totais: number
          posicao: number | null
          reunioes_participadas: number
          streak_estudo: number
          tempo_estudo_total: number
          tempo_reunioes_total: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_referencia: string
          id?: string
          periodo: string
          pontos_estudo?: number
          pontos_reunioes?: number
          pontos_totais?: number
          posicao?: number | null
          reunioes_participadas?: number
          streak_estudo?: number
          tempo_estudo_total?: number
          tempo_reunioes_total?: number
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_referencia?: string
          id?: string
          periodo?: string
          pontos_estudo?: number
          pontos_reunioes?: number
          pontos_totais?: number
          posicao?: number | null
          reunioes_participadas?: number
          streak_estudo?: number
          tempo_estudo_total?: number
          tempo_reunioes_total?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reunioes: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string
          data_hora: string
          descricao: string | null
          duracao: number | null
          id: string
          link_gravacao: string | null
          link_meet: string | null
          participantes: string[] | null
          resumo_ia: string | null
          status: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by: string
          data_hora: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          link_gravacao?: string | null
          link_meet?: string | null
          participantes?: string[] | null
          resumo_ia?: string | null
          status?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          data_hora?: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          link_gravacao?: string | null
          link_meet?: string | null
          participantes?: string[] | null
          resumo_ia?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes_agendadas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_hora: string
          descricao: string | null
          duracao_prevista: number | null
          id: string
          link_meet: string | null
          organizador_id: string
          participantes_obrigatorios: string[] | null
          participantes_opcionais: string[] | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_hora: string
          descricao?: string | null
          duracao_prevista?: number | null
          id?: string
          link_meet?: string | null
          organizador_id: string
          participantes_obrigatorios?: string[] | null
          participantes_opcionais?: string[] | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_hora?: string
          descricao?: string | null
          duracao_prevista?: number | null
          id?: string
          link_meet?: string | null
          organizador_id?: string
          participantes_obrigatorios?: string[] | null
          participantes_opcionais?: string[] | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      slack_webhooks: {
        Row: {
          ativo: boolean
          canal: string | null
          created_at: string
          id: string
          nome: string
          tipos_aviso: string[] | null
          webhook_url: string
        }
        Insert: {
          ativo?: boolean
          canal?: string | null
          created_at?: string
          id?: string
          nome: string
          tipos_aviso?: string[] | null
          webhook_url: string
        }
        Update: {
          ativo?: boolean
          canal?: string | null
          created_at?: string
          id?: string
          nome?: string
          tipos_aviso?: string[] | null
          webhook_url?: string
        }
        Relationships: []
      }
      streaks_estudo: {
        Row: {
          created_at: string
          id: string
          streak_atual: number
          streak_maximo: number
          ultima_atividade: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          streak_atual?: number
          streak_maximo?: number
          ultima_atividade?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          streak_atual?: number
          streak_maximo?: number
          ultima_atividade?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          atribuido_para: string | null
          cliente_id: string | null
          created_at: string
          created_by: string
          data_vencimento: string | null
          descricao: string | null
          id: string
          prioridade: string
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          atribuido_para?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by: string
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          atribuido_para?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          created_by: string | null
          descricao: string | null
          duracao: number | null
          id: string
          nivel: string
          tags: string[] | null
          thumbnail_url: string | null
          tipo: string
          titulo: string
          updated_at: string
          url_conteudo: string | null
          visualizacoes: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao?: number | null
          id?: string
          nivel?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          url_conteudo?: string | null
          visualizacoes?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao?: number | null
          id?: string
          nivel?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          url_conteudo?: string | null
          visualizacoes?: number | null
        }
        Relationships: []
      }
      uploads_clientes: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          nome_arquivo: string
          tamanho_arquivo: number | null
          tipo_arquivo: string | null
          uploaded_by: string | null
          url_drive: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho_arquivo?: number | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
          url_drive?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho_arquivo?: number | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
          url_drive?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_conquistas: {
        Row: {
          conquista_id: string
          data_obtencao: string
          id: string
          pontos_ganhos: number
          user_id: string
        }
        Insert: {
          conquista_id: string
          data_obtencao?: string
          id?: string
          pontos_ganhos?: number
          user_id: string
        }
        Update: {
          conquista_id?: string
          data_obtencao?: string
          id?: string
          pontos_ganhos?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_admin_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      get_colaborador_dados_sensíveis: {
        Args: { _colaborador_id: string; _motivo?: string }
        Returns: {
          cnpj: string
          conta_bancaria: string
          cpf: string
          endereco: string
          pix: string
          razao_social: string
          rg: string
          telefone_contato: string
          telefone_proximo: string
        }[]
      }
      grant_master_access_to_email: {
        Args: { _email: string }
        Returns: undefined
      }
      has_sensitive_data_permission: {
        Args: {
          _permission_type: Database["public"]["Enums"]["tipo_acesso_dados"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_with_valid_reason: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_profile_owner: {
        Args: { _profile_user_id: string; _user_id: string }
        Returns: boolean
      }
      update_creative_status: {
        Args: { creative_id: string; new_status: boolean }
        Returns: Json
      }
    }
    Enums: {
      categoria_cliente: "negocio_local" | "infoproduto"
      estado_civil:
        | "solteiro"
        | "casado"
        | "divorciado"
        | "viuvo"
        | "uniao_estavel"
      nivel_acesso: "admin" | "gestor_trafego" | "cs" | "designer"
      tipo_acesso_dados:
        | "leitura_propria"
        | "leitura_limitada"
        | "leitura_completa"
        | "administracao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_cliente: ["negocio_local", "infoproduto"],
      estado_civil: [
        "solteiro",
        "casado",
        "divorciado",
        "viuvo",
        "uniao_estavel",
      ],
      nivel_acesso: ["admin", "gestor_trafego", "cs", "designer"],
      tipo_acesso_dados: [
        "leitura_propria",
        "leitura_limitada",
        "leitura_completa",
        "administracao",
      ],
    },
  },
} as const
