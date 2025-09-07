-- Add status column to workers table
ALTER TABLE public.workers 
ADD COLUMN status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN position TEXT,
ADD COLUMN notes TEXT;

-- Create projects table for work sites
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Authenticated users can view projects" 
ON public.projects 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects" 
ON public.projects 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete projects" 
ON public.projects 
FOR DELETE 
USING (true);

-- Create worker assignments table
CREATE TABLE public.worker_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  foreman_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'foreman', 'assistant')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(worker_id, project_id)
);

-- Enable RLS on worker_assignments
ALTER TABLE public.worker_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for worker_assignments
CREATE POLICY "Authenticated users can view worker assignments" 
ON public.worker_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create worker assignments" 
ON public.worker_assignments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update worker assignments" 
ON public.worker_assignments 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete worker assignments" 
ON public.worker_assignments 
FOR DELETE 
USING (true);

-- Add triggers for timestamp updates
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_assignments_updated_at
BEFORE UPDATE ON public.worker_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();