# Android File and Offline Reliability Design

## Goal

Make the existing Sarf Capacitor application reliable on Android 10–14 while preserving its current Arabic UI and IndexedDB data model. PDF viewing, PDF/JSON export, JSON import, and offline styling must work without relying on browser download behavior.

## Scope

- Preserve current screens, colors, navigation, database name, table names, and stored record shapes.
- Replace the optional browser-only file actions with a typed Capacitor Android plugin.
- Save generated PDF and JSON files to Android Downloads through MediaStore by default.
- Open generated PDFs through an Android chooser using a content URI and temporary read permission.
- Support an optional user-selected directory through Android's Storage Access Framework and persist its URI permission.
- Validate backups before changing the database and perform replacement atomically.
- Compile Tailwind CSS and bundle Tajawal locally so the core UI works offline.
- Keep Gemini features optional and fail clearly when no secure AI endpoint is configured.
- Fix all TypeScript errors and align Capacitor Android configuration with Java 21 and SDK 35.

## Architecture

### Web file service

`utils/nativeFiles.ts` will expose typed `saveFile`, `viewFile`, and `chooseDirectory` operations. On Android it calls a registered Capacitor plugin. In a normal browser it uses Blob download/open fallbacks. All callers await a result object and show success only after the native operation resolves.

`utils/pdfActions.ts` remains the PDF-specific adapter. It converts jsPDF output to Base64 once, delegates to the file service, and returns the saved display location to the caller.

### Android plugin

`NativeFilesPlugin.java` will be registered from `MainActivity.java` under the JavaScript name `AndroidBridge`.

- Default save: use `MediaStore.Downloads` on Android 10+ with relative path `Download/eslam`; use the public Downloads directory on older supported Android versions.
- Chosen directory: launch `ACTION_OPEN_DOCUMENT_TREE`, persist read/write URI permission, and store the tree URI in SharedPreferences.
- Save to chosen directory: use `DocumentFile` and `ContentResolver` output streams.
- View PDF: write a temporary cache file, obtain a FileProvider URI, and launch `ACTION_VIEW` via `Intent.createChooser` with `FLAG_GRANT_READ_URI_PERMISSION`.
- Errors are rejected back to JavaScript with stable codes and Arabic-facing callers translate them into useful messages.

No broad legacy storage permission will be requested on Android 10–14.

## Backup and database behavior

The export payload keeps the existing collections: expenses, categories, settings, drafts, reminders, and trash. Import first parses and validates required arrays and record fields. Only a valid backup enters a single Dexie transaction. If validation or writing fails, the current database remains unchanged.

The selected folder is stored as an Android content URI on the native side. Web settings store only a friendly label, avoiding unusable `/storage/emulated/0/...` path assumptions.

## Offline UI

Tailwind will be installed as a build dependency and compiled from a local CSS entry. Tajawal font files will be bundled under `public/fonts`. External Tailwind, Google Fonts, and import-map links will be removed from `index.html`. PWA assets will live under `public`, or service-worker registration will be disabled in the native shell when it provides no value.

The application logic already bundles through Vite; Gemini network calls remain network-dependent and are not part of offline guarantees.

## AI security

The Android bundle will not embed a Gemini key. AI actions will check for a configured HTTPS backend endpoint. Without one, they display that the AI service is unavailable while all expense-management functions continue working.

## PDF reliability

Voucher PDFs continue using the existing visual template. Long reports will render page-sized sections rather than one unbounded canvas, preventing row cuts and reducing peak memory. Each PDF operation restores hidden DOM state in a `finally` block.

## Security

Android backup rules will exclude WebView financial storage unless explicitly protected. Existing destructive actions retain confirmation. The unused PIN screen is outside the core file fix; it will either be wired to a persisted, hashed PIN only if the existing UI exposes PIN settings, or removed from the production bundle to avoid implying protection that does not exist.

## Testing and acceptance

- Unit tests cover Base64 conversion, native/browser routing, backup validation, and failed imports preserving data.
- TypeScript: `npx tsc --noEmit` returns zero errors.
- Web build: `npm run build` succeeds with no missing `/index.css` warning and no Tailwind/Google Fonts CDN dependency.
- Capacitor: `npx cap sync android` succeeds and the plugin is registered.
- Android: `./gradlew assembleDebug` succeeds under Java 21 when Gradle and Android SDK dependencies are available.
- Manual device acceptance: save and view a voucher PDF, save a multi-page report, export/import JSON, retain data after restart, and launch the core UI offline on Android 13 and 14.

## Deliverables

- Modified full source project.
- Debug APK when the build environment can resolve Gradle/Android SDK dependencies.
- ZIP archive containing the project, verification notes, and any produced APK.
