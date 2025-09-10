-- Phase 1: Critical Security Fixes

-- Update RLS policies to use enhanced role system instead of legacy profile roles
-- Remove anonymous access and fix security vulnerabilities

-- 1. Update workers table RLS policy
DROP POLICY IF EXISTS "Admin full access to workers" ON public.workers;
CREATE POLICY "Admin full access to workers" 
ON public.workers 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

-- 2. Update attendance table RLS policy
DROP POLICY IF EXISTS "Admin full access to attendance" ON public.attendance;
CREATE POLICY "Admin full access to attendance" 
ON public.attendance 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

-- 3. Update payments table RLS policy
DROP POLICY IF EXISTS "Admin full access to payments" ON public.payments;
CREATE POLICY "Admin full access to payments" 
ON public.payments 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

-- 4. Update projects table RLS policy
DROP POLICY IF EXISTS "Admin full access to projects" ON public.projects;
CREATE POLICY "Admin full access to projects" 
ON public.projects 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

-- 5. Update profiles table RLS policies to be more secure
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

-- Add policy for admin to update any profile
CREATE POLICY "Admin can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

-- 6. Update all other tables to use enhanced role system
DROP POLICY IF EXISTS "Admin full access to skills" ON public.skills;
CREATE POLICY "Admin full access to skills" 
ON public.skills 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to worker_skills" ON public.worker_skills;
CREATE POLICY "Admin full access to worker_skills" 
ON public.worker_skills 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to worker_assignments" ON public.worker_assignments;
CREATE POLICY "Admin full access to worker_assignments" 
ON public.worker_assignments 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to clients" ON public.clients;
CREATE POLICY "Admin full access to clients" 
ON public.clients 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to certifications" ON public.certifications;
CREATE POLICY "Admin full access to certifications" 
ON public.certifications 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to expense_categories" ON public.expense_categories;
CREATE POLICY "Admin full access to expense_categories" 
ON public.expense_categories 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to worker_expenses" ON public.worker_expenses;
CREATE POLICY "Admin full access to worker_expenses" 
ON public.worker_expenses 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to project_expenses" ON public.project_expenses;
CREATE POLICY "Admin full access to project_expenses" 
ON public.project_expenses 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin full access to project_tasks" ON public.project_tasks;
CREATE POLICY "Admin full access to project_tasks" 
ON public.project_tasks 
FOR ALL 
USING (has_role_enhanced(auth.uid(), 'admin'::app_role));

-- 7. Add secure user lookup function for SystemSettings
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1;
$$;

-- 8. Create enhanced security function for role checking with temporary permissions
CREATE OR REPLACE FUNCTION public.check_user_access(_user_id uuid, _required_role app_role, _project_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role_enhanced(_user_id, _required_role) OR
    (_project_id IS NOT NULL AND has_temp_permission(_user_id, _project_id, _required_role::text))
$$;

-- 9. Add audit triggers to critical tables for security monitoring
CREATE OR REPLACE FUNCTION public.security_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log security-sensitive operations
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'user_roles' THEN
    PERFORM public.log_user_action('ROLE_GRANTED', TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'user_roles' THEN
    PERFORM public.log_user_action('ROLE_MODIFIED', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'user_roles' THEN
    PERFORM public.log_user_action('ROLE_REVOKED', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'temporary_permissions' THEN
    PERFORM public.log_user_action('TEMP_PERMISSION_GRANTED', TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'temporary_permissions' THEN
    PERFORM public.log_user_action('TEMP_PERMISSION_MODIFIED', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for security-sensitive tables
DROP TRIGGER IF EXISTS security_audit_user_roles ON public.user_roles;
CREATE TRIGGER security_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_temporary_permissions ON public.temporary_permissions;
CREATE TRIGGER security_audit_temporary_permissions
  AFTER INSERT OR UPDATE ON public.temporary_permissions
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();