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
  const featuredCards = [...(document.getElementById('featured-row')?.querySelectorAll('.entry') ?? [])];
  const allCards = [...cards, ...featuredCards];
  const filters = document.querySelector('.filters[data-enhanced]');
  if (filters) filters.hidden = false;


  // ---- the page in three languages ----
  /**
   * The catalog is published in three languages and so is the page around it. The
   * markup ships in English — that is what a reader without this script gets, and what
   * a search engine indexes — and everything with a `data-i18n` key is swapped here.
   * The few strings holding a link or a bold word are set as HTML on purpose: they are
   * constants in this file, never anything a publisher wrote.
   */
  const LANGS = ['en', 'ru', 'ro'];
  const T = {
    en: {
      title: 'Public catalog',
      lede: '{n} programs and exercises published by clinics, physiotherapists and individuals. Open them in the app\'s Library tab, or read the <a href="https://github.com/selic/kinetempo-catalog/blob/main/docs/AUTHORING.md">authoring guide</a> to publish yours. Machine-readable: <a href="index.json">index.json</a>.',
      ordering:
        'Ordered by how often each one has been opened, most recently updated first when that is equal. <strong>Verified</strong> means we checked who the publisher is — a real clinic, a real licence — not that a clinician reviewed the exercises. It is a badge and a filter; it never moves anything up this list. Paid placement exists, appears only in the Featured row, and is labelled <strong>Sponsored</strong>.',
      all: 'All {n}',
      featured: 'Featured',
      featuredNote:
        'Chosen by the maintainer. A card marked <strong>Sponsored</strong> is a paid placement; it buys this row and nothing else.',
      searchLabel: 'Search the catalog',
      searchHint: 'Search by name, tag or publisher',
      sort: 'Sort ',
      sortRecommended: 'Recommended',
      sortPopular: 'Most opened',
      sortNew: 'Recently updated',
      sortShort: 'Shortest first',
      sortName: 'A–Z',
      level: 'Level ',
      any: 'Any',
      language: 'Language ',
      verifiedOnly: 'Verified publishers only',
      featuredOnly: 'Featured only',
      category: 'Category',
      tags: 'Tags',
      results: '{shown} of {n} shown',
      clear: 'Clear filters',
      noMatch: 'Nothing matches those filters.',
      clearThem: 'Clear them',
      open: 'Open in Kinetempo',
      min: '{n} min',
      exercises: (n) => `${n} exercise${n === 1 ? '' : 's'}`,
      opened: (n) => `opened ${n}×`,
      levels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    },
    ru: {
      title: 'Публичный каталог',
      lede: '{n} программ и упражнений от клиник, физиотерапевтов и частных авторов. Открывайте их во вкладке «Библиотека» в приложении или прочитайте <a href="https://github.com/selic/kinetempo-catalog/blob/main/docs/AUTHORING.ru.md">руководство для авторов</a>, чтобы опубликовать своё. Машиночитаемо: <a href="index.json">index.json</a>.',
      ordering:
        'Сначала то, что открывают чаще; при равенстве — обновлённое позже. <strong>Проверено</strong> значит, что мы убедились, кто издатель — настоящая клиника, настоящая лицензия, — а не что упражнения смотрел врач. Это значок и фильтр, он никогда никого не поднимает в списке. Платное размещение существует, встречается только в строке «Избранное» и помечено словом <strong>Sponsored</strong>.',
      all: 'Все {n}',
      featured: 'Избранное',
      featuredNote:
        'Выбор мейнтейнера. Карточка с пометкой <strong>Sponsored</strong> — платное размещение; оно покупает эту строку и ничего больше.',
      searchLabel: 'Поиск по каталогу',
      searchHint: 'Название, тег или издатель',
      sort: 'Сортировка ',
      sortRecommended: 'Рекомендуем',
      sortPopular: 'Чаще открывают',
      sortNew: 'Недавно обновлённые',
      sortShort: 'Сначала короткие',
      sortName: 'А–Я',
      level: 'Уровень ',
      any: 'Любой',
      language: 'Язык ',
      verifiedOnly: 'Только проверенные издатели',
      featuredOnly: 'Только избранное',
      category: 'Категория',
      tags: 'Теги',
      results: 'показано {shown} из {n}',
      clear: 'Сбросить фильтры',
      noMatch: 'Под эти фильтры ничего не подходит.',
      clearThem: 'Сбросить',
      open: 'Открыть в Kinetempo',
      min: '{n} мин',
      exercises: (n) => `${n} ${plural(n, 'упражнение', 'упражнения', 'упражнений')}`,
      opened: (n) => `открытий: ${n}`,
      levels: { beginner: 'Начальный', intermediate: 'Средний', advanced: 'Продвинутый' },
    },
    ro: {
      title: 'Catalog public',
      lede: '{n} programe și exerciții publicate de clinici, fizioterapeuți și persoane individuale. Deschideți-le în fila Bibliotecă din aplicație sau citiți <a href="https://github.com/selic/kinetempo-catalog/blob/main/docs/AUTHORING.md">ghidul autorului</a> ca să publicați propriul program. Format citibil de mașini: <a href="index.json">index.json</a>.',
      ordering:
        'Ordonate după cât de des sunt deschise, iar la egalitate cele actualizate mai recent apar primele. <strong>Verificat</strong> înseamnă că am verificat cine este editorul — o clinică reală, o licență reală — nu că un clinician a revizuit exercițiile. Este o insignă și un filtru; nu urcă nimic în această listă. Plasarea plătită există, apare doar în rândul Recomandate și este marcată <strong>Sponsored</strong>.',
      all: 'Toate {n}',
      featured: 'Recomandate',
      featuredNote:
        'Alese de întreținător. O fișă marcată <strong>Sponsored</strong> este o plasare plătită; cumpără acest rând și nimic altceva.',
      searchLabel: 'Căutare în catalog',
      searchHint: 'Nume, etichetă sau editor',
      sort: 'Sortare ',
      sortRecommended: 'Recomandate',
      sortPopular: 'Cele mai deschise',
      sortNew: 'Actualizate recent',
      sortShort: 'Cele mai scurte',
      sortName: 'A–Z',
      level: 'Nivel ',
      any: 'Oricare',
      language: 'Limbă ',
      verifiedOnly: 'Doar editori verificați',
      featuredOnly: 'Doar recomandate',
      category: 'Categorie',
      tags: 'Etichete',
      results: '{shown} din {n} afișate',
      clear: 'Șterge filtrele',
      noMatch: 'Nimic nu se potrivește cu aceste filtre.',
      clearThem: 'Șterge-le',
      open: 'Deschide în Kinetempo',
      min: '{n} min',
      exercises: (n) => `${n} ${n === 1 ? 'exercițiu' : 'exerciții'}`,
      opened: (n) => (n === 1 ? 'deschis o dată' : `deschis de ${n} ori`),
      levels: { beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat' },
    },
  };

  /** Russian counts take three forms, and getting them wrong is the first thing a reader sees. */
  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  const HTML_KEYS = new Set(['lede', 'ordering', 'featuredNote']);
  const total = cards.length && new Set(cards.map((c) => c.dataset.id)).size;

  function translate(lang) {
    const t = T[lang] ?? T.en;
    document.documentElement.lang = lang;
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const key = el.dataset.i18n;
      const value = t[key];
      if (typeof value !== 'string') continue;
      const text = value.replaceAll('{n}', String(total));
      if (HTML_KEYS.has(key)) el.innerHTML = text;
      else if (el.tagName === 'LABEL') el.childNodes[0].nodeValue = text;
      else el.textContent = text;
    }
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
      el.placeholder = t[el.dataset.i18nPlaceholder] ?? el.placeholder;
    }
    for (const option of document.querySelectorAll('#level option[value]')) {
      if (option.value) option.textContent = t.levels[option.value] ?? option.textContent;
    }
    for (const card of allCards) {
      const meta = card.querySelector('[data-meta]');
      if (meta) {
        const n = Number(meta.dataset.exercises ?? 0);
        const opens = Number(card.dataset.opens ?? 0);
        meta.textContent = [
          n ? t.exercises(n) : '',
          t.min.replace('{n}', card.dataset.minutes),
          meta.dataset.publisher,
          opens ? t.opened(opens) : '',
        ]
          .filter(Boolean)
          .join(' · ');
      }
      const lvl = card.querySelector('.badge.lvl');
      if (lvl && card.dataset.level) lvl.textContent = t.levels[card.dataset.level] ?? lvl.textContent;
    }
  }

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

  /**
   * One card per document, in one language. The same programme is published in three,
   * and three cards saying the same thing is a list nobody reads. The reader's language
   * wins; where a translation is missing, English stands in; where even that is missing,
   * whatever exists does — better the exercise in a language you half-read than a gap.
   */
  const byId = new Map();
  for (const card of allCards) {
    const list = byId.get(card.dataset.id) ?? [];
    list.push(card);
    byId.set(card.dataset.id, list);
  }
  const representative = new Set();

  function chooseLanguage() {
    const want = locale?.value || 'en';
    representative.clear();
    for (const list of byId.values()) {
      const inResults = list.filter((c) => c.closest('#results'));
      const inFeatured = list.filter((c) => !c.closest('#results'));
      for (const group of [inResults, inFeatured]) {
        if (!group.length) continue;
        const one = group.find((c) => c.dataset.locale === want) ?? group.find((c) => c.dataset.locale === 'en') ?? group[0];
        representative.add(one);
      }
    }
    for (const card of featuredCards) card.hidden = !representative.has(card);
    translate(want);
  }

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
    if (!representative.has(card)) return false;
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
    if (shown) {
      const t = T[locale?.value] ?? T.en;
      shown.textContent = t.results.replace('{shown}', String(visible)).replace('{n}', String(total));
    }
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
    if (locale) {
      const asked = p.get('lang') || (navigator.languages ?? [navigator.language ?? 'en']).map((l) => String(l).slice(0, 2)).find((l) => LANGS.includes(l));
      const has = [...locale.options].some((o) => o.value === asked);
      locale.value = has ? asked : 'en';
    }
    if (verified) verified.checked = p.get('verified') === '1';
    if (featuredOnly) featuredOnly.checked = p.get('featured') === '1';
    if (sort && SORTS[p.get('sort')]) sort.value = p.get('sort');
  }

  function reset() {
    if (q) q.value = '';
    picked.category.clear();
    picked.tag.clear();
    if (level) level.value = '';
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
  for (const el of [sort, level, verified, featuredOnly]) el?.addEventListener('change', apply);
  locale?.addEventListener('change', () => {
    chooseLanguage();
    apply();
  });
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
  chooseLanguage();
  apply();
})();
