/* ============================================================
   Halaman utama (blog): banner artikel terbaru, ikon kategori,
   daftar artikel, pencarian, dan menu burger berisi kategori.
   Data diambil dari Supabase lewat REST (tanpa library).
   ============================================================ */
(function () {
  'use strict';

  var C = window.APP_CONFIG || {};
  var NP = window.NP;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var TAG_COLORS = ['#1f6feb', '#7c4dff', '#1f9d63', '#e5484d', '#d98e00', '#0ea5a4'];

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
  function configured() {
    return C.SUPABASE_URL && C.SUPABASE_KEY &&
      C.SUPABASE_URL.indexOf('ISI_') === -1 && C.SUPABASE_KEY.indexOf('ISI_') === -1;
  }

  /* ---- Data ---- */
  // Bisa dibuka dengan ?cat=ID atau ?q=kata (dipakai dari halaman baca)
  var qs = new URLSearchParams(location.search);
  var state = { posts: [], categories: [], cat: qs.get('cat') || '', q: qs.get('q') || '' };

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
  function loadData() {
    var postsQ = (C.TABLE || 'posters') +
      '?select=id,title,poster_url,link_url,content,created_at,category_id,categories(id,name)' +
      '&order=created_at.desc&limit=300';
    var catsQ = 'categories?select=id,name&order=name.asc';
    return Promise.all([restGet(postsQ), restGet(catsQ).catch(function () { return []; })])
      .then(function (res) {
        state.posts = (Array.isArray(res[0]) ? res[0] : []).map(function (p) {
          var blocks = NP.parseBlocks(p.content);
          return {
            id: p.id,
            title: String(p.title || '').trim(),
            poster_url: NP.safeUrl(p.poster_url),
            blocks: blocks,
            text: NP.plainText(blocks),
            created_at: p.created_at,
            category: p.categories ? { id: p.categories.id, name: p.categories.name } : null
          };
        }).filter(function (p) { return p.title && p.poster_url; });
        state.categories = Array.isArray(res[1]) ? res[1] : [];
      });
  }

  function colorFor(catId) {
    var i = state.categories.findIndex(function (c) { return c.id === catId; });
    return TAG_COLORS[(i < 0 ? 0 : i) % TAG_COLORS.length];
  }
  function postUrl(p) { return 'post.html?id=' + encodeURIComponent(p.id); }

  function makeTag(p) {
    if (!p.category) return null;
    var t = el('span', 'tag', p.category.name);
    t.style.background = colorFor(p.category.id);
    return t;
  }

  /* ---- Banner ---- */
  function buildHero(items) {
    var hero = $('hero'), track = $('heroTrack'), dots = $('heroDots');
    var prev = $('heroPrev'), next = $('heroNext');
    var slides = items.slice(0, C.HERO_COUNT || 4);
    track.textContent = '';
    dots.textContent = '';
    if (!slides.length) { hero.hidden = true; return; }

    var slideEls = [], dotEls = [], idx = 0, timer = null;

    slides.forEach(function (p, i) {
      var s = el('article', 'slide');
      var a = el('a', 'slide-link');
      a.href = postUrl(p);
      a.setAttribute('aria-label', p.title);
      var img = el('img', 'slide-img');
      img.src = p.poster_url; img.alt = ''; img.decoding = 'async';
      if (i > 0) img.loading = 'lazy';
      img.onerror = function () { img.style.display = 'none'; };
      a.appendChild(img);
      a.appendChild(el('div', 'slide-shade'));

      var body = el('div', 'slide-body');
      var tag = makeTag(p);
      if (tag) body.appendChild(tag);
      body.appendChild(el('h2', 'slide-title', p.title));
      var ex = NP.excerptOf(p.text);
      if (ex) body.appendChild(el('p', 'slide-excerpt', ex));
      var meta = el('div', 'meta');
      var d = NP.dateId(p.created_at);
      if (d) { meta.appendChild(icon('cal')); meta.appendChild(el('span', null, d)); }
      var rm = NP.readMinutes(p.text);
      if (rm) { meta.appendChild(el('span', 'sep', '|')); meta.appendChild(icon('clock')); meta.appendChild(el('span', null, rm + ' menit baca')); }
      body.appendChild(meta);
      var btn = el('span', 'btn-read');
      btn.appendChild(document.createTextNode('Baca Selengkapnya'));
      btn.appendChild(icon('arrow'));
      body.appendChild(btn);
      a.appendChild(body);
      s.appendChild(a);

      track.appendChild(s);
      slideEls.push(s);

      var dot = el('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Slide ' + (i + 1));
      dot.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(dot);
      dotEls.push(dot);
    });

    function go(n) {
      idx = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      slideEls.forEach(function (s, i) {
        var a = s.querySelector('a');
        if (a) a.tabIndex = i === idx ? 0 : -1;
        s.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
      });
      dotEls.forEach(function (d, i) { d.className = i === idx ? 'on' : ''; });
    }
    function restart() {
      if (timer) clearInterval(timer);
      timer = null;
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (slides.length > 1 && !reduce) timer = setInterval(function () { go(idx + 1); }, 6000);
    }

    if (slides.length < 2) {
      prev.hidden = true; next.hidden = true; dots.hidden = true;
    } else {
      prev.hidden = false; next.hidden = false; dots.hidden = false;
      prev.onclick = function () { go(idx - 1); restart(); };
      next.onclick = function () { go(idx + 1); restart(); };
      var sx = 0, sy = 0;
      hero.ontouchstart = function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
      hero.ontouchend = function (e) {
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
      };
    }
    go(0);
    restart();
    hero.hidden = false;
  }

  /* ---- Ikon kategori (grid) ---- */
  function setCategory(id) {
    state.cat = id;
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildCatGrid() {
    var grid = $('catGrid');
    grid.textContent = '';
    var all = [{ id: '', name: 'Semua', ic: 'grid' }].concat(state.categories.map(function (c) {
      return { id: c.id, name: c.name, ic: 'tag' };
    }));
    all.forEach(function (c) {
      var b = el('button', 'cat-box' + (state.cat === c.id ? ' on' : ''));
      b.type = 'button';
      b.appendChild(icon(c.ic));
      b.appendChild(el('span', null, c.name));
      b.addEventListener('click', function () { setCategory(c.id); });
      grid.appendChild(b);
    });
    grid.hidden = state.categories.length === 0;
  }

  /* ---- Daftar artikel ---- */
  function filtered() {
    var q = state.q.toLowerCase();
    return state.posts.filter(function (p) {
      if (state.cat && (!p.category || p.category.id !== state.cat)) return false;
      if (q && p.title.toLowerCase().indexOf(q) === -1 && p.text.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function articleCard(p) {
    var a = el('a', 'post');
    a.href = postUrl(p);
    var th = el('div', 'post-thumb');
    var img = el('img');
    img.src = p.poster_url; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.onerror = function () { img.style.visibility = 'hidden'; };
    th.appendChild(img);
    a.appendChild(th);

    var body = el('div', 'post-body');
    var tag = makeTag(p);
    if (tag) body.appendChild(tag);
    body.appendChild(el('h3', 'post-title', p.title));
    var ex = NP.excerptOf(p.text);
    if (ex) body.appendChild(el('p', 'post-excerpt', ex));
    var meta = el('div', 'post-meta');
    var d = NP.dateId(p.created_at);
    if (d) meta.appendChild(el('span', null, d));
    var rm = NP.readMinutes(p.text);
    if (rm) { if (d) meta.appendChild(el('span', 'sep', '|')); meta.appendChild(el('span', null, rm + ' menit baca')); }
    body.appendChild(meta);
    a.appendChild(body);

    var chev = el('span', 'chev');
    chev.appendChild(icon('right'));
    a.appendChild(chev);
    return a;
  }

  function renderList() {
    var list = $('list'), title = $('listTitle'), pesan = $('pesan');
    list.textContent = '';
    var items = filtered();

    if (state.q) title.textContent = 'Hasil: "' + state.q + '"';
    else if (state.cat) title.textContent = (state.categories.find(function (c) { return c.id === state.cat; }) || {}).name || 'Artikel';
    else title.textContent = 'Artikel Terbaru';

    if (!state.posts.length) { pesan.textContent = 'Belum ada artikel.'; pesan.className = 'msg'; pesan.hidden = false; return; }
    if (!items.length) { pesan.textContent = 'Belum ada artikel di sini.'; pesan.className = 'msg'; pesan.hidden = false; return; }
    pesan.hidden = true;
    items.forEach(function (p) { list.appendChild(articleCard(p)); });
  }

  function renderAll() {
    var showHero = !state.cat && !state.q;
    if (showHero) buildHero(state.posts);
    else $('hero').hidden = true;
    buildCatGrid();
    renderList();
    buildDrawer();
  }

  /* ---- Menu burger ---- */
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
  function buildDrawer() {
    var box = $('drawerList');
    box.textContent = '';
    var items = [{ id: '', name: 'Beranda' }].concat(state.categories);
    items.forEach(function (c) {
      var b = el('button', 'drawer-item' + (state.cat === c.id ? ' on' : ''), c.name);
      b.type = 'button';
      b.addEventListener('click', function () { closeDrawer(); setCategory(c.id); });
      box.appendChild(b);
    });
  }

  menuBtn.addEventListener('click', openDrawer);
  $('drawerClose').addEventListener('click', closeDrawer);
  drawerBg.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  /* ---- Pencarian ---- */
  var searchBtn = $('searchBtn'), searchForm = $('searchForm'), searchInput = $('searchInput');
  searchBtn.addEventListener('click', function () {
    var open = searchForm.hidden;
    searchForm.hidden = !open;
    searchBtn.setAttribute('aria-expanded', String(open));
    if (open) searchInput.focus();
    else { searchInput.value = ''; state.q = ''; renderAll(); }
  });
  searchForm.addEventListener('submit', function (e) { e.preventDefault(); });
  searchInput.addEventListener('input', function () {
    state.q = searchInput.value.trim();
    renderAll();
  });

  /* ---- Mulai ---- */
  if (!configured()) {
    var pesanEl = $('pesan');
    pesanEl.textContent = 'Web belum disambungkan ke Supabase. Isi SUPABASE_URL dan SUPABASE_KEY di js/config.js.';
    pesanEl.className = 'msg err';
    return;
  }
  loadData().then(function () {
    if (state.q) { searchForm.hidden = false; searchInput.value = state.q; searchBtn.setAttribute('aria-expanded', 'true'); }
    renderAll();
  }).catch(function () {
    var pesanEl = $('pesan');
    pesanEl.textContent = 'Gagal memuat artikel. Coba muat ulang halaman.';
    pesanEl.className = 'msg err';
  });
})();
