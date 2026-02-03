
-- Tabela de Categorias de Despesas
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    color TEXT
);

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE,
    category TEXT,
    status TEXT DEFAULT 'Pago',
    recurrence TEXT,
    billing_day INTEGER,
    is_cac BOOLEAN DEFAULT false,
    company_id UUID
);

-- Habilitar RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Drop and Recreate para evitar erros de duplicação)
DROP POLICY IF EXISTS "Acesso total a expense_categories" ON public.expense_categories;
CREATE POLICY "Acesso total a expense_categories" ON public.expense_categories
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total a expenses" ON public.expenses;
CREATE POLICY "Acesso total a expenses" ON public.expenses
    FOR ALL
    USING (true)
    WITH CHECK (true);
