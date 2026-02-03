-- Habilitar a extensão storage se ainda não estiver
-- CREATE EXTENSION IF NOT EXISTS "storage";

-- 1. Garantir que o bucket 'files' existe e é PÚBLICO
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Remover políticas antigas para evitar conflitos (opcional, mas seguro)
DROP POLICY IF EXISTS "Public Access to Files" ON storage.objects;
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

-- 3. Criar política de LEITURA pública irrestrita para o bucket 'files'
CREATE POLICY "Public Select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'files');

-- 4. Criar política de UPLOAD para autenticados (ou public se preferir aberto)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- 5. Criar política de UPDATE para autenticados
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'files');

-- 6. Criar política de DELETE para autenticados
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'files');
