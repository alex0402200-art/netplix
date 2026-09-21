/* =====================================================================
   PENGATURAN WEB  (satu-satunya file yang perlu kamu isi)
   ---------------------------------------------------------------------
   Ambil dua nilai pertama di Supabase:
   Project Settings -> API
     - Project URL            -> SUPABASE_URL
     - anon / publishable key -> SUPABASE_KEY

   PENTING: pakai kunci "anon" / "publishable" saja.
   JANGAN PERNAH menaruh kunci "service_role" / "secret" di sini,
   karena file ini bisa dilihat siapa saja yang membuka webnya.
   Keamanan datanya dijaga oleh aturan (RLS) di supabase/setup.sql.
   ===================================================================== */
window.APP_CONFIG = {
  SUPABASE_URL: "https://snlfrytutaphhqjyomde.supabase.co",
  SUPABASE_KEY: "sb_publishable_8G--_jVkrouqEDhQx4jroA_v3-cHFne",

  // Nama tabel & bucket (jangan diubah kalau setup.sql dipakai apa adanya)
  TABLE: "posters",
  BUCKET: "posters",

  // Nama di logo. Kalau mau ganti nama, cukup ubah dua kata ini.
  BRAND: ["NET", "PLIX"],

  // Poster diklik -> buka link di tab baru ("_blank") atau di tab yang sama ("_self")
  LINK_TARGET: "_blank",

  // Jumlah poster di banner besar paling atas (yang terbaru)
  HERO_COUNT: 4,

  // Baris-baris poster di halaman utama.
  //  mode "newest"  = poster terbaru di paling kiri
  //  mode "shuffle" = urutan diacak tiap web dibuka
  ROWS: [
    { title: "Film Populer", mode: "newest" },
    { title: "Rekomendasi Untuk Kamu", mode: "shuffle" },
    { title: "Serial Trending", mode: "shuffle" }
  ],

  // Tampilkan badge "HD" di pojok poster
  SHOW_HD_BADGE: true,

  // Menu admin: tampilkan daftar poster + tombol hapus (false = disembunyikan)
  ADMIN_LIST: true
};
