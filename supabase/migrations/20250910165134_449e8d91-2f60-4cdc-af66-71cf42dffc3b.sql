-- Fix Critical Security Issue: Clients table data protection (Corrected)
-- This addresses the security finding about potential client contact information theft

-- 1. Ensure RLS is enabled on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies and recreate with proper security
DROP POLICY IF EXISTS "Admin full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage all client data" ON public.clients;
DROP POLICY IF EXISTS "Project managers can view assigned client basic info" ON public.clients;

-- 3. Create secure, authenticated-only policies

-- Admin users have full access (authenticated only)
CREATE POLICY "Authenticated admins can manage client data" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  has_role_enhanced(auth.uid(), 'admin'::app_role)
);

-- Project managers/foremen can view limited client info for their projects only
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
    JOIN public.workers w ON wa.foreman_id = w.id 
    JOIN public.profiles pr ON w.id = pr.id
    WHERE p.client_id = clients.id 
    AND pr.user_id = auth.uid()
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
          'address', 'Адрес скрыт для безопасности',
          'notes', 'Заметки скрыты для безопасности'
        )
    END
  FROM public.clients c
  WHERE c.id = _client_id;
$$;

-- 5. Create audit trigger for client data modifications
CREATE OR REPLACE FUNCTION public.client_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all modifications to sensitive client data
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_user_action(
      'CLIENT_DATA_INSERT',
      'clients',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_user_action(
      'CLIENT_DATA_UPDATE',
      'clients',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_user_action(
      'CLIENT_DATA_DELETE',
      'clients',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit trigger for clients table (only for modifications)
DROP TRIGGER IF EXISTS client_security_audit ON public.clients;
CREATE TRIGGER client_security_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.client_audit_trigger();

-- 6. Create secure client data access function with logging
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

  -- Log the access attempt for security auditing
  PERFORM public.log_user_action(
    'CLIENT_DATA_ACCESS_FUNCTION',
    'clients',
    _client_id,
    NULL,
    jsonb_build_object(
      'accessed_client_id', _client_id, 
      'access_time', now(),
      'user_role', CASE 
        WHEN has_role_enhanced(auth.uid(), 'admin'::app_role) THEN 'admin'
        ELSE 'foreman' 
      END
    )
  );

  IF has_role_enhanced(auth.uid(), 'admin'::app_role) THEN
    -- Admin gets full data
    RETURN QUERY
    SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.address,
           c.company_type, c.status, c.notes, c.created_at, c.updated_at
    FROM public.clients c
    WHERE (_client_id IS NULL OR c.id = _client_id);
  ELSE
    -- Other users get masked sensitive data for their projects only
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
           'Адрес скрыт для безопасности' as address,
           c.company_type, c.status,
           'Заметки скрыты для безопасности' as notes,
           c.created_at, c.updated_at
    FROM public.clients c
    WHERE (_client_id IS NULL OR c.id = _client_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.worker_assignments wa ON p.id = wa.project_id
      JOIN public.workers w ON wa.foreman_id = w.id
      JOIN public.profiles pr ON w.id = pr.id
      WHERE p.client_id = c.id 
      AND pr.user_id = auth.uid()
    );
  END IF;
END;
$$;

-- 7. Create notifications_log table for security alerts
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

-- Policy for notifications_log - users can only see their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications_log 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  (recipient = auth.uid()::text OR has_role_enhanced(auth.uid(), 'admin'::app_role))
);

-- Policy for inserting notifications (system functions only)
CREATE POLICY "System can insert notifications" 
ON public.notifications_log 
FOR INSERT 
WITH CHECK (true); -- This will be controlled by function-level security

-- 8. Create function to validate client data access and send alerts
CREATE OR REPLACE FUNCTION public.check_and_log_client_access(_action text, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  user_email text;
BEGIN
  -- Check if user is admin
  is_admin := has_role_enhanced(auth.uid(), 'admin'::app_role);
  
  -- Get user email for logging
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Log the access attempt
  PERFORM public.log_user_action(
    'CLIENT_DATA_ACCESS_CHECK',
    'clients',
    _client_id,
    NULL,
    jsonb_build_object(
      'action', _action,
      'user_email', user_email,
      'is_admin', is_admin,
      'timestamp', now()
    )
  );
  
  -- If non-admin is accessing sensitive data, create security alert
  IF NOT is_admin AND _action IN ('VIEW_SENSITIVE', 'EXPORT', 'BULK_ACCESS') THEN
    INSERT INTO public.notifications_log (
      type, 
      recipient, 
      message, 
      status, 
      metadata
    )
    SELECT 
      'SECURITY_ALERT',
      ur.user_id::text,
      format('Подозрительный доступ к данным клиента от пользователя %s', user_email),
      'pending',
      jsonb_build_object(
        'accessed_by', auth.uid(),
        'accessed_by_email', user_email,
        'client_id', _client_id,
        'action', _action,
        'timestamp', now(),
        'severity', 'medium'
      )
    FROM public.user_roles ur
    WHERE ur.role = 'admin' AND ur.is_active = true;
  END IF;

  RETURN true;
END;
$$;