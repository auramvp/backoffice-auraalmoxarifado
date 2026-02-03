-- Criação da tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT NOT NULL,
    user_id UUID,
    company_name TEXT NOT NULL,
    company_id UUID,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Em aberto' CHECK (status IN ('Em aberto', 'Em andamento', 'Resolvido')),
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    started_by TEXT,
    resolved_by TEXT
);

-- Habilitar RLS (Row Level Security) - Opcional, recomendado
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Política de acesso (Exemplo: permitir tudo para usuários autenticados ou pública para testes)
-- Ajuste conforme a necessidade de segurança do projeto
CREATE POLICY "Acesso total a support_tickets" ON public.support_tickets
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE public.support_tickets IS 'Tabela de chamados de suporte do BackOffice Aura';
