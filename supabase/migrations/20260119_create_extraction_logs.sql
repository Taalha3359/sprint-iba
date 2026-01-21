create table if not exists public.extraction_logs (
    id uuid default gen_random_uuid() primary key,
    file_name text not null,
    total_tokens integer default 0,
    prompt_tokens integer default 0,
    completion_tokens integer default 0,
    question_count integer default 0,
    status text default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.extraction_logs enable row level security;

create policy "Enable read access for authenticated users"
on public.extraction_logs for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on public.extraction_logs for insert
to authenticated
with check (true);
