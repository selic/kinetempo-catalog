# Making a Kinetempo exercise or programme

You are helping someone add an exercise — or a whole programme of them — with a
moving figure for each, to Kinetempo, an interval timer for rehab and training.
Follow this page and hand back one link, or one file when a programme outgrows a
link.

Reply in whatever language the person is writing in.

## What an animation actually is here

Kinetempo does not play a video. It draws a schematic side-view figure from
joint angles, and an animation is a small JSON document — an **AnimSpec** —
saying which joints move, how far, and during which phase of the timer. That is
why a whole exercise fits inside a link.

## Workflow

1. **Find out what is wanted** — one exercise, or a programme of several in
   order. Then, for each movement: position of the body, which joints move,
   roughly how far, in what order, and the timing. Ask only what you cannot
   reasonably infer — most exercises are well known. If they gave you steps and
   reps already, do not ask again.
2. **Write the draft** (shape below).
3. **Build the link** by running `kinetempo_link(draft)` — or
   `kinetempo_program_link(draft)` for a programme — from **Building the link**
   below in your code tool. It refuses anything the app would refuse, so
   read what it says rather than working around it. Never write a payload by hand.
4. **Check what you are about to send.** Draft the reply, then copy the link out
   of the draft and run `check_link` on that text. Keep correcting and checking
   until it returns `None`. This is not optional: it is the step that catches the
   one way these links actually break.
5. **Hand it over.** Give the plain `https://` form: a `kinetempo://` address is
   not tappable in most chat apps, and the page it opens carries the exercise in
   the address itself, uploading nothing. Tell them to open it on the phone that
   has Kinetempo installed and press **Open in Kinetempo** there. If the link
   came out too long — or if your tool can hand over files and you would rather
   not risk the copy at all — write the document to `<name>.kinetempo.json`
   instead: **Import → Import from file** takes it at any size.
6. **Say what the figure does**, in one or two sentences.

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

### A programme of several exercises

When the ask is a plan rather than a single movement — "four exercises for my
knee", "a week one" — build a programme. It is the same drafts in a list, plus
the order and the rests between them:

```python
draft = {
    'name': 'Knee: week one',
    'description': 'Four exercises, in this order.',
    'restBetweenMs': 30000,          # the pause between exercises; 15000 if you leave it out
    'exercises': [
        {**straight_leg_raise, 'restAfterMs': 45000},   # this one gets a longer pause after it
        heel_slide,
        glute_bridge,
        wall_squat,
    ],
}
link, doc = kinetempo_program_link(draft)
```

Each entry is exactly the draft described above — steps, reps, sets, animation —
and `restAfterMs` on one of them overrides the programme's own pause after that
exercise. The app imports the exercises and the programme together, in the order
you list them.

**Never hand over several exercises in one document as a substitute for a
programme.** A document without a `complex` block imports as loose exercises,
however many it holds: they land in the Exercises tab one by one, in no order,
with nothing tying them together, and the person has to assemble the programme
by hand. If a programme is what was asked for, `kinetempo_program_link` is the
only thing that produces one — and when it raises `LinkTooLong`, the answer is
the file, not a document of loose exercises.

Do not write the `id` fields yourself. The builder generates them and points the
programme's items at them; an item naming an exercise that is not in the same
document imports as a hole in the programme, and `check_document` refuses it
before that can happen.

**Expect a file rather than a link.** Every animation is carried in full, so a
programme outgrows the address quickly: three small animations came to an
825-character link, four detailed ones to about 1900 — already at the edge. When
`kinetempo_program_link` raises `LinkTooLong`, write `e.document` to
`<name>.kinetempo.json` and hand that over; **Import → Import from file** takes a
programme the same way it takes an exercise, at any size.

## The animation itself

Everything needed to write the `animation` field is below — the rig, the angle
conventions, the body positions, the traps and the `AnimSpec` format. It is the
same reference served on its own at
`https://selic.github.io/kinetempo-catalog/animation-only.md`, for the case where
someone only wants an animation for an exercise they already have. You do not
need to fetch it: it is inlined here, so this page is the only one you have to
read.

<!--#include animation-only.md#rig — inlined at build time from site/animation-only.md -->

## Building the link

Run this in your code tool with the draft. It builds the document, refuses
anything the app would refuse, compresses it and hands back a link — together
with the document, so that when the link comes out too long you can write a file
instead. Do not modify it, and never assemble a payload by hand: it is a
compressed binary blob, not something that can be written out.

The whole exercise rides in the fragment after `#`, which browsers never send to
a server — the page reads it locally and offers to open the app.

```python
"""Build a Kinetempo link, and check it the way the app does."""
import base64, json, time, datetime, zlib

B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
LINK_LIMIT = 2000           # a longer address is cut off before the app sees it
TONES = ('squeeze', 'lift', 'hold', 'release', 'move', 'timer', 'rest')
TRACK_TONES = TONES + ('prep', 'setRest', 'exerciseRest')
JOINTS = ('torso', 'neck', 'hip', 'knee', 'ankle', 'shoulder', 'elbow',
          'hipFar', 'kneeFar', 'ankleFar', 'shoulderFar', 'elbowFar')
MUSCLES = ('quad', 'hamstring', 'glute', 'calf', 'abs', 'chest', 'back', 'shoulder', 'biceps')
PROPS = ('none', 'pillowUnderHeel', 'chair', 'wall', 'band', 'crutch')


class LinkTooLong(Exception):
    """The document is fine, the address is not. `.document` is what to write to a file."""
    def __init__(self, length, document):
        super().__init__(f'link is {length} characters, over the {LINK_LIMIT} an address survives')
        self.length, self.document = length, document


def check_document(doc):
    """Every rule the app enforces. Returns a list of problems; empty means it will import."""
    bad = []
    def want(cond, msg):
        if not cond: bad.append(msg)

    want(doc.get('kind') in ('kinetempo.exercise', 'kinetempo.complex'), 'kind must name a Kinetempo document')
    want(doc.get('schemaVersion') == 1, 'schemaVersion must be 1')
    want(doc.get('app') == 'kinetempo', 'app must be "kinetempo"')
    want(isinstance(doc.get('exportedAt'), str) and len(doc['exportedAt']) <= 40, 'exportedAt must be a short ISO string')
    exercises = doc.get('exercises')
    want(isinstance(exercises, list) and 1 <= len(exercises) <= 100, 'exercises must hold 1 to 100 entries')
    for i, e in enumerate(exercises if isinstance(exercises, list) else []):
        at = f'exercises[{i}]'
        want(isinstance(e.get('id'), str) and 1 <= len(e['id']) <= 64, f'{at}.id')
        want(isinstance(e.get('name'), str) and 1 <= len(e['name']) <= 120, f'{at}.name: 1 to 120 characters')
        want(len(e.get('description', '')) <= 4000, f'{at}.description: at most 4000 characters')
        want(isinstance(e.get('updatedAt'), str) and len(e['updatedAt']) <= 40, f'{at}.updatedAt')
        want(isinstance(e.get('workMs'), int) and 0 < e['workMs'] <= 3_600_000, f'{at}.workMs: above zero, at most an hour')
        want(isinstance(e.get('restMs'), int) and 0 <= e['restMs'] <= 3_600_000, f'{at}.restMs')
        want(isinstance(e.get('reps'), int) and 0 < e['reps'] <= 1000, f'{at}.reps: 1 to 1000')
        want(isinstance(e.get('sets', 1), int) and 0 < e.get('sets', 1) <= 100, f'{at}.sets: 1 to 100')
        want(isinstance(e.get('setRestMs', 0), int) and 0 <= e.get('setRestMs', 0) <= 3_600_000, f'{at}.setRestMs')
        steps = e.get('steps')
        if steps is not None:
            want(isinstance(steps, list) and 1 <= len(steps) <= 20, f'{at}.steps: 1 to 20 of them')
            for j, s in enumerate(steps if isinstance(steps, list) else []):
                want(s.get('tone') in TONES, f'{at}.steps[{j}].tone: one of {", ".join(TONES)}')
                want(isinstance(s.get('durationMs'), int) and 0 <= s['durationMs'] <= 3_600_000, f'{at}.steps[{j}].durationMs')
                want(len(s.get('label', '')) <= 40, f'{at}.steps[{j}].label: at most 40 characters')
            want(any(s.get('tone') != 'rest' and s.get('durationMs', 0) > 0 for s in steps),
                 f'{at}.steps: needs one active step longer than zero, or the session cannot be built')
        anim = e.get('animation')
        if isinstance(anim, dict) and anim.get('kind') == 'spec':
            bad += check_spec(anim.get('spec'), f'{at}.animation.spec')
        elif isinstance(anim, dict):
            want(anim.get('kind') in ('builtin', 'url') and isinstance(anim.get('ref'), str), f'{at}.animation')

    programme = doc.get('complex')
    want(bool(programme) == (doc.get('kind') == 'kinetempo.complex'),
         'a programme needs kind "kinetempo.complex" and a "complex" block — one without the other is a document of loose exercises')
    if isinstance(programme, dict):
        ids = {e.get('id') for e in exercises if isinstance(e, dict)}
        want(isinstance(programme.get('id'), str) and 1 <= len(programme['id']) <= 64, 'complex.id')
        want(isinstance(programme.get('name'), str) and 1 <= len(programme['name']) <= 120, 'complex.name: 1 to 120 characters')
        want(len(programme.get('description', '')) <= 4000, 'complex.description: at most 4000 characters')
        want(isinstance(programme.get('updatedAt'), str) and len(programme['updatedAt']) <= 40, 'complex.updatedAt')
        want(isinstance(programme.get('restBetweenMs', 0), int) and 0 <= programme.get('restBetweenMs', 0) <= 3_600_000, 'complex.restBetweenMs')
        items = programme.get('items')
        want(isinstance(items, list) and 1 <= len(items) <= 100, 'complex.items: 1 to 100 of them')
        for i, it in enumerate(items if isinstance(items, list) else []):
            at = f'complex.items[{i}]'
            # The app looks each id up among the exercises in the same document. One that
            # is not there imports as an item pointing at nothing, and the programme
            # cannot be played.
            want(it.get('exerciseId') in ids, f'{at}.exerciseId: "{it.get("exerciseId")}" is not one of the exercises in this document')
            rest = it.get('restAfterMs')
            want(rest is None or (isinstance(rest, int) and 0 <= rest <= 3_600_000), f'{at}.restAfterMs: milliseconds, or null to use the programme default')
            ov = it.get('override')
            if isinstance(ov, dict):
                for field in ('reps', 'sets'):
                    if field in ov:
                        want(isinstance(ov[field], int) and ov[field] > 0, f'{at}.override.{field}')
                if 'setRestMs' in ov:
                    want(isinstance(ov['setRestMs'], int) and ov['setRestMs'] >= 0, f'{at}.override.setRestMs')
                if 'steps' in ov:
                    want(isinstance(ov['steps'], list) and 1 <= len(ov['steps']) <= 20, f'{at}.override.steps')
    return bad


def check_spec(spec, at):
    bad = []
    def want(cond, msg):
        if not cond: bad.append(msg)
    if not isinstance(spec, dict):
        return [f'{at}: missing']
    want(spec.get('v') == 1, f'{at}.v must be 1')
    want(spec.get('orientation') in ('supine', 'prone', 'sideLying', 'seated', 'standing'), f'{at}.orientation')
    want(spec.get('ground', 'floor') in ('bed', 'floor', 'none'), f'{at}.ground')
    want(spec.get('prop', 'none') in PROPS, f'{at}.prop')

    def keys(ks, kat):
        want(isinstance(ks, list) and 1 <= len(ks) <= 24, f'{kat}: 1 to 24 keyframes')
        for j, k in enumerate(ks if isinstance(ks, list) else []):
            want(isinstance(k.get('t'), (int, float)) and 0 <= k['t'] <= 1, f'{kat}[{j}].t must be between 0 and 1')
            want(k.get('ease', 'inOut') in ('linear', 'in', 'out', 'inOut'), f'{kat}[{j}].ease')
            for name, v in k.items():
                if name in ('t', 'ease', 'highlight', 'arrow', 'prop'):
                    continue
                want(name in JOINTS, f'{kat}[{j}].{name}: not a joint — use {", ".join(JOINTS)}')
                want(isinstance(v, (int, float)) and -200 <= v <= 200, f'{kat}[{j}].{name}: keep the angle within ±200°')
            for m, v in (k.get('highlight') or {}).items():
                want(m in MUSCLES, f'{kat}[{j}].highlight.{m}: not a muscle')
                want(isinstance(v, (int, float)) and 0 <= v <= 1, f'{kat}[{j}].highlight.{m}: 0 to 1')
            arrow = k.get('arrow')
            if isinstance(arrow, dict):
                want(arrow.get('at') in ('foot', 'knee', 'hip', 'hand', 'torso'), f'{kat}[{j}].arrow.at')
                want(arrow.get('dir') in ('up', 'down', 'left', 'right'), f'{kat}[{j}].arrow.dir')

    if 'idle' in spec:
        keys(spec['idle'], f'{at}.idle')
    if 'tracks' in spec:
        tracks = spec['tracks']
        want(isinstance(tracks, list) and 1 <= len(tracks) <= 12, f'{at}.tracks: 1 to 12 of them, and never an empty list')
        for i, tr in enumerate(tracks if isinstance(tracks, list) else []):
            when = tr.get('when', {})
            if 'tone' in when:
                for t in (when['tone'] if isinstance(when['tone'], list) else [when['tone']]):
                    want(t in TRACK_TONES, f'{at}.tracks[{i}].when.tone: {t} is not a tone')
            if 'step' in when:
                st = when['step']
                want(st in ('even', 'odd') or (isinstance(st, int) and 0 <= st <= 19), f'{at}.tracks[{i}].when.step')
            keys(tr.get('keys'), f'{at}.tracks[{i}].keys')
    return bad


def b64url(data):
    out = ''
    for i in range(0, len(data), 3):
        a = data[i]
        b = data[i + 1] if i + 1 < len(data) else None
        c = data[i + 2] if i + 2 < len(data) else None
        out += B64[a >> 2] + B64[((a & 3) << 4) | ((b or 0) >> 4)]
        if b is not None:
            out += B64[((b & 15) << 2) | ((c or 0) >> 6)]
        if c is not None:
            out += B64[c & 63]
    return out


def decode(payload):
    """What the app does with the fragment: base64url, raw inflate, JSON."""
    raw = base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4))
    return json.loads(zlib.decompress(raw, -15))


def exercise_entry(draft, now, suffix=''):
    steps = draft['steps']
    active = next((s for s in steps if s['tone'] != 'rest'), steps[0])
    rest = next((s for s in steps if s['tone'] == 'rest'), None)
    return {
        'id': 'gen-' + format(int(time.time() * 1000), 'x') + suffix,
        'name': draft['name'],
        'description': draft.get('description', ''),
        'steps': steps,
        'animation': {'kind': 'spec', 'spec': draft['animation']},
        'workMs': max(1, active['durationMs']),
        'restMs': rest['durationMs'] if rest else 0,
        'reps': draft['reps'], 'sets': draft.get('sets', 1), 'setRestMs': draft.get('setRestMs', 0),
        'updatedAt': now,
    }


def now_stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def document_for(draft):
    now = now_stamp()
    return {
        'kind': 'kinetempo.exercise', 'schemaVersion': 1, 'app': 'kinetempo', 'exportedAt': now,
        'exercises': [exercise_entry(draft, now)],
    }


def program_for(draft):
    """A programme: the exercises it is made of, plus the order and the rests between them."""
    now = now_stamp()
    entries = [exercise_entry(e, now, f'-{i}') for i, e in enumerate(draft['exercises'])]
    return {
        'kind': 'kinetempo.complex', 'schemaVersion': 1, 'app': 'kinetempo', 'exportedAt': now,
        'exercises': entries,
        'complex': {
            'id': 'gen-' + format(int(time.time() * 1000), 'x') + '-p',
            'name': draft['name'],
            'description': draft.get('description', ''),
            # The pause the app puts between two exercises unless an item says otherwise.
            'restBetweenMs': draft.get('restBetweenMs', 15000),
            'items': [
                {'exerciseId': entry['id'], **({'restAfterMs': e['restAfterMs']} if 'restAfterMs' in e else {})}
                for entry, e in zip(entries, draft['exercises'])
            ],
            'updatedAt': now,
        },
    }


def kinetempo_link(draft):
    """Returns (link, document). Raises ValueError with the app's own complaints, or LinkTooLong."""
    return link_for(document_for(draft))


def kinetempo_program_link(draft):
    """The same for a whole programme. Expect LinkTooLong past two or three animations."""
    return link_for(program_for(draft))


def link_for(doc):
    problems = check_document(doc)
    if problems:
        raise ValueError('the app would refuse this document:\n- ' + '\n- '.join(problems))
    data = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    c = zlib.compressobj(9, zlib.DEFLATED, -15)     # -15 = raw DEFLATE, the format the app inflates
    payload = b64url(c.compress(data) + c.flush())
    if decode(payload) != doc:
        raise AssertionError('the payload does not decode back to the document — do not send it')
    link = 'https://selic.github.io/kinetempo-catalog/s/#' + payload
    if len(link) > LINK_LIMIT:
        raise LinkTooLong(len(link), doc)
    return link, doc


def check_link(sent, original):
    """
    Run this on the link as it stands in your draft reply — copy it out of the
    message, not out of the variable. Returns None when it will import, or what
    is wrong with it and where.
    """
    sent = sent.strip()
    if sent != original:
        for i, (a, b) in enumerate(zip(original, sent)):
            if a != b:
                return (f'character {i} changed on the way into the message: '
                        f'{b!r} where the encoder wrote {a!r} — near …{sent[max(0, i - 20):i + 20]}…')
        return f'the link is {len(sent)} characters, {len(original)} were written'
    try:
        doc = decode(sent.split('#', 1)[1])
    except Exception as e:
        return f'the payload does not decode: {e}'
    problems = check_document(doc)
    return None if not problems else 'the app would refuse it:\n- ' + '\n- '.join(problems)
```

Use it like this:

```python
from pathlib import Path

try:
    link, doc = kinetempo_link(draft)
    print(link)
except LinkTooLong as e:
    Path('exercise.kinetempo.json').write_text(json.dumps(e.document, ensure_ascii=False), encoding='utf8')
    # hand over that file instead: Import → Import from file takes it, at any size
```

### Then check the link you are about to send

A payload retyped into a reply rather than carried across is what breaks these
links in practice. One wrong character a few hundred in, and everything after it
decompresses into shuffled fragments of the exercise — deflate does not fail on
that, it happily reconstructs rubble.

So when the reply is drafted, copy the link **out of the message** and check that
text:

```python
problem = check_link('…paste the link from your draft here…', link)
```

- Returns `None` — send it.
- `character 344 changed…` — it names the position and the character the encoder
  wrote there. Fix that one character in the draft, or replace the whole link,
  and run the check again. Repeat until it returns `None`.
- `the payload does not decode` or a list of refusals — do not send the link at
  all; write the file instead.

Checking by re-running the encoder and decoding its fresh output proves nothing:
it passes every time while never looking at the text being sent.

### The numbers behind the limits

- **A tapped link is cut off past about 2000 characters** — measured on iOS, a
  2014-character link opens and a 2048-character one does not. This is the only
  size limit, and it is on the address, not on the exercise: a 2813-byte document
  imported without complaint through a 590-character link.
- Compression is what buys the room. A Russian description of 2000 characters
  still comes out as a 1591-character link; at the schema's own maximum of 4000
  the link reaches 2144 and `kinetempo_link` refuses it, which is when the file
  is the answer.
- A QR code is exempt: the camera hands the payload straight to the app without
  the operating system opening a URL. Its own limit is about 2800 characters.

### If your tool has no zlib

JavaScript sandboxes usually have no inflate. This encoder writes **stored**
DEFLATE blocks instead — valid DEFLATE that holds the JSON verbatim, so no
compression is involved. Its payload is about three times longer, which fits one
tersely written exercise and nothing more; the checks above still apply, and
`check_document` should be ported alongside it rather than skipped.

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
  // LEN counts BYTES of the JSON, not characters. They are the same in English
  // and differ on the first Cyrillic letter — two bytes each — and a header that
  // counts characters produces a link that decodes to rubbish.
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

One consolation for the stored form: because the JSON sits in it verbatim, a
damaged link can be read and repaired by hand. A compressed one cannot — it can
only be built again.

Check the draft itself too: every joint name is from the table above, every `t`
is between 0 and 1, no angle is absurd, and the body position matches the
exercise.


## If you cannot run code

Give the person the `animation` object alone, as JSON in a code block, and tell
them: open the exercise in Kinetempo, go to **Animation → Generated**, and paste
it there. That works just as well — the link is only a convenience.
