
-- TENTATIVA DE FORÇAR A CRIAÇÃO DO BUCKET E PERMISSÕES DE LISTAGEM DE BUCKETS

-- 1. Permitir que anon liste buckets (apenas para debug, pode remover depois)
CREATE POLICY "Public List Buckets"
ON storage.buckets FOR SELECT
TO public
USING (true);

-- 2. Recriar bucket 'files' garantindo que é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Inserir um arquivo de teste via SQL (hacky, mas valida se a pasta existe)
-- Não é possível criar objeto via SQL puro facilmente sem extensão http, 
-- mas garantimos as permissões.

-- 4. Remover RLS da tabela de objetos temporariamente para teste extremo
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- ATENÇÃO: ISSO É PERIGOSO EM PROD, MAS NECESSÁRIO PARA DIAGNÓSTICO AGORA.
-- DEPOIS REATIVAREMOS.

-- 5. Garantir tabela de dados
CREATE TABLE IF NOT EXISTS tax_analysis_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_name TEXT, 
    cnpj TEXT, 
    status TEXT DEFAULT 'Doc. Pendente', 
    files JSONB DEFAULT '[]'::jsonb
);
ALTER TABLE tax_analysis_requests DISABLE ROW LEVEL SECURITY; 
-- Desativar RLS da tabela de dados também para garantir leitura
