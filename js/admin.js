/* ============================================================
   Halaman admin (khusus pemilik).
   - Login pakai Supabase Auth (email + password)
   - Yang boleh menulis data HANYA akun admin: dijaga oleh aturan
     RLS di supabase/setup.sql, bukan oleh kode ini.
   ============================================================ */
(function () {
  'use strict';

  var C = window.APP_CONFIG || {};
  var TABLE = C.TABLE || 'posters';
  var BUCKET = C.BUCKET || 'posters';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function setStatus(node, text, kind) {
    node.textContent = text || '';
    node.className = 'status' + (kind ? ' ' + kind : '');
  }
  function fixLink(v) {
    v = String(v || '').trim();
    if (!v) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
    } catch (e) { return null; }
  }
  function niceError(err) {
    var m = (err && err.message) || String(err || '');
    if (/row-level security|violates|permission denied|not authorized|Unauthorized/i.test(m)) {
      return 'Akun ini tidak punya izin admin. Cek email di supabase/setup.sql (fungsi is_owner).';
    }
    if (/Bucket not found/i.test(m)) return 'Bucket "' + BUCKET + '" belum ada. Jalankan supabase/setup.sql.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Koneksi bermasalah. Coba lagi.';
    return m || 'Terjadi kesalahan.';
  }

  var boot = $('boot');
  if (!window.supabase) {
    boot.textContent = 'Library Supabase gagal dimuat. Cek koneksi internet lalu muat ulang.';
    boot.className = 'msg err';
    return;
  }
  if (!C.SUPABASE_URL || !C.SUPABASE_KEY || C.SUPABASE_URL.indexOf('ISI_') !== -1 || C.SUPABASE_KEY.indexOf('ISI_') !== -1) {
    boot.textContent = 'Isi SUPABASE_URL dan SUPABASE_KEY di js/config.js dulu.';
    boot.className = 'msg err';
    return;
  }

  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  var brand = C.BRAND || ['NET', 'PLIX'];
  document.querySelector('.logo-a').textContent = brand[0] || '';
  document.querySelector('.logo-b').textContent = brand[1] || '';

  var loginView = $('login'), panelView = $('panel'), btnKeluar = $('keluar');

  function showLogin() {
    boot.hidden = true; panelView.hidden = true; btnKeluar.hidden = true; loginView.hidden = false;
  }
  function showPanel() {
    boot.hidden = true; loginView.hidden = true; panelView.hidden = false; btnKeluar.hidden = false;
    if (C.ADMIN_LIST !== false) { $('daftarWrap').hidden = false; loadList(); }
  }

  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) showPanel(); else showLogin();
  }).catch(showLogin);

  /* ---- Login / keluar ---- */
  $('formLogin').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('email').value.trim(), pass = $('password').value;
    var msg = $('loginMsg'), btn = $('btnMasuk');
    if (!email || !pass) { setStatus(msg, 'Isi email dan password.', 'err'); return; }
    btn.disabled = true; setStatus(msg, 'Memeriksa…');
    sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
      btn.disabled = false;
      if (r.error) { setStatus(msg, 'Email atau password salah.', 'err'); return; }
      $('password').value = '';
      setStatus(msg, '');
      showPanel();
    }).catch(function (err) {
      btn.disabled = false; setStatus(msg, niceError(err), 'err');
    });
  });
  btnKeluar.addEventListener('click', function () {
    sb.auth.signOut().then(function () { $('daftar').textContent = ''; showLogin(); });
  });

  /* ---- Pilih poster dari galeri ---- */
  var chosen = null, previewUrl = null;
  var foto = $('foto'), preview = $('preview');
  $('pilihFoto').addEventListener('click', function () { foto.click(); });
  foto.addEventListener('change', function () {
    var f = foto.files && foto.files[0];
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    preview.textContent = '';
    if (!f) { chosen = null; preview.textContent = 'Belum dipilih'; return; }
    if (!/^image\//.test(f.type)) {
      chosen = null; foto.value = ''; preview.textContent = 'Bukan gambar';
      setStatus($('status'), 'File harus berupa gambar.', 'err'); return;
    }
    chosen = f;
    previewUrl = URL.createObjectURL(f);
    var im = el('img'); im.src = previewUrl; im.alt = 'Pratinjau poster';
    preview.appendChild(im);
    setStatus($('status'), '');
  });

  // Kecilkan & ubah ke JPEG dulu supaya upload cepat dan hemat storage
  function prepareImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var maxW = 900, maxH = 1350;
        var s = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
        var w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d');
        cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h);
        cx.drawImage(img, 0, 0, w, h);
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('Gagal memproses gambar.')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Gambar tidak bisa dibaca. Coba pilih format JPG atau PNG.'));
      };
      img.src = url;
    });
  }

  /* ---- Tambah poster ---- */
  $('formTambah').addEventListener('submit', function (e) {
    e.preventDefault();
    var st = $('status'), btn = $('btnTambah');
    var title = $('judul').value.trim();
    var link = fixLink($('link').value);
    if (!title) { setStatus(st, 'Judul belum diisi.', 'err'); return; }
    if (!chosen) { setStatus(st, 'Pilih poster dari galeri dulu.', 'err'); return; }
    if (!link) { setStatus(st, 'Link tujuan belum benar. Contoh: https://contoh.com/abc', 'err'); return; }

    btn.disabled = true; setStatus(st, 'Mengunggah…');
    var path = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';

    prepareImage(chosen).then(function (blob) {
      return sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
    }).then(function (up) {
      if (up.error) throw up.error;
      var pub = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      return sb.from(TABLE).insert({ title: title, poster_url: pub, poster_path: path, link_url: link }).then(function (ins) {
        if (ins.error) {
          sb.storage.from(BUCKET).remove([path]);   // batalkan file yang sudah terlanjur naik
          throw ins.error;
        }
      });
    }).then(function () {
      $('formTambah').reset();
      foto.value = ''; chosen = null;
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
      preview.textContent = 'Belum dipilih';
      setStatus(st, 'Poster berhasil ditambahkan.', 'ok');
      btn.disabled = false;
      if (C.ADMIN_LIST !== false) loadList();
    }).catch(function (err) {
      btn.disabled = false;
      setStatus(st, niceError(err), 'err');
    });
  });

  /* ---- Daftar poster + hapus ---- */
  function loadList() {
    var box = $('daftar');
    sb.from(TABLE).select('id,title,poster_url,poster_path,link_url,created_at')
      .order('created_at', { ascending: false }).then(function (r) {
        box.textContent = '';
        if (r.error) { box.appendChild(el('p', 'status err', niceError(r.error))); return; }
        if (!r.data.length) { box.appendChild(el('p', 'status', 'Belum ada poster.')); return; }
        r.data.forEach(function (p) {
          var row = el('div', 'item');
          var im = el('img'); im.src = p.poster_url; im.alt = ''; im.loading = 'lazy';
          row.appendChild(im);
          var txt = el('div', 'txt');
          txt.appendChild(el('div', 't', p.title));
          txt.appendChild(el('div', 'u', p.link_url));
          row.appendChild(txt);
          var del = el('button', 'del', 'Hapus');
          del.type = 'button';
          del.addEventListener('click', function () { removeItem(p, del); });
          row.appendChild(del);
          box.appendChild(row);
        });
      });
  }
  function removeItem(p, btn) {
    if (!window.confirm('Hapus "' + p.title + '"?')) return;
    btn.disabled = true;
    sb.from(TABLE).delete().eq('id', p.id).select('id').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('row-level security');
      if (p.poster_path) return sb.storage.from(BUCKET).remove([p.poster_path]);
    }).then(function () {
      loadList();
    }).catch(function (err) {
      btn.disabled = false;
      setStatus($('status'), niceError(err), 'err');
    });
  }
})();
 
