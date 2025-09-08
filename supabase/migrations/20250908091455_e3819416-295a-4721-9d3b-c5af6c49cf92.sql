-- Fix RLS policies to require authentication and proper access control

-- First, drop existing policies that allow anonymous access
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

-- Create new RLS policies that require authentication (not anonymous)
-- Workers table
CREATE POLICY "Authenticated users can view workers" 
ON public.workers 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert workers" 
ON public.workers 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update workers" 
ON public.workers 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete workers" 
ON public.workers 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Attendance table
CREATE POLICY "Authenticated users can view attendance" 
ON public.attendance 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert attendance" 
ON public.attendance 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update attendance" 
ON public.attendance 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete attendance" 
ON public.attendance 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Payments table
CREATE POLICY "Authenticated users can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert payments" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete payments" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Projects table
CREATE POLICY "Authenticated users can view projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update projects" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete projects" 
ON public.projects 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Worker assignments table
CREATE POLICY "Authenticated users can view worker assignments" 
ON public.worker_assignments 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create worker assignments" 
ON public.worker_assignments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update worker assignments" 
ON public.worker_assignments 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete worker assignments" 
ON public.worker_assignments 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);