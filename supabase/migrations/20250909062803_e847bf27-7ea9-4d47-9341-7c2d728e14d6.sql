-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

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

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add admin policies for all tables
CREATE POLICY "Admins can view all workers" 
ON public.workers 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all workers" 
ON public.workers 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all attendance" 
ON public.attendance 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all attendance" 
ON public.attendance 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all payments" 
ON public.payments 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all projects" 
ON public.projects 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all worker assignments" 
ON public.worker_assignments 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all worker assignments" 
ON public.worker_assignments 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();