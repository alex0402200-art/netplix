/* ============================================================
   Halaman baca artikel: ambil satu postingan dari Supabase
   berdasarkan ?id=..., lalu tampilkan isinya.
   Isi tulisan ditampilkan sebagai teks biasa (aman dari HTML).
   ============================================================ */
(function () {
  'use strict';

  var C = window.APP_CONFIG || {};

  function $(id) { return document.getElementById(id); }
  function safeUrl(u) {
    try {
      var x = new URL(String(u || '').trim());
      return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null;
    } catch (e) { return null; }
  }
  function dateId(s) {
    var d = new Date(s);
    return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function readMinutes(text) {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return words ? Math.max(1, Math.ceil(words / 200)) : 0;
  }
  function showMsg(text, isErr) {
    var m = $('pesan');
    m.textContent = text;
    m.className = 'msg' + (isErr ? ' err' : '');
    m.hidden = false;
  }

  var id = new URLSearchParams(location.search).get('id');

  function fetchPost() {
    var base = C.SUPABASE_URL.replace(/\/+$/, '');
    var headers = { apikey: C.SUPABASE_KEY };
    if (/^eyJ/.test(C.SUPABASE_KEY)) headers.Authorization = 'Bearer ' + C.SUPABASE_KEY;
    var url = base + '/rest/v1/' + (C.TABLE || 'posters') +
      '?select=id,title,poster_url,link_url,content,created_at,categories(name)' +
      '&id=eq.' + encodeURIComponent(id) + '&limit=1';
    return fetch(url, { headers: headers }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function render(p) {
    var title = String(p.title || '').trim();
    document.title = title + ' - NETPLIX';

    var cover = safeUrl(p.poster_url);
    if (cover) {
      var img = $('cover');
      img.src = cover;
      img.alt = title;
      img.hidden = false;
    }

    if (p.categories && p.categories.name) {
      var tag = $('tag');
      tag.textContent = p.categories.name;
      tag.hidden = false;
    }

    $('title').textContent = title;

    var meta = $('meta');
    meta.textContent = '';
    var d = dateId(p.created_at);
    if (d) meta.appendChild(document.createTextNode(d));
    var rm = readMinutes(p.content);
    if (rm) {
      if (d) meta.appendChild(document.createTextNode(' | '));
      meta.appendChild(document.createTextNode(rm + ' menit baca'));
    }

    var body = $('body');
    body.textContent = '';
    String(p.content || '').split(/\n\s*\n/).forEach(function (para) {
      para = para.trim();
      if (!para) return;
      var n = document.createElement('p');
      n.textContent = para;
      body.appendChild(n);
    });

    var link = safeUrl(p.link_url);
    if (link) {
      var a = $('ext');
      a.href = link;
      a.hidden = false;
    }

    $('pesan').hidden = true;
    $('post').hidden = false;
  }

  if (!id) { showMsg('Artikel tidak ditemukan.', true); return; }
  if (!C.SUPABASE_URL || !C.SUPABASE_KEY || C.SUPABASE_URL.indexOf('ISI_') !== -1) {
    showMsg('Web belum disambungkan ke Supabase.', true);
    return;
  }

  fetchPost().then(function (rows) {
    if (!rows || !rows.length) { showMsg('Artikel tidak ditemukan.', true); return; }
    render(rows[0]);
  }).catch(function () {
    showMsg('Gagal memuat artikel. Coba muat ulang halaman.', true);
  });
})();
