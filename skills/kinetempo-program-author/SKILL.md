---
name: kinetempo-program-author
description: Author exercises and programs for the Kinetempo physiotherapy timer catalog (github.com/selic/kinetempo-catalog). Use when asked to create, convert, translate or validate a Kinetempo exercise/program JSON (.kinetempo.json), turn a clinic's rehab protocol or a text/PDF instruction sheet into a Kinetempo program, or prepare a catalog pull request.
---

# Kinetempo program author

You produce `*.kinetempo.json` documents that the Kinetempo app imports and that `scripts/build-index.mjs` accepts.
Read `docs/AUTHORING.md` in this repository for the field reference; the essentials are below.

## Workflow

1. **Collect the protocol.** From the user's text / PDF / clinic sheet extract, per exercise: name, how to perform,
   what to avoid, stop signals, hold/rest seconds, reps, sets, session length, order of exercises, rests between them.
   Ask only for what cannot be inferred (usually reps or total minutes).
2. **Map each exercise to steps** (one rep):
   - isometric "hold X s, relax Y s" → `squeeze X` + `rest Y`
   - "lift, hold at top, lower slowly" → `lift` + `hold` + `release` (+ `rest`)
   - "slide / pump / circle" → two `move` steps with labels, `ticks: false` for steps ≤ 3 s
   - passive stretch / walk / plank for N minutes → single `timer` step, `reps: 1`
   - "for 5 minutes" with an X+Y-second rep → `reps = round(300 / (X+Y))`
3. **Write the document** (see template). Ids: `<publisher-id>-<slug>`, stable, lowercase. Descriptions ≤ 4000 chars,
   factual, in the file's locale. Set `workMs`/`restMs` to the first active / first rest step durations.
   Set `updatedAt` and `exportedAt` to now (ISO-8601 UTC).
4. **Attach visuals** only as links: `videoUrl` (YouTube/mp4) and `animation` — built-in ids
   `quadSets`, `heelSlides`, `straightLegRaise`, `heelProp`, `anklePumps`, or `{ "kind": "url", "ref": "https://…/x.json" }`.
5. **Program:** put every referenced exercise in `exercises`, build `complex.items` in the prescribed order,
   `restBetweenMs` (default 30000), per-item `restAfterMs` / `override` when the protocol differs.
6. **Catalog block:** `tags`, `bodyParts`, `level`, `source`, `reviewedBy` if known, `license`.
7. **Save** to `publishers/<id>/programs/<slug>.<locale>.kinetempo.json` (or `exercises/`), create
   `publisher.json` if missing, run `npm run validate`, fix every reported issue, then open a PR
   (`gh pr create`) with the PR template filled in.
8. **Translations:** separate files per locale (`.ru.`, `.ro.`), same ids, translate names/descriptions/labels only.

## Template

```json
{
  "kind": "kinetempo.complex",
  "schemaVersion": 1,
  "app": "kinetempo",
  "exportedAt": "<ISO>",
  "exercises": [
    {
      "id": "<publisher>-<slug>",
      "name": "…",
      "description": "How to perform. What to avoid. Stop if …",
      "steps": [ { "tone": "squeeze", "durationMs": 8000 }, { "tone": "rest", "durationMs": 4000 } ],
      "reps": 25, "sets": 1, "setRestMs": 0,
      "workMs": 8000, "restMs": 4000,
      "videoUrl": null,
      "animation": { "kind": "builtin", "ref": "quadSets" },
      "updatedAt": "<ISO>"
    }
  ],
  "complex": {
    "id": "<publisher>-<program-slug>",
    "name": "…",
    "description": "…",
    "restBetweenMs": 30000,
    "items": [ { "exerciseId": "<publisher>-<slug>" } ],
    "updatedAt": "<ISO>"
  },
  "catalog": { "tags": [], "bodyParts": [], "level": "rehab", "source": "…", "license": "CC-BY-4.0" }
}
```

## Guardrails

- Never invent clinical parameters; if the protocol lacks a number, ask or use a conservative default and say so in the PR.
- Keep patient-identifying details out; mark patient-specific protocols in the description.
- Do not embed binary media; do not change other publishers' files.
- Tones are the only allowed values: squeeze, lift, hold, release, move, timer, rest.
