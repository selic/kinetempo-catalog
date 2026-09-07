/**
 * Turns a submission from the app into a pull request against this catalog.
 *
 * The app cannot open a pull request itself: that needs a token with write
 * access, and a token shipped inside a mobile app is readable by anyone who
 * downloads it. The token lives here instead, where it can also be rate limited
 * and where the payload can be checked before it reaches GitHub.
 *
 * The pull request is deliberately not merged automatically — the repository's
 * own CI validates it, and a person decides what gets published. The app follows
 * the request afterwards by asking `/status` what the person decided.
 */

const REPO_OWNER = 'selic';
const REPO_NAME = 'kinetempo-catalog';
const BASE_BRANCH = 'main';
const PUBLISHER = 'community';
/** The catalog reads the locale out of the file name, so it has to be one it knows. */
const LOCALES = ['en', 'ru', 'ro'];

/** A submitted document is a few kilobytes; anything far larger is not a rehab programme. */
const MAX_BYTES = 200 * 1024;
/** Submissions allowed from one address per hour. */
const RATE_LIMIT = 5;
/** Status lookups allowed from one address per hour — cached and cheap, but not free. */
const STATUS_LIMIT = 60;
/** Pull requests one status request may ask about. */
const MAX_STATUS_IDS = 25;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/status') {
      if (request.method !== 'GET') return json(405, { error: 'Ask for the status with GET.' });
      return pullRequestStatuses(request, env);
    }
    if (path !== '/submit') return json(404, { error: 'Not found.' });
    if (request.method !== 'POST') return json(405, { error: 'Send the document with POST.' });

    const body = await request.text();
    if (body.length > MAX_BYTES) return json(413, { error: 'That programme is too large to submit. Split it into several.' });

    let submission;
    try {
      submission = JSON.parse(body);
    } catch {
      return json(400, { error: 'The body is not JSON.' });
    }

    const doc = submission.document;
    const problem = checkDocument(doc);
    if (problem) return json(400, { error: problem });

    const limited = await overRateLimit(request, env, 'submit', RATE_LIMIT);
    if (limited) return json(429, { error: 'Too many submissions from here. Try again in an hour.' });

    // A second tap on Send, or the same programme a week later, should not open a second
    // pull request. The fingerprint covers what makes a submission the same submission.
    const seen = await alreadySubmitted(doc, env);
    if (seen) return json(200, { url: seen, duplicate: true });

    try {
      const url = await openPullRequest(env, doc, submission.contact, submission.locale);
      await rememberSubmission(doc, url, env);
      return json(201, { url });
    } catch (e) {
      // The token and the GitHub response stay here; the app gets something it can show a person.
      console.error('submission failed', e);
      return json(502, { error: 'Could not reach GitHub. Try again later, or send the file by email.' });
    }
  },
};

/** Cheap shape checks. The repository's CI validates the document properly on the pull request. */
function checkDocument(doc) {
  if (!doc || typeof doc !== 'object') return 'No document.';
  if (doc.app !== 'kinetempo') return 'That is not a Kinetempo document.';
  if (doc.schemaVersion !== 1) return `Unsupported document version ${doc.schemaVersion}.`;
  if (doc.kind !== 'kinetempo.exercise' && doc.kind !== 'kinetempo.complex') return 'Unknown document kind.';
  if (!Array.isArray(doc.exercises) || doc.exercises.length === 0) return 'The document has no exercises.';
  if (doc.exercises.length > 100) return 'Too many exercises in one document.';
  const head = doc.complex ?? doc.exercises[0];
  if (!head?.name || typeof head.name !== 'string') return 'The programme has no name.';
  return null;
}

async function overRateLimit(request, env, kind, limit) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = `rate:${kind}:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  const used = Number((await env.SUBMISSIONS.get(key)) ?? 0);
  if (used >= limit) return true;
  await env.SUBMISSIONS.put(key, String(used + 1), { expirationTtl: 3600 });
  return false;
}

/**
 * What makes two submissions the same one: the name and the shape of every exercise —
 * its steps, their tones and durations, the reps and sets. A reworded description or a
 * different animation is a new submission; the same programme sent twice is not.
 */
async function fingerprint(doc) {
  const head = doc.complex ?? doc.exercises[0];
  const shape = {
    name: head.name.trim().toLowerCase(),
    exercises: doc.exercises.map((e) => ({
      name: e.name?.trim().toLowerCase(),
      reps: e.reps,
      sets: e.sets,
      steps: (e.steps ?? []).map((s) => [s.tone, s.durationMs]),
      workMs: e.workMs,
      restMs: e.restMs,
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(shape));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The pull request opened for an identical submission, or null. */
async function alreadySubmitted(doc, env) {
  return env.SUBMISSIONS.get(`doc:${await fingerprint(doc)}`);
}

async function rememberSubmission(doc, url, env) {
  // Ninety days: long enough to catch a resend, short enough that a rejected programme
  // can be reworked and sent again without hunting down the record.
  await env.SUBMISSIONS.put(`doc:${await fingerprint(doc)}`, url, { expirationTtl: 90 * 24 * 3600 });
}

/**
 * What became of the pull requests the app opened. The catalog is a public
 * repository, so the app could ask GitHub itself — but unauthenticated calls are
 * limited per address, and a phone behind carrier NAT shares its address with
 * thousands of others. Here the token lifts that limit and KV holds the answer,
 * so a screen that refreshes on every open costs GitHub almost nothing.
 */
async function pullRequestStatuses(request, env) {
  const asked = (new URL(request.url).searchParams.get('pr') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[0-9]{1,7}$/.test(s))
    .map(Number);
  const numbers = [...new Set(asked)].slice(0, MAX_STATUS_IDS);
  if (numbers.length === 0) return json(400, { error: 'Ask with ?pr=1,2,3.' });
  if (await overRateLimit(request, env, 'status', STATUS_LIMIT)) return json(429, { error: 'Too many status checks from here. Try again in an hour.' });

  const items = [];
  for (const n of numbers) {
    const item = await pullRequestState(env, n);
    if (item) items.push(item);
  }
  return json(200, { items });
}

/** `open`, `accepted` (merged) or `declined` (closed unmerged) — the three a person cares about. */
async function pullRequestState(env, number) {
  const key = `pr:${number}`;
  const cached = await env.SUBMISSIONS.get(key, 'json');
  if (cached) return cached;

  let pr;
  try {
    pr = await github(env, `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${number}`);
  } catch (e) {
    // A request we cannot read — deleted, or GitHub having a moment — leaves the
    // app's own record alone rather than reporting a state that is not true.
    console.error('status lookup failed', number, e);
    return null;
  }
  const item = {
    number,
    state: pr.merged_at ? 'accepted' : pr.state === 'closed' ? 'declined' : 'open',
    url: pr.html_url,
    title: pr.title,
    updatedAt: pr.merged_at ?? pr.closed_at ?? pr.updated_at,
  };
  // Nothing is cached forever: a closed request can be reopened, and an open one
  // is the state most worth being fresh.
  await env.SUBMISSIONS.put(key, JSON.stringify(item), { expirationTtl: item.state === 'open' ? 300 : 3600 });
  return item;
}

/** Lowercase, letters and digits only, so it can never escape the publisher directory. */
/**
 * A slug becomes a branch name and a file path, so it stays ASCII. Non-Latin names
 * are transliterated rather than kept: macOS and Linux normalise unicode file names
 * differently (NFD against NFC), and a Cyrillic path created on one shows up as both
 * deleted and untracked when checked out on the other.
 */
const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugOf(doc) {
  const head = doc.complex ?? doc.exercises[0];
  const slug = head.name
    .toLowerCase()
    // Compose first: decomposed й is и plus a breve, and stripping marks would turn it into i.
    .normalize('NFC')
    .replace(/[\u0400-\u04ff]/g, (c) => CYRILLIC[c] ?? '')
    // Romanian ă î â ș ț decompose to a letter plus a mark; dropping the mark keeps the letter.
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  // A name in a script we do not transliterate leaves nothing behind.
  return slug || (doc.complex ? 'programme' : 'exercise');
}

const base64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};

async function github(env, path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'kinetempo-submissions',
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function openPullRequest(env, doc, contact, locale) {
  const repo = `/repos/${REPO_OWNER}/${REPO_NAME}`;
  const slug = slugOf(doc);
  const dir = doc.complex ? 'programs' : 'exercises';
  const stamp = Date.now().toString(36);
  const branch = `submission/${slug}-${stamp}`;
  // The stamp goes in the name, never in the locale segment: the catalog parses
  // that segment and rejects anything that is not a language it supports.
  const lang = LOCALES.includes(locale) ? locale : 'en';
  const path = `publishers/${PUBLISHER}/${dir}/${slug}-${stamp}.${lang}.kinetempo.json`;
  const head = doc.complex ?? doc.exercises[0];

  const base = await github(env, `${repo}/git/ref/heads/${BASE_BRANCH}`);
  await github(env, `${repo}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }) });
  await github(env, `${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Submission: ${head.name}`,
      content: base64(`${JSON.stringify(doc, null, 2)}\n`),
      branch,
    }),
  });

  const facts = [
    `**${head.name}**`,
    '',
    doc.complex ? `${doc.exercises.length} exercises` : '1 exercise',
    contact ? `Submitted by: ${String(contact).slice(0, 200)}` : 'Submitted anonymously from the app.',
    '',
    'Sent from Kinetempo. Nobody has reviewed this yet — CI checks the file format only.',
  ].join('\n');

  const pr = await github(env, `${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title: `Submission: ${head.name}`, head: branch, base: BASE_BRANCH, body: facts }),
  });
  return pr.html_url;
}
