-- Remove old insecure policies that allow anonymous access
DROP POLICY IF EXISTS "Authenticated users can view workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can insert workers" ON public.workers;  
DROP POLICY IF EXISTS "Authenticated users can update workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can delete workers" ON public.workers;

DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can delete attendance" ON public.attendance;

DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

DROP POLICY IF EXISTS "Authenticated users can view worker assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "Authenticated users can create worker assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "Authenticated users can update worker assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete worker assignments" ON public.worker_assignments;

-- Update existing admin policies to be more secure
DROP POLICY IF EXISTS "Admins can view all workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can manage all workers" ON public.workers;
CREATE POLICY "Admin full access to workers" 
ON public.workers 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
CREATE POLICY "Admin full access to attendance" 
ON public.attendance 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admin full access to payments" 
ON public.payments 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
CREATE POLICY "Admin full access to projects" 
ON public.projects 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all worker assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "Admins can manage all worker assignments" ON public.worker_assignments;
CREATE POLICY "Admin full access to worker assignments" 
ON public.worker_assignments 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

-- Add secure policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'admin');