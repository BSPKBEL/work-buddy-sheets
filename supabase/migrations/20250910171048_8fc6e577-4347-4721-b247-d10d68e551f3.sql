-- Назначение пользователя a21@tut.by администратором
SELECT promote_user_to_admin('a21@tut.by');

-- Также добавим запись в user_roles напрямую для надежности
INSERT INTO public.user_roles (user_id, role, created_by, is_active) 
SELECT id, 'admin'::app_role, id, true
FROM auth.users 
WHERE email = 'a21@tut.by'
ON CONFLICT (user_id, role) DO UPDATE SET
  is_active = true,
  expires_at = NULL;