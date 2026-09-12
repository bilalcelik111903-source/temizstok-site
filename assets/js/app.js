/* TemizStok storefront – sepet, canlı katalog ve Hostinger Ecommerce checkout */
(function () {
  'use strict';
  var CONFIG = window.TS_CONFIG || {};
  var R = window.TSRender;
  var ROOT = document.documentElement.getAttribute('data-root') || '';
  var PAGE = document.body.getAttribute('data-page') || '';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- Katalog ---------- */
  var catalogPromise = null;
  function getCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(ROOT + 'data/catalog.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('catalog ' + r.status); return r.json(); })
      .then(function (cat) {
        cat.products.forEach(function (p) { if (p.static === undefined) p.static = true; });
        return fetchLive(cat);
      });
    return catalogPromise;
  }
  function norm(s) { return String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim(); }
  function stripCat(s) { return String(s || '').replace(/\s*Kategori:\s*[^.\n]+\.?\s*$/i, '').trim(); }
  function guessCategory(desc, cats) {
    var m = /Kategori:\s*([^\n.]+)/i.exec(desc || '');
    if (m) {
      var name = norm(m[1]);
      for (var i = 0; i < cats.length; i++) if (norm(cats[i].name) === name) return cats[i].slug;
    }
    return cats.length ? cats[0].slug : '';
  }
  /* Canlı katalog: Hostinger Storefront API'den fiyat/stok/yeni ürünleri okur; başarısız olursa yerel katalog kullanılır. */
  function fetchLive(cat) {
    if (!CONFIG.liveCatalog || !CONFIG.salesChannelId || typeof fetch !== 'function') return Promise.resolve(cat);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    var url = CONFIG.apiBase + '/channels/' + CONFIG.salesChannelId + '/products?limit=100';
    return fetch(url, { signal: ctrl && ctrl.signal, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var list = Array.isArray(j) ? j : (j.products || j.data || j.items || []);
        if (list.length) mergeLive(cat, list);
        return cat;
      })
      .catch(function () { return cat; })
      .then(function (c) { clearTimeout(timer); return c; });
  }
  function mergeLive(cat, list) {
    var byId = {}, byTitle = {};
    cat.products.forEach(function (p) { if (p.product_id) byId[p.product_id] = p; byTitle[norm(p.name)] = p; });
    list.forEach(function (lp) {
      var title = lp.title || lp.name || '';
      var variants = lp.variants || [];
      var v = variants[0] || null;
      var pr = v && v.prices && v.prices[0];
      var amount = pr ? Number(pr.amount) : (lp.price_range ? Number(lp.price_range.min) : NaN);
      var sale = pr && pr.sale_amount != null ? Number(pr.sale_amount) : null;
      var p = byId[lp.id] || byTitle[norm(title)];
      if (!p) {
        p = {
          slug: R.slugify(title) || lp.id, sku: (v && v.sku) || '', name: title,
          category: guessCategory(lp.description, cat.categories), price: amount, comparePrice: null, unit: '',
          badge: 'Yeni', short: stripCat(lp.description).slice(0, 160), description: stripCat(lp.description),
          features: [], usage: '', image: lp.thumbnail || '', product_id: lp.id, variant_id: v && v.id, static: false
        };
        cat.products.push(p);
      }
      if (!isNaN(amount) && amount > 0) {
        if (sale && sale > 0 && sale < amount) { p.price = sale; p.comparePrice = amount; }
        else { p.price = amount; if (p.comparePrice && p.comparePrice <= amount) p.comparePrice = null; }
      }
      if (v && v.id) p.variant_id = v.id;
      if (lp.status && lp.status !== 'published') p.hidden = true;
      if (v && v.manage_inventory && Number(v.inventory_quantity) <= 0) p.outOfStock = true;
      if (lp.thumbnail && !p.image) p.image = lp.thumbnail;
    });
  }
  function findProduct(cat, key) {
    for (var i = 0; i < cat.products.length; i++) {
      var p = cat.products[i];
      if (p.slug === key || p.product_id === key) return p;
    }
    return null;
  }
  function catName(cat, slug) {
    for (var i = 0; i < cat.categories.length; i++) if (cat.categories[i].slug === slug) return cat.categories[i].name;
    return '';
  }
  function visible(cat) { return cat.products.filter(function (p) { return !p.hidden; }); }

  /* ---------- Sepet ---------- */
  var Cart = {
    key: 'ts_cart_v1', items: [],
    load: function () { try { this.items = JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { this.items = []; } if (!Array.isArray(this.items)) this.items = []; },
    save: function () { try { localStorage.setItem(this.key, JSON.stringify(this.items)); } catch (e) {} updateBadge(); },
    find: function (slug) { for (var i = 0; i < this.items.length; i++) if (this.items[i].slug === slug) return this.items[i]; return null; },
    add: function (p, qty) {
      qty = Math.max(1, parseInt(qty, 10) || 1);
      var it = this.find(p.slug);
      if (it) it.qty = Math.min(999, it.qty + qty); else this.items.push({ slug: p.slug, variant_id: p.variant_id || null, qty: qty });
      this.save();
    },
    setQty: function (slug, qty) { var it = this.find(slug); if (!it) return; qty = parseInt(qty, 10) || 0; if (qty <= 0) this.remove(slug); else { it.qty = Math.min(999, qty); this.save(); } },
    remove: function (slug) { this.items = this.items.filter(function (i) { return i.slug !== slug; }); this.save(); },
    clear: function () { this.items = []; this.save(); },
    count: function () { return this.items.reduce(function (a, i) { return a + i.qty; }, 0); }
  };
  function updateBadge() {
    var n = Cart.count();
    $$('#cart-count').forEach(function (el) { el.textContent = n; el.setAttribute('data-empty', n ? 'false' : 'true'); });
  }
  var toastTimer;
  function toast(html, ms) {
    var t = $('#toast'); if (!t) return;
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 3200);
  }
  function addToCartBySlug(slug, qty) {
    return getCatalog().then(function (cat) {
      var p = findProduct(cat, slug);
      if (!p) return;
      Cart.add(p, qty);
      toast('<span>' + R.icon('check') + '</span><span><b>' + R.esc(p.name) + '</b> sepete eklendi.</span><a href="' + ROOT + 'sepet.html">Sepete git</a>');
    });
  }

  /* ---------- Checkout (Hostinger Ecommerce) ---------- */
  function siteBase() { return new URL(ROOT || './', window.location.href).href; }
  function checkout(btn, cat) {
    var items = Cart.items.map(function (i) {
      var p = findProduct(cat, i.slug);
      return p && p.variant_id ? { variant_id: p.variant_id, quantity: i.qty } : null;
    }).filter(Boolean);
    var alertEl = $('#checkout-alert');
    if (!items.length) { showAlert(alertEl, 'error', 'Sepetinizdeki ürünler için ödeme bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.'); return Promise.resolve(); }
    var base = siteBase();
    var body = { items: items, success_url: base + 'checkout/success/', cancel_url: base + 'checkout/cancel/', locale: 'tr' };
    if (btn) { btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.innerHTML = 'Ödeme sayfasına yönlendiriliyor…'; }
    return fetch(CONFIG.apiBase + '/channels/' + CONFIG.salesChannelId + '/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, json: j }; }); })
      .then(function (res) {
        var url = res.json && (res.json.url || (res.json.data && res.json.data.url));
        if (res.ok && url) { window.location.href = url; return; }
        var msg = (res.json && (res.json.message || res.json.error)) || ('HTTP ' + res.status);
        throw new Error(msg);
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.label; }
        showAlert(alertEl, 'error', 'Ödeme sayfası şu anda açılamadı (' + R.esc(String(err.message || err)) + '). ' +
          'Siparişinizi <a href="' + whatsappOrderLink(cat) + '" target="_blank" rel="noopener"><b>WhatsApp</b></a> üzerinden veya ' +
          '<a href="' + ROOT + 'iletisim.html"><b>iletişim formu</b></a> ile iletebilirsiniz.');
      });
  }
  function whatsappOrderLink(cat) {
    var lines = Cart.items.map(function (i) { var p = findProduct(cat, i.slug); return p ? ('- ' + p.name + ' x ' + i.qty) : ''; }).filter(Boolean);
    var text = 'Merhaba, aşağıdaki ürünler için sipariş vermek istiyorum:\n' + lines.join('\n');
    return 'https://wa.me/' + (CONFIG.whatsapp || '') + '?text=' + encodeURIComponent(text);
  }
  function showAlert(el, type, html) {
    if (!el) { toast(html, 6000); return; }
    el.className = 'alert alert-' + type; el.innerHTML = html; el.hidden = false;
  }

  /* ---------- Sayfalar ---------- */
  function renderGrid(el, cat, list) {
    if (!el) return;
    if (!list.length) { el.innerHTML = '<div class="empty">Bu kriterlere uygun ürün bulunamadı.</div>'; return; }
    el.innerHTML = list.map(function (p) { return R.productCard(p, ROOT, catName(cat, p.category)); }).join('');
  }
  function initHome(cat) {
    var all = visible(cat);
    var featured = all.filter(function (p) { return p.badge && /satan|yeni/i.test(p.badge); });
    if (featured.length < 8) all.forEach(function (p) { if (featured.length < 8 && featured.indexOf(p) < 0) featured.push(p); });
    renderGrid($('#featured-grid'), cat, featured.slice(0, 8));
    var deals = all.filter(function (p) { return R.discountPct(p) > 0; });
    var dealsWrap = $('#deals-section');
    if (deals.length) renderGrid($('#deals-grid'), cat, deals.slice(0, 4)); else if (dealsWrap) dealsWrap.hidden = true;
  }
  function initCatalog(cat) {
    var params = new URLSearchParams(window.location.search);
    var state = { q: params.get('q') || '', kategori: params.get('kategori') || '', indirim: params.get('indirim') === '1', sort: params.get('sirala') || 'onerilen' };
    var qInput = $('#catalog-q'); if (qInput) qInput.value = state.q;
    var sortSel = $('#sort'); if (sortSel) { sortSel.value = state.sort; sortSel.addEventListener('change', function () { state.sort = sortSel.value; apply(); }); }
    var searchHeader = $('.search input'); if (searchHeader && state.q) searchHeader.value = state.q;
    function apply() {
      var list = visible(cat);
      if (state.kategori) list = list.filter(function (p) { return p.category === state.kategori; });
      if (state.indirim) list = list.filter(function (p) { return R.discountPct(p) > 0; });
      if (state.q) {
        var q = norm(state.q);
        list = list.filter(function (p) { return norm(p.name + ' ' + p.short + ' ' + p.sku + ' ' + catName(cat, p.category)).indexOf(q) > -1; });
      }
      if (state.sort === 'fiyat-artan') list.sort(function (a, b) { return a.price - b.price; });
      else if (state.sort === 'fiyat-azalan') list.sort(function (a, b) { return b.price - a.price; });
      else if (state.sort === 'ad') list.sort(function (a, b) { return a.name.localeCompare(b.name, 'tr'); });
      renderGrid($('#catalog-grid'), cat, list);
      var title = state.kategori ? catName(cat, state.kategori) : (state.indirim ? 'Fırsat Ürünleri' : 'Tüm Ürünler');
      if (state.q) title = '“' + state.q + '” için sonuçlar';
      var h = $('#catalog-title'); if (h) h.textContent = title;
      var cnt = $('#catalog-count'); if (cnt) cnt.textContent = list.length + ' ürün';
      document.title = title + ' | ' + (CONFIG.name || 'TemizStok');
      $$('[data-cat-link]').forEach(function (a) {
        var v = a.getAttribute('data-cat-link');
        var active = (v === '' && !state.kategori && !state.indirim) || (v === state.kategori && v !== '') || (v === '__indirim' && state.indirim);
        a.classList.toggle('active', active);
      });
    }
    var counts = {};
    visible(cat).forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    $$('[data-cat-count]').forEach(function (el) { el.textContent = counts[el.getAttribute('data-cat-count')] || 0; });
    var total = $('[data-cat-count-all]'); if (total) total.textContent = visible(cat).length;
    apply();
  }
  function initProduct(cat) {
    var el = $('#product-root'); if (!el) return;
    var key = el.getAttribute('data-product') || new URLSearchParams(window.location.search).get('id') || '';
    var p = findProduct(cat, key);
    if (!p) { el.innerHTML = '<div class="empty">Ürün bulunamadı. <a href="' + ROOT + 'urunler.html">Tüm ürünlere dön</a></div>'; return; }
    if (!el.getAttribute('data-product')) { renderProductPage(el, cat, p); document.title = p.name + ' | ' + (CONFIG.name || 'TemizStok'); }
    else { var ph = $('#product-price'); if (ph) ph.innerHTML = R.priceHtml(p); }
    var qty = $('#qty'); 
    $$('[data-qty]').forEach(function (b) { b.addEventListener('click', function () { var v = parseInt(qty.value, 10) || 1; v += parseInt(b.getAttribute('data-qty'), 10); qty.value = Math.max(1, Math.min(999, v)); }); });
    var addBtn = $('#add-to-cart'), buyBtn = $('#buy-now');
    if (p.outOfStock) { if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Stokta yok'; } if (buyBtn) buyBtn.disabled = true; }
    if (addBtn) addBtn.addEventListener('click', function () { Cart.add(p, qty ? qty.value : 1); toast('<span>' + R.icon('check') + '</span><span><b>' + R.esc(p.name) + '</b> sepete eklendi.</span><a href="' + ROOT + 'sepet.html">Sepete git</a>'); });
    if (buyBtn) buyBtn.addEventListener('click', function () { Cart.add(p, qty ? qty.value : 1); window.location.href = ROOT + 'sepet.html#odeme'; });
    $$('.tabs nav button').forEach(function (b) { b.addEventListener('click', function () {
      $$('.tabs nav button').forEach(function (x) { x.classList.toggle('active', x === b); });
      $$('.tab-panel').forEach(function (x) { x.classList.toggle('active', x.id === b.getAttribute('data-tab')); });
    }); });
    var rel = visible(cat).filter(function (x) { return x.category === p.category && x.slug !== p.slug; }).slice(0, 4);
    if (rel.length) renderGrid($('#related-grid'), cat, rel); else { var rs = $('#related-section'); if (rs) rs.hidden = true; }
  }
  function renderProductPage(el, cat, p) {
    el.innerHTML = '<div class="breadcrumb"><a href="' + ROOT + '">Ana Sayfa</a><span>/</span><a href="' + ROOT + 'urunler.html">Ürünler</a><span>/</span><a href="' + ROOT + 'urunler.html?kategori=' + R.esc(p.category) + '">' + R.esc(catName(cat, p.category)) + '</a></div>' +
      '<div class="product-page"><div class="gallery"><img src="' + R.esc(R.imageUrl(p, ROOT)) + '" alt="' + R.esc(p.name) + '"></div>' +
      '<div class="product-info">' + (p.badge ? '<span class="badge ' + R.badgeClass(p.badge) + '" style="position:static;display:inline-block;margin-bottom:10px">' + R.esc(p.badge) + '</span>' : '') +
      '<h1>' + R.esc(p.name) + '</h1>' + (p.sku ? '<div class="sku">Ürün kodu: ' + R.esc(p.sku) + '</div>' : '') +
      '<p class="lead">' + R.esc(p.short) + '</p><div class="buy-box"><div id="product-price">' + R.priceHtml(p) + '</div>' +
      '<div class="buy-row"><div class="qty"><button type="button" data-qty="-1" aria-label="Azalt">−</button><input id="qty" type="number" min="1" max="999" value="1" aria-label="Adet"><button type="button" data-qty="1" aria-label="Artır">+</button></div>' +
      '<button class="btn btn-primary btn-lg" id="add-to-cart">' + R.icon('cart') + 'Sepete Ekle</button><button class="btn btn-dark btn-lg" id="buy-now">Hemen Al</button></div>' +
      '<ul class="info-list"><li>' + R.icon('truck') + 'Aynı gün kargoya teslim, 1–3 iş gününde kapınızda</li><li>' + R.icon('shield') + 'Güvenli ödeme – kredi kartı veya havale/EFT</li><li>' + R.icon('invoice') + 'Kurumsal fatura ve toptan fiyat seçeneği</li></ul></div>' +
      '<div class="tabs"><nav><button class="active" data-tab="tab-desc">Açıklama</button></nav><div class="tab-panel active" id="tab-desc"><p>' + R.esc(p.description) + '</p></div></div></div></div>';
  }
  function initCart(cat) {
    var wrap = $('#cart-items'), summary = $('#cart-summary');
    function render() {
      var rows = Cart.items.map(function (i) { var p = findProduct(cat, i.slug); return p ? { p: p, qty: i.qty } : null; }).filter(Boolean);
      if (!rows.length) {
        wrap.innerHTML = '<div class="empty"><p><b>Sepetiniz boş.</b></p><p>İhtiyacınız olan temizlik ürünlerini kataloğumuzdan seçebilirsiniz.</p><a class="btn btn-primary" href="' + ROOT + 'urunler.html">Alışverişe Başla</a></div>';
        summary.hidden = true; return;
      }
      summary.hidden = false;
      wrap.innerHTML = '<div class="cart-table">' + rows.map(function (r) {
        return '<div class="cart-row" data-slug="' + R.esc(r.p.slug) + '"><img src="' + R.esc(R.imageUrl(r.p, ROOT)) + '" alt=""><div><div class="name"><a href="' + R.productUrl(r.p, ROOT) + '">' + R.esc(r.p.name) + '</a></div><div class="unit">' + R.esc(r.p.unit || '') + ' · Birim: ' + R.fmtPrice(r.p.price) + '</div></div>' +
          '<div class="qty"><button type="button" data-cart-qty="-1" aria-label="Azalt">−</button><input type="number" min="1" max="999" value="' + r.qty + '" data-cart-input aria-label="Adet"><button type="button" data-cart-qty="1" aria-label="Artır">+</button></div>' +
          '<div class="line-total">' + R.fmtPrice(r.p.price * r.qty) + '</div><button class="remove" data-cart-remove aria-label="Kaldır">' + R.icon('trash') + '</button></div>';
      }).join('') + '</div>';
      var subtotal = rows.reduce(function (a, r) { return a + r.p.price * r.qty; }, 0);
      var freeAt = CONFIG.freeShippingThreshold || 0, flat = CONFIG.shippingFlat || 0;
      var ship = freeAt && subtotal >= freeAt ? 0 : flat;
      var remaining = Math.max(0, freeAt - subtotal);
      $('#sum-subtotal').textContent = R.fmtPrice(subtotal);
      $('#sum-shipping').textContent = ship ? R.fmtPrice(ship) : 'Ücretsiz';
      $('#sum-total').textContent = R.fmtPrice(subtotal + ship);
      var bar = $('#ship-progress i'); if (bar && freeAt) bar.style.width = Math.min(100, subtotal / freeAt * 100) + '%';
      var note = $('#ship-note'); if (note) note.textContent = remaining > 0 ? R.fmtPrice(remaining) + ' daha ekleyin, kargo ücretsiz olsun!' : 'Tebrikler, kargonuz ücretsiz!';
    }
    wrap.addEventListener('click', function (e) {
      var row = e.target.closest('.cart-row'); if (!row) return;
      var slug = row.getAttribute('data-slug');
      if (e.target.closest('[data-cart-remove]')) { Cart.remove(slug); render(); return; }
      var qb = e.target.closest('[data-cart-qty]');
      if (qb) { var inp = row.querySelector('[data-cart-input]'); var v = (parseInt(inp.value, 10) || 1) + parseInt(qb.getAttribute('data-cart-qty'), 10); Cart.setQty(slug, v); render(); }
    });
    wrap.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-cart-input]'); if (!inp) return;
      Cart.setQty(inp.closest('.cart-row').getAttribute('data-slug'), inp.value); render();
    });
    var btn = $('#checkout-btn');
    if (btn) btn.addEventListener('click', function () { checkout(btn, cat); });
    var wa = $('#whatsapp-order'); if (wa) wa.addEventListener('click', function (e) { wa.href = whatsappOrderLink(cat); });
    render();
    if (window.location.hash === '#odeme' && btn) btn.focus();
  }
  function initForm(formId) {
    var form = $(formId); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('.form-status', form), btn = $('button[type=submit]', form);
      var data = new FormData(form);
      btn.disabled = true; status.className = 'alert alert-info'; status.hidden = false; status.textContent = 'Gönderiliyor…';
      fetch(ROOT + 'api/contact.php', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) { status.className = 'alert alert-success'; status.textContent = res.j.message || 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.'; form.reset(); }
          else throw new Error(res.j && res.j.message ? res.j.message : 'Gönderilemedi');
        })
        .catch(function (err) {
          status.className = 'alert alert-error';
          status.innerHTML = 'Mesaj gönderilemedi (' + R.esc(err.message) + '). Bize <a href="mailto:' + R.esc(CONFIG.email) + '"><b>' + R.esc(CONFIG.email) + '</b></a> adresinden veya <a href="https://wa.me/' + R.esc(CONFIG.whatsapp) + '" target="_blank" rel="noopener"><b>WhatsApp</b></a> ile ulaşabilirsiniz.';
        })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ---------- Genel ---------- */
  function initCommon() {
    Cart.load(); updateBadge();
    var mb = $('#menu-btn'), nav = $('#nav');
    if (mb && nav) mb.addEventListener('click', function () { var open = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]'); if (!b) return;
      e.preventDefault(); b.disabled = true;
      addToCartBySlug(b.getAttribute('data-add'), 1).then(function () { b.disabled = false; });
    });
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    var path = window.location.pathname;
    $$('.nav a').forEach(function (a) { if (a.getAttribute('href') && path.indexOf(a.getAttribute('href').replace(ROOT, '').split('?')[0]) > -1 && a.getAttribute('href').indexOf('.html') > -1 && !a.getAttribute('href').split('?')[1]) a.classList.add('active'); });
  }
  initCommon();
  var inits = { home: initHome, catalog: initCatalog, product: initProduct, cart: initCart };
  if (inits[PAGE]) getCatalog().then(function (cat) { inits[PAGE](cat); }).catch(function (err) {
    var g = $('#catalog-grid') || $('#featured-grid') || $('#product-root') || $('#cart-items');
    if (g) g.innerHTML = '<div class="empty">Katalog yüklenemedi. Lütfen sayfayı yenileyin.</div>';
    if (window.console) console.error(err);
  });
  if (PAGE === 'contact') initForm('#contact-form');
  if (PAGE === 'quote') initForm('#quote-form');
  if (PAGE === 'success') { Cart.clear(); }
  window.TS = { getCatalog: getCatalog, Cart: Cart, checkout: checkout };
})();
