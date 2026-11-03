// Reelix Director AI - Produces strict Zod-validated 9:16 Edit Plans with auto-healing, scene tiling, and notice banners
import { EditPlan, Layer, CaptionChunk, VideoLayer, ImageLayer, AudioLayer } from '../engine/types';
import { DirectorRequest, DirectorResult } from './types';
import { callGeminiJson } from './gemini';
import { Registry } from '../registry';
import { DEFAULT_EDIT_CONTROLS } from '../pipeline/types';
import { getCutSpeedRange, enforceEditControls } from '../pipeline/enforce-controls';

export interface RawAiScene {
  start?: number;
  end?: number;
  source?: 'clip' | 'image';
  clipIndex?: number;
  clipStart?: number;
  imageIndex?: number;
  effect?: string;
  transition?: string;
  punchIn?: boolean;
}

export interface RawAiPlan {
  title?: string;
  hookText?: string;
  musicMood?: 'hype' | 'upbeat' | 'calm' | 'dramatic';
  directorNotes?: string;
  scenes?: RawAiScene[];
  sfx?: Array<{ time: number; type: 'whoosh' | 'pop' | 'hit' | 'ding' }>;
}

export interface RepairedScene {
  start: number;
  end: number;
  duration: number;
  source: 'clip' | 'image' | 'stock';
  clipIndex: number;
  clipStart: number;
  imageIndex?: number;
  effect: string;
  transition?: string;
  punchIn: boolean;
  focusPoint?: { x: number; y: number };
}

export function groupWordsIntoSentences(
  words: Array<{ word: string; start: number; end: number }>
): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  if (!words || words.length === 0) return sentences;

  let currentWords: Array<{ word: string; start: number; end: number }> = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentWords.push(w);
    const hasPunctuation = /[.!?।,;:]$/.test(w.word.trim());
    const nextWord = words[i + 1];
    const hasPause = nextWord && nextWord.start - w.end > 0.45;
    const isLong = currentWords.length >= 14;

    if (hasPunctuation || hasPause || isLong || i === words.length - 1) {
      sentences.push({
        text: currentWords.map((cw) => cw.word).join(' '),
        start: Number(currentWords[0].start.toFixed(2)),
        end: Number(currentWords[currentWords.length - 1].end.toFixed(2)),
      });
      currentWords = [];
    }
  }

  return sentences;
}

/**
 * 7-Step Robust Deterministic Timeline Scene Repair:
 * 1. Normalize AI scenes: sort by start, clamp to [0, D], drop empty
 * 2. Tile 0..D with no gaps/overlaps: scene[i].end = scene[i+1].start; first.start = 0; last.end = D
 * 3. Merge scenes < minCut into previous; split scenes > maxCut into equal parts (clamped by cutSpeed)
 * 4. Fill clip timing: moving cursor per clip; cursor wraps when cursor + dur > clipDur - 0.05
 * 5. If sceneDuration > clipDuration, split into clip-sized pieces looping from 0
 * 6. Validate effect/transition IDs against Registry
 * 7. Empty media fallback (video layer with src '')
 */
export function repairDirectorScenes(
  rawScenes: RawAiScene[] | undefined,
  totalDuration: number,
  clipsMeta: Array<{ duration: number; focusPoint?: { x: number; y: number } }>,
  imagesCount: number,
  mode: 'broll' | 'talking-head' = 'broll',
  cutSpeed: 'slow' | 'normal' | 'fast' = 'normal'
): RepairedScene[] {
  const D = Math.max(0.5, totalDuration);
  const { min: minCut, max: maxCut } = getCutSpeedRange(cutSpeed);

  // 1. Normalize AI scenes
  let scenes: Array<{
    start: number;
    end: number;
    source?: 'clip' | 'image';
    clipIndex?: number;
    clipStart?: number;
    imageIndex?: number;
    effect?: string;
    transition?: string;
    punchIn?: boolean;
  }> = [];

  if (rawScenes && Array.isArray(rawScenes) && rawScenes.length > 0) {
    for (const s of rawScenes) {
      const start = Math.max(0, Math.min(D, Number(s.start) || 0));
      const end = Math.max(0, Math.min(D, Number(s.end) || 0));
      if (end > start) {
        scenes.push({
          start,
          end,
          source: s.source,
          clipIndex: s.clipIndex,
          clipStart: s.clipStart,
          imageIndex: s.imageIndex,
          effect: s.effect,
          transition: s.transition,
          punchIn: !!s.punchIn,
        });
      }
    }
  }

  if (scenes.length === 0) {
    // Generate default scenes matching cutSpeed target
    const targetDur = (minCut + maxCut) / 2;
    const count = Math.max(1, Math.round(D / targetDur));
    const step = D / count;
    for (let i = 0; i < count; i++) {
      scenes.push({
        start: i * step,
        end: i === count - 1 ? D : (i + 1) * step,
        source: 'clip',
        clipIndex: clipsMeta.length > 0 ? i % clipsMeta.length : 0,
      });
    }
  }

  // Sort by start
  scenes.sort((a, b) => a.start - b.start);

  // 2. Tile 0..D with no gaps/overlaps
  scenes[0].start = 0;
  for (let i = 0; i < scenes.length - 1; i++) {
    if (scenes[i].end <= scenes[i].start) {
      scenes[i].end = scenes[i].start + minCut;
    }
    scenes[i + 1].start = scenes[i].end;
  }
  scenes[scenes.length - 1].end = D;

  // 3. Merge scenes < minCut into previous; split scenes > maxCut
  if (D >= minCut) {
    let merged = true;
    while (merged && scenes.length > 1) {
      merged = false;
      for (let i = 0; i < scenes.length; i++) {
        const dur = scenes[i].end - scenes[i].start;
        if (dur < minCut - 0.001 && scenes.length > 1) {
          if (i === 0) {
            scenes[1].start = 0;
            scenes.shift();
          } else {
            scenes[i - 1].end = scenes[i].end;
            scenes.splice(i, 1);
          }
          merged = true;
          break;
        }
      }
    }
  }

  // Split scenes > maxCut
  let split = true;
  while (split) {
    split = false;
    for (let i = 0; i < scenes.length; i++) {
      const dur = scenes[i].end - scenes[i].start;
      if (dur > maxCut + 0.001) {
        const parts = Math.ceil(dur / maxCut);
        const partDur = dur / parts;
        const newPieces = [];
        for (let p = 0; p < parts; p++) {
          newPieces.push({
            ...scenes[i],
            start: scenes[i].start + p * partDur,
            end: p === parts - 1 ? scenes[i].end : scenes[i].start + (p + 1) * partDur,
          });
        }
        scenes.splice(i, 1, ...newPieces);
        split = true;
        break;
      }
    }
  }

  // Guarantee strict contiguous tiling 0..D
  scenes[0].start = 0;
  for (let i = 0; i < scenes.length - 1; i++) {
    scenes[i + 1].start = scenes[i].end;
  }
  scenes[scenes.length - 1].end = D;

  // 4 & 5. Fill clip timing with cursors and clip looping
  const clipCursors = new Map<number, number>();
  const repaired: RepairedScene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const sStart = Number(sc.start.toFixed(2));
    const sEnd = Number(sc.end.toFixed(2));
    const sDur = Number((sEnd - sStart).toFixed(2));

    if (mode === 'talking-head') {
      repaired.push({
        start: sStart,
        end: sEnd,
        duration: sDur,
        source: 'clip',
        clipIndex: 0,
        clipStart: sStart, // lip-sync with voiceover timeline
        effect: sc.effect && Registry.getEffect(sc.effect) ? sc.effect : 'color-grade',
        transition: i > 0 && sc.transition && Registry.getTransition(sc.transition) ? sc.transition : undefined,
        punchIn: i % 2 === 1, // punch in on alternate scenes
        focusPoint: clipsMeta[0]?.focusPoint,
      });
      continue;
    }

    // B-Roll / Dynamic Cuts Mode
    const hasVideos = clipsMeta.length > 0;
    const hasImages = imagesCount > 0;

    let source: 'clip' | 'image' | 'stock' = 'stock';
    let clipIdx = 0;
    let imgIdx: number | undefined = undefined;

    if (sc.source === 'image' && hasImages) {
      source = 'image';
      imgIdx = typeof sc.imageIndex === 'number' ? sc.imageIndex % imagesCount : i % imagesCount;
    } else if (hasVideos) {
      source = 'clip';
      clipIdx = typeof sc.clipIndex === 'number' ? Math.max(0, Math.min(clipsMeta.length - 1, sc.clipIndex)) : i % clipsMeta.length;
    } else if (hasImages) {
      source = 'image';
      imgIdx = i % imagesCount;
    } else {
      source = 'stock';
    }

    // Clip timing calculation
    let clipStart = 0;
    const clipDur = clipsMeta[clipIdx]?.duration || 10;

    if (source === 'clip') {
      const cursor = clipCursors.get(clipIdx) ?? 0;
      if (typeof sc.clipStart === 'number' && sc.clipStart >= 0 && sc.clipStart + sDur <= clipDur - 0.05) {
        clipStart = sc.clipStart;
      } else {
        clipStart = cursor;
      }

      // Update cursor for this clip
      let nextCursor = clipStart + sDur;
      if (nextCursor + minCut > clipDur - 0.05) {
        nextCursor = 0;
      }
      clipCursors.set(clipIdx, nextCursor);
    }

    // 6. Validate effect and transition against Registry
    let effect = sc.effect;
    if (!effect || !Registry.getEffect(effect)) {
      effect = i === 0 ? 'zoom-punch' : i % 2 === 1 ? 'vignette' : 'glow';
    }

    let transition = sc.transition;
    if (i === 0) {
      transition = undefined;
    } else if (!transition || !Registry.getTransition(transition)) {
      transition = 'crossfade';
    }

    repaired.push({
      start: sStart,
      end: sEnd,
      duration: sDur,
      source,
      clipIndex: clipIdx,
      clipStart: Number(clipStart.toFixed(2)),
      imageIndex: imgIdx,
      effect,
      transition,
      punchIn: sc.punchIn ?? (i === 0),
      focusPoint: clipsMeta[clipIdx]?.focusPoint,
    });
  }

  return repaired;
}

export async function generateDirectorPlan(
  req: DirectorRequest,
  words: Array<{ word: string; start: number; end: number }>
): Promise<DirectorResult> {
  const duration = Math.min(180, Math.max(3, req.voiceDuration || req.targetDuration || 30));
  const controls = req.controls || DEFAULT_EDIT_CONTROLS;
  const rawCaptionStyle = controls.captions.styleId || req.captionStyle || 'karaoke-word-highlight';
  const captionStyle = Registry.getCaptionStyle(rawCaptionStyle) ? rawCaptionStyle : 'karaoke-word-highlight';
  const isTalkingHead = req.mode === 'talking-head';

  // Format caption chunks: max 3 words or 24 characters limit per chunk
  const captionChunks: CaptionChunk[] = [];
  let currentChunkWords: Array<{ word: string; start: number; end: number }> = [];
  let currentLen = 0;

  for (const w of words) {
    const wordLen = w.word.length;
    if (currentChunkWords.length >= 3 || currentLen + wordLen + 1 > 24) {
      if (currentChunkWords.length > 0) {
        captionChunks.push({
          text: currentChunkWords.map((cw) => cw.word).join(' '),
          start: currentChunkWords[0].start,
          end: currentChunkWords[currentChunkWords.length - 1].end,
          words: [...currentChunkWords],
        });
        currentChunkWords = [];
        currentLen = 0;
      }
    }
    currentChunkWords.push(w);
    currentLen += wordLen + (currentChunkWords.length > 1 ? 1 : 0);
  }

  if (currentChunkWords.length > 0) {
    captionChunks.push({
      text: currentChunkWords.map((cw) => cw.word).join(' '),
      start: currentChunkWords[0].start,
      end: currentChunkWords[currentChunkWords.length - 1].end,
      words: currentChunkWords,
    });
  }

  const notices: string[] = [];
  if (!req.hasPexelsKey && (!req.userVideoUrls || req.userVideoUrls.length === 0)) {
    notices.push('Pexels API key not configured: dynamic ambient visuals will be generated.');
  }

  // 1. Pass the REAL clip analysis and transcript sentences into prompt
  const sentences = groupWordsIntoSentences(words);
  const sentenceSummary = sentences.map((s) => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s] "${s.text}"`).join('\n');

  const clipsSummary = (req.clipAnalysis?.clips || []).map((c) => {
    const segs = (c.segments || []).map(
      (s) =>
        `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s] energy=${s.energy.toFixed(2)}, face=${s.hasFace}, focus=(${s.focusX.toFixed(2)},${s.focusY.toFixed(2)}): ${s.description}`
    ).join('; ');
    return `Clip ${c.index}: duration=${c.duration.toFixed(1)}s, summary="${c.summary || 'Video clip'}", segments=[${segs}]`;
  }).join('\n');

  const imageCount = req.userImageUris?.length || req.userImageUrls?.length || 0;
  const userInstruction = req.userPrompt ? `USER EDIT INSTRUCTION (HIGHEST PRIORITY OVER SWITCHES): "${req.userPrompt}"` : 'USER EDIT INSTRUCTION: Match clip moments to spoken words with high engagement.';

  const controlsSummary = `EXPLICIT SWITCHES (Do not add off items unless user prompt asks):
- Silence Removal: ${controls.silence.mode} (minSec: ${controls.silence.minSec}s)
- SFX: ${controls.sfx.mode} (level: ${controls.sfx.level})
- Music: ${controls.music.mode} (vol: ${controls.music.volume}%, duck: ${controls.music.duck})
- Hook Text: ${controls.hook}
- Captions: ${controls.captions.mode} (style: ${controls.captions.styleId})
- Effects: ${controls.effects.mode} (intensity: ${controls.effects.intensity})
- Transitions: ${controls.transitions}
- Cut Speed: ${controls.cutSpeed}
- Color Look: ${controls.colorLook}`;

  const prompt = `You are Reelix Director, an elite AI director for vertical 9:16 Shorts (1080x1920).
Create a professional edit plan that matches user video clips to the spoken words.

Duration: ${duration.toFixed(1)}s
Niche: ${req.niche || 'General'}
Pacing Style: ${req.style || 'Viral High Energy'}
Mode: ${isTalkingHead ? 'talking-head (speaker lip-synced)' : 'broll (dynamic cutting)'}
Available Clips Count: ${req.clipAnalysis?.clips?.length || req.userVideoUrls?.length || 0}
Available Images Count: ${imageCount}

${userInstruction}

${controlsSummary}

SPOKEN SENTENCES & TIMINGS:
${sentenceSummary || req.script || 'Engaging voiceover narration'}

AVAILABLE USER VIDEO CLIPS ANALYSIS:
${clipsSummary || 'No user video clips provided; use stock queries'}

Return JSON strictly matching this schema:
{
  "title": "Compelling Short Title",
  "hookText": "Short 3-6 word hook banner in same language as voice",
  "musicMood": "hype",
  "directorNotes": "Directing notes describing how the edit achieves the user instruction",
  "scenes": [
    {
      "start": 0.0,
      "end": 3.0,
      "source": "clip",
      "clipIndex": 0,
      "clipStart": 0.0,
      "effect": "zoom-punch",
      "transition": "crossfade",
      "punchIn": true
    }
  ],
  "sfx": [
    { "time": 0.0, "type": "whoosh" }
  ]
}`;

  const schema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      hookText: { type: 'STRING' },
      musicMood: { type: 'STRING', enum: ['hype', 'upbeat', 'calm', 'dramatic'] },
      directorNotes: { type: 'STRING' },
      scenes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            start: { type: 'NUMBER' },
            end: { type: 'NUMBER' },
            source: { type: 'STRING', enum: ['clip', 'image'] },
            clipIndex: { type: 'NUMBER' },
            clipStart: { type: 'NUMBER' },
            imageIndex: { type: 'NUMBER' },
            effect: { type: 'STRING' },
            transition: { type: 'STRING' },
            punchIn: { type: 'BOOLEAN' },
          },
          required: ['start', 'end'],
        },
      },
      sfx: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            time: { type: 'NUMBER' },
            type: { type: 'STRING', enum: ['whoosh', 'pop', 'hit', 'ding'] },
          },
          required: ['time', 'type'],
        },
      },
    },
    required: ['title', 'hookText', 'musicMood', 'scenes'],
  };

  const systemInstruction = `Follow the user's instruction literally. What the user writes in prompt overrides any switch. For every scene pick the clip moment whose description best fits the words spoken during that time. Cut speed is ${controls.cutSpeed}. Use clipStart inside the real duration of that clip.`;

  try {
    const parsed = await callGeminiJson<RawAiPlan>(
      {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction,
      },
      schema,
      { temperature: 0.3 }
    );

    return assembleFullEditPlan(parsed, req, duration, captionChunks, captionStyle, notices);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Director AI generation warning:', errorMsg);
    notices.push(`Director AI unavailable (${errorMsg}); used an automatic edit.`);
    return buildFallbackPlan(req, duration, captionChunks, captionStyle, notices);
  }
}

export function assembleFullEditPlan(
  aiData: RawAiPlan,
  req: DirectorRequest,
  totalDuration: number,
  captionChunks: CaptionChunk[],
  captionStyle: string,
  notices: string[] = []
): DirectorResult {
  const controls = req.controls || DEFAULT_EDIT_CONTROLS;
  const planId = `plan_${Date.now()}`;
  const title = aiData.title || req.script?.slice(0, 32) || 'Reelix Short';
  const hookText = aiData.hookText || title;
  const musicMood = aiData.musicMood || (req.style === 'Viral High Energy' ? 'hype' : 'upbeat');
  const directorNotes = aiData.directorNotes || 'High energy vertical Short with synchronized visual cuts.';

  const niche = req.niche || 'General / Tech';
  const style = req.style || 'Viral High Energy';

  // Prepare metadata for repair
  const clipsMeta: Array<{ duration: number; focusPoint?: { x: number; y: number } }> = [];
  const videoUris = req.userVideoUris && req.userVideoUris.length > 0 ? req.userVideoUris : req.userVideoUrls || [];

  if (req.clipAnalysis?.clips && req.clipAnalysis.clips.length > 0) {
    for (const c of req.clipAnalysis.clips) {
      const segWithFace = c.segments?.find((s) => s.hasFace);
      clipsMeta.push({
        duration: c.duration || 10,
        focusPoint: segWithFace ? { x: segWithFace.focusX, y: segWithFace.focusY } : undefined,
      });
    }
  } else {
    for (let i = 0; i < videoUris.length; i++) {
      clipsMeta.push({ duration: 15 });
    }
  }

  const imageUris = req.userImageUris && req.userImageUris.length > 0 ? req.userImageUris : req.userImageUrls || [];
  const imagesCount = imageUris.length;

  // 3. REPAIR in code with cutSpeed clamping
  const repairedScenes = repairDirectorScenes(
    aiData.scenes,
    totalDuration,
    clipsMeta,
    imagesCount,
    req.mode,
    controls.cutSpeed
  );

  const layers: Layer[] = [];

  // Generate visual layers from repaired scenes
  for (let i = 0; i < repairedScenes.length; i++) {
    const sc = repairedScenes[i];
    const transDef = sc.transition ? Registry.getTransition(sc.transition) : undefined;
    const effectDef = Registry.getEffect(sc.effect);

    if (sc.source === 'image' && imagesCount > 0) {
      const imgIdx = (sc.imageIndex ?? 0) % imagesCount;
      const srcUri = imageUris[imgIdx] || '';
      layers.push({
        id: `scene_img_${i}`,
        name: `Visual Scene ${i + 1}`,
        type: 'image',
        trackIndex: 0,
        startTime: sc.start,
        duration: sc.duration,
        src: srcUri,
        opacity: 1,
        animation: i % 2 === 0 ? 'zoom-in' : 'zoom-out',
        fitMode: 'cover',
        transitionIn: transDef ? { type: sc.transition!, duration: 0.4 } : undefined,
        effects: effectDef ? [{ effectId: sc.effect, enabled: true, params: {} }] : [],
      } as ImageLayer);
    } else {
      const clipIdx = sc.clipIndex;
      const srcUri = videoUris[clipIdx] || '';

      // Punch-in scale keyframes: 1.14 -> 1.0 over 0.35s, else 1.0 -> 1.06 over duration
      const keyframes = sc.punchIn
        ? {
            scale: [
              { time: 0, value: 1.14, easing: 'ease-out' as const },
              { time: 0.35, value: 1.0, easing: 'linear' as const },
            ],
          }
        : {
            scale: [
              { time: 0, value: 1.0, easing: 'linear' as const },
              { time: sc.duration, value: 1.06, easing: 'linear' as const },
            ],
          };

      layers.push({
        id: `scene_vid_${i}`,
        name: i === 0 ? 'Hook Scene' : `Scene ${i + 1}`,
        type: 'video',
        trackIndex: 0,
        startTime: sc.start,
        duration: sc.duration,
        src: srcUri,
        trimIn: sc.clipStart,
        trimOut: sc.clipStart + sc.duration,
        volume: 0,
        opacity: 1,
        focusPoint: sc.focusPoint,
        keyframes,
        transitionIn: transDef ? { type: sc.transition!, duration: 0.4 } : undefined,
        effects: effectDef ? [{ effectId: sc.effect, enabled: true, params: {} }] : [],
      } as VideoLayer);
    }
  }

  // Captions Layer (TrackIndex 2)
  if (captionChunks.length > 0) {
    layers.push({
      id: 'layer_captions',
      name: 'Word-by-Word Captions',
      type: 'caption',
      trackIndex: 2,
      startTime: 0,
      duration: totalDuration,
      chunks: captionChunks,
      styleId: captionStyle,
      baseColor: '#FFFFFF',
      highlightColor: '#06B6D4',
      fontFamily: 'Inter, sans-serif',
      fontSize: 54,
      positionY: 380,
    });
  }

  // 4. Hook Text Layer using hookText (TrackIndex 3)
  layers.push({
    id: 'layer_title_hook',
    name: 'Viral Hook Text',
    type: 'text',
    trackIndex: 3,
    startTime: 0.15,
    duration: Math.min(2.8, totalDuration),
    text: hookText.slice(0, 48),
    fontSize: 54,
    fontFamily: 'Inter, sans-serif',
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(11, 11, 15, 0.85)',
    backgroundPadding: 16,
    backgroundRadius: 14,
    strokeColor: '#000000',
    strokeWidth: 8,
    animationId: 'kinetic-slam',
    animationDuration: 0.45,
  });

  // Voiceover Audio Layer (TrackIndex 4)
  const voiceSrc = req.voiceUri || req.voiceUrl;
  if (voiceSrc) {
    layers.push({
      id: 'layer_voiceover',
      name: 'Primary Voice',
      type: 'audio',
      audioType: 'voiceover',
      trackIndex: 4,
      startTime: 0,
      duration: totalDuration,
      src: voiceSrc,
      volume: 1.0,
    });
  }

  // Background Music Layer (TrackIndex 5)
  const musicSrc = req.musicUri || req.musicUrl || '';
  layers.push({
    id: 'layer_bg_music',
    name: 'Background Music',
    type: 'audio',
    audioType: 'music',
    trackIndex: 5,
    startTime: 0,
    duration: totalDuration,
    src: musicSrc,
    volume: controls.music.volume / 100,
    fadeIn: 0.5,
    fadeOut: 1.0,
    ducking: controls.music.duck
      ? {
          duckWhenVoiceOver: true,
          duckVolume: 0.18,
          attackMs: 150,
          releaseMs: 350,
        }
      : undefined,
  });

  // SFX cues
  const sfxCues: Array<{ time: number; type: 'whoosh' | 'pop' | 'hit' | 'ding' }> = [];

  for (let i = 1; i < repairedScenes.length; i++) {
    sfxCues.push({ time: repairedScenes[i].start, type: 'whoosh' });
  }

  if (aiData.sfx && Array.isArray(aiData.sfx)) {
    for (const cue of aiData.sfx) {
      if (cue.time >= 0 && cue.time < totalDuration) {
        sfxCues.push({ time: cue.time, type: cue.type || 'pop' });
      }
    }
  }

  sfxCues.sort((a, b) => a.time - b.time);

  let lastSfxTime = -999;
  let sfxIdx = 0;
  for (const cue of sfxCues) {
    if (cue.time - lastSfxTime >= 1.5) {
      lastSfxTime = cue.time;
      layers.push({
        id: `sfx_${sfxIdx++}`,
        name: `SFX ${cue.type}`,
        type: 'audio',
        audioType: 'sfx',
        trackIndex: 6,
        startTime: Number(cue.time.toFixed(2)),
        duration: 0.8,
        volume: 0.5,
        src: '', // filled in pipeline.ts via resolveSfx
        sfxType: cue.type,
      } as AudioLayer & { sfxType: string });
    }
  }

  const rawPlan: EditPlan = {
    id: planId,
    title,
    duration: totalDuration,
    fps: 30,
    canvas: {
      width: 1080,
      height: 1920,
      backgroundColor: '#0B0B0F',
    },
    layers,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      directorNotes,
      niche,
      style,
    },
  };

  // Enforce EditControls strictly (switches + user prompt overrides)
  const enforcement = enforceEditControls(rawPlan, controls, req.userPrompt);
  const combinedNotices = [...notices, ...enforcement.notices];

  const bRollQueries = [
    `${niche} cinematic b-roll`,
    'high energy motion background',
    'modern vertical aesthetic',
  ];

  return {
    editPlan: enforcement.plan,
    bRollQueries,
    sfxQueries: ['whoosh', 'pop', 'hit', 'ding'],
    directorNotes,
    musicMood,
    hookText,
    sfx: sfxCues,
    notices: combinedNotices,
  };
}

function buildFallbackPlan(
  req: DirectorRequest,
  totalDuration: number,
  captionChunks: CaptionChunk[],
  captionStyle: string,
  notices: string[] = []
): DirectorResult {
  return assembleFullEditPlan(
    {
      title: req.script?.slice(0, 32) || 'Reelix Short',
      hookText: req.script?.slice(0, 24) || 'Reelix Edit',
      musicMood: req.style === 'Viral High Energy' ? 'hype' : 'upbeat',
      directorNotes: 'Automatic cut sequence adhering to 9:16 viral pacing rules.',
      scenes: [],
    },
    req,
    totalDuration,
    captionChunks,
    captionStyle,
    notices
  );
}

