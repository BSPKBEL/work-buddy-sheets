-- Fix column reference ambiguity in promote_user_to_admin function
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS TEXT AS $$
DECLARE
    target_user_id uuid;
    result_message text;
BEGIN
    -- Find user by email in auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email 
    LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RETURN 'Пользователь с email ' || user_email || ' не найден';
    END IF;
    
    -- Update user role to admin in profiles table
    UPDATE public.profiles 
    SET role = 'admin', updated_at = now()
    WHERE user_id = target_user_id;
    
    IF FOUND THEN
        result_message := 'Пользователь ' || user_email || ' успешно назначен администратором';
    ELSE
        -- Create profile if it doesn't exist
        INSERT INTO public.profiles (user_id, role, full_name)
        SELECT target_user_id, 'admin', raw_user_meta_data->>'full_name'
        FROM auth.users
        WHERE id = target_user_id;
        
        result_message := 'Создан профиль администратора для ' || user_email;
    END IF;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;