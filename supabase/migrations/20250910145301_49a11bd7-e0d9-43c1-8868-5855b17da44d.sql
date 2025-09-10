-- Расширенная система ролей
CREATE TYPE public.app_role AS ENUM ('admin', 'foreman', 'worker', 'guest');

-- Таблица пользователей с расширенными ролями
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  UNIQUE (user_id, role)
);

-- Временные разрешения
CREATE TABLE public.temporary_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- Аудит действий пользователей
CREATE TABLE public.user_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT
);

-- Настройки AI провайдеров
CREATE TABLE public.ai_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL, -- 'openai', 'anthropic', 'deepseek', etc.
  api_endpoint TEXT,
  model_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 1,
  max_tokens INTEGER,
  temperature DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Системные настройки
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (category, key)
);

-- 2FA настройки
CREATE TABLE public.user_2fa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  secret TEXT,
  backup_codes TEXT[],
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS на всех таблицах
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

-- Функция для проверки расширенных ролей
CREATE OR REPLACE FUNCTION public.has_role_enhanced(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Функция для проверки временных разрешений
CREATE OR REPLACE FUNCTION public.has_temp_permission(_user_id UUID, _project_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.temporary_permissions
    WHERE user_id = _user_id
      AND (project_id = _project_id OR project_id IS NULL)
      AND permission_type = _permission
      AND is_active = true
      AND expires_at > now()
  )
$$;

-- Функция аудита
CREATE OR REPLACE FUNCTION public.log_user_action(_action TEXT, _table_name TEXT DEFAULT NULL, _record_id UUID DEFAULT NULL, _old_values JSONB DEFAULT NULL, _new_values JSONB DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.user_audit_log (
    user_id, action, table_name, record_id, old_values, new_values
  ) VALUES (
    auth.uid(), _action, _table_name, _record_id, _old_values, _new_values
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- RLS политики для user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (has_role_enhanced(auth.uid(), 'admin'));

CREATE POLICY "Foremen can view worker roles" ON public.user_roles
FOR SELECT USING (
  has_role_enhanced(auth.uid(), 'foreman') AND role IN ('worker', 'guest')
);

CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- RLS политики для temporary_permissions
CREATE POLICY "Admins can manage all temp permissions" ON public.temporary_permissions
FOR ALL USING (has_role_enhanced(auth.uid(), 'admin'));

CREATE POLICY "Foremen can manage project permissions" ON public.temporary_permissions
FOR ALL USING (
  has_role_enhanced(auth.uid(), 'foreman') AND 
  EXISTS (
    SELECT 1 FROM public.worker_assignments 
    WHERE foreman_id IN (
      SELECT id FROM public.workers WHERE id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- RLS политики для audit log
CREATE POLICY "Admins can view all audit logs" ON public.user_audit_log
FOR SELECT USING (has_role_enhanced(auth.uid(), 'admin'));

CREATE POLICY "Users can view own audit logs" ON public.user_audit_log
FOR SELECT USING (user_id = auth.uid());

-- RLS политики для AI providers
CREATE POLICY "Admins can manage AI providers" ON public.ai_providers
FOR ALL USING (has_role_enhanced(auth.uid(), 'admin'));

-- RLS политики для system settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
FOR ALL USING (has_role_enhanced(auth.uid(), 'admin'));

CREATE POLICY "Public settings are visible to authenticated users" ON public.system_settings
FOR SELECT USING (is_public = true AND auth.uid() IS NOT NULL);

-- RLS политики для 2FA
CREATE POLICY "Users can manage own 2FA" ON public.user_2fa
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view 2FA status" ON public.user_2fa
FOR SELECT USING (has_role_enhanced(auth.uid(), 'admin'));

-- Триггеры для audit log
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_user_action('INSERT', TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_user_action('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_user_action('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Применяем триггеры аудита к основным таблицам
CREATE TRIGGER audit_workers AFTER INSERT OR UPDATE OR DELETE ON public.workers
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects  
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Обновляем функцию обновления updated_at
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_2fa_updated_at BEFORE UPDATE ON public.user_2fa
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Вставляем базовые настройки системы
INSERT INTO public.system_settings (category, key, value, description, is_public, updated_by) VALUES
('general', 'app_name', '"Work Buddy"', 'Название приложения', true, (SELECT id FROM auth.users LIMIT 1)),
('general', 'app_version', '"3.0"', 'Версия приложения', true, (SELECT id FROM auth.users LIMIT 1)),
('security', 'session_timeout', '3600', 'Таймаут сессии в секундах', false, (SELECT id FROM auth.users LIMIT 1)),
('security', 'max_login_attempts', '5', 'Максимальное количество попыток входа', false, (SELECT id FROM auth.users LIMIT 1)),
('ai', 'default_provider', '"openai"', 'AI провайдер по умолчанию', false, (SELECT id FROM auth.users LIMIT 1)),
('notifications', 'telegram_enabled', 'true', 'Включены ли Telegram уведомления', false, (SELECT id FROM auth.users LIMIT 1));