-- Script de Correção para Logs de Atividade
-- Este script corrige o problema onde logs automáticos aparecem como "Usuário (ID Oculto)" ou "Sistema".
-- Ele melhora a função de trigger para identificar corretamente o usuário logado.

-- 1. Garantir que a tabela de logs tenha a coluna user_id para auditoria futura
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.activity_logs'::regclass AND attname = 'user_id') THEN
            ALTER TABLE public.activity_logs ADD COLUMN user_id UUID;
        END IF;
    END IF;
END $$;

-- 2. Atualizar a Função de Log com SECURITY DEFINER e melhor detecção de usuário
CREATE OR REPLACE FUNCTION public.log_activity_trigger()
RETURNS TRIGGER
SECURITY DEFINER -- Permite ler a tabela profiles mesmo com RLS ativado
SET search_path = public -- Segurança
AS $$
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
    
    -- Tenta recuperar o usuário
    IF current_user_id IS NOT NULL THEN
        -- 1. Tenta buscar da tabela profiles
        BEGIN
            SELECT name, role INTO user_name_val, user_role_val
            FROM public.profiles
            WHERE id = current_user_id;
        EXCEPTION WHEN OTHERS THEN 
            NULL; 
        END;
        
        -- 2. Se não achou em profiles, tenta pegar dos metadados do JWT (Auth)
        IF user_name_val IS NULL THEN
            -- Tenta pegar nome dos metadados
            BEGIN
                user_name_val := current_setting('request.jwt.claim.user_metadata', true)::json->>'name';
                IF user_name_val IS NULL THEN
                     user_name_val := current_setting('request.jwt.claim.email', true);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    ELSE
        -- Se não tem auth.uid(), pode ser uma operação de sistema ou service role
        -- Tenta pegar o user_id do registro inserido (se houver coluna user_id na tabela alvo)
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                current_user_id := NEW.user_id;
                IF current_user_id IS NOT NULL THEN
                    SELECT name, role INTO user_name_val, user_role_val
                    FROM public.profiles
                    WHERE id = current_user_id;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    -- 3. Fallbacks Finais
    IF user_name_val IS NULL THEN
        IF current_user_id IS NOT NULL THEN
             user_name_val := 'Usuário Desconhecido';
        ELSE
             user_name_val := 'Sistema / Automação';
             user_role_val := 'SYSTEM';
        END IF;
    END IF;
    
    IF user_role_val IS NULL THEN
        user_role_val := 'USER';
    END IF;

    -- --- IDENTIFICAÇÃO DA AÇÃO ---
    IF (TG_OP = 'INSERT') THEN log_action := 'Criação';
    ELSIF (TG_OP = 'UPDATE') THEN log_action := 'Edição';
    ELSIF (TG_OP = 'DELETE') THEN log_action := 'Exclusão';
    END IF;

    -- --- IDENTIFICAÇÃO DA EMPRESA ---
    BEGIN
        IF (TG_OP = 'DELETE') THEN company_id_val := OLD.company_id;
        ELSE company_id_val := NEW.company_id; END IF;
    EXCEPTION WHEN OTHERS THEN company_id_val := NULL; END;

    -- --- DETALHES ESPECÍFICOS POR TABELA ---
    
    -- 1. PROFILES (Usuários/Equipe)
    IF (TG_TABLE_NAME = 'profiles') THEN
        log_module := 'EQUIPE';
        BEGIN IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF; EXCEPTION WHEN OTHERS THEN record_name := 'Usuário'; END;
        IF (TG_OP = 'INSERT') THEN log_details := format('Novo colaborador adicionado: %s', record_name);
        ELSIF (TG_OP = 'UPDATE') THEN log_details := format('Dados do colaborador alterados: %s', record_name);
        ELSE log_details := format('Colaborador removido: %s', record_name); END IF;

    -- 2. PRODUCTS (Produtos)
    ELSIF (TG_TABLE_NAME = 'products') THEN
        log_module := 'PRODUTOS';
        BEGIN IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF; EXCEPTION WHEN OTHERS THEN record_name := 'Produto'; END;
        log_details := format('%s de produto: %s', log_action, record_name);

    -- 3. EXPENSES (Financeiro)
    ELSIF (TG_TABLE_NAME = 'expenses') THEN
        log_module := 'FINANCEIRO';
        BEGIN IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF; EXCEPTION WHEN OTHERS THEN record_name := 'Despesa'; END;
        log_details := format('Despesa %s: %s', CASE WHEN TG_OP='INSERT' THEN 'registrada' ELSE 'atualizada' END, record_name);

    -- 4. MOVIMENTAÇÕES (Estoque)
    ELSIF (TG_TABLE_NAME IN ('stock_movements', 'movements', 'inventory_movements')) THEN
        log_module := 'ESTOQUE';
        log_details := 'Movimentação de estoque realizada';

    -- 5. COMPANIES (Empresa)
    ELSIF (TG_TABLE_NAME = 'companies') THEN
        log_module := 'CONFIGURAÇÕES';
        BEGIN IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF; EXCEPTION WHEN OTHERS THEN record_name := 'Empresa'; END;
        IF (TG_OP = 'UPDATE') THEN log_details := format('Dados da empresa %s atualizados', record_name);
        ELSE log_details := format('Empresa %s %s', record_name, CASE WHEN TG_OP='INSERT' THEN 'criada' ELSE 'removida' END); END IF;
        IF (TG_OP = 'DELETE') THEN company_id_val := OLD.id; ELSE company_id_val := NEW.id; END IF;

    -- 6. SUBSCRIPTIONS (Assinaturas)
    ELSIF (TG_TABLE_NAME = 'subscriptions') THEN
        log_module := 'ASSINATURA';
        log_details := format('Status da assinatura alterado (%s)', TG_OP);

    -- 7. TEAM_MEMBERS
    ELSIF (TG_TABLE_NAME = 'team_members') THEN
        log_module := 'EQUIPE';
        BEGIN IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF; EXCEPTION WHEN OTHERS THEN record_name := 'Membro'; END;
        log_details := format('Membro da equipe %s: %s', CASE WHEN TG_OP='INSERT' THEN 'adicionado' ELSE 'atualizado' END, record_name);

    -- 8. PLANOS
    ELSIF (TG_TABLE_NAME = 'plans') THEN
        log_module := 'PLANOS';
        BEGIN IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF; EXCEPTION WHEN OTHERS THEN record_name := 'Plano'; END;
        log_details := format('Plano %s: %s', CASE WHEN TG_OP='INSERT' THEN 'criado' ELSE 'atualizado' END, record_name);

    -- 9. CATEGORIAS DE DESPESA
    ELSIF (TG_TABLE_NAME = 'expense_categories') THEN
        log_module := 'FINANCEIRO';
        BEGIN IF (TG_OP = 'DELETE') THEN record_name := OLD.name; ELSE record_name := NEW.name; END IF; EXCEPTION WHEN OTHERS THEN record_name := 'Categoria'; END;
        log_details := format('Categoria de despesa %s: %s', CASE WHEN TG_OP='INSERT' THEN 'criada' ELSE 'atualizada' END, record_name);

    -- DEFAULT
    ELSE
        log_module := TG_TABLE_NAME;
        log_details := format('Registro %s na tabela %s', log_action, TG_TABLE_NAME);
    END IF;

    -- --- GRAVAÇÃO DO LOG ---
    -- Verifica se a coluna user_id existe antes de tentar inserir
    -- (Isso é tricky em PL/pgSQL dinâmico, então vamos assumir que existe se criamos acima, ou ignorar na inserção se for complexo. 
    --  Para simplificar, vamos tentar inserir user_id. Se falhar, a trigger falha? Sim.
    --  Então vamos usar a tabela que sabemos que existe: activity_logs)
    
    INSERT INTO public.activity_logs (
        company_id, user_name, user_role, action, details, module, type, timestamp, user_id
    ) VALUES (
        company_id_val, user_name_val, user_role_val, log_action, log_details, log_module, 'info', NOW(), current_user_id
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
