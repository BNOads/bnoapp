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
      clickup_user_mappings: {
        Row: {
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
      client_roles: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_primary: boolean
          role: string
          since: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role: string
          since?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string
          since?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["user_id"]
          },
        ]
      }
      clientes: {
        Row: {
          aliases: string[] | null
          ativo: boolean
          auto_permission: boolean | null
          branding_bg: string | null
          branding_description: string | null
          branding_enabled: boolean | null
          branding_logo_url: string | null
          branding_primary: string | null
          branding_secondary: string | null
          catalogo_criativos_url: string | null
          categoria: Database["public"]["Enums"]["categoria_cliente"]
          created_at: string
          created_by: string | null
          cs_id: string | null
          dashboards_looker: Json | null
          data_inicio: string | null
          deleted_at: string | null
          drive_folder_id: string | null
          drive_sync_error: string | null
          etapa_atual: string | null
          funis_trabalhando: string[] | null
          funnel_status: boolean
          id: string
          is_active: boolean
          last_drive_sync: string | null
          link_painel: string | null
          nicho: string | null
          nome: string
          observacoes: string | null
          pasta_drive_url: string | null
          primary_cs_user_id: string | null
          primary_gestor_user_id: string | null
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
          branding_bg?: string | null
          branding_description?: string | null
          branding_enabled?: boolean | null
          branding_logo_url?: string | null
          branding_primary?: string | null
          branding_secondary?: string | null
          catalogo_criativos_url?: string | null
          categoria: Database["public"]["Enums"]["categoria_cliente"]
          created_at?: string
          created_by?: string | null
          cs_id?: string | null
          dashboards_looker?: Json | null
          data_inicio?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_sync_error?: string | null
          etapa_atual?: string | null
          funis_trabalhando?: string[] | null
          funnel_status?: boolean
          id?: string
          is_active?: boolean
          last_drive_sync?: string | null
          link_painel?: string | null
          nicho?: string | null
          nome: string
          observacoes?: string | null
          pasta_drive_url?: string | null
          primary_cs_user_id?: string | null
          primary_gestor_user_id?: string | null
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
          branding_bg?: string | null
          branding_description?: string | null
          branding_enabled?: boolean | null
          branding_logo_url?: string | null
          branding_primary?: string | null
          branding_secondary?: string | null
          catalogo_criativos_url?: string | null
          categoria?: Database["public"]["Enums"]["categoria_cliente"]
          created_at?: string
          created_by?: string | null
          cs_id?: string | null
          dashboards_looker?: Json | null
          data_inicio?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_sync_error?: string | null
          etapa_atual?: string | null
          funis_trabalhando?: string[] | null
          funnel_status?: boolean
          id?: string
          is_active?: boolean
          last_drive_sync?: string | null
          link_painel?: string | null
          nicho?: string | null
          nome?: string
          observacoes?: string | null
          pasta_drive_url?: string | null
          primary_cs_user_id?: string | null
          primary_gestor_user_id?: string | null
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
            foreignKeyName: "clientes_primary_cs_user_id_fkey"
            columns: ["primary_cs_user_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "clientes_primary_gestor_user_id_fkey"
            columns: ["primary_gestor_user_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["user_id"]
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
      clientes_audit_log: {
        Row: {
          acao: string
          cliente_id: string
          created_at: string
          id: string
          motivo: string | null
          user_id: string
        }
        Insert: {
          acao: string
          cliente_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          user_id: string
        }
        Update: {
          acao?: string
          cliente_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_audit_log_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
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
          primeiro_login: boolean | null
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
          primeiro_login?: boolean | null
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
          primeiro_login?: boolean | null
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
      collaboration_permissions: {
        Row: {
          document_id: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          permission_type: string
          user_id: string
        }
        Insert: {
          document_id: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permission_type: string
          user_id: string
        }
        Update: {
          document_id?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permission_type?: string
          user_id?: string
        }
        Relationships: []
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
          nomenclatura_trafego: string | null
          observacao_personalizada: string | null
          pagina_destino: string | null
          parent_folder_id: string | null
          status: string | null
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
          nomenclatura_trafego?: string | null
          observacao_personalizada?: string | null
          pagina_destino?: string | null
          parent_folder_id?: string | null
          status?: string | null
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
          nomenclatura_trafego?: string | null
          observacao_personalizada?: string | null
          pagina_destino?: string | null
          parent_folder_id?: string | null
          status?: string | null
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
      crm_access_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string
          card_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          card_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          card_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cards: {
        Row: {
          amount: number | null
          column_id: string
          company: string | null
          converted_client_id: string | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          description: string | null
          disqualify_reason: string | null
          email: string | null
          id: string
          instagram: string | null
          lost_reason: string | null
          next_action_at: string | null
          order: number
          origin: string | null
          owner_id: string | null
          phone: string | null
          segment: string | null
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          column_id: string
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          description?: string | null
          disqualify_reason?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          lost_reason?: string | null
          next_action_at?: string | null
          order?: number
          origin?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          column_id?: string
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          description?: string | null
          disqualify_reason?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          lost_reason?: string | null
          next_action_at?: string | null
          order?: number
          origin?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "crm_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_columns: {
        Row: {
          color: string
          column_sla_days: number | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          order: number
          updated_at: string
        }
        Insert: {
          color?: string
          column_sla_days?: number | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          column_sla_days?: number | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          order?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_custom_fields: {
        Row: {
          created_at: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean | null
          order: number
        }
        Insert: {
          created_at?: string
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_required?: boolean | null
          order?: number
        }
        Update: {
          created_at?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          order?: number
        }
        Relationships: []
      }
      crm_templates: {
        Row: {
          created_at: string
          default_fields: Json
          description: string | null
          id: string
          initial_tags: string[] | null
          name: string
          required_fields: string[] | null
        }
        Insert: {
          created_at?: string
          default_fields?: Json
          description?: string | null
          id?: string
          initial_tags?: string[] | null
          name: string
          required_fields?: string[] | null
        }
        Update: {
          created_at?: string
          default_fields?: Json
          description?: string | null
          id?: string
          initial_tags?: string[] | null
          name?: string
          required_fields?: string[] | null
        }
        Relationships: []
      }
      debrief_metrics: {
        Row: {
          cliente_id: string | null
          created_at: string
          debriefing_id: string | null
          fonte: string
          id: string
          janela_atribuicao: string
          metrics: Json
          periodo_fim: string
          periodo_hash: string
          periodo_inicio: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          debriefing_id?: string | null
          fonte?: string
          id?: string
          janela_atribuicao?: string
          metrics?: Json
          periodo_fim: string
          periodo_hash: string
          periodo_inicio: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          debriefing_id?: string | null
          fonte?: string
          id?: string
          janela_atribuicao?: string
          metrics?: Json
          periodo_fim?: string
          periodo_hash?: string
          periodo_inicio?: string
          updated_at?: string
        }
        Relationships: []
      }
      debrief_overrides: {
        Row: {
          autor_id: string
          card_key: string
          cliente_id: string | null
          created_at: string
          debriefing_id: string
          fonte: string
          id: string
          periodo_hash: string
          valor: number | null
        }
        Insert: {
          autor_id: string
          card_key: string
          cliente_id?: string | null
          created_at?: string
          debriefing_id: string
          fonte?: string
          id?: string
          periodo_hash: string
          valor?: number | null
        }
        Update: {
          autor_id?: string
          card_key?: string
          cliente_id?: string | null
          created_at?: string
          debriefing_id?: string
          fonte?: string
          id?: string
          periodo_hash?: string
          valor?: number | null
        }
        Relationships: []
      }
      debriefings: {
        Row: {
          anexos: Json | null
          cliente_id: string | null
          cliente_nome: string
          conversao_lead_venda: number | null
          cpl: number | null
          created_at: string
          created_by: string
          dados_compradores: Json | null
          dados_leads: Json | null
          dados_outras_fontes: Json | null
          dados_pesquisa: Json | null
          dados_trafego: Json | null
          faturamento_bruto: number | null
          faturamento_total: number | null
          id: string
          insights_automaticos: Json | null
          investimento_total: number | null
          leads_total: number | null
          meta_cpl: number | null
          meta_roas: number | null
          moeda: string
          nome_lancamento: string
          o_que_ajustar: string[] | null
          o_que_funcionou: string[] | null
          paineis_excluidos: Json | null
          periodo_fim: string
          periodo_inicio: string
          proximos_passos: string[] | null
          roas: number | null
          status: string
          ticket_medio: number | null
          updated_at: string
          vendas_total: number | null
        }
        Insert: {
          anexos?: Json | null
          cliente_id?: string | null
          cliente_nome: string
          conversao_lead_venda?: number | null
          cpl?: number | null
          created_at?: string
          created_by: string
          dados_compradores?: Json | null
          dados_leads?: Json | null
          dados_outras_fontes?: Json | null
          dados_pesquisa?: Json | null
          dados_trafego?: Json | null
          faturamento_bruto?: number | null
          faturamento_total?: number | null
          id?: string
          insights_automaticos?: Json | null
          investimento_total?: number | null
          leads_total?: number | null
          meta_cpl?: number | null
          meta_roas?: number | null
          moeda?: string
          nome_lancamento: string
          o_que_ajustar?: string[] | null
          o_que_funcionou?: string[] | null
          paineis_excluidos?: Json | null
          periodo_fim: string
          periodo_inicio: string
          proximos_passos?: string[] | null
          roas?: number | null
          status?: string
          ticket_medio?: number | null
          updated_at?: string
          vendas_total?: number | null
        }
        Update: {
          anexos?: Json | null
          cliente_id?: string | null
          cliente_nome?: string
          conversao_lead_venda?: number | null
          cpl?: number | null
          created_at?: string
          created_by?: string
          dados_compradores?: Json | null
          dados_leads?: Json | null
          dados_outras_fontes?: Json | null
          dados_pesquisa?: Json | null
          dados_trafego?: Json | null
          faturamento_bruto?: number | null
          faturamento_total?: number | null
          id?: string
          insights_automaticos?: Json | null
          investimento_total?: number | null
          leads_total?: number | null
          meta_cpl?: number | null
          meta_roas?: number | null
          moeda?: string
          nome_lancamento?: string
          o_que_ajustar?: string[] | null
          o_que_funcionou?: string[] | null
          paineis_excluidos?: Json | null
          periodo_fim?: string
          periodo_inicio?: string
          proximos_passos?: string[] | null
          roas?: number | null
          status?: string
          ticket_medio?: number | null
          updated_at?: string
          vendas_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "debriefings_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_bordo: {
        Row: {
          autor_id: string
          cliente_id: string
          created_at: string
          id: string
          parent_id: string | null
          reacoes: Json
          texto: string
          updated_at: string
        }
        Insert: {
          autor_id: string
          cliente_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          reacoes?: Json
          texto: string
          updated_at?: string
        }
        Update: {
          autor_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          reacoes?: Json
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_bordo_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "diario_bordo"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          autor: string | null
          categoria_documento: string | null
          cliente_id: string | null
          conteudo: string | null
          created_at: string
          created_by: string
          icone: string | null
          id: string
          link_publico: string | null
          link_publico_ativo: boolean | null
          tags: string[] | null
          tamanho_arquivo: string | null
          tipo: string
          titulo: string
          updated_at: string
          url_arquivo: string | null
          versao: number | null
        }
        Insert: {
          autor?: string | null
          categoria_documento?: string | null
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string
          created_by: string
          icone?: string | null
          id?: string
          link_publico?: string | null
          link_publico_ativo?: boolean | null
          tags?: string[] | null
          tamanho_arquivo?: string | null
          tipo: string
          titulo: string
          updated_at?: string
          url_arquivo?: string | null
          versao?: number | null
        }
        Update: {
          autor?: string | null
          categoria_documento?: string | null
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string
          created_by?: string
          icone?: string | null
          id?: string
          link_publico?: string | null
          link_publico_ativo?: boolean | null
          tags?: string[] | null
          tamanho_arquivo?: string | null
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
      finance_aliases_unmapped: {
        Row: {
          created_at: string
          header_original: string
          id: string
          sheet_name: string
        }
        Insert: {
          created_at?: string
          header_original: string
          id?: string
          sheet_name: string
        }
        Update: {
          created_at?: string
          header_original?: string
          id?: string
          sheet_name?: string
        }
        Relationships: []
      }
      financeiro_access_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      financeiro_clientes_ativos: {
        Row: {
          ano_referencia: number
          cliente_id: string | null
          created_at: string | null
          id: string
          ltv: number | null
          mes_referencia: number
          mrr: number
          tempo_ativo_meses: number
          updated_at: string | null
        }
        Insert: {
          ano_referencia: number
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          ltv?: number | null
          mes_referencia: number
          mrr: number
          tempo_ativo_meses?: number
          updated_at?: string | null
        }
        Update: {
          ano_referencia?: number
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          ltv?: number | null
          mes_referencia?: number
          mrr?: number
          tempo_ativo_meses?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_clientes_ativos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_config: {
        Row: {
          aba_clientes_ativos: string
          aba_movimentos: string
          aba_resumo_ano_1: string
          aba_resumo_ano_2: string
          created_at: string
          id: number
          spreadsheet_id: string
          updated_at: string
        }
        Insert: {
          aba_clientes_ativos?: string
          aba_movimentos?: string
          aba_resumo_ano_1?: string
          aba_resumo_ano_2?: string
          created_at?: string
          id?: number
          spreadsheet_id: string
          updated_at?: string
        }
        Update: {
          aba_clientes_ativos?: string
          aba_movimentos?: string
          aba_resumo_ano_1?: string
          aba_resumo_ano_2?: string
          created_at?: string
          id?: number
          spreadsheet_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      financeiro_mensal: {
        Row: {
          ano: number
          clientes_ativos: number | null
          clientes_perdidos: number | null
          colaboradores: number | null
          created_at: string | null
          despesas_previstas: number | null
          despesas_realizadas: number | null
          faturamento_previsto: number | null
          faturamento_realizado: number | null
          fechamento: string | null
          id: string
          mes: number
          pagamento_parceiros_previsto: number | null
          pagamento_parceiros_realizado: number | null
          total_ads: number | null
          updated_at: string | null
        }
        Insert: {
          ano: number
          clientes_ativos?: number | null
          clientes_perdidos?: number | null
          colaboradores?: number | null
          created_at?: string | null
          despesas_previstas?: number | null
          despesas_realizadas?: number | null
          faturamento_previsto?: number | null
          faturamento_realizado?: number | null
          fechamento?: string | null
          id?: string
          mes: number
          pagamento_parceiros_previsto?: number | null
          pagamento_parceiros_realizado?: number | null
          total_ads?: number | null
          updated_at?: string | null
        }
        Update: {
          ano?: number
          clientes_ativos?: number | null
          clientes_perdidos?: number | null
          colaboradores?: number | null
          created_at?: string | null
          despesas_previstas?: number | null
          despesas_realizadas?: number | null
          faturamento_previsto?: number | null
          faturamento_realizado?: number | null
          fechamento?: string | null
          id?: string
          mes?: number
          pagamento_parceiros_previsto?: number | null
          pagamento_parceiros_realizado?: number | null
          total_ads?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financeiro_movimentos: {
        Row: {
          ano_referencia: number
          classificacao: string
          created_at: string | null
          created_by: string | null
          data_prevista: string
          descricao: string | null
          id: string
          mes_referencia: number
          movimento: string
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          ano_referencia: number
          classificacao: string
          created_at?: string | null
          created_by?: string | null
          data_prevista: string
          descricao?: string | null
          id?: string
          mes_referencia: number
          movimento: string
          observacoes?: string | null
          status?: string
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          ano_referencia?: number
          classificacao?: string
          created_at?: string | null
          created_by?: string | null
          data_prevista?: string
          descricao?: string | null
          id?: string
          mes_referencia?: number
          movimento?: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      funis_marketing: {
        Row: {
          compartilhado_em: string | null
          created_at: string
          dados_funil: Json
          descricao: string | null
          id: string
          link_publico: string | null
          publico: boolean | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          compartilhado_em?: string | null
          created_at?: string
          dados_funil?: Json
          descricao?: string | null
          id?: string
          link_publico?: string | null
          publico?: boolean | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          compartilhado_em?: string | null
          created_at?: string
          dados_funil?: Json
          descricao?: string | null
          id?: string
          link_publico?: string | null
          publico?: boolean | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      funnel_status_audit_log: {
        Row: {
          changed_at: string
          cliente_id: string
          id: string
          new_status: boolean
          old_status: boolean | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          cliente_id: string
          id?: string
          new_status: boolean
          old_status?: boolean | null
          user_id: string
        }
        Update: {
          changed_at?: string
          cliente_id?: string
          id?: string
          new_status?: boolean
          old_status?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_status_audit_log_cliente_id_fkey"
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
          decisoes_tomadas: Json | null
          descricao: string | null
          duracao: number | null
          embedding: string | null
          id: string
          indexacao_busca: unknown | null
          palavras_chave: string[] | null
          participantes_identificados: string[] | null
          participantes_mencionados: string[] | null
          pendencias: Json | null
          resumo_ia: string | null
          reuniao_id: string | null
          tags: string[] | null
          temas: Json | null
          thumbnail_url: string | null
          titulo: string
          topicos_principais: Json | null
          transcricao: string | null
          updated_at: string
          url_gravacao: string
          visualizacoes: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by: string
          decisoes_tomadas?: Json | null
          descricao?: string | null
          duracao?: number | null
          embedding?: string | null
          id?: string
          indexacao_busca?: unknown | null
          palavras_chave?: string[] | null
          participantes_identificados?: string[] | null
          participantes_mencionados?: string[] | null
          pendencias?: Json | null
          resumo_ia?: string | null
          reuniao_id?: string | null
          tags?: string[] | null
          temas?: Json | null
          thumbnail_url?: string | null
          titulo: string
          topicos_principais?: Json | null
          transcricao?: string | null
          updated_at?: string
          url_gravacao: string
          visualizacoes?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          decisoes_tomadas?: Json | null
          descricao?: string | null
          duracao?: number | null
          embedding?: string | null
          id?: string
          indexacao_busca?: unknown | null
          palavras_chave?: string[] | null
          participantes_identificados?: string[] | null
          participantes_mencionados?: string[] | null
          pendencias?: Json | null
          resumo_ia?: string | null
          reuniao_id?: string | null
          tags?: string[] | null
          temas?: Json | null
          thumbnail_url?: string | null
          titulo?: string
          topicos_principais?: Json | null
          transcricao?: string | null
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
      historico_orcamentos: {
        Row: {
          alterado_por: string
          data_alteracao: string
          id: string
          motivo_alteracao: string | null
          orcamento_id: string
          valor_anterior: number | null
          valor_novo: number
        }
        Insert: {
          alterado_por: string
          data_alteracao?: string
          id?: string
          motivo_alteracao?: string | null
          orcamento_id: string
          valor_anterior?: number | null
          valor_novo: number
        }
        Update: {
          alterado_por?: string
          data_alteracao?: string
          id?: string
          motivo_alteracao?: string | null
          orcamento_id?: string
          valor_anterior?: number | null
          valor_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_orcamentos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_funil"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_status_lancamentos: {
        Row: {
          alterado_por: string
          data_alteracao: string
          id: string
          lancamento_id: string
          motivo: string | null
          status_anterior:
            | Database["public"]["Enums"]["status_lancamento"]
            | null
          status_novo: Database["public"]["Enums"]["status_lancamento"]
        }
        Insert: {
          alterado_por: string
          data_alteracao?: string
          id?: string
          lancamento_id: string
          motivo?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["status_lancamento"]
            | null
          status_novo: Database["public"]["Enums"]["status_lancamento"]
        }
        Update: {
          alterado_por?: string
          data_alteracao?: string
          id?: string
          lancamento_id?: string
          motivo?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["status_lancamento"]
            | null
          status_novo?: Database["public"]["Enums"]["status_lancamento"]
        }
        Relationships: [
          {
            foreignKeyName: "historico_status_lancamentos_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
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
      kickoff_content: {
        Row: {
          content_md: string
          created_at: string
          created_by: string
          id: string
          kickoff_id: string
          version: number
        }
        Insert: {
          content_md: string
          created_at?: string
          created_by: string
          id?: string
          kickoff_id: string
          version?: number
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string
          id?: string
          kickoff_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kickoff_content_kickoff_id_fkey"
            columns: ["kickoff_id"]
            isOneToOne: false
            referencedRelation: "kickoffs"
            referencedColumns: ["id"]
          },
        ]
      }
      kickoffs: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          status: Database["public"]["Enums"]["kickoff_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          status?: Database["public"]["Enums"]["kickoff_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: Database["public"]["Enums"]["kickoff_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kickoffs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          created_at: string
          created_by: string
          data_fechamento: string | null
          data_fim_aquecimento: string | null
          data_fim_captacao: string | null
          data_fim_carrinho: string | null
          data_fim_cpl: string | null
          data_fim_lembrete: string | null
          data_fim_remarketing: string | null
          data_inicio_aquecimento: string | null
          data_inicio_captacao: string
          data_inicio_carrinho: string | null
          data_inicio_cpl: string | null
          data_inicio_lembrete: string | null
          data_inicio_remarketing: string | null
          datas_cpls: string[] | null
          descricao: string | null
          distribuicao_canais: Json | null
          distribuicao_fases: Json | null
          distribuicao_plataformas: Json | null
          gestor_responsavel_id: string | null
          id: string
          investimento_total: number
          leads_desejados: number | null
          link_briefing: string | null
          link_dashboard: string | null
          links_uteis: Json | null
          meta_custo_lead: number | null
          meta_investimento: number | null
          metas_investimentos: Json | null
          nome_lancamento: string
          observacoes: string | null
          observacoes_verbas: string | null
          promessa: string | null
          publico_alvo: string | null
          resultado_obtido: number | null
          roi_percentual: number | null
          status_lancamento: Database["public"]["Enums"]["status_lancamento"]
          ticket_produto: number | null
          tipo_aulas: string | null
          tipo_lancamento: Database["public"]["Enums"]["tipo_lancamento"]
          updated_at: string
          verba_por_fase: Json | null
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          created_by: string
          data_fechamento?: string | null
          data_fim_aquecimento?: string | null
          data_fim_captacao?: string | null
          data_fim_carrinho?: string | null
          data_fim_cpl?: string | null
          data_fim_lembrete?: string | null
          data_fim_remarketing?: string | null
          data_inicio_aquecimento?: string | null
          data_inicio_captacao: string
          data_inicio_carrinho?: string | null
          data_inicio_cpl?: string | null
          data_inicio_lembrete?: string | null
          data_inicio_remarketing?: string | null
          datas_cpls?: string[] | null
          descricao?: string | null
          distribuicao_canais?: Json | null
          distribuicao_fases?: Json | null
          distribuicao_plataformas?: Json | null
          gestor_responsavel_id?: string | null
          id?: string
          investimento_total?: number
          leads_desejados?: number | null
          link_briefing?: string | null
          link_dashboard?: string | null
          links_uteis?: Json | null
          meta_custo_lead?: number | null
          meta_investimento?: number | null
          metas_investimentos?: Json | null
          nome_lancamento: string
          observacoes?: string | null
          observacoes_verbas?: string | null
          promessa?: string | null
          publico_alvo?: string | null
          resultado_obtido?: number | null
          roi_percentual?: number | null
          status_lancamento?: Database["public"]["Enums"]["status_lancamento"]
          ticket_produto?: number | null
          tipo_aulas?: string | null
          tipo_lancamento: Database["public"]["Enums"]["tipo_lancamento"]
          updated_at?: string
          verba_por_fase?: Json | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          data_fechamento?: string | null
          data_fim_aquecimento?: string | null
          data_fim_captacao?: string | null
          data_fim_carrinho?: string | null
          data_fim_cpl?: string | null
          data_fim_lembrete?: string | null
          data_fim_remarketing?: string | null
          data_inicio_aquecimento?: string | null
          data_inicio_captacao?: string
          data_inicio_carrinho?: string | null
          data_inicio_cpl?: string | null
          data_inicio_lembrete?: string | null
          data_inicio_remarketing?: string | null
          datas_cpls?: string[] | null
          descricao?: string | null
          distribuicao_canais?: Json | null
          distribuicao_fases?: Json | null
          distribuicao_plataformas?: Json | null
          gestor_responsavel_id?: string | null
          id?: string
          investimento_total?: number
          leads_desejados?: number | null
          link_briefing?: string | null
          link_dashboard?: string | null
          links_uteis?: Json | null
          meta_custo_lead?: number | null
          meta_investimento?: number | null
          metas_investimentos?: Json | null
          nome_lancamento?: string
          observacoes?: string | null
          observacoes_verbas?: string | null
          promessa?: string | null
          publico_alvo?: string | null
          resultado_obtido?: number | null
          roi_percentual?: number | null
          status_lancamento?: Database["public"]["Enums"]["status_lancamento"]
          ticket_produto?: number | null
          tipo_aulas?: string | null
          tipo_lancamento?: Database["public"]["Enums"]["tipo_lancamento"]
          updated_at?: string
          verba_por_fase?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_gestor_responsavel_id_fkey"
            columns: ["gestor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
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
      mapas_mentais: {
        Row: {
          compartilhado_em: string | null
          created_at: string
          dados_mapa: Json
          id: string
          link_publico: string | null
          publico: boolean | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          compartilhado_em?: string | null
          created_at?: string
          dados_mapa?: Json
          id?: string
          link_publico?: string | null
          publico?: boolean | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          compartilhado_em?: string | null
          created_at?: string
          dados_mapa?: Json
          id?: string
          link_publico?: string | null
          publico?: boolean | null
          titulo?: string
          updated_at?: string
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
      mensagens_semanais: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string
          cs_id: string | null
          enviado: boolean
          enviado_cs_em: string | null
          enviado_em: string | null
          enviado_gestor_em: string | null
          enviado_por: string | null
          gestor_id: string
          historico_envios: Json | null
          id: string
          mensagem: string
          semana_referencia: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by: string
          cs_id?: string | null
          enviado?: boolean
          enviado_cs_em?: string | null
          enviado_em?: string | null
          enviado_gestor_em?: string | null
          enviado_por?: string | null
          gestor_id: string
          historico_envios?: Json | null
          id?: string
          mensagem: string
          semana_referencia: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string
          cs_id?: string | null
          enviado?: boolean
          enviado_cs_em?: string | null
          enviado_em?: string | null
          enviado_gestor_em?: string | null
          enviado_por?: string | null
          gestor_id?: string
          historico_envios?: Json | null
          id?: string
          mensagem?: string
          semana_referencia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_semanais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_semanais_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mensagens_semanais_cs_id_fkey"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_semanais_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mensagens_semanais_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          conteudo: string | null
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          id?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orcamentos_funil: {
        Row: {
          active: boolean
          ativo: boolean
          cliente_id: string
          created_at: string
          created_by: string
          data_atualizacao: string
          etapa_funil: string | null
          id: string
          nome_funil: string
          observacoes: string | null
          periodo_ano: number | null
          periodo_mes: number | null
          sort_order: number | null
          status_orcamento: string | null
          updated_at: string
          valor_gasto: number | null
          valor_investimento: number
        }
        Insert: {
          active?: boolean
          ativo?: boolean
          cliente_id: string
          created_at?: string
          created_by: string
          data_atualizacao?: string
          etapa_funil?: string | null
          id?: string
          nome_funil: string
          observacoes?: string | null
          periodo_ano?: number | null
          periodo_mes?: number | null
          sort_order?: number | null
          status_orcamento?: string | null
          updated_at?: string
          valor_gasto?: number | null
          valor_investimento?: number
        }
        Update: {
          active?: boolean
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          created_by?: string
          data_atualizacao?: string
          etapa_funil?: string | null
          id?: string
          nome_funil?: string
          observacoes?: string | null
          periodo_ano?: number | null
          periodo_mes?: number | null
          sort_order?: number | null
          status_orcamento?: string | null
          updated_at?: string
          valor_gasto?: number | null
          valor_investimento?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_funil_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_funil_audit_log: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_status: boolean
          orcamento_id: string
          previous_status: boolean | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_status: boolean
          orcamento_id: string
          previous_status?: boolean | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: boolean
          orcamento_id?: string
          previous_status?: boolean | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_funil_audit_log_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_funil"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
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
          aulas_externas: Json | null
          colaborador_id: string
          created_at: string
          created_by: string
          data_limite: string
          descricao: string | null
          id: string
          links_externos: Json | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          aulas_externas?: Json | null
          colaborador_id: string
          created_at?: string
          created_by: string
          data_limite: string
          descricao?: string | null
          id?: string
          links_externos?: Json | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          aulas_externas?: Json | null
          colaborador_id?: string
          created_at?: string
          created_by?: string
          data_limite?: string
          descricao?: string | null
          id?: string
          links_externos?: Json | null
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
          primeiro_login: boolean | null
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
          primeiro_login?: boolean | null
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
          primeiro_login?: boolean | null
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
      referencias_criativos: {
        Row: {
          ativo: boolean
          categoria: string | null
          cliente_id: string | null
          configuracoes_editor: Json | null
          conteudo: Json
          conteudo_markdown: string | null
          created_at: string
          created_by: string
          data_expiracao: string | null
          id: string
          is_public: boolean | null
          is_template: boolean
          link_publico: string | null
          link_url: string | null
          links_externos: Json | null
          permissoes_edicao: Json | null
          public_slug: string | null
          public_token: string | null
          published_at: string | null
          titulo: string
          updated_at: string
          versao_editor: number | null
          view_count: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          cliente_id?: string | null
          configuracoes_editor?: Json | null
          conteudo?: Json
          conteudo_markdown?: string | null
          created_at?: string
          created_by: string
          data_expiracao?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean
          link_publico?: string | null
          link_url?: string | null
          links_externos?: Json | null
          permissoes_edicao?: Json | null
          public_slug?: string | null
          public_token?: string | null
          published_at?: string | null
          titulo: string
          updated_at?: string
          versao_editor?: number | null
          view_count?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          cliente_id?: string | null
          configuracoes_editor?: Json | null
          conteudo?: Json
          conteudo_markdown?: string | null
          created_at?: string
          created_by?: string
          data_expiracao?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean
          link_publico?: string | null
          link_url?: string | null
          links_externos?: Json | null
          permissoes_edicao?: Json | null
          public_slug?: string | null
          public_token?: string | null
          published_at?: string | null
          titulo?: string
          updated_at?: string
          versao_editor?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referencias_criativos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string
          data_hora: string
          decisoes_tomadas: Json | null
          descricao: string | null
          duracao: number | null
          embedding: string | null
          id: string
          indexacao_busca: unknown | null
          link_gravacao: string | null
          link_meet: string | null
          palavras_chave: string[] | null
          participantes: string[] | null
          pendencias: Json | null
          resumo_ia: string | null
          status: string | null
          temas_discutidos: Json | null
          titulo: string
          topicos_principais: Json | null
          transcricao: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by: string
          data_hora: string
          decisoes_tomadas?: Json | null
          descricao?: string | null
          duracao?: number | null
          embedding?: string | null
          id?: string
          indexacao_busca?: unknown | null
          link_gravacao?: string | null
          link_meet?: string | null
          palavras_chave?: string[] | null
          participantes?: string[] | null
          pendencias?: Json | null
          resumo_ia?: string | null
          status?: string | null
          temas_discutidos?: Json | null
          titulo: string
          topicos_principais?: Json | null
          transcricao?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          data_hora?: string
          decisoes_tomadas?: Json | null
          descricao?: string | null
          duracao?: number | null
          embedding?: string | null
          id?: string
          indexacao_busca?: unknown | null
          link_gravacao?: string | null
          link_meet?: string | null
          palavras_chave?: string[] | null
          participantes?: string[] | null
          pendencias?: Json | null
          resumo_ia?: string | null
          status?: string | null
          temas_discutidos?: Json | null
          titulo?: string
          topicos_principais?: Json | null
          transcricao?: string | null
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
      reunioes_blocos: {
        Row: {
          ancora: string | null
          conteudo: Json
          created_at: string
          documento_id: string
          id: string
          ordem: number
          tipo: Database["public"]["Enums"]["tipo_bloco_reuniao"]
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ancora?: string | null
          conteudo?: Json
          created_at?: string
          documento_id: string
          id?: string
          ordem?: number
          tipo: Database["public"]["Enums"]["tipo_bloco_reuniao"]
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ancora?: string | null
          conteudo?: Json
          created_at?: string
          documento_id?: string
          id?: string
          ordem?: number
          tipo?: Database["public"]["Enums"]["tipo_bloco_reuniao"]
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_blocos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "reunioes_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes_documentos: {
        Row: {
          ano: number
          cliente_id: string | null
          conteudo_texto: string | null
          contribuidores: string[] | null
          created_at: string
          created_by: string
          descricao: string | null
          dia: number
          id: string
          mes: number
          participantes: string[] | null
          status: Database["public"]["Enums"]["status_documento_reuniao"]
          titulo_reuniao: string
          ultima_atualizacao: string
          updated_at: string
        }
        Insert: {
          ano: number
          cliente_id?: string | null
          conteudo_texto?: string | null
          contribuidores?: string[] | null
          created_at?: string
          created_by: string
          descricao?: string | null
          dia: number
          id?: string
          mes: number
          participantes?: string[] | null
          status?: Database["public"]["Enums"]["status_documento_reuniao"]
          titulo_reuniao: string
          ultima_atualizacao?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          cliente_id?: string | null
          conteudo_texto?: string | null
          contribuidores?: string[] | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          dia?: number
          id?: string
          mes?: number
          participantes?: string[] | null
          status?: Database["public"]["Enums"]["status_documento_reuniao"]
          titulo_reuniao?: string
          ultima_atualizacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes_templates: {
        Row: {
          ativo: boolean
          blocos_template: Json
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          blocos_template?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          blocos_template?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
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
          concluida_por: string | null
          created_at: string
          created_by: string
          data_conclusao: string | null
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
          concluida_por?: string | null
          created_at?: string
          created_by: string
          data_conclusao?: string | null
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
          concluida_por?: string | null
          created_at?: string
          created_by?: string
          data_conclusao?: string | null
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
      user_tools_layout: {
        Row: {
          hidden: Json | null
          positions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          hidden?: Json | null
          positions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          hidden?: Json | null
          positions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      utm_history: {
        Row: {
          created_at: string
          created_by: string
          id: string
          params: Json
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          params?: Json
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          params?: Json
          url?: string
        }
        Relationships: []
      }
      utm_presets: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_global: boolean
          name: string
          params: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_global?: boolean
          name: string
          params?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_global?: boolean
          name?: string
          params?: Json
          updated_at?: string
        }
        Relationships: []
      }
      yjs_snapshots: {
        Row: {
          block_id: string
          created_at: string
          created_by: string | null
          description: string | null
          document_id: string
          id: string
          operations_count: number
          snapshot_data: string
          version: number
        }
        Insert: {
          block_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id: string
          id?: string
          operations_count?: number
          snapshot_data: string
          version?: number
        }
        Update: {
          block_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string
          id?: string
          operations_count?: number
          snapshot_data?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      buscar_transcricoes_reunioes: {
        Args: {
          _cliente_id?: string
          _data_fim?: string
          _data_inicio?: string
          _limit?: number
          _query?: string
          _responsavel?: string
          _user_id: string
        }
        Returns: {
          cliente_nome: string
          data_reuniao: string
          id: string
          link_meet: string
          palavras_chave: string[]
          relevancia: number
          resumo_ia: string
          temas: Json
          tipo: string
          titulo: string
          transcricao: string
          url_gravacao: string
        }[]
      }
      check_admin_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      create_yjs_snapshot: {
        Args: {
          _block_id: string
          _description?: string
          _document_id: string
          _operations_count?: number
          _snapshot_data: string
          _version?: number
        }
        Returns: string
      }
      extrair_titulos_reuniao: {
        Args: { conteudo: string }
        Returns: string[]
      }
      generate_initial_password: {
        Args: { email_input: string }
        Returns: string
      }
      generate_public_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_reference_slug: {
        Args: { titulo: string }
        Returns: string
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
      get_user_collaboration_permission: {
        Args: { _document_id: string; _user_id?: string }
        Returns: string
      }
      grant_master_access_to_email: {
        Args: { _email: string }
        Returns: undefined
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_sensitive_data_permission: {
        Args: {
          _permission_type: Database["public"]["Enums"]["tipo_acesso_dados"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin_with_valid_reason: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_profile_owner: {
        Args: { _profile_user_id: string; _user_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      migrate_reference_content_to_markdown: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      soft_delete_referencia: {
        Args: { _id: string }
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_creative_status: {
        Args: { creative_id: string; new_status: boolean }
        Returns: Json
      }
      update_creative_status_v2: {
        Args: { creative_id: string; new_status_text: string }
        Returns: Json
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
      etapa_funil_enum:
        | "captacao"
        | "cpl"
        | "vendas"
        | "remarketing"
        | "email_marketing"
        | "upsell"
      kickoff_status: "draft" | "active" | "archived"
      nivel_acesso:
        | "admin"
        | "gestor_trafego"
        | "cs"
        | "designer"
        | "webdesigner"
        | "editor_video"
        | "gestor_projetos"
        | "dono"
      status_documento_reuniao:
        | "rascunho"
        | "pauta_criada"
        | "ata_concluida"
        | "arquivado"
      status_lancamento:
        | "em_captacao"
        | "cpl"
        | "remarketing"
        | "finalizado"
        | "pausado"
        | "cancelado"
      status_orcamento_enum: "ativo" | "pausado" | "concluido" | "cancelado"
      tipo_acesso_dados:
        | "leitura_propria"
        | "leitura_limitada"
        | "leitura_completa"
        | "administracao"
      tipo_bloco_reuniao:
        | "titulo"
        | "descricao"
        | "participantes"
        | "pauta"
        | "decisoes"
        | "acoes"
      tipo_lancamento:
        | "semente"
        | "interno"
        | "externo"
        | "perpetuo"
        | "flash"
        | "evento"
        | "outro"
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
      etapa_funil_enum: [
        "captacao",
        "cpl",
        "vendas",
        "remarketing",
        "email_marketing",
        "upsell",
      ],
      kickoff_status: ["draft", "active", "archived"],
      nivel_acesso: [
        "admin",
        "gestor_trafego",
        "cs",
        "designer",
        "webdesigner",
        "editor_video",
        "gestor_projetos",
        "dono",
      ],
      status_documento_reuniao: [
        "rascunho",
        "pauta_criada",
        "ata_concluida",
        "arquivado",
      ],
      status_lancamento: [
        "em_captacao",
        "cpl",
        "remarketing",
        "finalizado",
        "pausado",
        "cancelado",
      ],
      status_orcamento_enum: ["ativo", "pausado", "concluido", "cancelado"],
      tipo_acesso_dados: [
        "leitura_propria",
        "leitura_limitada",
        "leitura_completa",
        "administracao",
      ],
      tipo_bloco_reuniao: [
        "titulo",
        "descricao",
        "participantes",
        "pauta",
        "decisoes",
        "acoes",
      ],
      tipo_lancamento: [
        "semente",
        "interno",
        "externo",
        "perpetuo",
        "flash",
        "evento",
        "outro",
      ],
    },
  },
} as const
