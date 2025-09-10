-- Update all policies to explicitly exclude anonymous users
DROP POLICY IF EXISTS "Admin full access to workers" ON public.workers;
CREATE POLICY "Admin full access to workers" 
ON public.workers 
FOR ALL 
USING (auth.uid() IS NOT NULL AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin full access to attendance" ON public.attendance;
CREATE POLICY "Admin full access to attendance" 
ON public.attendance 
FOR ALL 
USING (auth.uid() IS NOT NULL AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin full access to payments" ON public.payments;
CREATE POLICY "Admin full access to payments" 
ON public.payments 
FOR ALL 
USING (auth.uid() IS NOT NULL AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin full access to projects" ON public.projects;
CREATE POLICY "Admin full access to projects" 
ON public.projects 
FOR ALL 
USING (auth.uid() IS NOT NULL AND public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin full access to worker assignments" ON public.worker_assignments;
CREATE POLICY "Admin full access to worker assignments" 
ON public.worker_assignments 
FOR ALL 
USING (auth.uid() IS NOT NULL AND public.get_current_user_role() = 'admin');

-- Update profile policies with explicit auth check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND public.get_current_user_role() = 'admin');