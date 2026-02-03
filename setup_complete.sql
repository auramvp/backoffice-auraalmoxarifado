-- Script completo de configuração do banco de dados para BackOffice Aura
-- Inclui tabelas: plans, subscriptions, support_tickets, activity_logs

-- 1. Tabela de PLANOS (Sincronizada com Cakto)
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    external_id TEXT, -- ID na Cakto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Constraint UNIQUE para nome do plano (crucial para o webhook funcionar)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_key') THEN 
        ALTER TABLE public.plans ADD CONSTRAINT plans_name_key UNIQUE (name); 
    END IF; 
END $$;

-- 2. Tabela de ASSINATURAS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    plan TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('active', 'overdue', 'blocked', 'trial', 'cancelled')),
    next_billing TIMESTAMP WITH TIME ZONE,
    last_attempt TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    payment_method TEXT, -- Adicionado conforme solicitação
    user_email TEXT, -- Para vincular ao usuário
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Constraint UNIQUE para CNPJ (uma assinatura por empresa)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_cnpj_key') THEN 
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_cnpj_key UNIQUE (cnpj); 
    END IF; 
END $$;

-- 3. Tabela de TICKETS DE SUPORTE
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Em aberto' CHECK (status IN ('Em aberto', 'Em andamento', 'Resolvido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    started_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT,
    resolution TEXT
);

-- 4. Tabela de LOGS DE ATIVIDADE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    module TEXT,
    type TEXT DEFAULT 'info',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- POLÍTICAS DE SEGURANÇA (RLS) - Permissiva para facilitar o desenvolvimento
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total a plans" ON public.plans FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total a subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total a support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total a activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
