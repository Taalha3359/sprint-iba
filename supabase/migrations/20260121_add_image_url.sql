-- Add image_url column for storing uploaded question images
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for question images (if not exists)
-- Note: This needs to be done via Supabase dashboard or CLI
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('question-images', 'question-images', true)
-- ON CONFLICT (id) DO NOTHING;
