-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration (with conflict handling)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add admin policies for all tables (will replace existing ones)
DROP POLICY IF EXISTS "Admins can view all workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can manage all workers" ON public.workers;
CREATE POLICY "Admins can view all workers" 
ON public.workers 
FOR SELECT 
USING (public.get_current_user_role() = 'admin' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all workers" 
ON public.workers 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance" 
ON public.attendance 
FOR SELECT 
USING (public.get_current_user_role() = 'admin' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all attendance" 
ON public.attendance 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (public.get_current_user_role() = 'admin' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all payments" 
ON public.payments 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.get_current_user_role() = 'admin' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all projects" 
ON public.projects 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all worker assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "Admins can manage all worker assignments" ON public.worker_assignments;
CREATE POLICY "Admins can view all worker assignments" 
ON public.worker_assignments 
FOR SELECT 
USING (public.get_current_user_role() = 'admin' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all worker assignments" 
ON public.worker_assignments 
FOR ALL 
USING (public.get_current_user_role() = 'admin');