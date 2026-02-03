
-- Script Completo para Monitoramento Global de Atividades
-- Garante que TODAS as tabelas críticas gerem logs de atividade

-- 0. Garantir colunas necessárias para vínculo com empresa
DO $$
BEGIN
    -- Adicionar company_id em team_members se não existir
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.team_members'::regclass AND attname = 'company_id') THEN
            ALTER TABLE public.team_members ADD COLUMN company_id UUID;
            RAISE NOTICE 'Coluna company_id adicionada em team_members';
        END IF;
    END IF;
END $$;

-- 1. Atualizar Função de Log (Melhorada para cobrir mais módulos)
CREATE OR REPLACE FUNCTION public.log_activity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    log_action TEXT;
    log_details TEXT;
    log_module TEXT;
    user_name_val TEXT;
    user_role_val TEXT;
    current_user_id UUID;
    company_id_val UUID;
    record_name TEXT;
BEGIN
    -- --- IDENTIFICAÇÃO DO USUÁRIO ---
    current_user_id := auth.uid();
            
            -- TENTATIVA DE RECUPERAR O USUÁRIO SE AUTH.UID() FOR NULO (Service Role ou API)
            IF current_user_id IS NULL THEN
                BEGIN
                    -- Tenta pegar o user_id do próprio registro (comum em expenses, support_tickets, etc)
                    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                        BEGIN
                            current_user_id := NEW.user_id;
                        EXCEPTION WHEN OTHERS THEN NULL; END;
                    END IF;
                EXCEPTION WHEN OTHERS THEN NULL; END;
            END IF;

            IF current_user_id IS NOT NULL THEN
                BEGIN
            SELECT name, role INTO user_name_val, user_role_val
            FROM public.profiles
            WHERE id = current_user_id;
        EXCEPTION WHEN OTHERS THEN user_name_val := NULL; END;
        
        IF user_name_val IS NULL THEN
            user_name_val := 'Usuário (ID Oculto)';
        END IF;
        IF user_role_val IS NULL THEN user_role_val := 'USER'; END IF;
    ELSE
        user_name_val := 'Sistema / Admin';
        user_role_val := 'SYSTEM';
    END IF;

    -- --- IDENTIFICAÇÃO DA AÇÃO ---
    IF (TG_OP = 'INSERT') THEN log_action := 'Criação';
    ELSIF (TG_OP = 'UPDATE') THEN log_action := 'Edição';
    ELSIF (TG_OP = 'DELETE') THEN log_action := 'Exclusão';
    END IF;

    -- --- IDENTIFICAÇÃO DA EMPRESA ---
    -- Tenta pegar company_id. Se falhar (tabela sem company_id), fica NULL (log global)
    BEGIN
        IF (TG_OP = 'DELETE') THEN company_id_val := OLD.company_id;
        ELSE company_id_val := NEW.company_id; END IF;
    EXCEPTION WHEN OTHERS THEN company_id_val := NULL; END;

    -- --- DETALHES ESPECÍFICOS POR TABELA ---
    
    -- 1. PROFILES (Usuários/Equipe)
    IF (TG_TABLE_NAME = 'profiles') THEN
        log_module := 'EQUIPE';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Usuário'; END;
        
        IF (TG_OP = 'INSERT') THEN log_details := format('Novo colaborador adicionado: %s', record_name);
        ELSIF (TG_OP = 'UPDATE') THEN log_details := format('Dados do colaborador alterados: %s', record_name);
        ELSE log_details := format('Colaborador removido: %s', record_name); END IF;

    -- 2. PRODUCTS (Produtos)
    ELSIF (TG_TABLE_NAME = 'products') THEN
        log_module := 'PRODUTOS';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Produto'; END;
        
        log_details := format('%s de produto: %s', log_action, record_name);

    -- 3. EXPENSES (Financeiro)
    ELSIF (TG_TABLE_NAME = 'expenses') THEN
        log_module := 'FINANCEIRO';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Despesa'; END;
        
        log_details := format('Despesa %s: %s', CASE WHEN TG_OP='INSERT' THEN 'registrada' ELSE 'atualizada' END, record_name);

    -- 4. MOVIMENTAÇÕES (Estoque)
    ELSIF (TG_TABLE_NAME IN ('stock_movements', 'movements', 'inventory_movements')) THEN
        log_module := 'ESTOQUE';
        log_details := 'Movimentação de estoque realizada';

    -- 5. COMPANIES (Empresa)
    ELSIF (TG_TABLE_NAME = 'companies') THEN
        log_module := 'CONFIGURAÇÕES';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Empresa'; END;
        
        IF (TG_OP = 'UPDATE') THEN log_details := format('Dados da empresa %s atualizados', record_name);
        ELSE log_details := format('Empresa %s %s', record_name, CASE WHEN TG_OP='INSERT' THEN 'criada' ELSE 'removida' END); END IF;
        
        -- Ajuste especial: Se for update na própria empresa, o ID é o próprio ID da linha
        IF (TG_OP = 'DELETE') THEN company_id_val := OLD.id; ELSE company_id_val := NEW.id; END IF;

    -- 6. SUBSCRIPTIONS (Assinaturas)
    ELSIF (TG_TABLE_NAME = 'subscriptions') THEN
        log_module := 'ASSINATURA';
        log_details := format('Status da assinatura alterado (%s)', TG_OP);

    ELSIF (TG_TABLE_NAME IN ('sectors', 'departments')) THEN
        log_module := 'SETOR';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Setor'; END;
        
        log_details := format('Setor %s: %s', CASE WHEN TG_OP='INSERT' THEN 'criado' ELSE 'atualizado' END, record_name);

    ELSIF (TG_TABLE_NAME = 'team_members') THEN
        log_module := 'EQUIPE';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Membro'; END;
        
        log_details := format('Membro da equipe %s: %s', CASE WHEN TG_OP='INSERT' THEN 'adicionado' ELSE 'atualizado' END, record_name);

    -- 7. PLANOS
    ELSIF (TG_TABLE_NAME = 'plans') THEN
        log_module := 'PLANOS';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Plano'; END;
        
        log_details := format('Plano %s: %s', CASE WHEN TG_OP='INSERT' THEN 'criado' ELSE 'atualizado' END, record_name);

    -- 8. CATEGORIAS DE DESPESA
    ELSIF (TG_TABLE_NAME = 'expense_categories') THEN
        log_module := 'FINANCEIRO';
        BEGIN
            IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF;
        EXCEPTION WHEN OTHERS THEN record_name := 'Categoria'; END;
        
        log_details := format('Categoria de despesa %s: %s', CASE WHEN TG_OP='INSERT' THEN 'criada' ELSE 'atualizada' END, record_name);

    -- DEFAULT (Outras tabelas)
    ELSE
        log_module := TG_TABLE_NAME;
        log_details := format('Registro %s na tabela %s', log_action, TG_TABLE_NAME);
    END IF;

    -- --- GRAVAÇÃO DO LOG ---
    INSERT INTO public.activity_logs (
        company_id, user_name, user_role, action, details, module, type, timestamp
    ) VALUES (
        company_id_val, user_name_val, user_role_val, log_action, log_details, log_module, 'info', NOW()
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- 2. Aplicar Triggers em Massa
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['profiles', 'products', 'expenses', 'companies', 'subscriptions', 'support_tickets', 'sectors', 'departments', 'team_members', 'positions', 'roles', 'job_titles'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Verifica se a tabela existe
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            -- Remove trigger antigo se existir
            EXECUTE format('DROP TRIGGER IF EXISTS trg_log_%I ON public.%I', t, t);
            -- Cria novo trigger
            EXECUTE format('CREATE TRIGGER trg_log_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger()', t, t);
            RAISE NOTICE 'Trigger de log aplicado em: %', t;
        END IF;
    END LOOP;
    
    -- Tabelas de movimentação (nomes variados, tenta todos)
    FOREACH t IN ARRAY ARRAY['stock_movements', 'movements', 'inventory_movements']
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_log_%I ON public.%I', t, t);
            EXECUTE format('CREATE TRIGGER trg_log_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger()', t, t);
            RAISE NOTICE 'Trigger de log aplicado em: %', t;
        END IF;
    END LOOP;
END $$;
