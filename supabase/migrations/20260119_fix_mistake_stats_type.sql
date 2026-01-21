-- Fix type mismatch in get_high_priority_mistakes function
-- The view returns severity_score as bigint (due to count(*)), but function expects integer.

CREATE OR REPLACE FUNCTION public.get_high_priority_mistakes(
    p_user_id uuid,
    p_limit integer DEFAULT 50,
    p_min_score integer DEFAULT 30
)
RETURNS TABLE (
    question_id uuid,
    severity_level text,
    severity_score integer,
    mistake_count bigint,
    correct_after_last_mistake bigint,
    last_mistake_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.question_id,
        ms.severity_level,
        ms.severity_score::integer, -- Cast to integer to match return type
        ms.mistake_count,
        ms.correct_after_last_mistake,
        ms.last_mistake_at
    FROM public.mistake_stats ms
    WHERE ms.user_id = p_user_id
      AND ms.severity_score >= p_min_score
    ORDER BY ms.severity_score DESC, ms.last_mistake_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
