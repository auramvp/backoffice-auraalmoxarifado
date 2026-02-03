
-- CORREÇÃO DEFINITIVA DE STORAGE
-- Execute este script no SQL Editor do Supabase para corrigir o acesso ao bucket 'files'.

BEGIN;

-- 1. Garantir que o bucket 'files' existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remover TODAS as políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public Access Files" ON storage.objects;
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;

-- 3. Criar política de LEITURA irrestrita (para qualquer pessoa ver os arquivos)
CREATE POLICY "Public Access Files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'files');

-- 4. Criar política de ESCRITA (Upload) para todos (útil para teste e envio de docs)
-- Se quiser restringir depois, altere TO public para TO authenticated
CREATE POLICY "Public Insert Files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'files');

-- 5. Criar política de ATUALIZAÇÃO/DELEÇÃO (Opcional, mas útil para admin)
CREATE POLICY "Public Update Files"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'files');

CREATE POLICY "Public Delete Files"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'files');

COMMIT;
