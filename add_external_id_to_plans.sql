-- Adicionar coluna external_id na tabela plans se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'external_id') THEN 
        ALTER TABLE public.plans ADD COLUMN external_id TEXT; 
    END IF; 
END $$;
