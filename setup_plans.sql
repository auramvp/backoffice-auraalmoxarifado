-- 1. Criação da tabela de planos (plans) se não existir
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    description TEXT,
    external_id TEXT, -- ID na Cakto
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- 2. Habilitar RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- 3. Política de acesso total
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Acesso total a plans') THEN 
        CREATE POLICY "Acesso total a plans" ON public.plans FOR ALL USING (true) WITH CHECK (true);
    END IF; 
END $$;

-- 4. Adicionar constraint UNIQUE para o nome do plano (crucial para o webhook funcionar)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_key') THEN 
        ALTER TABLE public.plans ADD CONSTRAINT plans_name_key UNIQUE (name); 
    END IF; 
END $$;
