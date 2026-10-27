/* ============================================================
   Fungsi bersama untuk halaman utama dan halaman baca:
   - membaca isi artikel (blok paragraf & gambar)
   - format tanggal, waktu baca, cuplikan
   - footer dengan ikon TikTok & WhatsApp
   ============================================================ */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  function safeUrl(u) {
    try {
      var x = new URL(String(u || '').trim());
      return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null;
    } catch (e) { return null; }
  }

  // Isi artikel: JSON berisi blok [{type:'text'|'image', ...}].
  // Postingan lama (teks biasa) dibaca sebagai paragraf dipisah baris kosong.
  function parseBlocks(content) {
    var t = String(content || '').trim();
    if (!t) return [];
    if (t.charAt(0) === '[') {
      try {
        var arr = JSON.parse(t);
        if (Array.isArray(arr)) {
          return arr.filter(function (b) {
            if (!b || typeof b !== 'object') return false;
            if (b.type === 'image') return !!safeUrl(b.url);
            if (b.type === 'text') return !!String(b.text || '').trim();
            return false;
          });
        }
      } catch (e) { /* bukan JSON, lanjut sebagai teks biasa */ }
    }
    return t.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (s) { return { type: 'text', text: s }; });
  }

  function plainText(blocks) {
    return blocks.filter(function (b) { return b.type === 'text'; })
      .map(function (b) { return b.text; }).join(' ');
  }

  // Waktu baca dihitung otomatis: ±200 kata per menit
  function readMinutes(text) {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return words ? Math.max(1, Math.ceil(words / 200)) : 0;
  }

  function excerptOf(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= 140) return t;
    return t.slice(0, 140).replace(/\s+\S*$/, '') + '…';
  }

  function dateId(s) {
    var d = new Date(s);
    return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ---- Footer ---- */
  function isSet(v) { return !!v && String(v).indexOf('ISI_') === -1; }

  function socialIcon(kind) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('fill', 'currentColor');
    p.setAttribute('d', kind === 'tiktok'
      ? 'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z'
      : 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z');
    s.appendChild(p);
    return s;
  }

  function buildFooter() {
    var foot = document.getElementById('footer');
    if (!foot) return;
    var C = window.APP_CONFIG || {};
    foot.textContent = '';
    var row = document.createElement('div');
    row.className = 'social';
    [['tiktok', 'TikTok', C.TIKTOK_URL], ['whatsapp', 'WhatsApp', C.WHATSAPP_URL]].forEach(function (s) {
      var url = safeUrl(s[2]);
      if (!url || !isSet(s[2])) return;
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'social-btn';
      a.setAttribute('aria-label', s[1]);
      a.appendChild(socialIcon(s[0]));
      row.appendChild(a);
    });
    if (row.children.length) foot.appendChild(row);
    var copy = document.createElement('p');
    copy.className = 'footer-copy';
    copy.textContent = 'KOTOKO Audio Sound System © 2026';
    foot.appendChild(copy);
  }

  window.NP = {
    safeUrl: safeUrl,
    parseBlocks: parseBlocks,
    plainText: plainText,
    readMinutes: readMinutes,
    excerptOf: excerptOf,
    dateId: dateId
  };

  buildFooter();
})();
