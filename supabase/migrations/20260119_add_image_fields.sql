alter table public.questions
add column if not exists has_image boolean default false,
add column if not exists image_description text;
