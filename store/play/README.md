# Google Play — listing assets

Captured from the **release** build (versionCode 2) on a Pixel 8 emulator, Android 16 (API 36).

| File | Use |
|---|---|
| `play-icon-512.png` | App icon (512×512, 32-bit PNG) |
| `play-feature-1024x500.png` | Feature graphic |
| `screenshots/*.png` | Phone screenshots, 1080×2400 (upload at least 4; the first four tell the story) |
| `../fgs-declaration-demo.mp4` | Video for the *Foreground service permissions* declaration |

Screenshot order: player during LIFT → LOCK THE KNEE → the countdown notification while the app is
in the background → LOWER SLOWLY → exercise with its animation → editor (presets and steps) →
imported program → public catalog (Library).

## Foreground service declaration

Type: **mediaPlayback**. Text to paste:

> Kinetempo is an exercise timer. When the user starts a session, a foreground service plays audible cues at
> every step change (squeeze / relax / lift / hold) and countdown ticks, and shows an ongoing notification with
> the current step and a live countdown. It must keep running while the screen is off because the user is
> exercising and cannot touch the phone. The service starts only on an explicit user action (Start) and stops
> when the session ends or the user taps Stop/Reset. It does not run in the background otherwise.
