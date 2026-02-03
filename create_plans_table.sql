-- Criação da tabela de planos (plans)
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    description TEXT,
    external_id TEXT, -- ID na Cakto
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- Habilitar RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Política de acesso total
CREATE POLICY "Acesso total a plans" ON public.plans
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Inserir alguns planos padrão (Exemplos baseados no contexto)
INSERT INTO public.plans (name, value, description, status) VALUES
('Plano Starter', 99.90, 'Para pequenas empresas', 'active'),
('Plano Pro', 199.90, 'Para empresas em crescimento', 'active'),
('Plano Enterprise', 499.90, 'Soluções completas para grandes volumes', 'active')
ON CONFLICT DO NOTHING;
