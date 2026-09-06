/**
 * Turns a submission from the app into a pull request against this catalog.
 *
 * The app cannot open a pull request itself: that needs a token with write
 * access, and a token shipped inside a mobile app is readable by anyone who
 * downloads it. The token lives here instead, where it can also be rate limited
 * and where the payload can be checked before it reaches GitHub.
 *
 * The pull request is deliberately not merged automatically — the repository's
 * own CI validates it, and a person decides what gets published.
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

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json(405, { error: 'Send the document with POST.' });
    if (new URL(request.url).pathname !== '/submit') return json(404, { error: 'Not found.' });

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

    const limited = await overRateLimit(request, env);
    if (limited) return json(429, { error: 'Too many submissions from here. Try again in an hour.' });

    try {
      const url = await openPullRequest(env, doc, submission.contact, submission.locale);
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

async function overRateLimit(request, env) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = `rate:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  const used = Number((await env.SUBMISSIONS.get(key)) ?? 0);
  if (used >= RATE_LIMIT) return true;
  await env.SUBMISSIONS.put(key, String(used + 1), { expirationTtl: 3600 });
  return false;
}

/** Lowercase, letters and digits only, so it can never escape the publisher directory. */
function slugOf(doc) {
  const head = doc.complex ?? doc.exercises[0];
  const slug = head.name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return slug || 'programme';
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
