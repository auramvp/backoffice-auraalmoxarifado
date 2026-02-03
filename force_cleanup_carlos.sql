
DO $$
DECLARE
    target_email TEXT := 'carlosgabriel.camppos@gmail.com';
    user_uid UUID;
    target_company_id UUID;
    r RECORD;
    del_query TEXT;
BEGIN
    RAISE NOTICE 'Iniciando limpeza profunda (Versão Dinâmica Inteligente)...';

    -- 1. Identificar o Usuário
    SELECT id INTO user_uid FROM auth.users WHERE email = target_email;

    -- 2. Identificar a Empresa
    SELECT id INTO target_company_id 
    FROM public.companies 
    WHERE name ILIKE '48.418.200 CARLOS GABRIEL%' 
       OR cnpj = '48.418.200/0001-95'
    LIMIT 1;

    -- Fallback ID
    IF target_company_id IS NULL THEN
        BEGIN
            target_company_id := 'dce86f24-1154-43e8-8b27-1a9c6fe2ce8a'::UUID;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    IF target_company_id IS NOT NULL THEN
        RAISE NOTICE 'Empresa alvo encontrada: %', target_company_id;

        -- 3. EXCLUSÃO INTELIGENTE DE DEPENDÊNCIAS DE PRODUTOS
        -- Verifica se tabela products existe
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
            
            -- Busca todas as tabelas que têm chave estrangeira apontando para 'products'
            FOR r IN 
                SELECT conrelid::regclass::text AS table_name, a.attname AS col_name
                FROM pg_constraint c
                JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                WHERE confrelid = 'public.products'::regclass
            LOOP
                RAISE NOTICE 'Encontrada dependência em products: Tabela % (Coluna %)', r.table_name, r.col_name;
                
                -- Monta query para deletar itens dessas tabelas que pertencem aos produtos da nossa empresa
                -- "DELETE FROM child_table WHERE child_col IN (SELECT id FROM products WHERE company_id = target_id)"
                del_query := format(
                    'DELETE FROM %s WHERE %I IN (SELECT id FROM public.products WHERE company_id = %L)', 
                    r.table_name, r.col_name, target_company_id
                );
                
                BEGIN
                    EXECUTE del_query;
                    RAISE NOTICE '  -> Registros removidos de % com sucesso.', r.table_name;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '  -> AVISO: Falha ao limpar %: %', r.table_name, SQLERRM;
                END;
            END LOOP;

            -- Agora tenta apagar os produtos
            BEGIN
                DELETE FROM public.products WHERE company_id = target_company_id;
                RAISE NOTICE 'Produtos removidos.';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'ERRO CRÍTICO ao remover produtos: %', SQLERRM;
            END;
        END IF;

        -- 4. EXCLUSÃO DE OUTRAS DEPENDÊNCIAS DIRETAS (Profiles, Invoices, etc)
        DELETE FROM public.profiles WHERE company_id = target_company_id;
        
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
             DELETE FROM public.invoices WHERE company_id = target_company_id;
        END IF;

        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
             DELETE FROM public.subscriptions WHERE company IN (SELECT name FROM public.companies WHERE id = target_company_id);
        END IF;

        -- 5. EXCLUSÃO DA EMPRESA
        BEGIN
            DELETE FROM public.companies WHERE id = target_company_id;
            RAISE NOTICE 'Empresa removida com sucesso.';
        EXCEPTION WHEN OTHERS THEN
             -- Se falhar aqui, tenta limpar dependências da própria empresa dinamicamente também
             RAISE NOTICE 'Erro ao remover empresa. Tentando limpeza profunda de dependências da empresa...';
             
             FOR r IN 
                SELECT conrelid::regclass::text AS table_name, a.attname AS col_name
                FROM pg_constraint c
                JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                WHERE confrelid = 'public.companies'::regclass
            LOOP
                del_query := format('DELETE FROM %s WHERE %I = %L', r.table_name, r.col_name, target_company_id);
                BEGIN EXECUTE del_query; EXCEPTION WHEN OTHERS THEN NULL; END;
            END LOOP;

            DELETE FROM public.companies WHERE id = target_company_id;
            RAISE NOTICE 'Empresa removida após limpeza forçada.';
        END;

    END IF;

    -- 6. Recriar Admin Limpo
    IF user_uid IS NOT NULL THEN
        DELETE FROM public.profiles WHERE id = user_uid; 
        INSERT INTO public.profiles (id, email, role, name, status, created_at, company_id)
        VALUES (user_uid, target_email, 'admin', 'Carlos Gabriel (Admin)', 'active', NOW(), NULL);
        RAISE NOTICE 'Admin recriado com sucesso.';
    ELSE
        RAISE NOTICE 'Usuário não encontrado.';
    END IF;
END $$;
