-- =====================================================================
-- MIGRASI: halaman depan (banner sampul & teks sambutan)
-- Jalankan SEKALI di Supabase -> SQL Editor -> New query -> Run.
-- Aman dijalankan ulang.
-- =====================================================================

-- Tabel pengaturan sederhana: setiap baris = satu pengaturan (key, value)
create table if not exists public.site_settings (
  key    text primary key,
  value  text
);

alter table public.site_settings enable row level security;

drop policy if exists "publik lihat pengaturan" on public.site_settings;
create policy "publik lihat pengaturan"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "admin ubah pengaturan" on public.site_settings;
create policy "admin ubah pengaturan"
  on public.site_settings for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
