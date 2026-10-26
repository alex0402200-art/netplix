-- =====================================================================
-- MIGRASI: ubah web poster jadi blog (kategori + tulisan)
-- Jalankan SEKALI di Supabase -> SQL Editor -> New query -> Run.
-- Aman dijalankan ulang. Data poster lama tidak dihapus.
-- =====================================================================

-- 1. Tabel kategori (diisi manual lewat admin)
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 40),
  created_at  timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "publik lihat kategori" on public.categories;
create policy "publik lihat kategori"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "admin tambah kategori" on public.categories;
create policy "admin tambah kategori"
  on public.categories for insert
  to authenticated
  with check (public.is_owner());

drop policy if exists "admin hapus kategori" on public.categories;
create policy "admin hapus kategori"
  on public.categories for delete
  to authenticated
  using (public.is_owner());

grant select on public.categories to anon, authenticated;
grant insert, delete on public.categories to authenticated;

-- 2. Kolom baru di tabel posters
alter table public.posters
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists content text;

-- 3. Link tujuan jadi opsional (artikel bisa dibaca di dalam web)
alter table public.posters alter column link_url drop not null;
