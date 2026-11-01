# Reelix Smoke Test & Verification Checklist

## Automated Unit Tests
Run unit tests via Node native test runner & `tsx`:
```bash
npm run test
```
Verifies pure engine and AI functions:
1. `detectSilences`: RMS speech window analysis & silence detection boundaries.
2. `compactSpeechAudio` & `mapTimeToCompacted`: Silence removal, audio compaction, and original-to-compacted timeline mapping.
3. `alignScriptToDuration`: Word-level duration alignment fallback.
4. `isLayerActive`: Layer visibility and time range clipping.
5. `interpolateKeyframe`: Eased and linear keyframe interpolation.
6. `computeAudioDuckingVolume`: Keyframe volume, fade-in/out, and voiceover auto-ducking.
7. `layerVideoTime`: Trim offsets, loop calculations, and video element time seeking.

## Manual Smoke Checklist

### 1. Unified Library & Shader Studio
- [x] Open Library tab: verify 9 categories (Effects, Transitions, Text Animations, Caption Styles, Templates, SFX, BGM, Fonts, Stickers).
- [x] Hover or click any effect/transition: live 9:16 canvas preview renders instantly.
- [x] Click "Fork": Creates an editable copy in "MY ITEMS" stored in IndexedDB.
- [x] Open AI Creator Studio: create custom GLSL Shader Effect with live preview and save to Library.

### 2. Video Creation Wizard Flow
- [x] Upload voice recording / video clip with speech.
- [x] Toggle "Silence Compaction" & select caption style + edit style.
- [x] Type prompt in "Describe the Edit" box.
- [x] Click "Generate Vertical Short".
- [x] Real-time 6-step progress overlay displays current status and accurate step detail.

### 3. Studio Engine & Timeline Editing
- [x] 9:16 Canvas Preview: displays responsive canvas with high-dpi pixel ratio.
- [x] Video element pool: keeps max 3 active decoded video elements near playhead (±5s) to preserve WebView memory.
- [x] Multi-track timeline: drag/seek playhead, click layers to inspect transform/keyframes/effects.
- [x] Auto-ducking: background music volume drops automatically during active voiceover segments.
- [x] Audio Context: closes and releases on component unmount to prevent audio leaks.

### 4. Error Handling & Resilience
- [x] Network Disconnect: API calls show user-friendly error messages ("No internet connection...").
- [x] Rate Limit / Server Error: central logger captures error to localStorage with step name and stack trace.
- [x] Error Boundary: Tab-level error boundary displays "Copy details" and "Reload Tab" buttons without crashing full UI.

### 5. WebCodecs Export & Mobile Performance
- [x] Open Export modal: auto-detects low-memory/mobile devices and defaults to 720p 30fps.
- [x] Screen Wake Lock: keeps device awake during MP4 rendering.
- [x] Native Share: on Capacitor native runtime, invokes native share sheet (`@capacitor/share`).
- [x] Page Leave Warning: `beforeunload` prevents accidental tab closure during active export.

### 6. Android Capacitor & GitHub Actions
- [x] `capacitor.config.ts`: synchronized app name with `BRAND.appName`.
- [x] Android back button listener: closes modals first, then switches tab, blocking mid-export navigation.
- [x] GitHub Workflow `.github/workflows/build-apk.yml`: builds APK with Node 22, JDK 21 temurin, and AndroidManifest permissions patch.
