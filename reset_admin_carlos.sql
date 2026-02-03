-- Script para limpar dados do usuário e torná-lo Admin

-- 1. Remover dados vinculados ao email carlosgabriel.camppos@gmail.com
-- (Assume que o ID do usuário em auth.users é necessário para identificar o profile)

DO $$
DECLARE
    target_email TEXT := 'carlosgabriel.camppos@gmail.com';
    user_uid UUID;
    company_id_to_delete UUID;
BEGIN
    -- Obter UUID do usuário
    SELECT id INTO user_uid FROM auth.users WHERE email = target_email;

    IF user_uid IS NOT NULL THEN
        -- Obter ID da empresa vinculada ao perfil (se houver)
        SELECT company_id INTO company_id_to_delete FROM public.profiles WHERE id = user_uid;

        -- Remover Profile
        DELETE FROM public.profiles WHERE id = user_uid;
        RAISE NOTICE 'Perfil removido para %', target_email;
        
        -- Se não achou company_id no profile, tentar pelo ID conhecido do bloqueio
        IF company_id_to_delete IS NULL THEN
            company_id_to_delete := 'dce86f24-1154-43e8-8b27-1a9c6fe2ce8a';
        END IF;

        -- Remover Empresa e dados relacionados
        IF company_id_to_delete IS NOT NULL THEN
            DELETE FROM public.invoices WHERE company_id = company_id_to_delete;
            DELETE FROM public.subscriptions WHERE company IN (SELECT name FROM public.companies WHERE id = company_id_to_delete);
            DELETE FROM public.companies WHERE id = company_id_to_delete;
            RAISE NOTICE 'Empresa removida: %', company_id_to_delete;
        END IF;

        -- Recriar Profile como Admin
        -- Nota: Assume que a tabela profiles tem colunas id, email, role, status, name
        -- Se a tabela não tiver 'role', o comando abaixo pode falhar ou precisar de ajuste.
        -- Baseado no código, parece haver verificação de role.
        
        INSERT INTO public.profiles (id, email, role, name, status, created_at)
        VALUES (
            user_uid, 
            target_email, 
            'admin', -- Definindo como Admin
            'Carlos Gabriel (Admin)', 
            'active',
            NOW()
        );
        RAISE NOTICE 'Usuário recriado como Admin.';
        
    ELSE
        RAISE NOTICE 'Usuário com email % não encontrado em auth.users.', target_email;
    END IF;
END $$;
