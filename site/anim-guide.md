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
4. **Hand it over.** If your code tool can produce a file the person downloads,
   write the whole document to `<name>.kinetempo.json` and give them that: the
   app takes it under **Import → Import from file**, and a file is carried by
   the tool rather than retyped by you, so nothing can drift on the way.
   Otherwise hand back the link, checked first — see the section below. Give the
   plain `https://` form: a `kinetempo://` address is not tappable in most chat
   apps, and the page it opens carries the exercise in the address itself,
   uploading nothing. Tell them to open it on the phone that has Kinetempo
   installed and press **Open in Kinetempo** there.
5. **Say what the figure does**, in one or two sentences.

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
  "animation": {
    "v": 1,
    "orientation": "supine",
    "tracks": [
      { "when": { "tone": "lift" },    "keys": [{ "t": 0, "hip": 0 },  { "t": 1, "hip": 45 }] },
      { "when": { "tone": "hold" },    "keys": [{ "t": 0, "hip": 45 }, { "t": 1, "hip": 45 }] },
      { "when": { "tone": "release" }, "keys": [{ "t": 0, "hip": 45 }, { "t": 1, "hip": 0 }] }
    ]
  }
}
```

`tracks` must hold at least one track, and the angles sit on the keyframe itself
— there is no `pose` object around them. An empty array is not "no animation
yet": the app rejects the whole document for it, and the person is handed a link
that does not open.

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

If your code tool runs **Python** instead, use this one. It writes the same kind
of link.

```python
import json, time, datetime

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
    # Stored DEFLATE blocks: no compression, so the JSON is still readable inside
    # the payload. That is on purpose — see below.
    data = json.dumps(doc, separators=(',', ':')).encode()
    raw = bytearray()
    i = 0
    while True:
        n = min(65535, len(data) - i)
        nlen = 0xFFFF ^ n
        raw += bytes([1 if i + n >= len(data) else 0, n & 255, n >> 8, nlen & 255, nlen >> 8])
        raw += data[i:i + n]
        i += n
        if i >= len(data):
            break
    out = ''
    for i in range(0, len(raw), 3):
        a = raw[i]
        b = raw[i + 1] if i + 1 < len(raw) else None
        d = raw[i + 2] if i + 2 < len(raw) else None
        out += B64[a >> 2] + B64[((a & 3) << 4) | ((b or 0) >> 4)]
        if b is not None:
            out += B64[((b & 15) << 2) | ((d or 0) >> 6)]
        if d is not None:
            out += B64[d & 63]
    return 'https://selic.github.io/kinetempo-catalog/s/#' + out
```

### How long a link may be, and which encoder to use

**A tapped link has to stay under about 2000 characters.** Beyond that the
address is cut off before the app ever sees it, and the app reports a damaged
link. Measured on iOS: a 2014-character link opens, a 2048-character one does
not; treat it as the ceiling everywhere. This is the only size limit that
matters, and it is on the *link*, not on the exercise.

The document's own size is not a limit. A 2813-byte document imported without
complaint through a 590-character compressed link. So the question is only ever
how many characters the link comes out to:

| | payload | one exercise with an animation |
|---|---|---|
| stored (both encoders above) | about 4 characters per 3 bytes of JSON | ~1900 characters |
| compressed (`zlib.compressobj(9, zlib.DEFLATED, -15)`) | roughly half of that or less | ~700 characters |

So: **stored while the JSON stays under ~1400 bytes**, which covers one exercise
written tersely. Past that the stored link crosses 2000 characters and stops
working, and the choice is to compress, to trim the draft, or — best — to hand
over the document as a file, where no limit applies at all.

Compressed is the fragile form: one wrong character a few hundred in turns
everything after it into shuffled fragments of the exercise, which is what
happens when a payload is retyped into a reply instead of carried across. In a
stored payload every four characters stand for three characters of the JSON and
nothing else, so a slip costs three letters — a misspelt label, or a loud
failure — and the link can be read and repaired by hand. Compress only when the
length forces it, and then be certain the payload reaches the person exactly as
printed.

A QR code is not subject to the 2000-character ceiling: the camera hands the
payload straight to the app without going through the operating system's URL
opening. Its own limit is about 2800 characters.

**Keep the document small** — it is what keeps you inside the ceiling:

- `json.dumps(doc, separators=(',', ':'), ensure_ascii=False)`. Without
  `ensure_ascii=False` every Cyrillic letter becomes `\uXXXX` and the document
  roughly triples.
- Description to a couple of sentences, step labels to a word or two.
- Drop `idle` when the first track already starts from the neutral pose, and
  `ground` when the default suits.
- Leave out joints that stay at 0 through a whole track, and `highlight` values
  that only repeat the previous key.
- One pair of keyframes per phase, not a raster of them.

**The limits the app actually enforces**, none of which is about size: at most 12
tracks, at most 24 keys in a track, angles within ±200°, at most 20 steps, name
up to 120 characters, description up to 4000. Break one of those and the whole
document is refused, animation and all — a spec with thirteen tracks does not
lose a track, it loses the exercise.

## Check the link before you hand it over

**Decode the link exactly as you are about to send it, not the variable that
holds it.** Copy the string out of your message draft, paste it back into your
code tool, and decode that. This is the whole point of the check: the encoder is
rarely wrong, and what breaks links is the payload being retyped rather than
carried across verbatim. Two hundred characters in, one wrong letter, and the
rest of the exercise decompresses into rubble — a link that looks perfectly
normal and fails later, on someone's phone, where you cannot see it happen.

```python
import base64, hashlib, json, zlib
sent = '…paste here the link exactly as it stands in your draft message…'
payload = sent.split('#', 1)[1]
assert len(payload) == LENGTH, 'characters were lost or added'
assert hashlib.sha256(payload.encode()).hexdigest()[:8] == FINGERPRINT, 'a character changed'
back = json.loads(zlib.decompress(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)), -15))
assert back['exercises'][0]['name'] == draft['name']
assert len(back['exercises'][0]['steps']) == len(draft['steps'])
```

`LENGTH` and `FINGERPRINT` are the two numbers the encoder printed. They are the
part that cannot be faked: a check that re-runs the encoder and decodes its fresh
output passes every time and proves nothing, because it never looks at the text
you are actually sending.

```js
const sent = '…paste here the link exactly as it stands in your draft message…';
const payload = sent.split('#')[1];
if (payload.length !== LENGTH) throw new Error('characters were lost or added');
const bin = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
const back = JSON.parse(await new Response(stream).text());
if (back.exercises[0].name !== draft.name) throw new Error('the link does not hold the draft');
if (back.exercises[0].steps.length !== draft.steps.length) throw new Error('the link does not hold the draft');
```

The stored-block encoder above writes no compressed data, so its links decode
the same way — `DecompressionStream` reads them too.

If the check throws — or if handing the link over would mean typing the payload
out rather than passing the exact text through — do not send a link at all. Give
the animation JSON instead (see the last section): it is longer, but it is text
a person can read, and a slip in it fails loudly rather than turning the whole
exercise to noise.

Check the draft itself too: every joint name is from the table above, every `t`
is between 0 and 1, no angle is absurd, and the body position matches the
exercise.

## If you cannot run code

Give the person the `animation` object alone, as JSON in a code block, and tell
them: open the exercise in Kinetempo, go to **Animation → Generated**, and paste
it there. That works just as well — the link is only a convenience.
