-- Criação da tabela de assinaturas (subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    payment_method TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'overdue', 'blocked', 'trial', 'cancelled')),
    next_billing DATE,
    last_attempt TIMESTAMPTZ,
    failure_reason TEXT
);

-- Habilitar RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Política de acesso total (ajuste conforme necessidade)
CREATE POLICY "Acesso total a subscriptions" ON public.subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.subscriptions IS 'Tabela de assinaturas do SaaS';
