-- Add status tracking fields to ai_providers table
ALTER TABLE public.ai_providers 
ADD COLUMN last_status text CHECK (last_status IN ('online', 'offline', 'error', 'testing')) DEFAULT 'offline',
ADD COLUMN last_tested_at timestamp with time zone,
ADD COLUMN last_response_time_ms integer,
ADD COLUMN last_error text;

-- Add index for better performance when querying active providers by priority
CREATE INDEX idx_ai_providers_active_priority ON public.ai_providers (is_active, priority) WHERE is_active = true;

-- Enable realtime for ai_providers table
ALTER TABLE public.ai_providers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_providers;