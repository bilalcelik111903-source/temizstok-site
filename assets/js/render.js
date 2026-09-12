/* TemizStok – paylaşılan render yardımcıları (hem build betiği hem tarayıcı kullanır) */
var TSRender = (function () {
  'use strict';
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var nf = null;
  function fmtPrice(minor) {
    if (typeof minor !== 'number' || isNaN(minor)) return '';
    try {
      nf = nf || new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return nf.format(minor / 100);
    } catch (e) {
      var v = (minor / 100).toFixed(2).replace('.', ',');
      return '₺' + v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  }
  var ICONS = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.3a1 1 0 0 0-.3-.7l-3.4-3.4a1 1 0 0 0-.7-.3H14v7.7"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.3.8 3.1.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    invoice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    spray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8h6l1 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-8z"/><path d="M11 8V5h2v3"/><path d="M13 5h5M18 3v4M20 5h1"/></svg>',
    wash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M7 6h.01M11 6h2"/><path d="M9 14c1.5-1.5 4.5-1.5 6 0"/></svg>',
    dish: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M4 12h1M19 12h1"/></svg>',
    roll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v12c0 1.7 2.7 3 6 3s6-1.3 6-3V6"/><path d="M15 9h6v12h-6"/></svg>',
    mop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2 8 14"/><path d="M6 14h8l1 8H5z"/><path d="M8 18h4"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>'
  };
  function icon(name, cls) { return '<span class="icon ' + (cls || '') + '" aria-hidden="true">' + (ICONS[name] || '') + '</span>'; }

  function badgeClass(badge) {
    if (!badge) return '';
    var b = badge.toLowerCase();
    if (b.indexOf('indirim') > -1 || b.indexOf('i̇ndirim') > -1) return 'sale';
    if (b.indexOf('yeni') > -1) return 'new';
    if (b.indexOf('satan') > -1) return 'hot';
    if (b.indexOf('toptan') > -1) return 'bulk';
    return '';
  }
  function imageUrl(p, root) {
    if (!p.image) return root + 'assets/img/placeholder.svg';
    return /^https?:\/\//.test(p.image) ? p.image : root + p.image;
  }
  function productUrl(p, root) {
    return p.static === false ? root + 'urun.html?id=' + encodeURIComponent(p.product_id || p.slug) : root + 'urun/' + p.slug + '.html';
  }
  function discountPct(p) {
    if (!p.comparePrice || p.comparePrice <= p.price) return 0;
    return Math.round((1 - p.price / p.comparePrice) * 100);
  }
  function priceHtml(p) {
    var pct = discountPct(p);
    var h = '<div class="price"><span class="now">' + fmtPrice(p.price) + '</span>';
    if (pct) h += '<span class="old">' + fmtPrice(p.comparePrice) + '</span><span class="off">%' + pct + '</span>';
    return h + '</div>';
  }
  function productCard(p, root, catName) {
    var url = productUrl(p, root);
    var out = p.outOfStock;
    return '<article class="product-card" data-slug="' + esc(p.slug) + '">' +
      (p.badge ? '<span class="badge ' + badgeClass(p.badge) + '">' + esc(p.badge) + '</span>' : '') +
      '<a class="thumb" href="' + url + '"><img src="' + esc(imageUrl(p, root)) + '" alt="' + esc(p.name) + '" loading="lazy" width="500" height="500"></a>' +
      '<div class="body">' +
      (catName ? '<span class="cat">' + esc(catName) + '</span>' : '') +
      '<h3><a href="' + url + '">' + esc(p.name) + '</a></h3>' +
      (p.unit ? '<span class="unit">' + esc(p.unit) + '</span>' : '') +
      priceHtml(p) +
      '<div class="actions">' +
      (out ? '<button class="btn btn-outline btn-sm" disabled>Stokta yok</button>' :
        '<button class="btn btn-primary btn-sm" data-add="' + esc(p.slug) + '">' + icon('cart') + 'Sepete Ekle</button>') +
      '<a class="btn btn-outline btn-sm" href="' + url + '">İncele</a>' +
      '</div></div></article>';
  }
  function categoryCard(c, root) {
    return '<a class="cat-card" href="' + root + 'urunler.html?kategori=' + esc(c.slug) + '">' +
      '<div class="icon-wrap" style="background:' + esc(c.color) + '">' + (ICONS[c.icon] || ICONS.box) + '</div>' +
      '<b>' + esc(c.name) + '</b><small>' + esc(c.desc) + '</small></a>';
  }
  function slugify(s) {
    var map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
    return String(s || '').replace(/[çğıöşüÇĞİÖŞÜ]/g, function (ch) { return map[ch]; }).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  return { esc: esc, fmtPrice: fmtPrice, icon: icon, ICONS: ICONS, badgeClass: badgeClass, imageUrl: imageUrl, productUrl: productUrl, priceHtml: priceHtml, productCard: productCard, categoryCard: categoryCard, discountPct: discountPct, slugify: slugify };
})();
if (typeof module !== 'undefined') module.exports = TSRender;
