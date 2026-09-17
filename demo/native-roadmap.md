# Final delivery goal: Android and iOS app stores

The PWA is the first delivery vehicle, not the final platform limit. Capacitor configuration is checked in so the same React UI and API contracts can become Android/iOS app packages without rewriting the clinical workspace.

## Implemented foundation

The authenticated SQLite milestone is same-origin web delivery only. Existing Capacitor configuration
does not validate native login, cookies, secure storage, or identity-provider redirects. Those remain
separate release work; setting VITE_API_BASE_URL alone is not sufficient for authenticated native use.

- Capacitor core and CLI dependencies, app identity and `webDir: dist`.
- Responsive layouts, mobile navigation, viewport safe-area handling and touch interactions.
- API client supports a build-time `VITE_API_BASE_URL` rather than assuming the device hosts Express.
- Server supports explicit configured CORS origins.
- UI avoids relying on persistent browser storage for clinical data.

The package ID `com.researchtwin.app` is a development default; choose an organization-owned identifier before the first store submission.

## Package Android

Prerequisites: deployed HTTPS API, Android Studio, Android SDK/JDK versions compatible with Capacitor 7, and a physical test device/emulator.

```powershell
npm install @capacitor/android@^7
npx cap add android
$env:VITE_API_BASE_URL = 'https://your-deployed-api.example'
npm run native:sync
npm run native:android
```

The example API hostname must be replaced with a real deployment. Configure the API host's `ALLOWED_ORIGINS` to allow the actual native WebView origin (normally `https://localhost` for Android). Build a signed Android App Bundle in Android Studio after device verification. Configure Play Console, signing custody, privacy policy, data safety disclosures, content ratings, tester access and any applicable health-app declarations.

## Package iOS

Prerequisites: macOS, Xcode, supported iOS tooling and Apple Developer membership for store distribution. This Windows workspace cannot build or sign an iOS package.

```bash
npm install @capacitor/ios@^7
npx cap add ios
VITE_API_BASE_URL=https://your-deployed-api.example npm run native:sync
npm run native:ios
```

Allow the actual iOS WebView origin on the API (normally `capacitor://localhost`). Configure signing and capabilities in Xcode, validate on physical devices, then use TestFlight before App Store review. Complete privacy disclosures, support/marketing URLs and applicable healthcare review requirements. Store acceptance is not guaranteed merely by packaging a website.

## Release gates still required

1. Replace synthetic-only architecture with authorized, clinically governed backend integrations where appropriate; never enable real data merely by changing a URL.
2. Decide and implement native authentication/secure token handling, deep links and session expiry.
3. Keep service workers/install UI disabled in native shells; test bundled asset updates and resume behavior.
4. Adapt Markdown brief export to native filesystem/share APIs (browser download behavior is not sufficient proof of native functionality).
5. Physical-device verification of keyboard, screen readers, focus, safe areas, networking, offline recovery and background/resume behavior.
6. Add only necessary device permissions; do not request health, camera, microphone or location access without a defined need and consent flow.
7. Set up Android/iOS CI, reproducible signing, secret storage and versioned release builds.
8. Complete accessibility, privacy, security and clinical-safety review; publish clear intended-use and limitation statements.
9. Submit signed packages to both stores and address review feedback.

No native project directories have been generated and no native builds, signing or store submission have been performed in this first PWA release.
