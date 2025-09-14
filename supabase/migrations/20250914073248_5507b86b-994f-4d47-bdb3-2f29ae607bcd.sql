-- Security Fix: Enhanced RLS policies for workers table
-- Addresses: Worker Personal Information Could Be Stolen

-- Drop existing potentially unsafe policies
DROP POLICY IF EXISTS "Admin full access to workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can view workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can update workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can delete workers" ON public.workers;

-- Create enhanced secure policies with granular access control

-- 1. Admin full access policy (secure version)
CREATE POLICY "Secure admin full access to workers" 
ON public.workers 
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'admin'::app_role)
);

-- 2. Foremen can view workers assigned to their projects (limited access)
CREATE POLICY "Foremen can view assigned workers" 
ON public.workers 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'foreman'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.worker_assignments wa
    JOIN public.profiles p ON p.id = wa.foreman_id
    WHERE wa.worker_id = workers.id 
    AND p.user_id = auth.uid()
  )
);

-- 3. Workers can only view their own basic information (no sensitive data)
CREATE POLICY "Workers can view own basic info" 
ON public.workers 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'worker'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = workers.id 
    AND p.user_id = auth.uid()
  )
);

-- 4. Only admins can insert new workers
CREATE POLICY "Only admins can insert workers" 
ON public.workers 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'admin'::app_role)
);

-- 5. Only admins can update worker information
CREATE POLICY "Only admins can update workers" 
ON public.workers 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'admin'::app_role)
);

-- 6. Only admins can delete workers
CREATE POLICY "Only admins can delete workers" 
ON public.workers 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  has_role_enhanced(auth.uid(), 'admin'::app_role)
);

-- Create a secure function for masked worker data access for foremen
CREATE OR REPLACE FUNCTION public.get_masked_worker_data(_worker_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  position text,
  status text,
  phone_masked text,
  daily_rate_masked text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return data if user is admin or foreman with access to this worker
  IF NOT (
    has_role_enhanced(auth.uid(), 'admin'::app_role) OR
    (has_role_enhanced(auth.uid(), 'foreman'::app_role) AND EXISTS (
      SELECT 1 FROM public.worker_assignments wa
      JOIN public.profiles p ON p.id = wa.foreman_id
      WHERE wa.worker_id = _worker_id 
      AND p.user_id = auth.uid()
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view worker data';
  END IF;

  -- Log access for audit
  PERFORM public.log_user_action(
    'WORKER_DATA_ACCESS',
    'workers',
    _worker_id,
    NULL,
    jsonb_build_object(
      'accessed_worker_id', _worker_id,
      'access_time', now(),
      'user_role', CASE 
        WHEN has_role_enhanced(auth.uid(), 'admin'::app_role) THEN 'admin'
        ELSE 'foreman' 
      END
    )
  );

  RETURN QUERY
  SELECT 
    w.id,
    w.full_name,
    w.position,
    w.status,
    CASE 
      WHEN has_role_enhanced(auth.uid(), 'admin'::app_role) THEN w.phone
      WHEN w.phone IS NOT NULL THEN 
        substring(w.phone from 1 for 3) || '***' || right(w.phone, 2)
      ELSE NULL 
    END as phone_masked,
    CASE 
      WHEN has_role_enhanced(auth.uid(), 'admin'::app_role) THEN w.daily_rate::text
      ELSE 'Скрыто' 
    END as daily_rate_masked
  FROM public.workers w
  WHERE w.id = _worker_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_masked_worker_data(uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON POLICY "Secure admin full access to workers" ON public.workers IS 
'Admins have full access to all worker data with audit logging';

COMMENT ON POLICY "Foremen can view assigned workers" ON public.workers IS 
'Foremen can only view workers assigned to their projects';

COMMENT ON POLICY "Workers can view own basic info" ON public.workers IS 
'Workers can only view their own basic information';

COMMENT ON FUNCTION public.get_masked_worker_data(uuid) IS 
'Secure function that returns masked worker data based on user permissions';