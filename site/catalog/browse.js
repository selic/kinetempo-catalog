/**
 * Search, filter and sort for the catalog page.
 *
 * Every card is already in the page — the build renders all of them — so this file
 * only shows, hides and reorders what is there. Nothing is fetched to filter, the
 * list still reads correctly with this script blocked, and the state lives in the
 * query string so a filtered view can be linked to.
 */
(() => {
  const results = document.getElementById('results');
  if (!results) return;
  const cards = [...results.querySelectorAll('.entry')];
  const filters = document.querySelector('.filters[data-enhanced]');
  if (filters) filters.hidden = false;

  const $ = (id) => document.getElementById(id);
  const q = $('q');
  const sort = $('sort');
  const level = $('level');
  const locale = $('locale');
  const verified = $('verified');
  const featuredOnly = $('featuredOnly');
  const shown = $('shown');
  const empty = $('empty');

  /** Chips are multi-select within a facet and AND across facets. */
  const picked = { category: new Set(), tag: new Set() };

  const num = (el, name) => Number(el.dataset[name] ?? 0);
  const SORTS = {
    recommended: (a, b) => num(b, 'opens') - num(a, 'opens') || b.dataset.updated.localeCompare(a.dataset.updated) || a.dataset.name.localeCompare(b.dataset.name),
    popular: (a, b) => num(b, 'opens') - num(a, 'opens') || a.dataset.name.localeCompare(b.dataset.name),
    new: (a, b) => b.dataset.updated.localeCompare(a.dataset.updated) || a.dataset.name.localeCompare(b.dataset.name),
    short: (a, b) => num(a, 'minutes') - num(b, 'minutes') || a.dataset.name.localeCompare(b.dataset.name),
    name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
  };

  function matches(card) {
    const terms = (q?.value ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    // Every word has to appear somewhere in the card, so two words narrow rather than widen.
    if (terms.some((t) => !card.dataset.text.includes(t))) return false;
    if (level?.value && card.dataset.level !== level.value) return false;
    if (locale?.value && card.dataset.locale !== locale.value) return false;
    if (verified?.checked && card.dataset.verified !== '1') return false;
    if (featuredOnly?.checked && card.dataset.featured !== '1') return false;
    if (picked.category.size && !picked.category.has(card.dataset.category)) return false;
    if (picked.tag.size) {
      const tags = new Set(card.dataset.tags.split(' ').filter(Boolean));
      // Several tags read as "any of these", the way a reader means it when they tick two.
      if (![...picked.tag].some((t) => tags.has(t))) return false;
    }
    return true;
  }

  function apply() {
    let visible = 0;
    for (const card of cards) {
      const ok = matches(card);
      card.hidden = !ok;
      if (ok) visible++;
    }
    for (const card of [...cards].sort(SORTS[sort?.value] ?? SORTS.recommended)) results.append(card);
    if (shown) shown.textContent = String(visible);
    if (empty) empty.hidden = visible > 0;
    results.hidden = visible === 0;
    syncChips();
    writeUrl();
  }

  function syncChips() {
    for (const chip of document.querySelectorAll('.chip[data-facet]')) {
      chip.classList.toggle('on', picked[chip.dataset.facet]?.has(chip.dataset.value) ?? false);
    }
    for (const tag of document.querySelectorAll('.tag[data-facet="tag"]')) {
      tag.classList.toggle('on', picked.tag.has(tag.dataset.value));
    }
  }

  // ---- the query string is the state ----
  function writeUrl() {
    const p = new URLSearchParams();
    if (q?.value.trim()) p.set('q', q.value.trim());
    if (picked.category.size) p.set('cat', [...picked.category].join(','));
    if (picked.tag.size) p.set('tag', [...picked.tag].join(','));
    if (level?.value) p.set('level', level.value);
    if (locale?.value) p.set('lang', locale.value);
    if (verified?.checked) p.set('verified', '1');
    if (featuredOnly?.checked) p.set('featured', '1');
    if (sort && sort.value !== 'recommended') p.set('sort', sort.value);
    const query = p.toString();
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    if (q) q.value = p.get('q') ?? '';
    for (const v of (p.get('cat') ?? '').split(',').filter(Boolean)) picked.category.add(v);
    for (const v of (p.get('tag') ?? '').split(',').filter(Boolean)) picked.tag.add(v);
    if (level) level.value = p.get('level') ?? '';
    if (locale) locale.value = p.get('lang') ?? '';
    if (verified) verified.checked = p.get('verified') === '1';
    if (featuredOnly) featuredOnly.checked = p.get('featured') === '1';
    if (sort && SORTS[p.get('sort')]) sort.value = p.get('sort');
  }

  function reset() {
    if (q) q.value = '';
    picked.category.clear();
    picked.tag.clear();
    if (level) level.value = '';
    if (locale) locale.value = '';
    if (verified) verified.checked = false;
    if (featuredOnly) featuredOnly.checked = false;
    if (sort) sort.value = 'recommended';
    apply();
  }

  // ---- wiring ----
  let typing;
  q?.addEventListener('input', () => {
    clearTimeout(typing);
    typing = setTimeout(apply, 120);
  });
  for (const el of [sort, level, locale, verified, featuredOnly]) el?.addEventListener('change', apply);
  document.addEventListener('click', (ev) => {
    const facet = ev.target.closest('[data-facet]');
    if (facet) {
      const set = picked[facet.dataset.facet];
      if (set) {
        set.has(facet.dataset.value) ? set.delete(facet.dataset.value) : set.add(facet.dataset.value);
        apply();
      }
      return;
    }
    if (ev.target.closest('#reset, [data-reset]')) reset();
    if (ev.target.closest('#more-tags')) {
      document.querySelector('[data-group="tag"]')?.classList.add('all');
      ev.target.closest('#more-tags').remove();
    }
  });

  // ---- open in the app ----
  const COUNT_URL = 'https://submit-kinetempo.defency.net/count';
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const base64url = (bytes) => {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
      out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
      if (b !== undefined) out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
      if (c !== undefined) out += B64[c & 63];
    }
    return out;
  };

  /**
   * The share landing already knows how to hand a program to the app, and its payload
   * is raw-deflated JSON — which the browser can produce itself. So a catalog entry
   * opens in Kinetempo with no new app release and no new endpoint. If any of that is
   * missing, the link is still a link to the document, which is where it pointed before
   * this script ran.
   */
  async function shareLink(url) {
    if (!('CompressionStream' in window)) return null;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const doc = await res.json();
    // `catalog` is our own bookkeeping — tags, licence, the source it came from. The
    // app's importer has no use for it, so it is not worth the URL length.
    delete doc.catalog;
    const stream = new Blob([JSON.stringify(doc)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return `../s/#${base64url(bytes)}`;
  }

  /** One number per document, no address and nothing about who asked. */
  function reportOpen(id) {
    try {
      navigator.sendBeacon?.(COUNT_URL, new Blob([JSON.stringify({ ids: [id] })], { type: 'text/plain' }));
    } catch {
      /* a count that never arrives is not worth interrupting anyone for */
    }
  }

  document.addEventListener('click', async (ev) => {
    const link = ev.target.closest('a[data-open]');
    if (!link || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    const card = link.closest('.entry');
    ev.preventDefault();
    reportOpen(card.dataset.id);
    let href = null;
    try {
      href = await shareLink(card.dataset.doc);
    } catch {
      /* fall through to the document itself */
    }
    location.href = href ?? card.dataset.doc;
  });

  readUrl();
  apply();
})();
