-- Create AI usage logs table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
    operation_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs (e.g. from server actions or client if needed)
-- Ideally this should be server-side only, but for this app structure we might insert from client hooks
CREATE POLICY "Enable insert for authenticated users" ON public.ai_usage_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to view logs
CREATE POLICY "Enable select for authenticated users" ON public.ai_usage_logs
    FOR SELECT TO authenticated USING (true);

-- Create index for faster stats queries
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
