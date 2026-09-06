# Kinetempo catalog & website

This repository is the public website of the Kinetempo app (landing page, privacy policy, terms, support,
share-link landing) **and** a public, reviewable catalog of exercise programs for the [Kinetempo](https://github.com/selic/kinetempo) timer app.
Programs are plain JSON files organised **by publisher** — a clinic, a physiotherapist, a doctor or an individual —
each in its own directory. Anything merged here becomes visible in the app's Library tab.

```
publishers/
  <publisher-id>/
    publisher.json                       # who publishes, type, website, verified flag
    programs/<slug>.<locale>.kinetempo.json    # a program (complex) with its exercises
    exercises/<slug>.<locale>.kinetempo.json   # a single exercise
```

`site/` holds the static pages; CI builds `dist/` = site + `/catalog/index.json` (what the app downloads) and
publishes it to GitHub Pages (custom domain via `CNAME`).

- Authoring guide: [docs/AUTHORING.md](docs/AUTHORING.md) · по‑русски: [docs/AUTHORING.ru.md](docs/AUTHORING.ru.md)
- Content roadmap (which base sets to publish next, and why): [docs/CONTENT-ROADMAP.md](docs/CONTENT-ROADMAP.md)
- Claude/Codex skill for authors: [skills/kinetempo-program-author](skills/kinetempo-program-author/SKILL.md)
- Examples: [examples/](examples/)

## Publishing a program

**From the app.** Share → Send to the catalog posts the programme to a small worker
([`worker/`](worker)) that opens the pull request for you. No GitHub account, no fork. CI validates it and a
maintainer decides whether to merge — nothing is published automatically.

**By hand,** for authors filling the catalog in bulk:

1. Fork this repository and create `publishers/<your-id>/publisher.json` (see [publishers/selic](publishers/selic)).
   `<your-id>` is lowercase letters, digits and dashes.
2. Export a program from Kinetempo (Share → Export file) and drop the file into `programs/` or `exercises/`.
   Name it `<slug>.<locale>.kinetempo.json` (`en`, `ru`, `ro`).
3. Optionally add a `catalog` block: `tags`, `bodyParts`, `level` (`rehab`, `beginner`, `intermediate`, `advanced`),
   `source`, `reviewedBy`, `license` (default CC-BY-4.0).
4. Run `npm install && npm run validate` and open a pull request. CI validates the schema; a maintainer reviews the content.

Clinics and licensed practitioners can ask for the `verified: true` badge by linking the publisher to an official
website or registry entry in the pull request.

## Rules

- Content is **not medical advice**. Programs written for a specific patient must say so in the description.
- Only link videos and hosted animations (YouTube, Lottie JSON, GIF); binary files are not accepted. A schematic
  figure is the exception — it is joint angles, not a file, and travels inside the document.
- Keep descriptions factual: how to perform, what to avoid, stop signals.
- One locale per file; add translations as separate files with the same slug.

## Data format

Documents use the app's share schema (`schemaVersion: 1`): exercises with step sequences
(`squeeze`, `lift`, `hold`, `release`, `move`, `timer`, `rest`), reps, sets, and optional programs (`complex`) that reference
exercises by id. The authoritative schema lives in the app at `src/share/schema.ts`; `scripts/build-index.mjs` mirrors it.

## Author

Built by **Eugene Samotija** ([@selic](https://github.com/selic)) — [defency.net](https://defency.net).
More projects: [github.com/selic](https://github.com/selic) · [LinkedIn](https://www.linkedin.com/in/evghenii-samotiia)

## License

Code (scripts, workflows): MIT — see [LICENSE](LICENSE). Content: each document states its license (default CC-BY-4.0).
