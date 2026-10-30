# Reelix — AI-Powered Vertical Shorts Video Studio

**Reelix** is an AI-powered, one-click vertical Shorts (1080×1920, up to 3 min) video creator and multi-track editor built for modern content creators. Designed with a CapCut-inspired dark premium aesthetic (#0B0B0F, glass blur, violet → cyan signature gradient), it operates **100% on-device** using IndexedDB, Origin Private File System (OPFS), Canvas 2D, and WebCodecs hardware encoding.

---

## Key Capabilities & Architecture

- **Zero-Backend Architecture**: All media, project data, and rendered clips live exclusively in the device browser storage (IndexedDB + OPFS). No user media is uploaded to any private server.
- **7-Step Creation Pipeline**:
  1. **Ingest**: File reader, audio waveform and duration extractor, OPFS binary storage.
  2. **Transcribe**: Speech-to-text with word-level micro timestamps and script alignment (Bangla, English, Hindi, Spanish).
  3. **Analyze**: Scene analysis and focal point detection for 9:16 vertical crop reframing.
  4. **Director**: Gemini Flash returns a structured, Zod-validated Edit Plan (2-second hook, pacing, zooms, transitions, captions, sound effects, auto-ducked music, CTA).
  5. **Resolve Assets**: Queries portrait stock videos (Pexels), sound effects (Freesound or procedural Web Audio synthesis), and background music with auto-ducking.
  6. **Preview**: Unified 60fps Canvas 2D frame renderer with proxy resolution mode (540p proxy vs 1080p FHD).
  7. **Export**: Hardware-accelerated H.264 + AAC MP4 export at 1080×1920 30fps using WebCodecs and `mp4-muxer`.
- **Extensible Registry Architecture**:
  - **12 Built-in Effects**: Gaussian blur, radial glow, cinematic vignette, digital glitch, RGB split, 35mm film grain, zoom punch, camera shake, cinematic color grading (LUTs), mirror, 8-bit pixelate, chromatic aberration.
  - **8 Built-in Transitions**: Crossfade, linear wipe, zoom-in punch, zoom pull out, slide left, glitch breakdown, white flash, whip pan.
  - **10 Text Animations**: Fade in up, pop in (spring), typewriter, bounce, scale down slam, slide in left, blur in focus, kinetic slam, neon pulse, wave letters.
  - **6 Dynamic Caption Styles**: Karaoke word glow, bouncy word pop, color box badge, bold comic outline, audio typewriter, viral bold center.
  - **5 Viral Shorts Templates**: Hook-Problem-Solution-CTA, Cinematic Storytime, Rapid Fact Breakdown, Step-by-Step How-To, Motivational Punch.
- **Full Multi-Track Timeline Editor**: Drag, trim in/out, split clips at playhead, duplicate, delete, and add keyframes with undo/redo history.
- **PIN Security & Admin Shell**: WebCrypto SHA-256 PIN locking for the `/admin` route.

---

## Project Structure

```
├── ai/
│   ├── types.ts          # AI provider interface
│   ├── http.ts           # Unified fetch + CapacitorHttp adapter
│   ├── gemini.ts         # Gemini Flash client with retry & TTS
│   ├── whisper.ts        # Transcriber with word-level alignment
│   └── director.ts       # AI Director with Zod validation
├── engine/
│   ├── types.ts          # Edit Plan types (single source of truth)
│   ├── schema.ts         # Zod runtime validation schemas
│   ├── easing.ts         # Spring physics and easing curves
│   ├── timeline.ts       # Keyframe interpolator & auto-ducking
│   ├── audio-mixer.ts    # Web Audio graph with ducking & SFX
│   ├── renderer.ts       # Unified Canvas 2D frame renderer
│   └── store.ts          # Zustand studio store & undo/redo
├── registry/
│   ├── index.ts          # Extensible registry manager
│   ├── effects.ts        # 12 real Canvas effects
│   ├── transitions.ts    # 8 real scene transitions
│   ├── text-animations.ts# 10 text animations
│   ├── caption-styles.ts # 6 synchronized caption styles
│   └── templates.ts      # 5 viral Shorts templates
├── pipeline/
│   ├── types.ts          # Pipeline progress events
│   ├── ingest.ts         # OPFS media ingestion & durations
│   ├── assets.ts         # Pexels, Freesound & music resolver
│   ├── exporter.ts       # WebCodecs + mp4-muxer MP4 exporter
│   └── pipeline.ts       # 7-step pipeline coordinator
├── storage/
│   ├── opfs.ts           # Origin Private File System wrapper
│   ├── db.ts             # IndexedDB for projects & history
│   ├── keys.ts           # API keys storage with live testers
│   ├── pin.ts            # PIN lock utility (SHA-256)
│   └── haptics.ts        # Haptic feedback utility
└── ui/
    └── components/       # Header, Navigation, CreateWizard, PreviewCanvas, etc.
```

---

## Deployment & Native Packaging

### Vercel Hobby Deployment

1. Run `npm run build`.
2. Deploy the resulting build directly on Vercel. Because all processing executes in the user's browser (Web Workers, WebCodecs, OPFS, IndexedDB), zero server infrastructure is required.

### Capacitor Android APK Wrapping

1. Configure `output: 'export'` in `next.config.ts`.
2. Run `npm run build` to generate the static `out/` bundle.
3. Initialize Capacitor in the project:
   ```bash
   npm i @capacitor/core @capacitor/cli @capacitor/android
   npx cap init Reelix com.reelix.studio --web-dir=out
   npx cap add android
   npx cap sync
   ```
4. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
5. `ai/http.ts` automatically uses `CapacitorHttp` when running inside the Android APK to prevent cross-origin CORS blocks when connecting to external APIs.
