-- Criar buckets para referências de mídia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'referencias-media', 
  'referencias-media', 
  true, 
  209715200, -- 200MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/mov', 'video/webm']
);

-- Criar políticas para o bucket de referências
CREATE POLICY "Usuarios autenticados podem ver mídia de referências" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'referencias-media' AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.ativo = true
));

CREATE POLICY "Admins podem fazer upload de mídia" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'referencias-media' 
  AND is_admin_with_valid_reason(auth.uid())
);

CREATE POLICY "Admins podem atualizar mídia" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'referencias-media' 
  AND is_admin_with_valid_reason(auth.uid())
);

CREATE POLICY "Admins podem excluir mídia" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'referencias-media' 
  AND is_admin_with_valid_reason(auth.uid())
);

-- Atualizar estrutura da tabela referencias_criativos para suportar novos tipos de bloco
ALTER TABLE public.referencias_criativos 
ADD COLUMN IF NOT EXISTS versao_editor integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS configuracoes_editor jsonb DEFAULT '{
  "version": 2,
  "dragDrop": true,
  "shortcuts": true,
  "maxFileSize": 209715200
}'::jsonb;