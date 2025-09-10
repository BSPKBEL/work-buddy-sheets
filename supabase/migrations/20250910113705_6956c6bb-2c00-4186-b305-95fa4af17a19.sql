-- Create function to manually promote user to admin (run this after first user registers)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS TEXT AS $$
DECLARE
    user_id uuid;
    result_message text;
BEGIN
    -- Find user by email in auth.users
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = user_email 
    LIMIT 1;
    
    IF user_id IS NULL THEN
        RETURN 'Пользователь с email ' || user_email || ' не найден';
    END IF;
    
    -- Update user role to admin in profiles table
    UPDATE public.profiles 
    SET role = 'admin', updated_at = now()
    WHERE user_id = user_id;
    
    IF FOUND THEN
        result_message := 'Пользователь ' || user_email || ' успешно назначен администратором';
    ELSE
        -- Create profile if it doesn't exist
        INSERT INTO public.profiles (user_id, role, full_name)
        SELECT user_id, 'admin', raw_user_meta_data->>'full_name'
        FROM auth.users
        WHERE id = user_id;
        
        result_message := 'Создан профиль администратора для ' || user_email;
    END IF;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check system security status
CREATE OR REPLACE FUNCTION public.check_security_status()
RETURNS TABLE (
    security_check text,
    status text,
    details text
) AS $$
BEGIN
    -- Check RLS is enabled
    RETURN QUERY
    SELECT 
        'Row Level Security'::text,
        CASE WHEN COUNT(*) = 5 THEN 'Включен' ELSE 'Проблема' END::text,
        'RLS включен для ' || COUNT(*) || ' из 5 основных таблиц'::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('workers', 'attendance', 'payments', 'projects', 'profiles')
    AND EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = t.table_name 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    );
    
    -- Check admin users exist
    RETURN QUERY
    SELECT 
        'Администраторы'::text,
        CASE WHEN COUNT(*) > 0 THEN 'Настроены' ELSE 'Отсутствуют' END::text,
        'Администраторов в системе: ' || COUNT(*)::text
    FROM public.profiles
    WHERE role = 'admin';
    
    -- Check policies exist
    RETURN QUERY
    SELECT 
        'Политики безопасности'::text,
        CASE WHEN COUNT(*) > 10 THEN 'Настроены' ELSE 'Недостаточно' END::text,
        'Активных политик RLS: ' || COUNT(*)::text
    FROM pg_policies
    WHERE schemaname = 'public';
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;