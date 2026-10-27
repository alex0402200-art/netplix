/* ============================================================
   Halaman baca artikel: ambil satu postingan dari Supabase
   berdasarkan ?id=..., tampilkan isinya (paragraf & gambar),
   tombol Download, dan rekomendasi artikel lain di bawahnya.
   Teks ditampilkan sebagai teks biasa (aman dari HTML).
   ============================================================ */
(function () {
  'use strict';

  var C = window.APP_CONFIG || {};
  var NP = window.NP;

  function $(id) { return document.getElementById(id); }
  function showMsg(text, isErr) {
    var m = $('pesan');
    m.textContent = text;
    m.className = 'msg' + (isErr ? ' err' : '');
    m.hidden = false;
  }
  function headers() {
    var h = { apikey: C.SUPABASE_KEY };
    if (/^eyJ/.test(C.SUPABASE_KEY)) h.Authorization = 'Bearer ' + C.SUPABASE_KEY;
    return h;
  }
  function restGet(query) {
    var base = C.SUPABASE_URL.replace(/\/+$/, '');
    return fetch(base + '/rest/v1/' + query, { headers: headers() }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function postUrl(id) { return 'post.html?id=' + encodeURIComponent(id); }
  function loadCategoryList() {
    return restGet('categories?select=id,name&order=name.asc').catch(function () { return []; });
  }

  var id = new URLSearchParams(location.search).get('id');
  var TABLE = C.TABLE || 'posters';

  function fetchPost() {
    return restGet(TABLE +
      '?select=id,title,poster_url,link_url,content,created_at,category_id,categories(id,name)' +
      '&id=eq.' + encodeURIComponent(id) + '&limit=1');
  }

  function render(p) {
    var title = String(p.title || '').trim();
    document.title = title + ' - NETPLIX';

    var cover = NP.safeUrl(p.poster_url);
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

    var blocks = NP.parseBlocks(p.content);
    var text = NP.plainText(blocks);

    var meta = $('meta');
    meta.textContent = '';
    var d = NP.dateId(p.created_at);
    if (d) meta.appendChild(document.createTextNode(d));
    var rm = NP.readMinutes(text);
    if (rm) {
      if (d) meta.appendChild(document.createTextNode(' | '));
      meta.appendChild(document.createTextNode(rm + ' menit baca'));
    }

    var body = $('body');
    body.textContent = '';
    blocks.forEach(function (b) {
      if (b.type === 'image') {
        var fig = document.createElement('figure');
        fig.className = 'post-figure';
        var im = document.createElement('img');
        im.src = NP.safeUrl(b.url) || '';
        im.alt = '';
        im.loading = 'lazy';
        im.decoding = 'async';
        fig.appendChild(im);
        body.appendChild(fig);
      } else {
        var n = document.createElement('p');
        n.textContent = b.text;
        body.appendChild(n);
      }
    });

    var link = NP.safeUrl(p.link_url);
    if (link) {
      var a = $('download');
      a.href = link;
      a.hidden = false;
    }

    $('pesan').hidden = true;
    $('post').hidden = false;
  }

  /* ---- Rekomendasi artikel lain ---- */
  function articleCard(p) {
    var a = document.createElement('a');
    a.className = 'post';
    a.href = postUrl(p.id);

    var th = document.createElement('div');
    th.className = 'post-thumb';
    var img = document.createElement('img');
    img.src = p.poster_url; img.alt = ''; img.loading = 'lazy';
    img.onerror = function () { img.style.visibility = 'hidden'; };
    th.appendChild(img);
    a.appendChild(th);

    var body = document.createElement('div');
    body.className = 'post-body';
    if (p.categories && p.categories.name) {
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = p.categories.name;
      body.appendChild(tag);
    }
    var h = document.createElement('h3');
    h.className = 'post-title';
    h.textContent = p.title;
    body.appendChild(h);
    var ex = NP.excerptOf(NP.plainText(NP.parseBlocks(p.content)));
    if (ex) {
      var pe = document.createElement('p');
      pe.className = 'post-excerpt';
      pe.textContent = ex;
      body.appendChild(pe);
    }
    a.appendChild(body);

    var chev = document.createElement('span');
    chev.className = 'chev';
    chev.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-right"/></svg>';
    a.appendChild(chev);
    return a;
  }

  function loadRelated(current) {
    return restGet(TABLE +
      '?select=id,title,poster_url,content,created_at,category_id,categories(id,name)' +
      '&order=created_at.desc&limit=40').then(function (rows) {
      var others = (Array.isArray(rows) ? rows : []).filter(function (r) {
        return r.id !== current.id && NP.safeUrl(r.poster_url);
      });
      // Utamakan kategori yang sama, lalu isi dengan artikel terbaru lainnya
      var same = current.category_id ? others.filter(function (r) { return r.category_id === current.category_id; }) : [];
      var rest = others.filter(function (r) { return same.indexOf(r) === -1; });
      var pick = same.concat(rest).slice(0, 4);
      if (!pick.length) return;

      var box = $('relatedList');
      box.textContent = '';
      pick.forEach(function (r) { box.appendChild(articleCard(r)); });
      $('related').hidden = false;
    }).catch(function () { /* rekomendasi cuma pelengkap, diamkan kalau gagal */ });
  }

  /* ---- Header: menu burger (kategori) & pencarian ---- */
  function wireHeader(categories) {
    var menuBtn = $('menuBtn'), drawer = $('drawer'), drawerBg = $('drawerBg');
    function openDrawer() {
      drawer.classList.add('open');
      drawerBg.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      drawerBg.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    menuBtn.addEventListener('click', openDrawer);
    $('drawerClose').addEventListener('click', closeDrawer);
    drawerBg.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

    var box = $('drawerList');
    box.textContent = '';
    [{ id: '', name: 'Beranda' }].concat(Array.isArray(categories) ? categories : []).forEach(function (c) {
      var a = document.createElement('a');
      a.className = 'drawer-item';
      a.href = c.id ? 'index.html?cat=' + encodeURIComponent(c.id) : 'index.html';
      a.textContent = c.name;
      box.appendChild(a);
    });

    var searchBtn = $('searchBtn'), searchForm = $('searchForm'), searchInput = $('searchInput');
    searchBtn.addEventListener('click', function () {
      var open = searchForm.hidden;
      searchForm.hidden = !open;
      searchBtn.setAttribute('aria-expanded', String(open));
      if (open) searchInput.focus();
    });
  }

  loadCategoryList().then(wireHeader);

  if (!id) { showMsg('Artikel tidak ditemukan.', true); return; }
  if (!C.SUPABASE_URL || !C.SUPABASE_KEY || C.SUPABASE_URL.indexOf('ISI_') !== -1) {
    showMsg('Web belum disambungkan ke Supabase.', true);
    return;
  }

  fetchPost().then(function (rows) {
    if (!rows || !rows.length) { showMsg('Artikel tidak ditemukan.', true); return; }
    render(rows[0]);
    loadRelated(rows[0]);
  }).catch(function () {
    showMsg('Gagal memuat artikel. Coba muat ulang halaman.', true);
  });
})();
