-- Fix user_progress table to ensure unique constraint for upsert
-- This handles cases where the table might have existed without the constraint

-- 1. Remove duplicates if any (keep the most recent answer)
DELETE FROM public.user_progress a
USING public.user_progress b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.question_id = b.question_id;

-- 2. Add the unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_progress_user_id_question_id_key'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD CONSTRAINT user_progress_user_id_question_id_key 
        UNIQUE (user_id, question_id);
    END IF;
END $$;
