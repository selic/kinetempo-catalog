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

## The animation itself

The rig, the angle conventions, the body positions, the traps that catch people
and the `AnimSpec` format all live in one place — read it before writing the
`animation` field:

**https://selic.github.io/kinetempo-catalog/animation-only.md**

That page ends by telling you to hand back the JSON on its own. Here you do not:
the JSON goes into the draft above, and what you hand over is the link built
below.

## Building the link

Run this in your code tool with the draft object. Use the version that matches
the language your tool runs — JavaScript below, Python after it. Both produce
the same kind of link. Do not modify them, and do not try to produce a link by
hand: it is a compressed binary payload, not something you can assemble in your
head.

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

If your code tool runs **Python** instead, use this. It compresses properly,
because Python has zlib built in where a browser JavaScript sandbox does not, so
the links come out roughly half as long.

```python
import json, zlib, time, datetime

def kinetempo_link(draft):
    B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    steps = draft['steps']
    active = next((s for s in steps if s['tone'] != 'rest'), steps[0])
    rest = next((s for s in steps if s['tone'] == 'rest'), None)
    doc = {
        'kind': 'kinetempo.exercise', 'schemaVersion': 1, 'app': 'kinetempo', 'exportedAt': now,
        'exercises': [{
            'id': 'gen-' + format(int(time.time() * 1000), 'x'),
            'name': draft['name'],
            'description': draft.get('description', ''),
            'steps': steps,
            'animation': {'kind': 'spec', 'spec': draft['animation']},
            'workMs': max(1, active['durationMs']),
            'restMs': rest['durationMs'] if rest else 0,
            'reps': draft['reps'], 'sets': draft.get('sets', 1), 'setRestMs': draft.get('setRestMs', 0),
            'updatedAt': now,
        }],
    }
    c = zlib.compressobj(9, zlib.DEFLATED, -15)  # -15 = raw DEFLATE, the format the app decodes
    data = c.compress(json.dumps(doc, separators=(',', ':')).encode()) + c.flush()
    out = ''
    for i in range(0, len(data), 3):
        a = data[i]
        b = data[i + 1] if i + 1 < len(data) else None
        d = data[i + 2] if i + 2 < len(data) else None
        out += B64[a >> 2] + B64[((a & 3) << 4) | ((b or 0) >> 4)]
        if b is not None:
            out += B64[((b & 15) << 2) | ((d or 0) >> 6)]
        if d is not None:
            out += B64[d & 63]
    return 'https://selic.github.io/kinetempo-catalog/s/#' + out
```

Before you hand the link over, check the draft yourself: every joint name is
from the table above, every `t` is between 0 and 1, no angle is absurd, and the
body position matches the exercise.

## If you cannot run code

Give the person the `animation` object alone, as JSON in a code block, and tell
them: open the exercise in Kinetempo, go to **Animation → Generated**, and paste
it there. That works just as well — the link is only a convenience.
