-- Fix Critical Security Issue: Clients table data protection
-- This addresses the security finding about potential client contact information theft

-- 1. First, ensure RLS is enabled on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing overly permissive policy  
DROP POLICY IF EXISTS "Admin full access to clients" ON public.clients;

-- 3. Create more secure, granular policies

-- Admin users have full access but with audit logging
CREATE POLICY "Admins can manage all client data" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'admin'::app_role)
);

-- Project managers/foremen can view basic client info for their projects only
CREATE POLICY "Project managers can view assigned client basic info" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'foreman'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.worker_assignments wa ON p.id = wa.project_id
    WHERE p.client_id = clients.id 
    AND wa.foreman_id IN (
      SELECT w.id FROM public.workers w WHERE w.id IN (
        SELECT pr.id FROM public.profiles pr WHERE pr.user_id = auth.uid()
      )
    )
  )
);

-- 4. Create function to mask sensitive client data for non-admin users
CREATE OR REPLACE FUNCTION public.get_masked_client_info(_client_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
        -- Admin gets full data
        to_jsonb(c.*)
      ELSE
        -- Other authorized users get masked data
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'company_type', c.company_type,
          'status', c.status,
          'contact_person', c.contact_person,
          'email', CASE 
            WHEN c.email IS NOT NULL THEN 
              substring(c.email from 1 for 3) || '***@' || split_part(c.email, '@', 2)
            ELSE NULL 
          END,
          'phone', CASE 
            WHEN c.phone IS NOT NULL THEN 
              substring(c.phone from 1 for 3) || '***' || right(c.phone, 2)
            ELSE NULL 
          END,
          'address', 'Адрес скрыт',
          'notes', 'Заметки скрыты'
        )
    END
  FROM public.clients c
  WHERE c.id = _client_id;
$$;

-- 5. Create audit trigger specifically for client data access
CREATE OR REPLACE FUNCTION public.client_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all access to sensitive client data
  IF TG_OP = 'SELECT' OR TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    PERFORM public.log_user_action(
      'CLIENT_DATA_' || TG_OP,
      'clients',
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit trigger for clients table
DROP TRIGGER IF EXISTS client_security_audit ON public.clients;
CREATE TRIGGER client_security_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.client_audit_trigger();

-- 6. Create secure client data access function
CREATE OR REPLACE FUNCTION public.get_secure_client_data(_client_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  contact_person text,
  email text,
  phone text,
  address text,
  company_type text,
  status text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has appropriate access
  IF NOT (has_role_enhanced(auth.uid(), 'admin'::app_role) OR 
          has_role_enhanced(auth.uid(), 'foreman'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view client data';
  END IF;

  -- Log the access attempt
  PERFORM public.log_user_action(
    'CLIENT_DATA_ACCESS_FUNCTION',
    'clients',
    _client_id,
    NULL,
    jsonb_build_object('accessed_client_id', _client_id, 'access_time', now())
  );

  IF has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    -- Admin gets full data
    RETURN QUERY
    SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.address,
           c.company_type, c.status, c.notes, c.created_at, c.updated_at
    FROM public.clients c
    WHERE (_client_id IS NULL OR c.id = _client_id);
  ELSE
    -- Other users get masked sensitive data
    RETURN QUERY
    SELECT c.id, c.name, c.contact_person,
           CASE 
             WHEN c.email IS NOT NULL THEN 
               substring(c.email from 1 for 3) || '***@' || split_part(c.email, '@', 2)
             ELSE NULL 
           END as email,
           CASE 
             WHEN c.phone IS NOT NULL THEN 
               substring(c.phone from 1 for 3) || '***' || right(c.phone, 2)
             ELSE NULL 
           END as phone,
           'Адрес скрыт' as address,
           c.company_type, c.status,
           'Заметки скрыты' as notes,
           c.created_at, c.updated_at
    FROM public.clients c
    WHERE (_client_id IS NULL OR c.id = _client_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.worker_assignments wa ON p.id = wa.project_id
      WHERE p.client_id = c.id 
      AND wa.foreman_id IN (
        SELECT w.id FROM public.workers w 
        JOIN public.profiles pr ON w.id = pr.id 
        WHERE pr.user_id = auth.uid()
      )
    );
  END IF;
END;
$$;

-- 7. Create notification system for sensitive data access
CREATE OR REPLACE FUNCTION public.notify_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Count how many admins we have to notify
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles 
  WHERE role = 'admin' AND is_active = true;

  -- If this is a non-admin accessing client data, notify admins
  IF NOT has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    -- Insert notification for all admins
    INSERT INTO public.notifications_log (
      type, 
      recipient, 
      message, 
      status, 
      metadata
    )
    SELECT 
      'SENSITIVE_DATA_ACCESS',
      ur.user_id::text,
      'Доступ к данным клиента: ' || COALESCE(NEW.name, OLD.name),
      'pending',
      jsonb_build_object(
        'accessed_by', auth.uid(),
        'client_id', COALESCE(NEW.id, OLD.id),
        'action', TG_OP,
        'timestamp', now()
      )
    FROM public.user_roles ur
    WHERE ur.role = 'admin' AND ur.is_active = true;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create notification trigger
DROP TRIGGER IF EXISTS notify_client_data_access ON public.clients;
CREATE TRIGGER notify_client_data_access
  AFTER SELECT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.notify_sensitive_data_access();

-- 8. Fix the anonymous access warning by making policies more restrictive
-- Ensure all policies require authentication
DROP POLICY IF EXISTS "Admins can manage all client data" ON public.clients;
CREATE POLICY "Authenticated admins can manage client data" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  has_role_enhanced(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Project managers can view assigned client basic info" ON public.clients;
CREATE POLICY "Authenticated foremen can view assigned client info" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  has_role_enhanced(auth.uid(), 'foreman'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.worker_assignments wa ON p.id = wa.project_id
    WHERE p.client_id = clients.id 
    AND wa.foreman_id IN (
      SELECT w.id FROM public.workers w 
      JOIN public.profiles pr ON w.id = pr.id
      WHERE pr.user_id = auth.uid()
    )
  )
);

-- 9. Create a notifications_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  recipient text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  read_at timestamptz
);

-- Enable RLS on notifications_log
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Policy for notifications_log
CREATE POLICY "Users can view own notifications" 
ON public.notifications_log 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  (recipient = auth.uid()::text OR has_role_enhanced(auth.uid(), 'admin'::app_role))
);