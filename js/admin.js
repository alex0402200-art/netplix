/* ============================================================
   Halaman admin (khusus pemilik).
   - Login pakai Supabase Auth (email + password)
   - Yang boleh menulis data HANYA akun admin: dijaga oleh aturan
     RLS di supabase/setup.sql dan supabase/migrate-blog.sql.
   - Isi artikel disusun sebagai blok: paragraf dan gambar,
     disimpan di kolom posters.content dalam bentuk JSON.
   - Artikel yang sudah ada bisa diedit dan dihapus.
   ============================================================ */
(function () {
  'use strict';

  var C = window.APP_CONFIG || {};
  var NP = window.NP;
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
    if (/duplicate key|unique/i.test(m)) return 'Nama itu sudah ada.';
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

  var loginView = $('login'), panelView = $('panel'), btnKeluar = $('keluar');

  function showLogin() {
    boot.hidden = true; panelView.hidden = true; btnKeluar.hidden = true; loginView.hidden = false;
  }
  function showPanel() {
    boot.hidden = true; loginView.hidden = true; panelView.hidden = false; btnKeluar.hidden = false;
    loadCategories();
    loadHomeSettings();
    if (C.ADMIN_LIST !== false) loadList();
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
    sb.auth.signOut().then(function () {
      $('daftar').textContent = '';
      resetForm();
      showLogin();
    });
  });

  /* ---- Kategori ---- */
  function loadCategories() {
    sb.from('categories').select('id,name').order('name', { ascending: true }).then(function (r) {
      var sel = $('kategori'), box = $('katList');
      var current = sel.value;
      sel.textContent = '';
      var none = el('option', null, 'Tanpa kategori');
      none.value = '';
      sel.appendChild(none);
      box.textContent = '';
      if (r.error) { box.appendChild(el('p', 'status err', niceError(r.error))); return; }
      if (!r.data.length) box.appendChild(el('p', 'status', 'Belum ada kategori. Tambahkan di bawah.'));
      r.data.forEach(function (c) {
        var opt = el('option', null, c.name);
        opt.value = c.id;
        sel.appendChild(opt);

        var row = el('div', 'item');
        var txt = el('div', 'txt');
        txt.appendChild(el('div', 't', c.name));
        row.appendChild(txt);
        var del = el('button', 'del', 'Hapus');
        del.type = 'button';
        del.addEventListener('click', function () { removeCategory(c, del); });
        row.appendChild(del);
        box.appendChild(row);
      });
      sel.value = current;
    });
  }

  $('formKat').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('katBaru'), btn = $('btnKat'), st = $('katStatus');
    var name = input.value.trim();
    if (!name) { setStatus(st, 'Nama kategori belum diisi.', 'err'); return; }
    btn.disabled = true;
    sb.from('categories').insert({ name: name }).then(function (r) {
      btn.disabled = false;
      if (r.error) throw r.error;
      input.value = '';
      setStatus(st, 'Kategori "' + name + '" ditambahkan.', 'ok');
      loadCategories();
    }).catch(function (err) {
      btn.disabled = false;
      setStatus(st, niceError(err), 'err');
    });
  });

  function removeCategory(c, btn) {
    if (!window.confirm('Hapus kategori "' + c.name + '"? Artikelnya tetap ada, hanya jadi tanpa kategori.')) return;
    btn.disabled = true;
    sb.from('categories').delete().eq('id', c.id).select('id').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('row-level security');
      setStatus($('katStatus'), 'Kategori dihapus.', 'ok');
      loadCategories();
      if (C.ADMIN_LIST !== false) loadList();
    }).catch(function (err) {
      btn.disabled = false;
      setStatus($('katStatus'), niceError(err), 'err');
    });
  }

  /* ---- Gambar: kecilkan & ubah ke JPEG, lalu upload ---- */
  function prepareImage(file, maxW, maxH) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
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
  function uploadBlob(blob) {
    var path = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    return sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
      .then(function (up) {
        if (up.error) throw up.error;
        return { path: path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
      });
  }

  /* ---- Pilih poster utama dari galeri ---- */
  var chosen = null, previewUrl = null;
  var foto = $('foto'), preview = $('preview');
  $('pilihFoto').addEventListener('click', function () { foto.click(); });
  foto.addEventListener('change', function () {
    var f = foto.files && foto.files[0];
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    preview.textContent = '';
    if (!f) { chosen = null; preview.textContent = editing ? 'Tidak diganti' : 'Belum dipilih'; return; }
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
  function showPosterPreview(url) {
    preview.textContent = '';
    if (url) {
      var im = el('img'); im.src = url; im.alt = 'Poster sekarang';
      preview.appendChild(im);
    } else {
      preview.textContent = 'Belum dipilih';
    }
  }

  /* ---- Editor blok isi artikel ---- */
  var blocks = [];
  var imgFile = $('imgFile');

  function renderBlocks(focusIndex) {
    var box = $('blocks');
    box.textContent = '';
    if (!blocks.length) {
      box.appendChild(el('p', 'hint', 'Belum ada isi. Tekan "+ Paragraf" atau "+ Gambar".'));
    }
    blocks.forEach(function (b, i) {
      var card = el('div', 'block');
      var head = el('div', 'block-head');
      head.appendChild(el('span', 'block-type', b.type === 'image' ? 'Gambar' : 'Paragraf'));
      var ctrls = el('div', 'block-ctrls');
      ctrls.appendChild(ctrlBtn('▲', 'Naik', i === 0, function () { swap(i, i - 1); }));
      ctrls.appendChild(ctrlBtn('▼', 'Turun', i === blocks.length - 1, function () { swap(i, i + 1); }));
      ctrls.appendChild(ctrlBtn('✕', 'Hapus', false, function () { blocks.splice(i, 1); renderBlocks(); }));
      head.appendChild(ctrls);
      card.appendChild(head);

      if (b.type === 'image') {
        var im = el('img', 'block-img'); im.src = b.url; im.alt = '';
        card.appendChild(im);
      } else {
        var ta = el('textarea', 'block-text');
        ta.rows = 4;
        ta.placeholder = 'Tulis paragraf di sini...';
        ta.value = b.text || '';
        ta.addEventListener('input', function () { b.text = ta.value; });
        card.appendChild(ta);
        if (focusIndex === i) setTimeout(function () { ta.focus(); }, 0);
      }
      box.appendChild(card);
    });
  }
  function ctrlBtn(label, title, disabled, fn) {
    var b = el('button', 'ctrl', label);
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.disabled = disabled;
    b.addEventListener('click', fn);
    return b;
  }
  function swap(i, j) {
    if (j < 0 || j >= blocks.length) return;
    var t = blocks[i]; blocks[i] = blocks[j]; blocks[j] = t;
    renderBlocks();
  }

  $('addPara').addEventListener('click', function () {
    blocks.push({ type: 'text', text: '' });
    renderBlocks(blocks.length - 1);
  });

  var blockMsg = $('blockMsg'), addImgBtn = $('addImg');
  addImgBtn.addEventListener('click', function () { imgFile.click(); });
  imgFile.addEventListener('change', function () {
    var f = imgFile.files && imgFile.files[0];
    imgFile.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) { setStatus(blockMsg, 'File harus berupa gambar.', 'err'); return; }
    addImgBtn.disabled = true;
    setStatus(blockMsg, 'Mengunggah gambar…');
    prepareImage(f, 1200, 1800).then(uploadBlob).then(function (r) {
      blocks.push({ type: 'image', url: r.url });
      renderBlocks();
      setStatus(blockMsg, 'Gambar ditambahkan.', 'ok');
    }).catch(function (err) {
      setStatus(blockMsg, niceError(err), 'err');
    }).then(function () {
      addImgBtn.disabled = false;
    });
  });

  /* ---- Mode edit ---- */
  var editing = null; // baris artikel yang sedang diedit, atau null

  function startEdit(p) {
    editing = p;
    $('judul').value = p.title || '';
    $('kategori').value = p.category_id || '';
    $('link').value = p.link_url || '';
    blocks = NP.parseBlocks(p.content).map(function (b) {
      return b.type === 'image' ? { type: 'image', url: b.url } : { type: 'text', text: b.text };
    });
    renderBlocks();
    chosen = null; foto.value = '';
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    showPosterPreview(p.poster_url);
    $('fotoNote').hidden = false;
    $('formTitle').textContent = 'Edit artikel';
    $('editName').textContent = 'Sedang mengedit: ' + (p.title || '');
    $('editBanner').hidden = false;
    $('btnTambah').textContent = 'Simpan perubahan';
    setStatus($('status'), '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    editing = null;
    $('formTambah').reset();
    foto.value = '';
    chosen = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    showPosterPreview(null);
    blocks = []; renderBlocks();
    $('fotoNote').hidden = true;
    $('formTitle').textContent = 'Tambah artikel';
    $('editBanner').hidden = true;
    $('btnTambah').textContent = 'Terbitkan';
  }
  $('btnBatal').addEventListener('click', function () {
    resetForm();
    setStatus($('status'), 'Edit dibatalkan.', '');
  });

  /* ---- Terbitkan / simpan artikel ---- */
  $('formTambah').addEventListener('submit', function (e) {
    e.preventDefault();
    var st = $('status'), btn = $('btnTambah');
    var title = $('judul').value.trim();
    var linkRaw = $('link').value.trim();
    var link = linkRaw ? fixLink(linkRaw) : null;
    var categoryId = $('kategori').value || null;

    var filled = blocks.filter(function (b) {
      return b.type === 'image' ? !!b.url : !!(b.text || '').trim();
    }).map(function (b) {
      return b.type === 'image' ? { type: 'image', url: b.url } : { type: 'text', text: b.text.trim() };
    });

    if (!title) { setStatus(st, 'Judul belum diisi.', 'err'); return; }
    if (!editing && !chosen) { setStatus(st, 'Pilih gambar utama dari galeri dulu.', 'err'); return; }
    if (!filled.length && !link) { setStatus(st, 'Isi artikel atau link download, minimal salah satu.', 'err'); return; }
    if (linkRaw && !link) { setStatus(st, 'Link download belum benar. Contoh: https://contoh.com/abc', 'err'); return; }

    btn.disabled = true; setStatus(st, 'Mengunggah…');
    var content = filled.length ? JSON.stringify(filled) : null;

    if (editing) {
      var target = editing;
      var newUp = null;
      var posterStep = chosen ? prepareImage(chosen, 900, 1350).then(uploadBlob).then(function (up) { newUp = up; return up; }) : Promise.resolve(null);
      posterStep.then(function (up) {
        var row = { title: title, link_url: link, content: content, category_id: categoryId };
        if (up) { row.poster_url = up.url; row.poster_path = up.path; }
        return sb.from(TABLE).update(row).eq('id', target.id).select('id').then(function (r) {
          if (r.error) throw r.error;
          if (!r.data || !r.data.length) throw new Error('row-level security');
          // poster lama dibuang kalau sudah diganti
          if (up && target.poster_path) sb.storage.from(BUCKET).remove([target.poster_path]);
        });
      }).then(function () {
        resetForm();
        setStatus(st, 'Artikel berhasil diperbarui.', 'ok');
        btn.disabled = false;
        if (C.ADMIN_LIST !== false) loadList();
      }).catch(function (err) {
        if (newUp) sb.storage.from(BUCKET).remove([newUp.path]);
        btn.disabled = false;
        setStatus(st, niceError(err), 'err');
      });
      return;
    }

    prepareImage(chosen, 900, 1350).then(uploadBlob).then(function (up) {
      var row = {
        title: title,
        poster_url: up.url,
        poster_path: up.path,
        link_url: link,
        content: content,
        category_id: categoryId
      };
      return sb.from(TABLE).insert(row).then(function (ins) {
        if (ins.error) {
          sb.storage.from(BUCKET).remove([up.path]);   // batalkan poster yang sudah terlanjur naik
          throw ins.error;
        }
      });
    }).then(function () {
      resetForm();
      setStatus(st, 'Artikel berhasil diterbitkan.', 'ok');
      btn.disabled = false;
      if (C.ADMIN_LIST !== false) loadList();
    }).catch(function (err) {
      btn.disabled = false;
      setStatus(st, niceError(err), 'err');
    });
  });

  renderBlocks();

  /* ---- Halaman depan: banner sampul & teks sambutan ----
     Disimpan di tabel site_settings (lihat supabase/migrate-home.sql):
     banner_url, banner_path, welcome_text */
  var homeSettings = {};
  var bannerPick = null, bannerPreviewUrl = null;
  var bannerFile = $('bannerFile'), homeStatus = $('homeStatus');

  function showBannerPreview(url) {
    var box = $('bannerPreview');
    box.textContent = '';
    if (url) {
      var im = el('img'); im.src = url; im.alt = 'Banner sekarang';
      box.appendChild(im);
    } else {
      box.textContent = 'Belum ada banner';
    }
  }

  function loadHomeSettings() {
    sb.from('site_settings').select('key,value').then(function (r) {
      if (r.error) { setStatus(homeStatus, niceError(r.error), 'err'); return; }
      homeSettings = {};
      (r.data || []).forEach(function (row) { homeSettings[row.key] = row.value || ''; });
      if (!bannerPick) showBannerPreview(homeSettings.banner_url);
      $('welcomeText').value = homeSettings.welcome_text || '';
      $('btnHapusBanner').hidden = !homeSettings.banner_url;
    });
  }

  $('pilihBanner').addEventListener('click', function () { bannerFile.click(); });
  bannerFile.addEventListener('change', function () {
    var f = bannerFile.files && bannerFile.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      bannerFile.value = '';
      setStatus(homeStatus, 'File harus berupa gambar.', 'err');
      return;
    }
    bannerPick = f;
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    bannerPreviewUrl = URL.createObjectURL(f);
    showBannerPreview(bannerPreviewUrl);
    setStatus(homeStatus, 'Gambar dipilih. Tekan "Simpan halaman depan" untuk menerapkannya.', '');
  });

  $('formHome').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('btnHome');
    var welcome = $('welcomeText').value.trim();
    var oldPath = homeSettings.banner_path || '';
    var newUp = null;
    btn.disabled = true;
    setStatus(homeStatus, 'Menyimpan…');

    var step = bannerPick
      ? prepareImage(bannerPick, 1280, 720).then(uploadBlob).then(function (up) { newUp = up; return up; })
      : Promise.resolve(null);

    step.then(function (up) {
      var rows = [{ key: 'welcome_text', value: welcome }];
      if (up) {
        rows.push({ key: 'banner_url', value: up.url });
        rows.push({ key: 'banner_path', value: up.path });
      }
      return sb.from('site_settings').upsert(rows, { onConflict: 'key' }).then(function (r) {
        if (r.error) throw r.error;
      });
    }).then(function () {
      // banner lama dibuang kalau sudah diganti
      if (newUp && oldPath) sb.storage.from(BUCKET).remove([oldPath]);
      bannerPick = null; bannerFile.value = '';
      loadHomeSettings();
      setStatus(homeStatus, 'Halaman depan tersimpan.', 'ok');
    }).catch(function (err) {
      if (newUp) sb.storage.from(BUCKET).remove([newUp.path]);
      setStatus(homeStatus, niceError(err), 'err');
    }).then(function () {
      btn.disabled = false;
    });
  });

  $('btnHapusBanner').addEventListener('click', function () {
    if (!window.confirm('Hapus banner dari halaman depan?')) return;
    var btn = $('btnHapusBanner');
    var oldPath = homeSettings.banner_path || '';
    btn.disabled = true;
    sb.from('site_settings').delete().in('key', ['banner_url', 'banner_path']).select('key').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('row-level security');
      if (oldPath) return sb.storage.from(BUCKET).remove([oldPath]);
    }).then(function () {
      bannerPick = null; bannerFile.value = '';
      loadHomeSettings();
      setStatus(homeStatus, 'Banner dihapus.', 'ok');
    }).catch(function (err) {
      setStatus(homeStatus, niceError(err), 'err');
    }).then(function () {
      btn.disabled = false;
    });
  });

  /* ---- Daftar artikel: edit & hapus ---- */
  function loadList() {
    var box = $('daftar');
    sb.from(TABLE).select('id,title,poster_url,poster_path,link_url,content,category_id,created_at,categories(name)')
      .order('created_at', { ascending: false }).then(function (r) {
        box.textContent = '';
        if (r.error) { box.appendChild(el('p', 'status err', niceError(r.error))); return; }
        if (!r.data.length) { box.appendChild(el('p', 'status', 'Belum ada artikel.')); return; }
        r.data.forEach(function (p) {
          var row = el('div', 'item');
          var im = el('img'); im.src = p.poster_url; im.alt = ''; im.loading = 'lazy';
          row.appendChild(im);
          var txt = el('div', 'txt');
          txt.appendChild(el('div', 't', p.title));
          var sub = p.categories && p.categories.name ? p.categories.name : 'Tanpa kategori';
          txt.appendChild(el('div', 'u', sub));
          row.appendChild(txt);
          var act = el('div', 'act');
          var edit = el('button', 'edit', 'Edit');
          edit.type = 'button';
          edit.addEventListener('click', function () { startEdit(p); });
          act.appendChild(edit);
          var del = el('button', 'del', 'Hapus');
          del.type = 'button';
          del.addEventListener('click', function () { removeItem(p, del); });
          act.appendChild(del);
          row.appendChild(act);
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
      if (editing && editing.id === p.id) resetForm();
      if (p.poster_path) return sb.storage.from(BUCKET).remove([p.poster_path]);
    }).then(function () {
      loadList();
    }).catch(function (err) {
      btn.disabled = false;
      setStatus($('status'), niceError(err), 'err');
    });
  }
})();
