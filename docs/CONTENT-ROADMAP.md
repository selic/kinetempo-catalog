# Content roadmap — which base sets the catalog should ship

Research notes and a prioritised plan for filling this catalog with high-quality, evidence-backed
exercise sets. Written 2026-09-06. Companion to [AUTHORING.md](AUTHORING.md), which is the field-by-field
format reference; this document is about *what* to publish and *why*, not how to encode it.

## 1. Where the catalog stands

One exercise (`ankle-pumps`) and one program (`knee-rehab-weeks-1-5`), a single publisher (`selic`),
English only. Five built-in animations exist — `quadSets`, `heelSlides`, `straightLegRaise`, `heelProp`,
`anklePumps` — all supine, all from the same knee protocol. In other words: a working demo of one
clinical case, not yet a library.

## 2. How sets were chosen

1. **Timer-native first.** Kinetempo wins where the prescription *is* the time: isometric holds,
   eccentric tempo, stretch holds, positional tests, paced breathing. It loses to a rep counter where
   only volume matters. Every Tier 1 set below is one where a stopwatch is the treatment.
2. **Citable protocol, original wording.** Each set names a published protocol in `catalog.source`.
   Descriptions are written from scratch — no NHS / AAOS / booklet text is copied, in any language.
3. **Animatable in the current engine** — sagittal skeleton, orientations `supine | prone | sideLying |
   seated | standing`, props `chair | wall | band | crutch`. Sets that need new engine features are
   flagged rather than silently dropped (§6).
4. **Real demand** — back, neck/desk, knee, foot, shoulder, older-adult balance, pelvic floor, blood pressure.
5. **Three languages from day one** (§5).

## 3. Tier 1 — build these first

Six programs. None of them needs an engine change to be useful, and all six are protocols where the
timing is the point.

### 3.1 Achilles tendinopathy — eccentric heel drops (Alfredson)

3 × 15 with the knee straight plus 3 × 15 with the knee bent, twice a day, 12 weeks — 180 heel drops
a day. The controlled lowering is the intervention.

| step | tone | ms | label |
|---|---|---|---|
| 1 | `lift` | 2000 | Up on both feet |
| 2 | `release` | 3000 | Lower on the sore leg |
| 3 | `rest` | 2000 | |

`reps 15 · sets 3 · setRestMs 60000` → ≈ 7 min per exercise, ≈ 15 min per block.
Two exercises (straight / bent knee) in one program. Level `rehab`, bodyParts `ankle`, `calf`.
Animation: `standing` with ankle travel — the step edge has no prop yet, ship without it.
Source: Alfredson et al.; volume comparison in JOSPT 2014 (§8).

### 3.2 Plantar fasciitis — high-load heel raises (Rathleff)

The only protocol that beat plantar-specific stretching on pain and function at 3 months in an RCT.
The tempo is written into the protocol: 3 s up, 2 s pause, 3 s down, every other day, towel under the toes.

| step | tone | ms | label |
|---|---|---|---|
| 1 | `lift` | 3000 | Rise |
| 2 | `hold` | 2000 | Hold at the top |
| 3 | `release` | 3000 | Lower slowly |
| 4 | `rest` | 2000 | |

`reps 12 · sets 3 · setRestMs 60000`, progressing over weeks 12×3 → 10×4 → 8×5 with added load
(a loaded backpack). Level `rehab`, bodyParts `foot`, `calf`.

### 3.3 Lower back — core endurance holds (McGill-style big three)

Modified curl-up, side bridge, bird dog; 8–10 s holds with a descending pyramid of 6 → 4 → 2 reps and
20–30 s between rounds. Best showcase in the catalog for `items[].override.reps`: one exercise, three
program items with different rep counts.

Per rep: `squeeze 10000` + `rest 20000` (drop the trailing rest on the last rep — the engine does that
automatically). Level `beginner`, bodyParts `spine`, `core`.
Animation: curl-up (`supine` + `torso`) and side bridge (`sideLying`) are authorable today;
**bird dog needs a `quadruped` orientation** (§6) — ship it without an animation until then.

### 3.4 Neck and desk micro-breaks

The highest-volume search demand of the whole list. Three documents:

- **Cervical isometrics** — four directions, `squeeze 10000` / `rest 5000` per direction, labels
  "Forehead", "Back of the head", "Left", "Right", `reps 3` → ≈ 3 min.
- **Chin tuck** — 10 × 10 s holds, `squeeze 10000` / `rest 5000`.
- **3-minute micro-break** — upper trapezius and levator stretches, `timer 30000` × 2 per side,
  meant to be launched hourly.

Level `beginner`, bodyParts `neck`, `spine`. Animation: `seated`, `neck` and `torso` channels — fully
within the current engine, specs still need writing.

### 3.5 Blood pressure — isometric wall squat

A 2023 network meta-analysis of 270 RCTs (n ≈ 15 800) put isometric training ahead of aerobic, dynamic
resistance, combined and HIIT for resting blood pressure (−8.2 / −4.0 mmHg), with the wall squat the
best single sub-mode. Protocol: **4 × 2 min holds, 2 min recovery, 3 sessions a week** — 14 minutes.

`squeeze 120000` ("Hold the squat") · `reps 1 · sets 4 · setRestMs 120000`.

This is the strongest argument in the catalog for a precise timer — a rep counter cannot express it at
all. Prop `wall` already exists. The description must say: breathe normally, never hold your breath;
uncontrolled hypertension, recent cardiac events or a doctor's restriction mean asking first.
Level `beginner`, bodyParts `quadriceps`, tags `blood-pressure`, `isometric`.

### 3.6 Paced breathing — 6 breaths per minute, 15 minutes

`lift 5000` ("Breathe in") / `release 5000` ("Breathe out"), `reps 90`, `ticks: false` on both steps.
Meta-analysis evidence for −3.7…−8.0 mmHg systolic at 10–15 min a day. Add two short variants in the
same program family: box breathing 4-4-4-4 (`lift 4000 · hold 4000 · release 4000 · hold 4000`) and
4-7-8 before sleep (4 cycles). Needs almost no animation. Level `beginner`, bodyParts `breathing`.

## 4. Tier 2 and Tier 3

| # | Set | Dose | Animation |
|---|---|---|---|
| 1 | Knee osteoarthritis / patellofemoral pain | quad sets, SLR, wall sit, terminal knee extension | reuses 3 of the 5 built-ins — cheapest set to produce |
| 2 | Post-op knee, weeks 6–12 | continuation of the existing program | same built-ins |
| 3 | Balance and leg strength 65+ (Otago principles) | 30 s stances: feet together → semi-tandem → tandem → single leg; sit-to-stand; heel and toe raises; 3×/week | `standing` + prop `chair` |
| 4 | Shoulder — rotator cuff tendinopathy | isometrics 5 × 45 s, wall slides | `standing`, `shoulder` channel exists |
| 5 | Shoulder — frozen shoulder | pendulum 60 s, wall walks, sleeper stretch 30 s × 3 | prop `wall` |
| 6 | Pelvic floor | 8–12 holds of 6–8 s + 10 quick flicks, 3× a day, ≥ 3 months | none needed |

Pelvic floor is the underrated entry here: a large audience, pure hold-and-rest timing, three languages,
and near-zero production cost.

Tier 3, when there is slack: vestibular work (Brandt–Daroff, 30 s per position, twice daily — perfect
for the timer, but it needs a hard "only after a diagnosis" frame); wrist and hand tendon/nerve glides;
an ACSM-dosed stretch library (10–30 s × 2–4 reps, 60 s total per muscle group); Nordic hamstring and
FIFA 11+; and plain interval classics (Tabata 20/10, 30/30, EMOM) which extend the app beyond
physiotherapy for almost nothing.

## 5. Publishing conventions to settle before volume arrives

**Publisher.** Do not pile base content under `selic` — that publisher honestly says "personal protocols
transcribed from a clinic, not medical advice". Add `publishers/kinetempo/` (`type: organisation`,
`verified: true`) for curated base content, keep `selic` personal and `community` for outside pull requests.

**Three locales, one id.** The index de-duplicates on `id:locale` ([scripts/build-index.mjs](../scripts/build-index.mjs)),
and the app picks the best locale per id with an English fallback (`src/app/(tabs)/library.tsx`). So
translations must **share** the exercise/program id and differ only in the filename suffix:
`<slug>.en|ru|ro.kinetempo.json`. Tier 1 = 6 programs × 3 = 18 files, ≈ 20 exercises.

**Taxonomy.** `tags` and `bodyParts` are free strings today and the Library screen searches across them.
Fix the vocabulary in AUTHORING.md before there are 50 files, or the filters will drift. Proposed
`bodyParts`: `knee, hip, ankle, foot, shoulder, neck, spine, wrist, pelvic-floor, core, quadriceps,
hamstrings, calf, breathing`.

**Safety text.** Every `rehab`-level program needs a stop-signal sentence (sharp pain, swelling, fever)
and a "not medical advice / follow your own clinician" line. Patient-specific protocols must say so.

**Provenance.** Fill `catalog.source` on everything, `catalog.reviewedBy` whenever a clinician signs off,
and leave `catalog.license` at `CC-BY-4.0`.

**Schema limits worth remembering:** ≤ 20 steps per exercise, `durationMs` ≤ 1 h, `reps` ≤ 1000,
`sets` ≤ 100, ≤ 100 exercises per document, `description` ≤ 4000 chars, `label` ≤ 40 chars.

## 6. Animation engine gaps (app repo)

Ranked by how much content each unlocks:

1. **`quadruped` orientation** — bird dog, cat-camel, quadruped hip extension. Blocks part of §3.3.
2. **Frontal-plane channel (abduction)** — hip and shoulder abduction. `sideLying` exists but there is
   currently no angle to animate a side-lying leg raise with.
3. **Prop: step / box** — needed by §3.1 and §3.2 to look right.
4. **Prop: towel roll** — plantar work, knee props.

## 7. Licensing notes

- **GLA:D®** is a registered trademark of the University of Southern Denmark and requires registry
  participation. Do not reproduce it or use the name.
- **Otago**: the 1997 ACC manual is freely downloadable, but the modern booklets are © Later Life
  Training. Use our own wording, credit the programme in `source`, do not copy the booklets.
- **NHS / AAOS / clinic leaflets**: reference only, never copy — including in translation.
- **FIFA 11+**: a search result suggested CC-BY, but that appears to be the license of a review article
  rather than the programme itself. Verify at the source before publishing anything derived from it.

## 8. Sources

- Alfredson protocol, volume comparison — <https://www.jospt.org/doi/10.2519/jospt.2014.4720>
- Rathleff et al., high-load strength training for plantar fasciitis, 2015 — <https://pubmed.ncbi.nlm.nih.gov/25145882/>
- Exercise training and resting blood pressure, network meta-analysis of 270 RCTs — <https://pubmed.ncbi.nlm.nih.gov/37491419/>
- BMJ Group summary of the isometric finding — <https://bmjgroup.com/static-isometric-exercise-such-as-wall-sits-best-for-lowering-blood-pressure/>
- Slow breathing and hypertension — <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10844494/>
- Otago Exercise Programme manual (ACC) — <https://www.livestronger.org.nz/assets/Uploads/acc1162-otago-exercise-manual.pdf>
- Otago balance meta-analysis — <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8345836/>
- Deep cervical flexor training, systematic review — <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6263552/>
- McGill big three, progressions and pitfalls — <https://www.backfitpro.com/mastering-the-mcgill-big-three-progressions-variations-and-common-pitfalls/>
- Brandt–Daroff patient leaflet (UHS NHS) — <https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Audiology/Brandt-Daroff-exercises-to-treat-BPPV-2839-PIL.pdf>
- Pelvic floor exercises — <https://www.physio-pedia.com/Pelvic_Floor_Exercises>
- ACSM flexibility guidelines — <https://www.unm.edu/~lkravitz/Article%20folder/ACSMGuidelinesUNM.pdf>
- GLA:D terms — <https://gladinternational.org/glad-back/>
