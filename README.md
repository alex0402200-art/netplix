# NETPLIX (GitHub Pages + Supabase)

Web poster sederhana:

- **Halaman utama** (`index.html`) cuma menampilkan poster. Poster diklik -> masuk ke link tujuannya.
- **Admin** (`admin.html`) cuma bisa dipakai kamu sendiri. Isinya cuma 3 hal:
  judul, poster dari galeri, link tujuan.
- Data & gambar disimpan di **Supabase** (database + bucket storage). Web-nya di **GitHub Pages**.

Santai aja, ikuti pelan-pelan dari nomor 1. Tidak perlu buru-buru.

---

## Isi folder

```
netplix-web/
├─ index.html          halaman utama (pengunjung)
├─ admin.html          halaman admin (khusus kamu)
├─ .nojekyll           supaya GitHub Pages tidak mengubah file
├─ css/style.css       tampilan
├─ js/config.js        <- SATU-SATUNYA file yang perlu kamu isi
├─ js/app.js           logika halaman utama
├─ js/admin.js         logika halaman admin
├─ assets/favicon.svg  ikon tab browser
└─ supabase/setup.sql  perintah SQL untuk menyiapkan Supabase
```

---

## Langkah 1 - Buat project Supabase

1. Buka https://supabase.com lalu buat project baru (atau pakai yang sudah ada).
2. Tunggu sampai project selesai dibuat.

## Langkah 2 - Jalankan setup.sql

1. Email admin di `supabase/setup.sql` sudah diisi (`alex0402200@gmail.com`).
   Kalau mau pakai email lain, ganti di bagian nomor 1 file itu (huruf kecil semua).
2. Di Supabase buka **SQL Editor** -> **New query**.
3. Tempel seluruh isi `setup.sql` -> klik **Run**.
4. Kalau muncul "Success", berarti tabel `posters`, bucket `posters` (public), dan aturan keamanannya sudah jadi.

## Langkah 3 - Buat akun admin (cuma kamu)

1. Buka **Authentication** -> **Users** -> **Add user** -> **Create new user**.
2. Isi email yang **sama persis** dengan yang kamu tulis di `setup.sql`, lalu buat password.
   Centang **Auto Confirm User** kalau ada.
3. Supaya orang lain tidak bisa mendaftar: buka pengaturan Authentication (bagian **Sign In / Providers**)
   lalu **matikan "Allow new users to sign up"**.

> Lapisan amannya ada dua: pendaftaran ditutup, dan aturan database hanya mengizinkan email admin
> untuk menulis data. Jadi walaupun ada yang menemukan `admin.html`, dia tidak bisa menambah apa pun.

## Langkah 4 - Isi js/config.js

1. Di Supabase buka **Project Settings** -> **API**.
2. Salin **Project URL** -> tempel ke `SUPABASE_URL`.
3. Salin kunci **anon / publishable** -> tempel ke `SUPABASE_KEY`.
4. **Jangan** pakai kunci `service_role` / `secret`. Kunci itu tidak boleh ada di file web.

Kunci anon memang boleh terlihat publik. Yang menjaga datamu adalah aturan (RLS) dari `setup.sql`.

## Langkah 5 - Upload ke GitHub & aktifkan Pages

1. Buat repository baru di GitHub, lalu upload **semua isi** folder ini
   (termasuk `.nojekyll` dan folder `css`, `js`, `assets`, `supabase`).
2. Buka **Settings** -> **Pages**.
3. Di **Source** pilih **Deploy from a branch**, branch `main`, folder `/ (root)` -> **Save**.
4. Tunggu 1-2 menit. Alamat webnya muncul di halaman itu, biasanya
   `https://username.github.io/nama-repo/`.

## Langkah 6 - Pakai

- Buka `https://username.github.io/nama-repo/admin.html` -> masuk pakai email & password admin.
- Isi **Judul**, tekan **Pilih dari galeri**, isi **Link tujuan**, tekan **Tambah**.
- Buka halaman utama, posternya sudah muncul. Diklik -> masuk ke link tujuan.

Simpan alamat `admin.html` di bookmark HP. Halaman admin tidak ada tautannya dari halaman utama.

---

## Kalau ada masalah

| Masalah | Penyebab & solusi |
|---|---|
| Halaman utama tulisan "belum disambungkan" | `js/config.js` belum diisi (masih ada tulisan `ISI_...`). |
| Poster tidak muncul tapi file ada di Supabase | Bucket belum public. Jalankan ulang `setup.sql` (sudah otomatis membuat bucket public). |
| "Akun ini tidak punya izin admin" | Email login beda dengan email di `setup.sql`. Samakan lalu Run ulang bagian nomor 1. |
| "Bucket not found" | `setup.sql` belum dijalankan. |
| Login gagal terus | Cek user di Authentication -> Users, pastikan sudah "confirmed", atau reset passwordnya. |
| Perubahan di GitHub belum kelihatan | Tunggu 1-2 menit lalu refresh (atau buka tab penyamaran). |

---

## Bagian yang cuma hiasan (belum berfungsi, sesuai desain)

Ikon cari, lonceng, foto profil, tab Film/Serial/Kategori, chip kategori (Horor, Dracin, ...),
tombol "Daftar Saya", "Lihat Semua", dan menu bawah. Semuanya sengaja tidak bisa diklik,
karena web ini hanya fokus menampilkan poster.

Baris "Film Populer" diisi poster terbaru, sedangkan "Rekomendasi Untuk Kamu" dan
"Serial Trending" diisi poster yang diacak, karena admin tidak punya kolom kategori.
Nama baris, urutan, dan nama logo bisa diubah di `js/config.js`.

Banner paling atas memakai judul + poster terbaru (tanpa deskripsi, karena admin cuma punya 3 isian).

Satu tambahan di admin: daftar poster + tombol **Hapus**, supaya poster yang salah upload bisa dibuang.
Kalau tidak mau, ubah `ADMIN_LIST: false` di `js/config.js`.
