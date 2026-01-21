-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;



-- Policy to allow authenticated users to upload files to 'pdfs' bucket
create policy "Allow authenticated uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pdfs'
);

-- Policy to allow authenticated users to view files in 'pdfs' bucket
create policy "Allow authenticated downloads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pdfs'
);
