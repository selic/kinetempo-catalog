#!/usr/bin/env node
/**
 * Validates every publisher and document, then writes dist/ with a copy of the
 * documents plus index.json (what the app downloads).
 *
 *   node scripts/build-index.mjs          # build dist/
 *   node scripts/build-index.mjs --check  # validate only
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLISHERS = join(ROOT, 'publishers');
const DIST = join(ROOT, 'dist');
const CHECK = process.argv.includes('--check');

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
const exercise = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(4000).default(''),
  videoUrl: z.string().url().max(500).nullable().optional(),
  hadLocalVideo: z.boolean().optional(),
  animation: z.object({ kind: z.enum(['builtin', 'url']), ref: z.string().max(500) }).nullable().optional(),
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
      source: z.string().max(300).optional(),
      reviewedBy: z.string().max(120).optional(),
      license: z.string().max(60).default('CC-BY-4.0'),
    })
    .default({}),
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

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`✔ ${publishers.length} publisher(s), ${entries.length} document(s) valid`);
if (CHECK) process.exit(0);

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
  if (rel.endsWith('.html')) {
    const depth = rel.split('/').length - 1;
    const prefix = depth ? '../'.repeat(depth) : './';
    const fix = (html) => html.replaceAll('href="./', `href="${prefix}`);
    writeFileSync(out, readFileSync(file, 'utf8').replace('<!--#header-->', fix(header)).replace('<!--#footer-->', fix(footer)));
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
const rows = entries
  .map((e) => {
    const pub = publishers.find((p) => p.id === e.publisherId);
    const mins = Math.round(e.durationMs / 60000);
    return `<div class="card"><h3>${esc(e.name)}</h3><p>${esc(e.description)}</p><p style="margin-top:8px">${e.kind === 'complex' ? `${e.exerciseCount} exercises · ` : ''}${mins} min · ${esc(pub?.name ?? e.publisherId)}${pub?.verified ? ' ✓' : ''} · <a href="../${e.path.replace('publishers/', 'catalog/publishers/')}">JSON</a></p></div>`;
  })
  .join('\n');
const catalogPage = readFileSync(join(SITE, '_catalog.html'), 'utf8').replace('<!--#entries-->', rows).replace('<!--#count-->', String(entries.length));
writeFileSync(join(CAT, 'index.html'), catalogPage.replace('<!--#header-->', header.replaceAll('href="./', 'href="../')).replace('<!--#footer-->', footer.replaceAll('href="./', 'href="../')));
// 3. custom domain + no jekyll
if (existsSync(join(ROOT, 'CNAME'))) cpSync(join(ROOT, 'CNAME'), join(DIST, 'CNAME'));
writeFileSync(join(DIST, '.nojekyll'), '');
console.log(`→ dist/ written: site + catalog (${entries.length} entries)`);

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
