# Android File and Offline Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a buildable Sarf Android project whose PDF/JSON file actions are native, whose imports are safe, and whose core interface works offline.

**Architecture:** A typed web adapter routes file operations to a local Capacitor plugin named `AndroidBridge` on Android and to Blob fallbacks in browsers. Backup parsing is isolated and tested before Dexie writes, while Android uses MediaStore, SAF, and FileProvider for scoped-storage compatibility.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Dexie 4, Capacitor Android 7, Java 21, Android SDK 35, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-11-android-file-and-offline-design.md`

## Global Constraints

- Preserve the Arabic UI, current colors, navigation, database name `SarfDB`, table names, and stored record shapes.
- Do not request broad legacy storage permissions on Android 10–14.
- Do not embed a Gemini API key in the web bundle or APK.
- Default exported files to `Download/eslam`; honor a persisted SAF directory when selected.
- Require Java 21, `minSdkVersion 23`, `compileSdkVersion 35`, and `targetSdkVersion 35`.

---

### Task 1: Test Harness and Backup Validation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `utils/backup.ts`
- Create: `tests/backup.test.ts`
- Modify: `components/SettingsView.tsx`

**Interfaces:**
- Produces: `parseBackup(text: string): BackupData` and `replaceDatabaseFromBackup(data: BackupData): Promise<void>`.
- Consumes: existing Dexie tables from `db.ts`.

- [ ] Write tests asserting valid backups parse, malformed JSON is rejected, missing required arrays are rejected, and optional arrays default to empty arrays.
- [ ] Run `npm test -- tests/backup.test.ts` and verify failure because `utils/backup.ts` does not exist.
- [ ] Implement `BackupData`, runtime record checks, and `parseBackup` without mutating the database.
- [ ] Run the backup tests and verify they pass.
- [ ] Replace the inline import parser in `SettingsView.tsx` with `parseBackup`, then use `db.transaction('rw', [db.expenses, db.categories, db.settings, db.drafts, db.reminders, db.trash], callback)` so TypeScript and runtime agree.
- [ ] Re-run the backup test and `npx tsc --noEmit`.

### Task 2: Typed File Service and PDF Routing

**Files:**
- Create: `utils/nativeFiles.ts`
- Create: `tests/nativeFiles.test.ts`
- Modify: `utils/pdfActions.ts`
- Modify: `components/ExpenseDetailView.tsx`
- Modify: `components/ReportsView.tsx`
- Modify: `components/SettingsView.tsx`

**Interfaces:**
- Produces: `saveBase64File(request): Promise<FileActionResult>`, `viewBase64File(request): Promise<FileActionResult>`, and `chooseExportDirectory(): Promise<DirectoryResult>`.
- The native plugin contract uses Capacitor calls under the registered name `AndroidBridge`.

- [ ] Write tests that a native platform routes saves/views to the plugin, that browser fallback downloads a Blob, and that native rejection is returned to the caller rather than reported as success.
- [ ] Run `npm test -- tests/nativeFiles.test.ts` and verify failure because the service does not exist.
- [ ] Implement the typed service with injected browser primitives for deterministic tests.
- [ ] Run the native file tests and verify they pass.
- [ ] Refactor `handlePdfAction` to return `FileActionResult` and convert jsPDF output only once.
- [ ] Update report, voucher, and backup callers to await the result and display success only from a resolved native/browser operation.
- [ ] Re-run tests and TypeScript.

### Task 3: Capacitor Android File Plugin

**Files:**
- Create: `android/app/src/main/java/com/eslam/sarf/NativeFilesPlugin.java`
- Create: `android/app/src/test/java/com/eslam/sarf/NativeFilesPluginTest.java`
- Modify: `android/app/src/main/java/com/eslam/sarf/MainActivity.java`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/res/xml/file_paths.xml`
- Modify: `android/app/build.gradle`

**Interfaces:**
- Produces Capacitor plugin methods `saveFile`, `viewFile`, `chooseDirectory`, and `getDirectory` under `AndroidBridge`.
- `saveFile` accepts `base64`, `fileName`, and `mimeType`; returns `uri` and `displayPath`.

- [ ] Write JVM tests for filename sanitization, Base64 decoding failure, and the default relative path `Download/eslam`.
- [ ] Run `./gradlew testDebugUnitTest` and verify the new tests fail before implementation when Gradle dependencies are available.
- [ ] Implement the plugin with `MediaStore.Downloads` on API 29+, public Downloads on API 23–28, and SAF `DocumentFile` for a selected tree URI.
- [ ] Implement PDF viewing by writing to cache, resolving a FileProvider URI, and launching `Intent.createChooser` with read permission.
- [ ] Register `NativeFilesPlugin.class` in `MainActivity.onCreate` before `super.onCreate`.
- [ ] Restrict FileProvider paths to the cache export directory and add AndroidX DocumentFile.
- [ ] Run Android unit tests and `./gradlew assembleDebug` when the toolchain is available.

### Task 4: Fully Local Styling and Fonts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `index.css`
- Create: `public/fonts/Tajawal-Regular.ttf`
- Create: `public/fonts/Tajawal-Medium.ttf`
- Create: `public/fonts/Tajawal-Bold.ttf`
- Modify: `index.tsx`
- Modify: `index.html`
- Move: `manifest.json` to `public/manifest.json`
- Move: `sw.js` to `public/sw.js`

**Interfaces:**
- Produces a self-contained Vite build with generated CSS and local font URLs.

- [ ] Add a build test that inspects `dist/index.html` and fails when it contains `cdn.tailwindcss.com`, `fonts.googleapis.com`, `esm.sh`, or `/index.css` without a generated CSS asset.
- [ ] Run the test and verify it fails against the current build.
- [ ] Install and configure Tailwind locally, add `@font-face` declarations, and import `index.css` from `index.tsx`.
- [ ] Remove CDN scripts, Google Font links, obsolete import maps, and the redundant stylesheet link from `index.html`.
- [ ] Move PWA assets into `public` so Vite copies them.
- [ ] Run the offline build test and `npm run build`.

### Task 5: Long PDF Memory and Pagination

**Files:**
- Create: `utils/pdfPages.ts`
- Create: `tests/pdfPages.test.ts`
- Modify: `components/ReportsView.tsx`
- Modify: `components/ExpenseDetailView.tsx`

**Interfaces:**
- Produces: `splitCanvasIntoPages(canvas, pageWidthMm, pageHeightMm)` yielding page-sized image slices.

- [ ] Write tests for one-page, exact-boundary, and multi-page canvas dimensions.
- [ ] Run the test and verify it fails because the pagination helper is absent.
- [ ] Implement page slicing so each PDF page receives only its own canvas region.
- [ ] Update reports to render page-sized chunks and restore the hidden report node in `finally`.
- [ ] Update voucher generation to restore its hidden node in `finally`.
- [ ] Re-run PDF tests, TypeScript, and the Vite build.

### Task 6: AI Failure Safety and Android Backup Rules

**Files:**
- Create: `utils/aiAvailability.ts`
- Create: `tests/aiAvailability.test.ts`
- Modify: `components/SettingsView.tsx`
- Modify: `vite.config.ts`
- Create: `android/app/src/main/res/xml/backup_rules.xml`
- Create: `android/app/src/main/res/xml/data_extraction_rules.xml`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `capacitor.config.ts`

**Interfaces:**
- Produces: `getAiAvailability(endpoint?: string): { available: boolean; message?: string }`.

- [ ] Write tests proving AI is unavailable without an HTTPS backend endpoint and available with a valid HTTPS endpoint.
- [ ] Run the test and verify failure because the helper is missing.
- [ ] Remove `GEMINI_API_KEY` injection from Vite and gate AI buttons behind the endpoint check with a clear Arabic message.
- [ ] Add Android backup/data-extraction rules excluding WebView financial data.
- [ ] Remove obsolete `bundledWebRuntime` from Capacitor configuration.
- [ ] Run tests and TypeScript.

### Task 7: Full Verification and Deliverables

**Files:**
- Create: `VERIFICATION.md`
- Create: `Eslam-main-android-fixed.zip`
- Create when possible: `android/app/build/outputs/apk/debug/app-debug.apk`

**Interfaces:**
- Produces the final source archive and, when Gradle dependencies are accessible, a debug APK.

- [ ] Run `npm ci` from a clean dependency state.
- [ ] Run the complete `npm test` suite and record the pass count.
- [ ] Run `npx tsc --noEmit` and require exit code 0.
- [ ] Run `npm run build` and inspect built HTML for external styling dependencies.
- [ ] Run `npx cap sync android` and verify the plugin source and local assets remain present.
- [ ] Run `java -version` and require Java 21 before attempting `./gradlew clean assembleDebug`.
- [ ] Record unavailable environment dependencies honestly in `VERIFICATION.md`; do not represent an unrun device test as passing.
- [ ] Create a ZIP excluding `node_modules`, temporary files, and Gradle caches while including a produced APK.
- [ ] Save the final ZIP and APK as user-facing deliverables.
