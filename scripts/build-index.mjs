#!/usr/bin/env node
/**
 * Validates every publisher and document, then writes dist/ with a copy of the
 * documents plus index.json (what the app downloads).
 *
 *   node scripts/build-index.mjs          # build dist/
 *   node scripts/build-index.mjs --check  # validate only
 *
 * Everything added to index.json since the first release is additive and optional:
 * versions of the app already in people's hands read the file with a plain cast and
 * ignore what they do not know, so `schemaVersion` stays 1 and no field is renamed
 * or removed. The same goes the other way — a document written before `category`
 * existed still validates, and the build still runs with no featured.json and no
 * network.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLISHERS = join(ROOT, 'publishers');
const DIST = join(ROOT, 'dist');
const CHECK = process.argv.includes('--check');
/** Where the open counts come from. `off` (or a failure) leaves every count at zero. */
const COUNTS_URL = process.env.KINETEMPO_COUNTS_URL ?? 'https://submit-kinetempo.defency.net/counts';

/**
 * The shelf a reader looks on. Deliberately a short closed list about the problem
 * rather than the anatomy — someone arrives with a sore back, not with a lumbar
 * spine — and deliberately separate from the free-form `tags`, which stay open so
 * a protocol can name itself.
 */
const CATEGORIES = {
  'back-neck': 'Back & neck',
  knee: 'Knee',
  'foot-ankle': 'Foot & ankle',
  shoulder: 'Shoulder',
  'hip-pelvis': 'Hip & pelvis',
  'breathing-bp': 'Breathing & blood pressure',
  balance: 'Balance',
  'pelvic-floor': 'Pelvic floor',
  general: 'General conditioning',
};
const LEVELS = { rehab: 'Rehab', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const LOCALE_NAMES = { en: 'English', ru: 'Русский', ro: 'Română' };

// ---- schema (mirror of src/share/schema.ts in the app; keep in sync) ----
const step = z.object({
  tone: z.enum(['squeeze', 'lift', 'hold', 'release', 'move', 'timer', 'rest']),
  durationMs: z.number().int().nonnegative().max(3_600_000),
  label: z.string().max(40).optional(),
  ticks: z.boolean().optional(),
});
const timingOverride = z.object({
  steps: z.array(step).min(1).max(20).optional(),
  reps: z.number().int().positive().optional(),
  sets: z.number().int().positive().optional(),
  setRestMs: z.number().int().nonnegative().optional(),
});
// An animation generated in the app travels as the spec itself rather than as a
// reference, so a submission carrying one has to validate here too. Mirrors
// src/anim/schema.ts in the app; angles and counts are capped because a spec
// from outside must not be able to stall the renderer.
const angle = z.number().finite().min(-200).max(200);
const unit = z.number().finite().min(0).max(1);
const angles = Object.fromEntries(
  ['torso', 'neck', 'hip', 'knee', 'ankle', 'shoulder', 'elbow', 'hipFar', 'kneeFar', 'ankleFar', 'shoulderFar', 'elbowFar'].map((k) => [k, angle.optional()]),
);
const muscle = z.enum(['quad', 'hamstring', 'glute', 'calf', 'abs', 'chest', 'back', 'shoulder', 'biceps']);
const prop = z.enum(['none', 'pillowUnderHeel', 'chair', 'wall', 'band', 'crutch']);
const animTone = z.enum(['squeeze', 'lift', 'hold', 'release', 'move', 'timer', 'rest', 'prep', 'setRest', 'exerciseRest']);
const keyframe = z.object({
  t: unit,
  ease: z.enum(['linear', 'in', 'out', 'inOut']).optional(),
  highlight: z.partialRecord(muscle, unit).optional(),
  arrow: z.object({ at: z.enum(['foot', 'knee', 'hip', 'hand', 'torso']), dir: z.enum(['up', 'down', 'left', 'right']) }).nullable().optional(),
  prop: prop.optional(),
  ...angles,
});
const animSpec = z.object({
  v: z.literal(1),
  name: z.string().max(80).optional(),
  orientation: z.enum(['supine', 'prone', 'sideLying', 'seated', 'standing']),
  ground: z.enum(['bed', 'floor', 'none']).optional(),
  prop: prop.optional(),
  base: z.object(angles).optional(),
  constrain: z.object({ heelOnGround: z.boolean().optional() }).optional(),
  idle: z.array(keyframe).min(1).max(24).optional(),
  tracks: z
    .array(
      z.object({
        when: z.object({ tone: z.union([animTone, z.array(animTone).min(1).max(10)]).optional(), step: z.union([z.number().int().min(0).max(19), z.literal('even'), z.literal('odd')]).optional() }).optional(),
        keys: z.array(keyframe).min(1).max(24),
      }),
    )
    .min(1)
    .max(12)
    .optional(),
});
const animation = z.union([z.object({ kind: z.enum(['builtin', 'url']), ref: z.string().max(500) }), z.object({ kind: z.literal('spec'), spec: animSpec })]);
const exercise = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(4000).default(''),
  videoUrl: z.string().url().max(500).nullable().optional(),
  hadLocalVideo: z.boolean().optional(),
  animation: animation.nullable().optional(),
  steps: z.array(step).min(1).max(20).optional(),
  workMs: z.number().int().positive().max(3_600_000),
  restMs: z.number().int().nonnegative().max(3_600_000),
  reps: z.number().int().positive().max(1000),
  sets: z.number().int().positive().max(100).default(1),
  setRestMs: z.number().int().nonnegative().max(3_600_000).default(0),
  color: z.string().max(16).nullable().optional(),
  updatedAt: z.string().max(40),
});
const complex = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(4000).default(''),
  restBetweenMs: z.number().int().nonnegative().max(3_600_000).default(15000),
  items: z.array(z.object({ exerciseId: z.string().min(1).max(64), override: timingOverride.optional(), restAfterMs: z.number().int().nonnegative().nullable().optional() })).min(1).max(100),
  updatedAt: z.string().max(40),
});
const document = z.object({
  kind: z.enum(['kinetempo.exercise', 'kinetempo.complex']),
  schemaVersion: z.literal(1),
  app: z.literal('kinetempo'),
  exportedAt: z.string().max(40),
  exercises: z.array(exercise).min(1).max(100),
  complex: complex.optional(),
  /** Catalog-only metadata (ignored by the app's importer). */
  catalog: z
    .object({
      tags: z.array(z.string().max(32)).max(12).default([]),
      bodyParts: z.array(z.string().max(32)).max(8).default([]),
      level: z.enum(['rehab', 'beginner', 'intermediate', 'advanced']).optional(),
      category: z.enum(Object.keys(CATEGORIES)).optional(),
      source: z.string().max(300).optional(),
      reviewedBy: z.string().max(120).optional(),
      license: z.string().max(60).default('CC-BY-4.0'),
    })
    // `prefault`, not `default`: a document sent from the app carries no `catalog`
    // block at all, and `.default({})` hands back that literal object without running
    // the schema on it — leaving `tags` and `bodyParts` undefined rather than empty
    // arrays, for everything downstream to trip over.
    .prefault({}),
});
const publisher = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/),
  name: z.string().min(1).max(120),
  type: z.enum(['clinic', 'physiotherapist', 'doctor', 'organisation', 'individual']),
  website: z.string().url().optional(),
  description: z.string().max(600).default(''),
  verified: z.boolean().default(false),
  contact: z.string().max(200).optional(),
  country: z.string().max(2).optional(),
});

/**
 * Who gets a place at the top of the catalog, kept in one curated file rather than
 * as a flag inside each document. Two reasons: the decision is the maintainer's, not
 * the author's — nobody promotes themselves by editing their own pull request — and a
 * paid slot needs an end date and a name to bill, neither of which belongs in an
 * exercise. Editorial picks (`sponsored: false`) and paid ones are the same mechanism
 * but never the same badge: the page labels a paid slot and says so in the open.
 */
const featuredItem = z
  .object({
    kind: z.enum(['entry', 'publisher']),
    id: z.string().min(1).max(64),
    /** Last day the slot runs, inclusive. */
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sponsored: z.boolean().default(false),
    /** Who paid. Required for a paid slot so an invoice can be traced back to it. */
    paidBy: z.string().max(120).optional(),
    note: z.string().max(200).optional(),
  })
  // A paid placement with no end date is how "just for this month" becomes permanent.
  .refine((f) => !f.sponsored || (f.until && f.paidBy), { message: 'a sponsored item needs both "until" and "paidBy"' });
const featuredFile = z.object({ schemaVersion: z.literal(1), items: z.array(featuredItem).max(50).default([]) });

// ---- helpers ----
const errors = [];
const fail = (msg) => errors.push(msg);
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const locales = ['en', 'ru', 'ro'];
function localeOf(file) {
  const m = file.match(/\.([a-z]{2})\.kinetempo\.json$/);
  return m ? m[1] : 'en';
}
function stepsOf(e) {
  return e.steps ?? [{ tone: 'squeeze', durationMs: e.workMs }, ...(e.restMs > 0 ? [{ tone: 'rest', durationMs: e.restMs }] : [])];
}
function repMs(steps) {
  return steps.reduce((a, s) => a + s.durationMs, 0);
}
function exerciseTotalMs(e, override = {}) {
  const steps = override.steps ?? stepsOf(e);
  const reps = override.reps ?? e.reps;
  const sets = override.sets ?? e.sets ?? 1;
  const setRest = override.setRestMs ?? e.setRestMs ?? 0;
  const trailingRest = steps.at(-1)?.tone === 'rest' ? steps.at(-1).durationMs : 0;
  return sets * (reps * repMs(steps) - trailingRest) + (sets - 1) * setRest;
}
function docTotalMs(doc) {
  const byId = new Map(doc.exercises.map((e) => [e.id, e]));
  if (!doc.complex) return exerciseTotalMs(doc.exercises[0]);
  const items = doc.complex.items;
  let total = 0;
  items.forEach((it, i) => {
    const e = byId.get(it.exerciseId);
    total += exerciseTotalMs(e, it.override ?? {});
    if (i < items.length - 1) total += it.restAfterMs ?? doc.complex.restBetweenMs;
  });
  return total;
}

// ---- walk publishers ----
const publishers = [];
const entries = [];
for (const dir of readdirSync(PUBLISHERS).sort()) {
  const pdir = join(PUBLISHERS, dir);
  if (!statSync(pdir).isDirectory()) continue;
  const pfile = join(pdir, 'publisher.json');
  if (!existsSync(pfile)) {
    fail(`${dir}: missing publisher.json`);
    continue;
  }
  const pres = publisher.safeParse(readJson(pfile));
  if (!pres.success) {
    fail(`${dir}/publisher.json: ${pres.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    continue;
  }
  const pub = pres.data;
  if (pub.id !== dir) fail(`${dir}/publisher.json: id "${pub.id}" must equal the directory name`);
  publishers.push(pub);

  for (const sub of ['programs', 'exercises']) {
    const sdir = join(pdir, sub);
    if (!existsSync(sdir)) continue;
    for (const file of readdirSync(sdir).sort()) {
      if (!file.endsWith('.kinetempo.json')) continue;
      const full = join(sdir, file);
      const res = document.safeParse(readJson(full));
      if (!res.success) {
        fail(`${relative(ROOT, full)}: ${res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
        continue;
      }
      const doc = res.data;
      const isProgram = sub === 'programs';
      if (isProgram && !doc.complex) fail(`${relative(ROOT, full)}: programs/ documents must contain a complex`);
      if (!isProgram && doc.complex) fail(`${relative(ROOT, full)}: exercises/ documents must not contain a complex`);
      const ids = new Set(doc.exercises.map((e) => e.id));
      for (const it of doc.complex?.items ?? []) if (!ids.has(it.exerciseId)) fail(`${relative(ROOT, full)}: item references unknown exercise "${it.exerciseId}"`);
      const loc = localeOf(file);
      if (!locales.includes(loc)) fail(`${relative(ROOT, full)}: unsupported locale "${loc}"`);
      const head = doc.complex ?? doc.exercises[0];
      entries.push({
        id: head.id,
        kind: doc.complex ? 'complex' : 'exercise',
        publisherId: pub.id,
        name: head.name,
        description: head.description.slice(0, 280),
        locale: loc,
        tags: doc.catalog.tags,
        bodyParts: doc.catalog.bodyParts,
        level: doc.catalog.level ?? null,
        category: doc.catalog.category ?? null,
        exerciseCount: doc.complex ? doc.complex.items.length : 1,
        durationMs: docTotalMs(doc),
        steps: doc.complex ? null : stepsOf(doc.exercises[0]).map((s) => ({ tone: s.tone, durationMs: s.durationMs })),
        updatedAt: head.updatedAt,
        path: `${relative(ROOT, full)}`,
      });
    }
  }
}

const dupes = entries.map((e) => `${e.id}:${e.locale}`).filter((k, i, a) => a.indexOf(k) !== i);
for (const d of new Set(dupes)) fail(`duplicate id/locale: ${d}`);

// The submission worker only counts ids it can safely use as a key, and it turns the
// rest away in silence. A document whose id it would refuse still publishes fine — it
// just sits at zero opens for ever, which is worth saying out loud rather than leaving
// to be discovered.
const COUNTABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
for (const id of new Set(entries.map((e) => e.id).filter((id) => !COUNTABLE_ID.test(id)))) {
  console.warn(`! "${id}" cannot be counted: opens for it will stay at zero (letters, digits, . _ - only, up to 64)`);
}

// ---- featured ----
const FEATURED_FILE = join(ROOT, 'featured.json');
/** ids in featured.json, minus the ones whose run has ended. */
const featured = { entry: new Map(), publisher: new Map() };
if (existsSync(FEATURED_FILE)) {
  const fres = featuredFile.safeParse(readJson(FEATURED_FILE));
  if (!fres.success) {
    fail(`featured.json: ${fres.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    for (const item of fres.data.items) {
      const known = item.kind === 'entry' ? entries.some((e) => e.id === item.id) : publishers.some((p) => p.id === item.id);
      // A typo here would quietly promote nothing at all, which is worse than a build failure.
      if (!known) {
        fail(`featured.json: no ${item.kind} with id "${item.id}"`);
        continue;
      }
      // An expired slot is not a mistake — it is a slot that ran its course. It comes
      // out of the list without stopping the build, so nobody has to deploy at midnight.
      if (item.until && item.until < today) {
        console.log(`· featured: ${item.kind} "${item.id}" ended ${item.until}, not promoted`);
        continue;
      }
      featured[item.kind].set(item.id, item);
    }
  }
}

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`✔ ${publishers.length} publisher(s), ${entries.length} document(s) valid`);
if (CHECK) process.exit(0);

// ---- popularity ----
/**
 * How often each document was opened, aggregated by the submission worker. Asked for
 * once per deploy and baked into the page, so a reader's browser never talks to us to
 * find out what is popular.
 *
 * The build must not depend on it. A worker having a moment, a runner with no network,
 * or a local `npm run build` all end up with every count at zero and a sort that simply
 * has nothing to order by — never a red build.
 */
const opens = await fetchOpenCounts();
async function fetchOpenCounts() {
  if (COUNTS_URL === 'off') return {};
  try {
    const res = await fetch(COUNTS_URL, { signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const counts = body?.counts;
    if (!counts || typeof counts !== 'object') throw new Error('no counts in the answer');
    return counts;
  } catch (e) {
    console.warn(`! open counts unavailable (${e.message}); sorting by popularity will have nothing to go on`);
    return {};
  }
}

// ---- fold featured and popularity into what gets published ----
for (const e of entries) {
  const f = featured.entry.get(e.id) ?? featured.publisher.get(e.publisherId);
  e.featured = Boolean(f);
  e.sponsored = Boolean(f?.sponsored);
  e.opens = Number(opens[e.id] ?? 0);
}
for (const p of publishers) {
  const f = featured.publisher.get(p.id);
  p.featured = Boolean(f);
  p.sponsored = Boolean(f?.sponsored);
}

// ---- site + catalog ----
const SITE = join(ROOT, 'site');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
// 1. static site with header/footer includes
const header = readFileSync(join(SITE, '_header.html'), 'utf8');
const footer = readFileSync(join(SITE, '_footer.html'), 'utf8');
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
for (const file of walk(SITE)) {
  const rel = relative(SITE, file);
  if (rel.startsWith('_')) continue;
  const out = join(DIST, rel);
  mkdirSync(join(out, '..'), { recursive: true });
  if (rel.endsWith('.md')) {
    // A guide has to be readable in one fetch: an assistant sent here reads plain
    // markdown, where a URL is text rather than a link, and its fetch tool may
    // refuse to follow one it was never handed. So a shared section is inlined
    // rather than linked, and lives in exactly one file.
    const md = readFileSync(file, 'utf8').replace(/<!--#include ([\w.-]+)#(\w+)[^>]*-->/g, (_, src, region) => {
      const text = readFileSync(join(SITE, src), 'utf8');
      const m = text.match(new RegExp(`<!--#${region}-start-->\\n([\\s\\S]*?)<!--#${region}-end-->`));
      if (!m) throw new Error(`${rel}: no region ${region} in ${src}`);
      return m[1].trimEnd();
    })
    // the region markers themselves are build plumbing, not something a reader needs
    .replace(/^<!--#\w+-(?:start|end)-->\n/gm, '');
    // Served as a page, not as a file. Two fetchers read these guides: one takes
    // text/markdown, the other refuses the content type outright and never sees
    // the page. A directory named `guide.md` holding an index.html makes the same
    // address answer as text/html — GitHub Pages redirects the bare path to it —
    // and the raw source stays one click away as text/plain for anything that
    // wants it. The address is what the app hands out, so it cannot change.
    const title = (md.match(/^#\s+(.+)$/m) ?? [, rel])[1];
    const txt = rel.replace(/\.md$/, '.txt');
    const escape = (t) => t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    mkdirSync(out, { recursive: true });
    writeFileSync(
      join(out, 'index.html'),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>${escape(title)}</title><link rel="icon" href="/kinetempo-catalog/favicon.png">` +
        `<style>body{margin:0;background:#233044;color:#fff;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}` +
        `main{max-width:82ch;margin:0 auto;padding:24px 16px 64px}pre{white-space:pre-wrap;word-wrap:break-word;margin:0}` +
        `a{color:#f0a58a}</style></head><body><main><p><a href="../${txt}">plain text</a></p><pre>${escape(md)}</pre></main></body></html>\n`
    );
    writeFileSync(join(DIST, txt), md);
  } else if (rel.endsWith('.html')) {
    const depth = rel.split('/').length - 1;
    const prefix = depth ? '../'.repeat(depth) : './';
    // `./` in the shared header means the site root, not the page's own folder — a nested
    // page like /demo/ or /catalog/ would otherwise ask for its own copy of the icon and
    // the script. Both attributes carry such paths, not just href.
    const fix = (html) => html.replaceAll('href="./', `href="${prefix}`).replaceAll('src="./', `src="${prefix}`);
    // cache-bust local scripts/styles with the build time so GitHub Pages readers always get the current version
    const stamp = Date.now().toString(36);
    const html = readFileSync(file, 'utf8').replace('<!--#header-->', fix(header)).replace('<!--#footer-->', fix(footer)).replace(/(src|href)="([^"]+\.(?:js|css))"/g, `$1="$2?v=${stamp}"`);
    writeFileSync(out, html);
  } else {
    cpSync(file, out);
  }
}
// 2. catalog under /catalog/
const CAT = join(DIST, 'catalog');
mkdirSync(CAT, { recursive: true });
cpSync(PUBLISHERS, join(CAT, 'publishers'), { recursive: true });
const index = { schemaVersion: 1, generatedAt: new Date().toISOString(), publishers, entries };
writeFileSync(join(CAT, 'index.json'), JSON.stringify(index));
writeFileSync(join(CAT, 'index.pretty.json'), JSON.stringify(index, null, 2));
/**
 * The catalog page is rendered whole at build time — every card, with the facets it
 * can be filtered by — and browse.js only shows and hides what is already there. So
 * the list reads and links correctly with no JavaScript at all, search engines see
 * the content rather than an empty shell, and filtering costs no network.
 */
const pubById = new Map(publishers.map((p) => [p.id, p]));
/**
 * The order a reader gets before touching anything: most opened first, and the more
 * recently updated of two equals ahead. Verification is a badge and a filter, never a
 * nudge up this list — it is sold, and a ranking you can buy is not one worth reading.
 * What is bought sits in the Featured row above, labelled.
 */
const byRecommended = (a, b) => b.opens - a.opens || String(b.updatedAt).localeCompare(String(a.updatedAt)) || a.name.localeCompare(b.name);
const ordered = [...entries].sort(byRecommended);

const minutesOf = (e) => Math.max(1, Math.round(e.durationMs / 60000));
const chip = (kind, value, label, count) =>
  `<button type="button" class="chip" data-facet="${kind}" data-value="${esc(value)}">${esc(label)}<span class="chip-n">${count}</span></button>`;

/** Facet values actually present in the catalog, commonest first — never an empty filter. */
function tally(list, pick) {
  const n = new Map();
  for (const e of list) for (const v of [pick(e)].flat().filter(Boolean)) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

const catCounts = tally(entries, (e) => e.category);
const tagCounts = tally(entries, (e) => e.tags);
const levelCounts = tally(entries, (e) => e.level);
const localeCounts = tally(entries, (e) => e.locale);
const verifiedCount = entries.filter((e) => pubById.get(e.publisherId)?.verified).length;
const featuredCount = entries.filter((e) => e.featured).length;
/** Enough tags to be useful without a wall of them; the rest open on demand. */
const TAGS_SHOWN = 12;

const facets = `
<div class="filters" data-enhanced hidden>
  <label class="search"><span class="sr-only" data-i18n="searchLabel">Search the catalog</span>
    <input type="search" id="q" placeholder="Search by name, tag or publisher" data-i18n-placeholder="searchHint" autocomplete="off" spellcheck="false"></label>
  <div class="filter-row">
    <label data-i18n="sort">Sort <select id="sort">
      <option value="recommended" data-i18n="sortRecommended">Recommended</option>
      <option value="popular" data-i18n="sortPopular">Most opened</option>
      <option value="new" data-i18n="sortNew">Recently updated</option>
      <option value="short" data-i18n="sortShort">Shortest first</option>
      <option value="name" data-i18n="sortName">A–Z</option>
    </select></label>
    <label data-i18n="level">Level <select id="level"><option value="" data-i18n="any">Any</option>${levelCounts.map(([v, n]) => `<option value="${esc(v)}">${esc(LEVELS[v] ?? v)} (${n})</option>`).join('')}</select></label>
    <label data-i18n="language">Language <select id="locale">${localeCounts.map(([v]) => `<option value="${esc(v)}"${v === 'en' ? ' selected' : ''}>${esc(LOCALE_NAMES[v] ?? v)}</option>`).join('')}</select></label>
    <label class="toggle"><input type="checkbox" id="verified"> <span data-i18n="verifiedOnly">Verified publishers only</span>${verifiedCount ? ` (${verifiedCount})` : ''}</label>
    ${featuredCount ? '<label class="toggle"><input type="checkbox" id="featuredOnly"> <span data-i18n="featuredOnly">Featured only</span></label>' : ''}
  </div>
  ${catCounts.length ? `<div class="chips" data-group="category"><span class="chips-label" data-i18n="category">Category</span>${catCounts.map(([v, n]) => chip('category', v, CATEGORIES[v] ?? v, n)).join('')}</div>` : ''}
  ${tagCounts.length ? `<div class="chips" data-group="tag"><span class="chips-label" data-i18n="tags">Tags</span>${tagCounts.map(([v, n], i) => chip('tag', v, v, n).replace('class="chip"', `class="chip${i >= TAGS_SHOWN ? ' extra' : ''}"`)).join('')}${tagCounts.length > TAGS_SHOWN ? `<button type="button" class="chip more" id="more-tags">+ ${tagCounts.length - TAGS_SHOWN} more</button>` : ''}</div>` : ''}
  <p class="result-line"><span id="shown">${new Set(entries.map((e) => e.id)).size} of ${new Set(entries.map((e) => e.id)).size} shown</span> · <button type="button" class="linkish" id="reset" data-i18n="clear">Clear filters</button></p>
</div>
<p class="empty" id="empty" hidden><span data-i18n="noMatch">Nothing matches those filters.</span> <button type="button" class="linkish" data-reset data-i18n="clearThem">Clear them</button></p>`;

function card(e, hidden = false) {
  const pub = pubById.get(e.publisherId);
  const badges = [
    e.sponsored ? '<span class="badge paid" title="A paid placement">Sponsored</span>' : e.featured ? '<span class="badge pick">Featured</span>' : '',
    pub?.verified ? '<span class="badge ok" title="We checked who this publisher is — not the content">Verified</span>' : '',
    e.level ? `<span class="badge lvl">${esc(LEVELS[e.level] ?? e.level)}</span>` : '',
  ]
    .filter(Boolean)
    .join('');
  const docHref = `../${e.path.replace('publishers/', 'catalog/publishers/')}`;
  // Search runs over one prepared string rather than over the DOM: it is the name, the
  // description, the tags, the body parts and the publisher, already lowercased.
  const haystack = [e.name, e.description, ...e.tags, ...e.bodyParts, pub?.name ?? e.publisherId, e.category ? CATEGORIES[e.category] : '']
    .join(' ')
    .toLowerCase();
  return `<article class="card entry"${hidden ? ' hidden' : ''} data-id="${esc(e.id)}" data-kind="${esc(e.kind)}" data-category="${esc(e.category ?? '')}" data-level="${esc(e.level ?? '')}" data-locale="${esc(e.locale)}" data-tags="${esc(e.tags.join(' '))}" data-verified="${pub?.verified ? '1' : '0'}" data-featured="${e.featured ? '1' : '0'}" data-opens="${e.opens}" data-minutes="${minutesOf(e)}" data-updated="${esc(e.updatedAt)}" data-name="${esc(e.name.toLowerCase())}" data-text="${esc(haystack)}" data-doc="${esc(docHref)}">
  <div class="badges">${badges}</div>
  <h3>${esc(e.name)}</h3>
  <p class="meta" data-meta data-publisher="${esc(pub?.name ?? e.publisherId)}" data-exercises="${e.kind === 'complex' ? e.exerciseCount : 0}">${e.kind === 'complex' ? `${e.exerciseCount} exercise${e.exerciseCount === 1 ? '' : 's'} · ` : ''}${minutesOf(e)} min · ${esc(pub?.name ?? e.publisherId)}${e.opens ? ` · opened ${e.opens}×` : ''}</p>
  <p>${esc(e.description)}</p>
  ${e.tags.length ? `<p class="tag-line">${e.tags.map((t) => `<button type="button" class="tag" data-facet="tag" data-value="${esc(t)}">${esc(t)}</button>`).join('')}</p>` : ''}
  <p class="actions"><a class="open" href="${esc(docHref)}" data-open data-i18n="open">Open in Kinetempo</a><a class="json" href="${esc(docHref)}">JSON</a></p>
</article>`;
}

/**
 * One card per programme, not one per language: the same set in three locales is three
 * entries, and a Featured row that says the same thing three times is a row nobody reads.
 * English is the fallback the rest of the site is written in; the full list below carries
 * every translation and a language filter.
 */
const FEATURED_MAX = 6;
const featuredIds = [...new Set(ordered.filter((e) => e.featured).map((e) => e.id))].slice(0, FEATURED_MAX);
// Every translation is rendered here too, and browse.js shows the one that matches the
// reader's language. Without the script the page falls back to English, which is what
// the rest of it is written in.
const featuredRow = featuredIds.flatMap((id) => ordered.filter((e) => e.id === id)).map((e) => card(e, e.locale !== 'en'));
const featuredSection = featuredRow.length
  ? `<section class="featured"><h2 data-i18n="featured">Featured</h2><p class="disclosure" data-i18n="featuredNote">Chosen by the maintainer. A card marked <strong>Sponsored</strong> is a paid placement; it buys this row and nothing else.</p><div class="grid" id="featured-row">${featuredRow.join('\n')}</div></section>`
  : '';

const catalogPage = readFileSync(join(SITE, '_catalog.html'), 'utf8')
  .replace('<!--#featured-->', featuredSection)
  .replace('<!--#facets-->', facets)
  .replace('<!--#entries-->', ordered.map((e) => card(e, e.locale !== 'en')).join('\n'))
  .replaceAll('<!--#count-->', String(new Set(entries.map((e) => e.id)).size));
const upOne = (html) => html.replaceAll('href="./', 'href="../').replaceAll('src="./', 'src="../');
writeFileSync(
  join(CAT, 'index.html'),
  catalogPage
    .replace('<!--#header-->', upOne(header))
    .replace('<!--#footer-->', upOne(footer))
    // The page skips the walk above (its source starts with `_`), so it needs the same
    // cache-busting stamp applied here or readers keep yesterday's browse.js.
    .replace(/(src|href)="([^"]+\.(?:js|css))"/g, `$1="$2?v=${Date.now().toString(36)}"`),
);
// 3. custom domain + no jekyll
if (existsSync(join(ROOT, 'CNAME'))) cpSync(join(ROOT, 'CNAME'), join(DIST, 'CNAME'));
writeFileSync(join(DIST, '.nojekyll'), '');
console.log(`→ dist/ written: site + catalog (${entries.length} entries)`);

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
