
-- Atualizar a função do trigger para capturar o usuário logado
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
    -- 1. Identificar o Usuário Logado
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Busca nome e role na tabela profiles
        BEGIN
            SELECT name, role INTO user_name_val, user_role_val
            FROM public.profiles
            WHERE id = current_user_id;
        EXCEPTION WHEN OTHERS THEN
            user_name_val := NULL;
        END;
        
        -- Fallback se não achar perfil
        IF user_name_val IS NULL THEN
            user_name_val := 'Usuário ID: ' || substring(current_user_id::text, 1, 8);
        END IF;
        
        IF user_role_val IS NULL THEN
            user_role_val := 'USER';
        END IF;
    ELSE
        -- Se não tiver usuário logado (ex: trigger via admin direto no banco ou job)
        user_name_val := 'Sistema / Admin';
        user_role_val := 'SYSTEM';
    END IF;

    -- 2. Define ação baseada na operação
    IF (TG_OP = 'INSERT') THEN
        log_action := 'Criação de Registro';
    ELSIF (TG_OP = 'UPDATE') THEN
        log_action := 'Atualização de Registro';
    ELSIF (TG_OP = 'DELETE') THEN
        log_action := 'Exclusão de Registro';
    END IF;

    -- 3. Tenta pegar o company_id do registro (NEW ou OLD)
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            company_id_val := OLD.company_id;
        ELSE
            company_id_val := NEW.company_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        company_id_val := NULL; 
    END;

    -- 4. Lógica específica por tabela para Detalhes
    IF (TG_TABLE_NAME = 'products') THEN
        log_module := 'PRODUTOS';
        -- Tenta pegar o nome do produto (tenta colunas comuns)
        BEGIN
            IF (TG_OP = 'DELETE') THEN 
                -- Tenta pegar 'name', se falhar tenta 'description', se falhar 'code'
                record_name := OLD.name; 
            ELSE 
                record_name := NEW.name; 
            END IF;
        EXCEPTION WHEN OTHERS THEN 
            record_name := 'Item sem nome'; 
        END;

        IF record_name IS NULL OR record_name = '' THEN
             record_name := '(Sem identificação)';
        END IF;

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

    -- 5. Insere o log
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
        user_role_val,
        log_action,
        log_details,
        log_module,
        'info',
        NOW()
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
