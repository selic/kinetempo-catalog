# Uploading build 1.0.0 (1) to App Store Connect

The archive and the signed `.ipa` are produced locally (no EAS needed):

```bash
cd ~/GitHub/kinetempo
pnpm expo prebuild --platform ios --no-install && (cd ios && LANG=en_US.UTF-8 pod install)
xcodebuild -workspace ios/Kinetempo.xcworkspace -scheme Kinetempo -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/Kinetempo.xcarchive \
  -allowProvisioningUpdates -derivedDataPath build/ios-derived archive
xcodebuild -exportArchive -archivePath build/Kinetempo.xcarchive \
  -exportOptionsPlist build/ExportOptions.plist -exportPath build/export -allowProvisioningUpdates
# → build/export/Kinetempo.ipa
```

## 1. Create the app record (once)
App Store Connect → My Apps → “+” → New App: platform iOS, name **Kinetempo**, primary language English (U.S.),
bundle ID `net.defency.kinetempo` (registered automatically by Xcode during the archive), SKU `kinetempo-ios`,
full access. Then fill everything from `store/app-store.md` (description, keywords, URLs, privacy answers,
age rating, review notes) and upload the screenshots from `store/screenshots/ios-6.9/` (6.9" display, 1320×2868).

## 2. Upload the build — pick one
**A. Transporter app (simplest):** open Transporter (Mac App Store), sign in with the Apple ID, drag `build/export/Kinetempo.ipa`, Deliver.

**B. altool with the App Store Connect API key** (key `AuthKey_2ZL3SN722C.p8` is in `~/GitHub/_apple`):
```bash
mkdir -p ~/.appstoreconnect/private_keys && cp ~/GitHub/_apple/AuthKey_2ZL3SN722C.p8 ~/.appstoreconnect/private_keys/
xcrun altool --upload-app -f ~/GitHub/kinetempo/build/export/Kinetempo.ipa -t ios \
  --apiKey 2ZL3SN722C --apiIssuer <ISSUER_ID>     # Issuer ID: App Store Connect → Users and Access → Integrations
```

**C. Xcode Organizer:** Window → Organizer → Archives → Kinetempo → Distribute App → App Store Connect → Upload.

## 3. After processing (10–30 min)
TestFlight → internal testers (yourself) → install and run the 5-minute locked-screen test once more.
Then App Store → 1.0 → select the build → Submit for Review. Export compliance: “No” (HTTPS only).

## Android (later)
`eas build --platform android --profile production` (needs an Expo account) or a local Gradle build once the Android SDK
is installed; then Play Console → create app → Data safety + foreground-service declaration from `store/google-play.md`.
