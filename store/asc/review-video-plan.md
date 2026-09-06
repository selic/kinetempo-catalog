# App Review demo video — shot plan

For the 2.1 information request. Record on a real iPhone running **build 6** from
TestFlight, upload as an unlisted YouTube video, and put the link in the review
notes. One take is fine; a few cuts are fine too.

## Before recording

- Install build 6 from TestFlight and open it once, so the first-launch seeding
  and the notification prompt are already out of the way.
- **Language: English.** The reviewer reads English; the app follows the system
  language, so set the phone to English for the recording.
- Do Not Disturb on, no unread badges, battery above 50 %.
- Settings → Lock-screen widget: **on** (it is what segment 3 shows).
- Have Claude (or the Claude web page) installed and signed in — segment 5 opens it.
- Screen recording from Control Centre, microphone **off**. Narration is not
  needed; the review notes carry the words.
- Move slowly. iOS does not draw touches, so a fast tap reads as "nothing
  happened" to someone watching.

## Shot list (~100 seconds)

| # | Time | What is on screen | What it answers |
|---|------|-------------------|-----------------|
| 1 | 0:00–0:08 | App opens on **Exercises**. Scroll the list slowly, top to bottom. | What the app is. |
| 2 | 0:08–0:22 | **Programs** tab → open "Knee rehab — daily" → **Play**. Let the prep count down and run two or three phases: the figure moves, the colour changes per phase, the rep dots fill. | The core product: a timer that talks you through an exercise. |
| 3 | 0:22–0:34 | Press the side button to **lock the phone**. Hold on the lock screen for a good five seconds so the Live Activity countdown is visibly ticking. Unlock back into the session. | The Live Activity, and that the session survives the lock screen. |
| 4 | 0:34–0:44 | Tap **Skip** → the confirmation appears → **Skip** → the next exercise starts. Then **Pause**, then **Reset**. | The controls, and that nothing destructive happens without a question. |
| 5 | 0:44–1:10 | Back to **Exercises** → **+** → **New exercise** → **Claude**. Claude opens with the request already written. Send it. Claude replies with a link. Tap the link → the app opens its **Import** preview → **Import** → the new exercise is in the list with a figure → open it → **Play** for two seconds. | **The segment that matters.** It shows exactly what "create with an assistant" means: the app hands a prompt to a chat app, the chat hands back a link, the app imports it. No hidden content, no code downloaded, nothing executed. |
| 6 | 1:10–1:20 | **+** → **New exercise** → **Copy prompt** → then open the editor of any exercise and show the **paste JSON** field. Paste is not required — just show the field. | The same flow without leaving for an assistant app: the user can paste the answer as text. |
| 7 | 1:20–1:30 | **Library** tab → scroll → open one entry → import it. | The built-in catalogue is curated content shipped with the app, not user-generated. |
| 8 | 1:30–1:40 | Open any exercise → share icon → **Copy link**, **Show QR**. Do **not** tap "Send to the catalog". | How people share a programme (a link that encodes the exercise itself, no server involved). |
| 9 | 1:40–1:45 | **Settings** tab, scroll through once. | No account, no sign-in, nothing to buy. |

## While you are there

Take one **lock-screen screenshot** during segment 3 — the store set is missing
it, because the simulator renders the Live Activity countdown as dashes. Any
recent iPhone screenshot will do; I will scale it to 1320×2868.

## What to write in the review notes

Point at the timestamps. Something like:

> The video shows the whole app. At 0:44 it shows the feature we expect the
> question is about: "New exercise → Claude" opens a chat app with a prompt
> already written. The assistant answers with a `kinetempo://` link. Opening it
> shows an import preview inside the app, and the user confirms. The link
> contains only the exercise's own data — name, step timings, and the joint
> angles of the stick figure — compressed into the URL. Nothing is downloaded
> and no code is executed. The same result can be pasted as plain text (1:10).
