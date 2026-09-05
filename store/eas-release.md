# Release runbook (EAS)

```bash
pnpm dlx eas-cli@latest login
eas init                                # links the project (Expo account)
eas build --profile production --platform ios      # App Store build (uses ASC API key or Apple login)
eas submit --platform ios --latest
eas build --profile production --platform android  # .aab
eas submit --platform android --latest             # needs a Play service-account JSON
```

Before the first store build:
1. Bump `version` in app.config.ts; EAS auto-increments build numbers (`autoIncrement: true`).
2. Register the domain and set `CNAME` in kinetempo-catalog so privacy/support URLs are permanent.
3. Replace placeholder icon/splash (assets/images) with final artwork (1024×1024 icon, no alpha).
4. App Store Connect: create the app record, fill the data from `store/app-store.md`, upload screenshots.
5. Play Console: create the app, complete Data safety and the Foreground service declaration from `store/google-play.md`.
