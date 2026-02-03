
-- 1. CRIAR A TABELA ACTIVITY_LOGS (Garante que ela existe antes de tudo)
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

-- Habilitar RLS para segurança
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
-- Política permissiva para evitar erros de permissão
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Acesso total a activity_logs'
    ) THEN
        CREATE POLICY "Acesso total a activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;


-- 2. Adicionar campo para vincular logs à empresa (se ainda não existir)
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS company_id UUID;

-- Criar índice para performance nas buscas por empresa
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON public.activity_logs(company_id);

-- 3. Função Trigger para registrar logs automaticamente
CREATE OR REPLACE FUNCTION public.log_activity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    log_action TEXT;
    log_details TEXT;
    log_module TEXT;
    user_name_val TEXT := 'Sistema';
    company_id_val UUID;
    record_name TEXT;
BEGIN
    -- Define ação baseada na operação
    IF (TG_OP = 'INSERT') THEN
        log_action := 'Criação de Registro';
    ELSIF (TG_OP = 'UPDATE') THEN
        log_action := 'Atualização de Registro';
    ELSIF (TG_OP = 'DELETE') THEN
        log_action := 'Exclusão de Registro';
    END IF;

    -- Tenta pegar o company_id do registro (NEW ou OLD)
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            company_id_val := OLD.company_id;
        ELSE
            company_id_val := NEW.company_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        company_id_val := NULL; 
    END;

    -- Lógica específica por tabela
    IF (TG_TABLE_NAME = 'products') THEN
        log_module := 'PRODUTOS';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'N/A'; END;

        IF (TG_OP = 'INSERT') THEN
            log_details := format('Novo produto cadastrado: %s', record_name);
        ELSIF (TG_OP = 'UPDATE') THEN
            log_details := format('Produto atualizado: %s', record_name);
        ELSE
            log_details := format('Produto removido: %s', record_name);
        END IF;

    ELSIF (TG_TABLE_NAME IN ('stock_movements', 'movements', 'inventory_movements')) THEN
        log_module := 'ESTOQUE';
        IF (TG_OP = 'INSERT') THEN
            log_details := 'Nova movimentação de estoque registrada';
        ELSE
            log_details := 'Movimentação de estoque alterada';
        END IF;
    ELSE
        log_module := TG_TABLE_NAME;
        log_details := format('Operação %s em %s', TG_OP, TG_TABLE_NAME);
    END IF;

    -- Insere o log
    INSERT INTO public.activity_logs (
        company_id,
        user_name,
        user_role,
        action,
        details,
        module,
        type,
        timestamp
    ) VALUES (
        company_id_val,
        user_name_val,
        'SYSTEM',
        log_action,
        log_details,
        log_module,
        'info',
        NOW()
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Aplicar Trigger na tabela PRODUCTS
DROP TRIGGER IF EXISTS trg_log_products ON public.products;
CREATE TRIGGER trg_log_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();

-- 5. Aplicar Trigger nas tabelas de MOVIMENTAÇÃO (Detecta qual existe)
DO $$
BEGIN
    -- Verifica stock_movements
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_movements') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_log_stock_movements ON public.stock_movements';
        EXECUTE 'CREATE TRIGGER trg_log_stock_movements AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger()';
        RAISE NOTICE 'Trigger aplicado em stock_movements';
    END IF;

    -- Verifica movements
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'movements') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_log_movements ON public.movements';
        EXECUTE 'CREATE TRIGGER trg_log_movements AFTER INSERT OR UPDATE OR DELETE ON public.movements FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger()';
        RAISE NOTICE 'Trigger aplicado em movements';
    END IF;
    
     -- Verifica inventory_movements
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_movements') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_log_inventory_movements ON public.inventory_movements';
        EXECUTE 'CREATE TRIGGER trg_log_inventory_movements AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger()';
        RAISE NOTICE 'Trigger aplicado em inventory_movements';
    END IF;
END $$;
