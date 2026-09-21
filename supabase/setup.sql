create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('alex0402200@gmail.com');
$$;

create table if not exists public.posters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  poster_url  text not null check (poster_url ~* '^https?://'),
  poster_path text not null,
  link_url    text not null check (link_url ~* '^https?://'),
  created_at  timestamptz not null default now()
);

create index if not exists posters_created_at_idx on public.posters (created_at desc);

alter table public.posters enable row level security;

drop policy if exists "publik boleh lihat poster" on public.posters;
create policy "publik boleh lihat poster"
  on public.posters for select
  to anon, authenticated
  using (true);

drop policy if exists "admin tambah poster" on public.posters;
create policy "admin tambah poster"
  on public.posters for insert
  to authenticated
  with check (public.is_owner());

drop policy if exists "admin ubah poster" on public.posters;
create policy "admin ubah poster"
  on public.posters for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists "admin hapus poster" on public.posters;
create policy "admin hapus poster"
  on public.posters for delete
  to authenticated
  using (public.is_owner());

grant usage on schema public to anon, authenticated;
grant select on public.posters to anon, authenticated;
grant insert, update, delete on public.posters to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posters', 'posters', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "admin upload poster" on storage.objects;
create policy "admin upload poster"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'posters' and public.is_owner());

drop policy if exists "admin ubah file poster" on storage.objects;
create policy "admin ubah file poster"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'posters' and public.is_owner())
  with check (bucket_id = 'posters' and public.is_owner());

drop policy if exists "admin hapus file poster" on storage.objects;
create policy "admin hapus file poster"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'posters' and public.is_owner());
