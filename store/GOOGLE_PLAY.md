# Publishing Chart Pattern Trainer on Google Play

The app ships to Google Play as a **Trusted Web Activity (TWA)**: a small Android app, built with
Google's Bubblewrap tool, that opens the live Vercel site full-screen. Updates to the site reach the
Android app without a new store release.

Requirements below were checked on November 2, 2026. Re-check the Play Console before submitting.

## What is already in the repo

| Requirement | Where |
|---|---|
| Web app manifest (name, colours, 192/512 icons, maskable icon) | `public/manifest.webmanifest` |
| Offline support (service worker) | `public/sw.js`, registered by `src/components/service-worker.tsx` |
| Privacy policy page (required for every app) | `/privacy` → `src/routes/privacy.tsx` |
| Digital Asset Links (removes the browser bar in the app) | `public/.well-known/assetlinks.json` |
| Bubblewrap config | `android/twa-manifest.json` |
| Store icon 512×512 | `store/play-icon-512.png` |
| Feature graphic 1024×500 | `store/feature-graphic-1024x500.png` |
| Touch targets ≥ 44px on phones, no pull-to-refresh bounce | `src/components/trainer.tsx`, `src/styles.css` |

Regenerate icons and the feature graphic with `node scripts/build-store-assets.mjs` (needs `sharp`).

## Before you build

1. **Contact email** — set `CONTACT_EMAIL` in `src/routes/privacy.tsx`.
2. **Real charts** — run `npm run data:yahoo` and commit `src/data/real-scenarios.json`.
3. **Deploy to Vercel** with `VITE_AUTH_ENABLED=false`. Note your production URL.
4. **Replace `YOUR-APP.vercel.app`** in `android/twa-manifest.json` with that host.
   A custom domain is better than `*.vercel.app` if you have one; the host is baked into the app.
5. Optional: `VITE_GROK_EXTENSIONS=0` stops the page loading the grok.com script, which keeps the
   Data safety answers below simple. This is a project setting in the Grok template.

## Build the Android app (on your computer)

Needs Node 18+. Bubblewrap downloads JDK 17 and the Android SDK on first run.

```bash
npm i -g @bubblewrap/cli          # use the latest version: Play requires target API 36
cd android
bubblewrap init --manifest=https://YOUR-APP.vercel.app/manifest.webmanifest
#   accept the values from twa-manifest.json; let it create a new signing key
bubblewrap build                   # produces app-release-bundle.aab
```

**Back up `android.keystore` and its passwords.** Without them you can never update the app.

## Target API level

From **August 31, 2026, new apps must target Android 16 (API 36)**. After `bubblewrap build`,
open `android/app/build.gradle` and confirm `targetSdkVersion 36` (or higher). If it is lower,
update Bubblewrap and rebuild, or set it to 36 and rebuild.

## Play Console steps

1. Create a developer account (one-time US$25) and the app: name *Chart Pattern Trainer*,
   type **App**, **Free**.
2. **App signing**: keep Play App Signing on. Copy the **SHA-256 of the app signing key**
   (Setup → App signing) into `public/.well-known/assetlinks.json`, redeploy, and check
   `https://YOUR-APP.vercel.app/.well-known/assetlinks.json` loads. Add the upload key's
   fingerprint too (`bubblewrap fingerprint add <sha256>`) if you test builds you sideload.
3. **Testing (personal accounts made after Nov 13, 2023)**: run a **closed test with at least 12
   testers who stay opted in for 14 days in a row** before you can apply for production.
4. Upload `app-release-bundle.aab` to the closed-test track.

## Store listing

- **App name**: Chart Pattern Trainer
- **Short description** (80 max): Read the chart, call the next move, and learn which indicators help.
- **Full description**:

  > Chart Pattern Trainer is a drill for reading stock charts.
  >
  > Each round, a candlestick chart stops right before the move. Add the tools you trust — SMA 20,
  > EMA 12, volume, RSI 14 — then call it: higher, lower, or no edge. The hidden candles are
  > plotted, and you see what really happened, the pattern behind it, and which indicators agreed
  > with the move and which misled you.
  >
  > • Practice deck: ten classic setups — head and shoulders, double tops and bottoms, triangles,
  >   bull flag, RSI divergence, breakaway gap — each with a clear explanation.
  > • Real charts: actual historical daily charts with the ticker and dates hidden until you
  >   commit, so you can't cheat by recognising the stock.
  > • "No edge" is a real answer. Many charts don't resolve, and learning to sit out is part of the
  >   skill.
  > • Score, hit rate, streak and your last 20 calls, saved on your device. No account needed.
  >
  > Educational only. This is a practice tool, not a broker or investment advice.

- **Category**: Education. **Tags**: education, finance, trading practice.
- **Graphics**: `store/play-icon-512.png`, `store/feature-graphic-1024x500.png`, and **at least 2
  phone screenshots** (take them on your phone from the deployed site: one "Your call" screen, one
  revealed result). 7" and 10" tablet screenshots are recommended.
- **Privacy policy URL**: `https://YOUR-APP.vercel.app/privacy`

## App content answers

- **Ads**: No ads.
- **Data safety**: no data collected or shared (scores stay in on-device storage). If the grok.com
  script stays on, check what it collects before answering.
- **Target audience**: 18+ (or 13+). Not designed for children.
- **Content rating questionnaire**: reference / educational; no violence, gambling or user content.
  It is not a simulated gambling app: there is no money, betting or prizes.
- **Financial features declaration**: the app offers **none** of the listed financial features
  (no trading, investing, loans, payments or accounts). It is educational content about charts.
- **News app**: No. **Government app**: No.

## Updating later

- Website changes go live in the app as soon as Vercel deploys.
- A new store release is needed only when `android/twa-manifest.json` changes (icon, name,
  colours, host): bump `appVersionCode`, run `bubblewrap update` and `bubblewrap build`.
- When the service worker changes, bump `VERSION` in `public/sw.js` so phones drop old caches.
