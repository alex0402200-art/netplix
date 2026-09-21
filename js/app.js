/* ============================================================
   Halaman utama: ambil poster dari Supabase lalu tampilkan.
   Poster diklik -> membuka link tujuannya.
   ============================================================ */
(function () {
  'use strict';

  var C = window.APP_CONFIG || {};
  var SVGNS = 'http://www.w3.org/2000/svg';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    var u = document.createElementNS(SVGNS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }
  // Hanya izinkan link http/https (mencegah "javascript:" dan sejenisnya)
  function safeUrl(u) {
    try {
      var x = new URL(String(u || '').trim());
      return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null;
    } catch (e) { return null; }
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function openLink(a, url) {
    a.href = url;
    if ((C.LINK_TARGET || '_blank') === '_blank') a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }

  /* ---- Nama brand ---- */
  var brand = C.BRAND || ['NET', 'PLIX'];
  var la = document.querySelector('.logo-a'), lb = document.querySelector('.logo-b');
  if (la) la.textContent = brand[0] || '';
  if (lb) lb.textContent = brand[1] || '';
  document.title = brand.join('');

  var pesan = $('pesan');
  function showMsg(text, isErr) {
    pesan.textContent = text;
    pesan.className = 'msg' + (isErr ? ' err' : '');
    pesan.hidden = false;
  }

  /* ---- Ambil data (tanpa library, langsung lewat REST) ---- */
  function configured() {
    return C.SUPABASE_URL && C.SUPABASE_KEY &&
      C.SUPABASE_URL.indexOf('ISI_') === -1 && C.SUPABASE_KEY.indexOf('ISI_') === -1;
  }
  function loadPosters() {
    var base = C.SUPABASE_URL.replace(/\/+$/, '');
    var headers = { apikey: C.SUPABASE_KEY };
    if (/^eyJ/.test(C.SUPABASE_KEY)) headers.Authorization = 'Bearer ' + C.SUPABASE_KEY;
    var url = base + '/rest/v1/' + (C.TABLE || 'posters') +
      '?select=id,title,poster_url,link_url,created_at&order=created_at.desc&limit=300';
    return fetch(url, { headers: headers }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---- Banner besar ---- */
  function buildHero(items) {
    var hero = $('hero'), track = $('heroTrack'), dots = $('heroDots');
    var prev = $('heroPrev'), next = $('heroNext');
    var slides = items.slice(0, C.HERO_COUNT || 4);
    if (!slides.length) return;

    var slideEls = [], dotEls = [], idx = 0, timer = null;

    slides.forEach(function (p, i) {
      var s = el('article', 'slide');
      var img = el('img', 'slide-img');
      img.src = p.poster_url; img.alt = ''; img.decoding = 'async';
      if (i > 0) img.loading = 'lazy';
      img.onerror = function () { img.style.display = 'none'; };
      s.appendChild(img);
      s.appendChild(el('div', 'slide-shade'));

      var body = el('div', 'slide-body');
      body.appendChild(el('span', 'tag', 'FILM TERBARU'));
      body.appendChild(el('h2', 'slide-title', p.title));
      if (C.SHOW_HD_BADGE !== false) {
        var meta = el('div', 'meta');
        meta.appendChild(el('span', 'badge-hd', 'HD'));
        body.appendChild(meta);
      }
      var act = el('div', 'actions');
      var play = el('a', 'btn-play');
      play.appendChild(icon('play'));
      play.appendChild(document.createTextNode('Putar'));
      openLink(play, p.link_url);
      act.appendChild(play);
      var list = el('span', 'btn-list');
      list.setAttribute('aria-hidden', 'true');
      list.appendChild(icon('plus'));
      list.appendChild(document.createTextNode('Daftar Saya'));
      act.appendChild(list);
      body.appendChild(act);
      s.appendChild(body);

      track.appendChild(s);
      slideEls.push(s);

      var d = el('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Slide ' + (i + 1));
      d.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(d);
      dotEls.push(d);
    });

    function go(n) {
      idx = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      slideEls.forEach(function (s, i) {
        s.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
        var a = s.querySelector('a');
        if (a) a.tabIndex = i === idx ? 0 : -1;
      });
      dotEls.forEach(function (d, i) { d.className = i === idx ? 'on' : ''; });
    }
    function restart() {
      if (timer) clearInterval(timer);
      timer = null;
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (slides.length > 1 && !reduce) timer = setInterval(function () { go(idx + 1); }, 5500);
    }

    if (slides.length < 2) {
      prev.hidden = true; next.hidden = true; dots.hidden = true;
    } else {
      prev.addEventListener('click', function () { go(idx - 1); restart(); });
      next.addEventListener('click', function () { go(idx + 1); restart(); });
      var sx = 0, sy = 0;
      hero.addEventListener('touchstart', function (e) {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      hero.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
      }, { passive: true });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { clearInterval(timer); timer = null; } else restart();
      });
    }
    go(0);
    restart();
    hero.hidden = false;
  }

  /* ---- Baris poster ---- */
  function buildRow(title, list) {
    var sec = el('section', 'block');
    var head = el('div', 'section-head');
    head.appendChild(el('h3', null, title));
    var all = el('span', 'see-all', 'Lihat Semua ');
    all.setAttribute('aria-hidden', 'true');
    all.appendChild(icon('right'));
    head.appendChild(all);
    sec.appendChild(head);

    var sc = el('div', 'scroller');
    list.forEach(function (p) {
      var a = el('a', 'card');
      openLink(a, p.link_url);
      a.setAttribute('aria-label', p.title);
      var th = el('div', 'thumb');
      var img = el('img');
      img.src = p.poster_url; img.alt = p.title; img.loading = 'lazy'; img.decoding = 'async';
      img.onerror = function () { img.style.visibility = 'hidden'; };
      th.appendChild(img);
      if (C.SHOW_HD_BADGE !== false) th.appendChild(el('span', 'badge-hd', 'HD'));
      a.appendChild(th);
      a.appendChild(el('span', 'cap', p.title));
      sc.appendChild(a);
    });
    sec.appendChild(sc);
    return sec;
  }

  function render(items) {
    var rows = $('rows');
    rows.textContent = '';
    if (!items.length) {
      $('hero').hidden = true;
      showMsg('Belum ada poster.');
      return;
    }
    pesan.hidden = true;
    buildHero(items);
    (C.ROWS || []).forEach(function (r) {
      var list = r.mode === 'shuffle' ? shuffle(items) : items;
      rows.appendChild(buildRow(r.title, list));
    });
  }

  /* ---- Mulai ---- */
  if (!configured()) {
    showMsg('Web belum disambungkan ke Supabase. Isi SUPABASE_URL dan SUPABASE_KEY di js/config.js.', true);
    return;
  }
  loadPosters().then(function (data) {
    var items = (Array.isArray(data) ? data : []).map(function (p) {
      return {
        id: p.id,
        title: String(p.title || '').trim(),
        poster_url: safeUrl(p.poster_url),
        link_url: safeUrl(p.link_url)
      };
    }).filter(function (p) { return p.title && p.poster_url && p.link_url; });
    render(items);
  }).catch(function () {
    showMsg('Gagal memuat poster. Coba muat ulang halaman.', true);
  });
})();
