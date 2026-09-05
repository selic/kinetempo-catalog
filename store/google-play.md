# Google Play Console — listing and declarations

## Identity
- **App name (30):** Kinetempo
- **Short description (80):** Physio exercise timer: steps, sounds and a lock-screen countdown that keep going.
- **Package:** net.defency.kinetempo · **Category:** Health & Fitness · **Free**, no ads, no in-app purchases
- **Contact:** es@defency.net · **Privacy policy:** https://selic.github.io/kinetempo-catalog/privacy.html
- **Content rating (IARC):** Utility/Productivity/Communication questionnaire → all "No" → Everyone.

## Full description (EN)
(Use the EN description from app-store.md, replacing "Live Activity / Dynamic Island" with "an ongoing notification with a live countdown (Live Updates on Android 16)".)

## Data safety
- Does your app collect or share any of the required user data types? **No.**
- Data encrypted in transit: Yes (HTTPS only). Data deletion: uninstall removes everything.
- No third-party SDKs that collect data.

## Permissions / declarations
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` — **Foreground service declaration:** type *mediaPlayback*.
  Purpose: "The timer plays audible cues at every step change while the screen is off; the foreground service keeps the audio and the countdown notification running during a session started by the user, and stops when the session ends." Provide a short screen recording: start an exercise → lock the phone → notification with countdown → cues audible.
- `POST_NOTIFICATIONS` — runtime prompt before the first session.
- `POST_PROMOTED_NOTIFICATIONS` (Android 16) — Live Updates chip for the running timer.
- `WAKE_LOCK`, `VIBRATE` — partial wake lock during a session; vibration on step change.
- Camera — QR import only. Photos/videos — via the system picker (no broad media permission).

## Health apps policy
The app is a timer; it does not provide diagnosis or treatment and does not handle health records. The catalog content is user/clinic-published and labelled as not medical advice (see Terms).

## Release checklist
- App signing by Google Play → copy the SHA-256 into `site/.well-known/assetlinks.json`.
- Internal testing track first (EAS `preview` profile, `.apk`), then closed testing (`.aab` via `eas build --profile production`).
- Screenshots: phone 16:9 or 9:16, at least 4; feature graphic 1024×500.
