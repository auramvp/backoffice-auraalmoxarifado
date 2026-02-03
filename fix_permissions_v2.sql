
-- CORREÇÃO TOTAL DE PERMISSÕES (Recuperação Tributária)
-- Rode este script no SQL Editor do Supabase para corrigir o acesso.

-- 1. Habilitar o Bucket 'files' como PÚBLICO
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Permitir acesso total (SELECT, INSERT, UPDATE) ao bucket 'files' para TODOS (Public)
-- (Isso resolve problemas de RLS bloqueando a listagem de arquivos)
DROP POLICY IF EXISTS "Public Access Files" ON storage.objects;
CREATE POLICY "Public Access Files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'files');

-- 3. Criar a tabela 'tax_analysis_requests' se não existir (apenas segurança)
CREATE TABLE IF NOT EXISTS tax_analysis_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_name TEXT,
    cnpj TEXT,
    status TEXT DEFAULT 'pending',
    files JSONB DEFAULT '[]'::jsonb
);

-- 4. Permitir leitura pública na tabela 'tax_analysis_requests'
ALTER TABLE tax_analysis_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Requests" ON tax_analysis_requests;
CREATE POLICY "Public Read Requests" 
ON tax_analysis_requests FOR SELECT 
TO public 
USING (true);

-- 5. Permitir inserção (caso o sistema precise criar registros)
DROP POLICY IF EXISTS "Public Insert Requests" ON tax_analysis_requests;
CREATE POLICY "Public Insert Requests" 
ON tax_analysis_requests FOR INSERT 
TO public 
WITH CHECK (true);
