# Authoring guide — exercises and programs for Kinetempo

This guide explains, field by field, how to write an exercise or a program that the Kinetempo app can import
and that this catalog accepts. Russian version: [AUTHORING.ru.md](AUTHORING.ru.md).
Which sets the catalog wants next, and the conventions volume publishing needs: [CONTENT-ROADMAP.md](CONTENT-ROADMAP.md).

## 1. Mental model

- An **exercise** is a *rep pattern* repeated N times: one rep is an ordered list of **steps**, every step has a
  **tone** (what the body does), a duration and, optionally, a custom label.
- A **program** (in the app: "Program", in files: `complex`) is an ordered list of exercises with rests in between.
- Everything is timed. The app plays a distinct sound for every tone, counts down the last 3 seconds of active
  steps ("ticks"), and shows the current step on the lock screen.

### Tones

| tone      | meaning                                   | colour  | sound             | ticks by default |
|-----------|-------------------------------------------|---------|-------------------|------------------|
| `squeeze` | isometric contraction, nothing moves      | orange  | two rising beeps  | yes |
| `lift`    | raise / move into the position            | amber   | rising glide      | yes |
| `hold`    | keep the position                         | red     | two rising beeps  | yes |
| `release` | lower / return with control               | blue    | falling glide     | yes |
| `move`    | continuous movement (slides, pumps)       | purple  | single beep       | yes |
| `timer`   | plain countdown, no reps (stretch, walk)  | steel   | single beep       | yes |
| `rest`    | relax                                     | green   | low beep          | no  |

Rules: at least one non-rest step per rep; a trailing `rest` is skipped automatically on the last rep of a set.

### Common patterns

| pattern                 | steps                                                                 |
|-------------------------|-----------------------------------------------------------------------|
| isometric hold          | `squeeze 8 s`, `rest 4 s`                                             |
| lift – hold – release   | `lift 2 s`, `hold 5 s`, `release 2 s`, `rest 3 s`                     |
| dynamic reps            | `lift 2 s`, `release 2 s`                                             |
| plain timer             | `timer 300 s` with `reps: 1`                                          |
| slides / pumps          | `move 4 s "Slide in"`, `move 4 s "Slide out"`                         |

## 2. File layout

```
publishers/<publisher-id>/publisher.json
publishers/<publisher-id>/programs/<slug>.<locale>.kinetempo.json
publishers/<publisher-id>/exercises/<slug>.<locale>.kinetempo.json
```

- `<publisher-id>`: lowercase letters, digits, dashes (`city-physio-clinic`). Must equal `publisher.json → id`.
- `<slug>`: short, lowercase, dashes (`knee-rehab-weeks-1-5`).
- `<locale>`: `en`, `ru` or `ro`. One language per file; translations are separate files with the same slug.

## 3. `publisher.json`

```json
{
  "id": "city-physio-clinic",
  "name": "City Physio Clinic",
  "type": "clinic",
  "website": "https://example.com",
  "description": "Outpatient physiotherapy, post-operative rehabilitation.",
  "verified": false,
  "contact": "rehab@example.com",
  "country": "MD"
}
```

`type`: `clinic` | `physiotherapist` | `doctor` | `organisation` | `individual`. Leave `verified` at `false`;
maintainers set it after checking the website / registry link in your pull request.

## 4. Exercise document

```json
{
  "kind": "kinetempo.exercise",
  "schemaVersion": 1,
  "app": "kinetempo",
  "exportedAt": "2026-09-05T10:00:00.000Z",
  "exercises": [
    {
      "id": "city-physio-heel-slides",
      "name": "Heel slides",
      "description": "Lie on your back. Slide the heel toward you, bending the knee — never past 90° — then slide back. Heel stays on the bed. Stop on sharp pain.",
      "steps": [
        { "tone": "move", "durationMs": 4000, "label": "Slide in (≤90°)", "ticks": false },
        { "tone": "move", "durationMs": 4000, "label": "Slide out", "ticks": false }
      ],
      "reps": 37,
      "sets": 1,
      "setRestMs": 0,
      "workMs": 4000,
      "restMs": 0,
      "videoUrl": "https://youtu.be/…",
      "animation": { "kind": "builtin", "ref": "heelSlides" },
      "updatedAt": "2026-09-05T10:00:00.000Z"
    }
  ],
  "catalog": {
    "tags": ["knee", "post-op"],
    "bodyParts": ["knee"],
    "level": "rehab",
    "source": "Clinic protocol v3, 2026",
    "reviewedBy": "Dr. A. Example, orthopaedic surgeon",
    "license": "CC-BY-4.0"
  }
}
```

Field reference (exercise):

| field          | required | notes |
|----------------|----------|-------|
| `id`           | yes      | globally unique, stable — prefix with your publisher id (`city-physio-…`) |
| `name`         | yes      | ≤ 120 chars |
| `description`  | no       | ≤ 4000 chars: how to perform, what to avoid, stop signals |
| `steps`        | yes*     | 1–20 steps; `durationMs` in milliseconds; `label` ≤ 40 chars; `ticks` overrides the tone default |
| `reps`, `sets`, `setRestMs` | yes / no / no | reps ≥ 1; `sets` default 1; `setRestMs` = rest between sets |
| `workMs`, `restMs` | yes  | legacy mirror of the first active / first rest step (older app versions read them) |
| `videoUrl`     | no       | YouTube link or direct `.mp4` / `.m3u8`; local files are never accepted |
| `animation`    | no       | `{ "kind": "builtin", "ref": "<id>" }`, `{ "kind": "url", "ref": "https://…/anim.json" }` (Lottie / GIF), or `{ "kind": "spec", "spec": { … } }` — a figure described as joint angles and carried inside the document |
| `updatedAt`    | yes      | ISO-8601; bump it when you change the exercise so the app can offer updates |

Built-in animation ids: `quadSets`, `heelSlides`, `straightLegRaise`, `heelProp`, `anklePumps`. All five are
lying-down knee work; anything else — standing, seated, face down — needs a `spec`.

A `spec` is the figure written out as anatomical joint angles rather than a picture, so it weighs a few hundred
bytes, travels inside the document with no hosting, and follows the timer instead of looping on its own. The
conventions, the format and worked examples are in
[animation-only.md](https://selic.github.io/kinetempo-catalog/animation-only.md); an assistant can write one from
a description of the movement.

## 5. Program document

Same envelope with `"kind": "kinetempo.complex"`, **all referenced exercises embedded** in `exercises`, and:

```json
"complex": {
  "id": "city-physio-knee-phase-1",
  "name": "Knee phase 1 (weeks 1–5)",
  "description": "3 blocks per day. Ice 20 min after each block.",
  "restBetweenMs": 30000,
  "items": [
    { "exerciseId": "city-physio-quad-sets" },
    { "exerciseId": "city-physio-slr", "override": { "reps": 20 } },
    { "exerciseId": "city-physio-heel-slides", "restAfterMs": 60000 }
  ],
  "updatedAt": "2026-09-05T10:00:00.000Z"
}
```

- `items[].override` may replace `steps`, `reps`, `sets`, `setRestMs` for this program only.
- `items[].restAfterMs` overrides `restBetweenMs` after that item (`0` = none).
- Exercises listed in `exercises` but not used by `items` are still imported (useful for "every hour" extras).

## 6. `catalog` block

| field        | values |
|--------------|--------|
| `tags`       | free-form, lowercase, ≤ 12 (`knee`, `post-op`, `isometric`, `balance`) |
| `bodyParts`  | `knee`, `hip`, `ankle`, `shoulder`, `spine`, `wrist`, `quadriceps`, `hamstrings`, `calf`, `core`, … |
| `level`      | `rehab`, `beginner`, `intermediate`, `advanced` |
| `source`     | protocol / paper / clinic document the program follows |
| `reviewedBy` | name and role of the reviewing clinician (optional, shown in the app) |
| `license`    | default `CC-BY-4.0` |

## 7. Validate and submit

```bash
npm install
npm run validate        # schema + cross-reference check for every file
```

Open a pull request. CI runs the same validation; a maintainer reviews the content and, if applicable,
the publisher's verification link. After merge the program appears in the app's Library within minutes.

## 8. Content rules

- Not medical advice; patient-specific protocols must say so in the description.
- Describe stop signals (sharp pain, swelling, fever) where relevant.
- Keep step durations realistic for the audience (rehab: 2–8 s per step; `timer` for long passive holds).
- Do not embed personal data of patients.
