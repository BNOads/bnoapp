-- Verificar e corrigir políticas RLS para o bucket richtext-uploads

-- Primeiro, remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar suas imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar suas imagens" ON storage.objects;

-- Políticas mais permissivas para todos os usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload no richtext-uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'richtext-uploads');

CREATE POLICY "Todos podem visualizar imagens do richtext-uploads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'richtext-uploads');

CREATE POLICY "Usuários podem atualizar suas próprias imagens"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'richtext-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem deletar suas próprias imagens"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'richtext-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);