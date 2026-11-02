# Reelix — AI-Powered Vertical Shorts Video Studio

**Reelix** is an AI-powered, one-click vertical Shorts (1080×1920, up to 3 min) video creator and multi-track editor built for modern content creators. Designed with a CapCut-inspired dark premium aesthetic, it operates **100% on-device** using IndexedDB, Origin Private File System (OPFS), Canvas 2D, and WebCodecs hardware encoding.

---

## Owner & Buyer Quickstart Guide

### 1. How to Rebrand the App
Rebranding Reelix takes under 1 minute:
1. Open `ui/brand.tsx` and update brand details (`appName`, `tagline`, `supportEmail`, `website`, colors, or the `BrandLogo` SVG).
2. Run the rebranding script in terminal:
   ```bash
   npm run brand
   ```
   This automatically syncs the new name to `package.json` and `capacitor.config.ts`.

### 2. How to Set Up API Keys
API keys are stored strictly in the user's browser device storage (`localStorage` / IndexedDB).
- **Gemini API Key (Required for AI Director & Speech Alignment)**: Obtain a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Pexels API Key (Optional)**: Unlocks HD vertical stock b-roll clips.
- **Jamendo Client ID (Optional)**: Unlocks royalty-free background music tracks.
- **Freesound API Token (Optional)**: Unlocks CC0 sound effect accents (a built-in procedural Web Audio synthesizer automatically generates whoosh, pop, hit, and ding sound effects if no key is provided).

### 3. How to Build Android APK with GitHub Actions
Reelix includes a GitHub Actions workflow `.github/workflows/build-apk.yml`.
1. Push the repository to GitHub.
2. Go to the **Actions** tab in your repository and select **Build Android APK**.
3. Click **Run workflow**.
4. Once completed, download the signed/unsigned APK artifact directly from the workflow summary page.

### 4. Portable Backup & Restore (.reelix Format)
Projects can be backed up as portable `.reelix` zip containers using `fflate`:
- **Backup**: Packages the complete JSON Edit Plan blueprint and all binary media files cached in OPFS.
- **Restore**: Unpacks `.reelix` archives, restores media files directly back into local OPFS, and registers the project in IndexedDB.

### 5. Licensing-Ready Hook
The app includes `ui/license.ts` with `isPro()` returning `true` out of the box with zero fake payment popups or fake plans. To connect a commercial license key backend or payment provider later, simply update `ui/license.ts`.

### 6. Known Limits & Hardware Guidance
- **Render Speed**: WebCodecs hardware encoding speed depends on the client GPU/SOC. On modern desktop Chrome or high-end Android phones, a 30-second 1080p Short renders in ~4–8 seconds. On budget devices, 720p 30fps mode is recommended.
- **Free API Quotas**: Google AI Studio free tier includes generous rate limits (~15 RPM). If hitting rate limits during batch testing, increase delay or connect a Pay-As-You-Go project key.

---

## Key Capabilities & Architecture

- **Zero-Backend Architecture**: All media, project data, and rendered clips live exclusively in device browser storage (IndexedDB + OPFS).
- **7-Step Creation Pipeline**:
  1. **Ingest**: File reader, audio waveform and duration extractor, OPFS binary storage.
  2. **Transcribe**: Speech-to-text with word-level micro timestamps and script alignment (Bangla & English support).
  3. **Analyze**: Scene analysis and focal point detection for 9:16 vertical crop reframing.
  4. **Director**: Gemini Flash returns a structured Edit Plan (2s hook, pacing, zooms, transitions, captions, sound effects, auto-ducked music, CTA).
  5. **Resolve Assets**: Queries portrait stock videos (Pexels), sound effects (Freesound or procedural Web Audio synthesis), and background music with auto-ducking.
  6. **Preview**: Unified 60fps Canvas 2D frame renderer with proxy resolution mode.
  7. **Export**: Hardware-accelerated H.264 + AAC MP4 export at 1080×1920 using WebCodecs and `mp4-muxer`.

---

## Developer Commands

```bash
# Start local dev server
npm run dev

# Run TypeScript type check and unit tests
npm run test

# Run code linter
npm run lint

# Sync brand name across configuration files
npm run brand

# Build Web / Node production bundle
npm run build

# Build static output for Capacitor Android / PWA
npm run build:static
```
