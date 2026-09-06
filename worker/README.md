# Submission worker

Turns a document sent from the app into a pull request against this repository.

The app cannot open a pull request itself: that needs a token with write access,
and a token shipped inside a mobile app can be read by anyone who downloads it.
The token lives here instead, where the payload can also be checked and rate
limited before it reaches GitHub.

Nothing is published automatically. The pull request is validated by this
repository's own CI — the same `npm run validate` that guards every change — and
a person decides whether to merge it.

## Deploying

```bash
set -a && . ~/.cloudflare.env && set +a
npx wrangler deploy
```

The KV namespace holding the per-address counter already exists and is wired
into `wrangler.toml`.

## The one secret

```bash
npx wrangler secret put GITHUB_TOKEN
```

A **fine-grained** personal access token, scoped to this repository only, with:

- **Contents: Read and write** — to create the branch and the file
- **Pull requests: Read and write** — to open the pull request

Nothing else. A token on the repository owner's own account is fine, and is in
fact narrower than the alternative: a machine account has to be added as a
collaborator, which grants everything that role allows, where this token grants
two permissions on one repository. A machine account buys only cosmetics — pull
requests listed as coming from someone other than the reviewer — and is worth it
later, if enough submissions arrive that telling them apart at a glance matters.

Fine-grained tokens expire, and submissions will fail **silently** when this one
does. Put the date in a calendar.

## What it does

`POST /submit` with `{ "document": …, "locale": "en" | "ru" | "ro", "contact": "…" }`

- Rejects anything that is not a Kinetempo document of a version it knows, and
  anything over 200 KB.
- Allows five submissions per address per hour.
- Writes to `publishers/community/{programs,exercises}/<slug>-<stamp>.<locale>.kinetempo.json`.
  The slug is stripped to letters and digits, so it cannot escape that directory,
  and the stamp goes in the name rather than the locale segment — the catalog
  parses that segment and rejects anything that is not a language it supports.
- Answers with the pull request URL, or a message the app can show a person.
