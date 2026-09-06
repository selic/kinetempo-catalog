# Making a Kinetempo exercise animation

You are helping someone add an exercise, with a moving figure, to Kinetempo — an
interval timer for rehab and training. Follow this page and hand back one link.

Reply in whatever language the person is writing in.

## What an animation actually is here

Kinetempo does not play a video. It draws a schematic side-view figure from
joint angles, and an animation is a small JSON document — an **AnimSpec** —
saying which joints move, how far, and during which phase of the timer. That is
why a whole exercise fits inside a link.

## Workflow

1. **Find out what the movement is.** Position of the body, which joints move,
   roughly how far, in what order, and the timing. Ask only what you cannot
   reasonably infer — most exercises are well known. If they gave you steps and
   reps already, do not ask again.
2. **Write the draft** (shape below).
3. **Build the link** by running the encoder at the end of this page in your code
   tool. Do not attempt it by hand.
4. **Hand back the link** plus one or two sentences on what the figure does.
   Tell them to open it on the phone that has Kinetempo installed and press
   **Open in Kinetempo** on the page it lands on. Hand over the plain `https://`
   link — a `kinetempo://` address is not tappable in most chat apps, and the
   page it opens carries the exercise in the address itself, uploading nothing.

## The draft

```json
{
  "name": "Straight-leg raise",
  "description": "Lock the knee, lift the whole leg, hold, lower slowly.",
  "steps": [
    { "tone": "squeeze", "durationMs": 2000, "label": "Lock the knee" },
    { "tone": "lift",    "durationMs": 2000 },
    { "tone": "hold",    "durationMs": 5000 },
    { "tone": "release", "durationMs": 3000 },
    { "tone": "rest",    "durationMs": 4000 }
  ],
  "reps": 10,
  "sets": 3,
  "setRestMs": 60000,
  "animation": { "v": 1, "orientation": "supine", "tracks": [] }
}
```

`steps` is **one repetition**. Tones are `squeeze`, `lift`, `hold`, `release`,
`move`, `timer`, `rest` — pick what the body is doing; the tone colours the
screen and chooses the sound. `rest` is the only passive one. Keep the
description under about 200 characters, or the link outgrows a QR code (it still
works when tapped).

## Joint angles — get the signs right

Every angle is **flexion in degrees, zero in the neutral pose**: body straight,
arms alongside the trunk, feet at a right angle to the shin. Positive is always
the direction the joint normally closes.

| Joint | Positive means | Usual range |
| --- | --- | --- |
| `hip` | thigh toward the chest | −20 (extension) … 120 |
| `knee` | heel toward the buttock | −5 … 140 |
| `ankle` | toes toward the shin | −40 … 25 |
| `shoulder` | arm raised toward the front | 0 … 180 (overhead) |
| `elbow` | hand toward the shoulder | 0 … 145 |
| `torso` | trunk curling forward | −20 … 90 |
| `neck` | chin toward the chest | −20 … 40 |

Add `Far` — `hipFar`, `kneeFar`, `ankleFar`, `shoulderFar`, `elbowFar` — for the
limbs on the other side. Left out, they copy the near side, which is what a
symmetric exercise wants. Name them only for one-sided work.

## Body position

| `orientation` | Drawn as | Watch out for |
| --- | --- | --- |
| `supine` | on the back, head left | Flexion lifts the leg toward the ceiling. |
| `prone` | face down, head left | Flexion presses into the bed — lift with **negative** `hip`. |
| `sideLying` | on the side, head left | Same layout as supine. |
| `seated` | hip at seat height | `hip: 90, knee: 90` puts the feet on the floor. |
| `standing` | upright, facing right | Anchored by the feet: bending the knees lowers the body. |

Optional `ground` is `bed`, `floor` or `none`, and defaults sensibly.

### Three traps

**A bent knee lying on the back needs hip flexion too**, or the shin swings down
through the bed. Either add `"constrain": { "heelOnGround": true }` and let the
rig solve the hip, or pair them by hand: `hip 29 / knee 60`, `hip 39 / knee 80`,
`hip 44 / knee 90`.

**Face down, point the toes.** The ankle is measured from a right angle to the
shin, so a neutral prone foot sticks into the mattress. Give a prone spec
`"base": { "ankle": -65 }`.

**Standing, the trunk tips with `torso`, not with `hip`.** The legs hang off the
trunk, so `hip` alone swings the leg forward — that is a standing leg raise. To
tip the body over planted feet, raise `torso` and match it with `hip`: a hinge is
about `torso: 72, hip: 87`. A squat adds `knee` on top. The rig lowers the body
by itself.

## The animation

```json
{
  "v": 1,
  "orientation": "supine",
  "base": { "ankle": 5 },
  "constrain": { "heelOnGround": true },
  "idle": [ { "t": 0, "knee": 0 }, { "t": 1, "knee": 90 } ],
  "tracks": [
    { "when": { "tone": "rest" }, "keys": [ { "t": 0, "knee": 0 } ] },
    { "when": { "step": "even" }, "keys": [
      { "t": 0, "knee": 0,  "arrow": { "at": "foot", "dir": "left" } },
      { "t": 1, "knee": 90 } ] },
    { "when": { "step": "odd" }, "keys": [
      { "t": 0, "knee": 90, "arrow": { "at": "foot", "dir": "right" } },
      { "t": 1, "knee": 0 } ] }
  ]
}
```

**Tracks** are matched against the running phase in order; the first match wins.
`when.tone` takes one tone or a list. `when.step` takes a step index, `"even"` or
`"odd"` — parity is how an out-and-back movement alternates. A track with no
`when` matches anything, so put it last.

**Keyframes** place angles at `t`, a fraction of the phase from 0 to 1. Each
joint is interpolated across only the keys that name it, so a joint that holds
still needs mentioning once or not at all. `ease` controls the approach to a key:
`inOut` (default), `linear`, `in`, `out`.

**`idle`** is the loop shown before the timer starts. Give one when the first
track does not read as the exercise.

**`base`** sets angles every track starts from. **`constrain.heelOnGround`**
solves hip flexion so the heel stays down — the difference between a heel
*slide* and a leg *raise*.

**`arrow`**: `{ "at": "foot" | "knee" | "hip" | "hand" | "torso", "dir": "up" | "down" | "left" | "right" }`.
Directions are **as drawn**: a lying figure has its head on the left, so `"left"`
is toward the head. One arrow at a time, only where the direction is not obvious.

**`highlight`**: `{ "quad": 1 }`, from 0 to 1 — tints the working segment. Use
`quad`, `hamstring`, `glute`, `calf`, `abs`, `chest`, `back`, `shoulder`,
`biceps`. Mark what the exercise is *for*, not everything involved.

**`prop`**: `none`, `pillowUnderHeel`, `chair`, `wall`, `band`, `crutch`.

Limits: at most 12 tracks, 24 keyframes per track, angles within ±200°.

## Two complete examples

### Lying on the back — straight-leg raise

```json
{
  "v": 1, "orientation": "supine",
  "idle": [ { "t": 0, "hip": 0 }, { "t": 1, "hip": 35 } ],
  "tracks": [
    { "when": { "tone": "squeeze" }, "keys": [ { "t": 0, "hip": 0, "knee": -3, "highlight": { "quad": 0.6 } }, { "t": 1, "highlight": { "quad": 1 } } ] },
    { "when": { "tone": "lift" },    "keys": [ { "t": 0, "hip": 0, "arrow": { "at": "foot", "dir": "up" }, "highlight": { "quad": 1 } }, { "t": 1, "hip": 35 } ] },
    { "when": { "tone": "hold" },    "keys": [ { "t": 0, "hip": 35, "highlight": { "quad": 1 } } ] },
    { "when": { "tone": "release" }, "keys": [ { "t": 0, "hip": 35, "arrow": { "at": "foot", "dir": "down" } }, { "t": 1, "hip": 0 } ] },
    { "keys": [ { "t": 0, "hip": 0, "highlight": { "quad": 0.1 } } ] }
  ]
}
```

### Standing — bodyweight squat

```json
{
  "v": 1, "orientation": "standing", "ground": "floor",
  "tracks": [
    { "when": { "step": 0 }, "keys": [
      { "t": 0, "torso": 0, "hip": 0, "knee": 0, "shoulder": 0, "arrow": { "at": "hip", "dir": "down" }, "highlight": { "quad": 0.2 } },
      { "t": 1, "torso": 28, "hip": 118, "knee": 105, "shoulder": 85, "elbow": 15, "highlight": { "quad": 1, "glute": 0.8 } } ] },
    { "when": { "tone": "hold" }, "keys": [ { "t": 0, "torso": 28, "hip": 118, "knee": 105, "shoulder": 85, "elbow": 15, "highlight": { "quad": 1, "glute": 0.8 } } ] },
    { "when": { "step": 2 }, "keys": [
      { "t": 0, "torso": 28, "hip": 118, "knee": 105, "shoulder": 85, "elbow": 15, "arrow": { "at": "hip", "dir": "up" }, "highlight": { "quad": 1, "glute": 1 } },
      { "t": 1, "torso": 0, "hip": 0, "knee": 0, "shoulder": 0, "elbow": 0, "highlight": { "quad": 0.2 } } ] },
    { "when": { "tone": "rest" }, "keys": [ { "t": 0, "torso": 0, "hip": 0, "knee": 0, "shoulder": 0, "elbow": 0 } ] }
  ]
}
```

## Building the link

Run this in your code tool with the draft object. It needs no libraries: the
payload is raw DEFLATE using stored blocks, which is exactly what the app
decodes. Do not modify it, and do not try to produce the link by hand.

The whole exercise rides in the fragment after `#`, which browsers never send to
a server — the page reads it locally and offers to open the app.

```js
function kinetempoLink(draft) {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const now = new Date().toISOString();
  const active = draft.steps.find((s) => s.tone !== 'rest') || draft.steps[0];
  const rest = draft.steps.find((s) => s.tone === 'rest');
  const doc = {
    kind: 'kinetempo.exercise', schemaVersion: 1, app: 'kinetempo', exportedAt: now,
    exercises: [{
      id: 'gen-' + Date.now().toString(36),
      name: draft.name,
      description: draft.description || '',
      steps: draft.steps,
      animation: { kind: 'spec', spec: draft.animation },
      workMs: Math.max(1, active.durationMs),
      restMs: rest ? rest.durationMs : 0,
      reps: draft.reps, sets: draft.sets || 1, setRestMs: draft.setRestMs || 0,
      updatedAt: now,
    }],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  const raw = [];
  let i = 0;
  do {
    const n = Math.min(65535, bytes.length - i);
    raw.push(i + n >= bytes.length ? 1 : 0, n & 255, n >> 8, ~n & 255, (~n >> 8) & 255);
    for (let k = 0; k < n; k++) raw.push(bytes[i + k]);
    i += n;
  } while (i < bytes.length);
  let payload = '';
  for (let j = 0; j < raw.length; j += 3) {
    const a = raw[j], b = raw[j + 1], c = raw[j + 2];
    payload += B64[a >> 2] + B64[((a & 3) << 4) | ((b === undefined ? 0 : b) >> 4)];
    if (b !== undefined) payload += B64[((b & 15) << 2) | ((c === undefined ? 0 : c) >> 6)];
    if (c !== undefined) payload += B64[c & 63];
  }
  return 'https://selic.github.io/kinetempo-catalog/s/#' + payload;
}
```

Before you hand the link over, check the draft yourself: every joint name is
from the table above, every `t` is between 0 and 1, no angle is absurd, and the
body position matches the exercise.

## If you cannot run code

Give the person the `animation` object alone, as JSON in a code block, and tell
them: open the exercise in Kinetempo, go to **Animation → Generated**, and paste
it there. That works just as well — the link is only a convenience.
