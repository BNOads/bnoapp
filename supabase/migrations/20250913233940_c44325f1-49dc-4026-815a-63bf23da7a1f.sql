-- Criar enum para status do kickoff
CREATE TYPE public.kickoff_status AS ENUM ('draft', 'active', 'archived');

-- Tabela principal de kickoffs
CREATE TABLE public.kickoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  status kickoff_status NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(client_id) -- Um kickoff por cliente
);

-- Tabela de conteúdo do kickoff (versionamento)
CREATE TABLE public.kickoff_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kickoff_id uuid NOT NULL REFERENCES public.kickoffs(id) ON DELETE CASCADE,
  content_md text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.kickoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kickoff_content ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para kickoffs
CREATE POLICY "Usuarios autenticados podem ver kickoffs" 
ON public.kickoffs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.ativo = true
));

CREATE POLICY "Usuarios podem criar kickoffs" 
ON public.kickoffs 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins e gestores podem atualizar kickoffs" 
ON public.kickoffs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() 
    AND p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs')
));

CREATE POLICY "Admins podem arquivar kickoffs" 
ON public.kickoffs 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.nivel_acesso = 'admin'
));

-- Políticas RLS para kickoff_content
CREATE POLICY "Usuarios autenticados podem ver conteudo kickoffs" 
ON public.kickoff_content 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.ativo = true
));

CREATE POLICY "Usuarios podem criar conteudo kickoffs" 
ON public.kickoff_content 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_kickoffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kickoffs_updated_at
  BEFORE UPDATE ON public.kickoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_kickoffs_updated_at();

-- Índices para performance
CREATE INDEX idx_kickoffs_client_id ON public.kickoffs(client_id);
CREATE INDEX idx_kickoff_content_kickoff_id ON public.kickoff_content(kickoff_id);
CREATE INDEX idx_kickoff_content_version ON public.kickoff_content(kickoff_id, version DESC);