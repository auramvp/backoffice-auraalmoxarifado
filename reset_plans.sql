-- Adicionar constraint UNIQUE para o nome do plano se não existir, para permitir upsert por nome
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_key') THEN 
        ALTER TABLE public.plans ADD CONSTRAINT plans_name_key UNIQUE (name); 
    END IF; 
END $$;

-- Limpar tabela de planos (Remover planos fictícios)
TRUNCATE TABLE public.plans;
