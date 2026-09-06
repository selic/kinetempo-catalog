# Drawing a Kinetempo exercise animation

You are drawing the moving figure for one exercise that someone already has in
Kinetempo — an interval timer for rehab and training. Hand back the animation as
JSON. Nothing else: no link, no exercise, no timings. They have those already.

Reply in whatever language the person is writing in.

## What an animation actually is here

Kinetempo does not play a video. It draws a schematic side-view figure from joint
angles, and an animation is a small JSON document — an **AnimSpec** — saying
which joints move, how far, and during which phase of the timer. That is why you
can write one out as text, and why no code, no drawing tool and no file is
involved.

## Workflow

1. **Find out what the movement is.** Position of the body, which joints move,
   roughly how far, and in what order. The person will usually have told you the
   exercise name and the steps of one repetition; ask only what you genuinely
   cannot infer from a well-known movement.
2. **Match the tracks to their steps.** The steps they gave you are the phases
   the animation is driven by: a `when.tone` track for each named tone, or
   `when.step` for movements that alternate out and back.
3. **Write the spec** using the reference below.
4. **Check it** against the traps and, when the movement is unusual, in the live
   preview linked at the end.
5. **Hand back the JSON in a single code block**, plus one sentence saying what
   the figure does. Tell them to paste it into the exercise under
   **Animation → Generated**.

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

## Checking your work

The rig has a live preview where a spec can be pasted and scrubbed frame by
frame: https://claude.ai/code/artifact/cb042935-40ba-4ee6-84f0-48823b07bd69

Paste your JSON into its **Spec** box and press Render. Use it whenever a
movement is unusual, and whenever someone asks whether the animation looks
right — reviewing five frames beats guessing.

## Limits

- The figure is schematic and seen from the side: it conveys which way a joint
  moves, not anatomy. Rotation, abduction and anything needing a front view
  cannot be drawn.
- At most 12 tracks and 24 keyframes per track. That is plenty; if you are near
  it, the movement is being over-described.
- Every angle must be within ±200°, and every `t` between 0 and 1.

## What to hand over

Just the spec, like this — the outer `animation` wrapper and everything around it
belong to the app, not to your answer:

```json
{
  "v": 1,
  "orientation": "supine",
  "tracks": [{ "when": { "tone": "lift" }, "keys": [{ "t": 0, "hip": 0 }, { "t": 1, "hip": 35 }] }]
}
```

If they need a whole exercise rather than an animation for one they already have,
that is a different job: https://selic.github.io/kinetempo-catalog/anim-guide.md
