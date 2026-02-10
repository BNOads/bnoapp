-- =============================================
-- Laboratório de Testes de Tráfego
-- =============================================

-- Enums
CREATE TYPE status_teste_lab AS ENUM (
  'planejado',
  'rodando',
  'pausado',
  'concluido',
  'cancelado'
);

CREATE TYPE validacao_teste_lab AS ENUM (
  'em_teste',
  'deu_bom',
  'deu_ruim',
  'inconclusivo'
);

CREATE TYPE tipo_teste_lab AS ENUM (
  'criativo',
  'publico',
  'estrategia',
  'pagina',
  'oferta',
  'evento'
);

CREATE TYPE canal_teste_lab AS ENUM (
  'meta_ads',
  'google_ads',
  'tiktok_ads',
  'youtube',
  'outro'
);

CREATE TYPE metrica_principal_lab AS ENUM (
  'ctr',
  'cpl',
  'cpa',
  'roas',
  'conversao_lp'
);

-- =============================================
-- Templates table (created first for FK)
-- =============================================
CREATE TABLE public.testes_laboratorio_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_teste tipo_teste_lab NOT NULL,
  canal canal_teste_lab,
  hipotese TEXT,
  metrica_principal metrica_principal_lab,
  meta_metrica NUMERIC(15,4),
  checklist JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_testes_lab_templates_ativo ON public.testes_laboratorio_templates(ativo);

-- =============================================
-- Main table
-- =============================================
CREATE TABLE public.testes_laboratorio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id),
  funil TEXT,
  nome TEXT NOT NULL,
  gestor_responsavel_id UUID REFERENCES public.colaboradores(id),
  tipo_teste tipo_teste_lab NOT NULL,
  canal canal_teste_lab NOT NULL,
  status status_teste_lab NOT NULL DEFAULT 'planejado',
  data_inicio DATE,
  data_fim DATE,
  validacao validacao_teste_lab NOT NULL DEFAULT 'em_teste',
  metrica_principal metrica_principal_lab,
  meta_metrica NUMERIC(15,4),
  resultado_observado NUMERIC(15,4),
  hipotese TEXT,
  o_que_foi_alterado TEXT,
  observacao_equipe TEXT,
  anotacoes TEXT,
  aprendizados TEXT,
  proximos_testes_sugeridos TEXT,
  link_anuncio TEXT,
  link_campanha TEXT,
  link_experimento TEXT,
  template_id UUID REFERENCES public.testes_laboratorio_templates(id),
  arquivado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testes_lab_cliente ON public.testes_laboratorio(cliente_id);
CREATE INDEX idx_testes_lab_gestor ON public.testes_laboratorio(gestor_responsavel_id);
CREATE INDEX idx_testes_lab_status ON public.testes_laboratorio(status);
CREATE INDEX idx_testes_lab_tipo ON public.testes_laboratorio(tipo_teste);
CREATE INDEX idx_testes_lab_validacao ON public.testes_laboratorio(validacao);
CREATE INDEX idx_testes_lab_canal ON public.testes_laboratorio(canal);
CREATE INDEX idx_testes_lab_created_at ON public.testes_laboratorio(created_at DESC);
CREATE INDEX idx_testes_lab_list ON public.testes_laboratorio(arquivado, created_at DESC);

-- =============================================
-- Evidence table
-- =============================================
CREATE TABLE public.testes_laboratorio_evidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teste_id UUID NOT NULL REFERENCES public.testes_laboratorio(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'imagem',
  url TEXT NOT NULL,
  descricao TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testes_lab_evidencias_teste ON public.testes_laboratorio_evidencias(teste_id);

-- =============================================
-- Comments table
-- =============================================
CREATE TABLE public.testes_laboratorio_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teste_id UUID NOT NULL REFERENCES public.testes_laboratorio(id) ON DELETE CASCADE,
  autor_user_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testes_lab_comentarios_teste ON public.testes_laboratorio_comentarios(teste_id);

-- =============================================
-- Audit log table
-- =============================================
CREATE TABLE public.testes_laboratorio_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teste_id UUID NOT NULL REFERENCES public.testes_laboratorio(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  campo_alterado TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testes_lab_audit_teste ON public.testes_laboratorio_audit_log(teste_id);
CREATE INDEX idx_testes_lab_audit_created ON public.testes_laboratorio_audit_log(created_at DESC);

-- =============================================
-- Triggers
-- =============================================
CREATE TRIGGER update_testes_laboratorio_updated_at
  BEFORE UPDATE ON public.testes_laboratorio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testes_lab_templates_updated_at
  BEFORE UPDATE ON public.testes_laboratorio_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto audit log for status and validation changes
CREATE OR REPLACE FUNCTION public.registrar_mudanca_teste_lab()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.testes_laboratorio_audit_log (
      teste_id, acao, campo_alterado, valor_anterior, valor_novo, user_id
    ) VALUES (
      NEW.id, 'status_alterado', 'status', OLD.status::TEXT, NEW.status::TEXT, auth.uid()
    );
  END IF;

  IF OLD.validacao IS DISTINCT FROM NEW.validacao THEN
    INSERT INTO public.testes_laboratorio_audit_log (
      teste_id, acao, campo_alterado, valor_anterior, valor_novo, user_id
    ) VALUES (
      NEW.id, 'validacao_alterada', 'validacao', OLD.validacao::TEXT, NEW.validacao::TEXT, auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_registrar_mudanca_teste_lab
  AFTER UPDATE ON public.testes_laboratorio
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_teste_lab();

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.testes_laboratorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testes_laboratorio_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testes_laboratorio_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testes_laboratorio_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testes_laboratorio_templates ENABLE ROW LEVEL SECURITY;

-- testes_laboratorio
CREATE POLICY "Autenticados podem ver testes"
  ON public.testes_laboratorio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.ativo = true
    )
  );

CREATE POLICY "Gestores podem criar testes"
  ON public.testes_laboratorio FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.nivel_acesso IN ('admin', 'dono', 'gestor_trafego', 'gestor_projetos')
    )
  );

CREATE POLICY "Gestores podem editar seus testes ou admin todos"
  ON public.testes_laboratorio FOR UPDATE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM colaboradores c
      WHERE c.id = gestor_responsavel_id AND c.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.nivel_acesso IN ('admin', 'dono')
    )
  );

-- testes_laboratorio_evidencias
CREATE POLICY "Autenticados podem ver evidencias"
  ON public.testes_laboratorio_evidencias FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

CREATE POLICY "Gestores podem adicionar evidencias"
  ON public.testes_laboratorio_evidencias FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Gestores podem deletar evidencias"
  ON public.testes_laboratorio_evidencias FOR DELETE
  USING (
    auth.uid() = uploaded_by OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.nivel_acesso IN ('admin', 'dono')
    )
  );

-- testes_laboratorio_comentarios
CREATE POLICY "Autenticados podem ver comentarios"
  ON public.testes_laboratorio_comentarios FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

CREATE POLICY "Autenticados podem comentar"
  ON public.testes_laboratorio_comentarios FOR INSERT
  WITH CHECK (auth.uid() = autor_user_id);

-- testes_laboratorio_audit_log
CREATE POLICY "Autenticados podem ver audit log"
  ON public.testes_laboratorio_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

CREATE POLICY "Sistema pode inserir no audit log"
  ON public.testes_laboratorio_audit_log FOR INSERT
  WITH CHECK (true);

-- testes_laboratorio_templates
CREATE POLICY "Autenticados podem ver templates"
  ON public.testes_laboratorio_templates FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

CREATE POLICY "Admins podem criar templates"
  ON public.testes_laboratorio_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.nivel_acesso IN ('admin', 'dono')
    )
  );

CREATE POLICY "Admins podem editar templates"
  ON public.testes_laboratorio_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.nivel_acesso IN ('admin', 'dono')
    )
  );
