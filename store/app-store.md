# App Store Connect — listing and review data

## Identity
- **Name:** Kinetempo
- **Subtitle (30):** Physio exercise timer
- **Bundle ID:** net.defency.kinetempo · **Team:** DEFENCY NET, SRL (QPDUFP7LLH) · **SKU:** kinetempo-ios
- **Primary category:** Health & Fitness · **Secondary:** Medical
- **Price:** Free · **Availability:** all territories
- **Age rating:** 4+ (no objectionable content; "Medical/Treatment Information: Infrequent/Mild" → answer *None* — the app gives no treatment information itself)
- **Privacy policy URL:** https://selic.github.io/kinetempo-catalog/privacy.html (later https://kinetempo.app/privacy.html)
- **Support URL:** https://selic.github.io/kinetempo-catalog/support.html
- **Marketing URL:** https://selic.github.io/kinetempo-catalog/
- **Copyright:** 2026 Eugene Samotija, DEFENCY NET, SRL

## App Privacy (nutrition label)
- **Data collection:** *No, we do not collect data from this app.*
  Rationale: no accounts, no analytics, no crash SDK, no ads. Catalog fetch is a plain HTTPS GET to GitHub Pages with no identifiers.
- Tracking: No.

## Export compliance
- `ITSAppUsesNonExemptEncryption = false` (only HTTPS via system APIs). Answer "No" to the encryption question.

## Capabilities used
- Background Modes: **Audio** — timer cues while locked.
- App Groups: `group.net.defency.kinetempo` — Live Activity widget extension.
- Live Activities: `NSSupportsLiveActivities`, frequent updates.
- Associated Domains: `applinks:kinetempo.app` (add once the domain is live; AASA is served from `/.well-known/`).

## Permission strings (Info.plist)
- NSPhotoLibraryUsageDescription: "Kinetempo needs access to your library to attach a video to an exercise."
- NSCameraUsageDescription: "Kinetempo uses the camera to scan shared workout QR codes."

## Review notes (paste into "Notes")
Kinetempo is an interval timer for physiotherapy exercises. It uses the **audio background mode** to keep playing
audible cues (beeps at every step change and countdown ticks) while the screen is locked — this is the core
feature: the user lies down and must not touch the phone during a hold. The cues are audible content, not
silence; a silent keep-alive stream runs only between beeps so the session is not interrupted.

The **Live Activity** shows the current step and countdown on the Lock Screen and in the Dynamic Island.

No account is needed. To test: open "Quad isometrics" → Play → Start, lock the device, listen for beeps every
8 / 4 seconds and check the Live Activity. The Library tab fetches a public JSON catalog from
https://selic.github.io/kinetempo-catalog/catalog/index.json.

## Description (EN)
Kinetempo times your physiotherapy exercises so you can focus on the movement, not the phone.

• Steps, not just seconds — squeeze, lift, hold, release, move, rest. Every step has its own sound and colour, with ticks on the last three seconds.
• Follow the figure — the built-in schematic figure moves in time with the timer and the screen stays on while you train; the big countdown and colours show every step.
• Sound keeps going when locked — lock the phone and every step change is still a distinct beep, with ticks before it ends. The Lock Screen shows the time left and the next steps.
• Programs — combine exercises into a block with rests between them, e.g. quad sets → straight-leg raises → heel slides → heel prop.
• Presets — isometric hold, lift-hold-release, dynamic reps, plain countdown, or build your own step sequence.
• Video and animation — attach a YouTube link or a video from your gallery, a Lottie animation, or use the built-in schematic figures that move in time with the timer.
• Share — send a program by link, QR code or file. Import what your physiotherapist sends you.
• Library — a public catalog of programs published by clinics and physiotherapists, reviewed on GitHub.
• Private — everything stays on your phone. No account, no tracking.

Kinetempo is a timer, not a medical device. Follow your clinician's instructions.

## Description (RU)
Kinetempo отсчитывает время упражнений ЛФК, чтобы вы думали о движении, а не о телефоне.

• Шаги, а не просто секунды — напрячь, поднять, задержать, опустить, движение, отдых. У каждого шага свой звук и цвет, последние три секунды — тики.
• Следите за фигурой — встроенная схематичная фигура двигается в такт таймеру, экран не гаснет во время занятия; крупный отсчёт и цвет показывают каждый шаг.
• Звук не останавливается при блокировке — заблокируйте телефон, и каждая смена шага останется отдельным сигналом с тиками перед концом. На экране блокировки — остаток сессии и следующие шаги.
• Комплексы — собирайте упражнения в блок с отдыхом между ними.
• Пресеты — изометрия, поднять‑задержать‑опустить, динамика, простой таймер или своя последовательность шагов.
• Видео и анимации — ссылка на YouTube, видео из галереи, Lottie‑анимация или встроенные схематичные фигуры, движущиеся в такт таймеру.
• Делитесь — ссылкой, QR‑кодом или файлом. Импортируйте то, что прислал физиотерапевт.
• Библиотека — публичный каталог программ от клиник и физиотерапевтов.
• Приватность — всё хранится на телефоне. Без аккаунта и слежки.

Kinetempo — таймер, а не медицинское устройство. Следуйте указаниям своего врача.

## Description (RO)
Kinetempo cronometrează exercițiile de kinetoterapie, ca să te concentrezi pe mișcare, nu pe telefon.

• Pași, nu doar secunde — contractă, ridică, menține, coboară, mișcare, pauză. Fiecare pas are sunetul și culoarea lui, cu ticuri în ultimele trei secunde.
• Urmărește figura — figura schematică integrată se mișcă în ritmul cronometrului, iar ecranul rămâne aprins în timpul exercițiului; numărătoarea mare și culorile arată fiecare pas.
• Sunetul continuă cu ecranul blocat — fiecare schimbare de pas rămâne un semnal distinct, cu ticuri înainte de final. Ecranul de blocare arată timpul rămas și pașii următori.
• Programe — combină exercițiile într-un bloc cu pauze între ele.
• Presetări — izometrie, ridică‑menține‑coboară, repetări dinamice, cronometru simplu sau propria secvență de pași.
• Video și animații — link YouTube, video din galerie, animație Lottie sau figurile schematice integrate, sincronizate cu cronometrul.
• Distribuie — prin link, cod QR sau fișier. Importă ce îți trimite kinetoterapeutul.
• Bibliotecă — catalog public de programe publicate de clinici și kinetoterapeuți.
• Confidențial — totul rămâne pe telefon. Fără cont, fără urmărire.

Kinetempo este un cronometru, nu un dispozitiv medical. Urmează indicațiile medicului.

## Keywords (100 chars, EN)
physio,physiotherapy,rehab,isometric,timer,interval,exercise,knee,hold,reps,kinetotherapy,workout

## What's New (1.0)
First release: step-based exercise timer, programs, lock-screen Live Activity, sharing, public catalog.

## Screenshots checklist (6.9" and 6.5" iPhone; iPad not required if "iPhone only")
1. Player during SQUEEZE (orange, big 8) with schematic figure.
2. Lock screen with the Live Activity banner.
3. Exercise editor with presets and steps.
4. Program detail (knee rehab block).
5. Library tab.
6. Share screen with QR.
