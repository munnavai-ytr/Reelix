// Reelix Director AI - Produces strict Zod-validated 9:16 Edit Plans with auto-healing, scene tiling, and notice banners
import { EditPlan, Layer, CaptionChunk, VideoLayer, ImageLayer } from '../engine/types';
import { DirectorRequest, DirectorResult } from './types';
import { callGeminiJson } from './gemini';
import { Registry } from '../registry';

export async function generateDirectorPlan(
  req: DirectorRequest,
  words: Array<{ word: string; start: number; end: number }>
): Promise<DirectorResult> {
  const duration = Math.min(180, Math.max(3, req.voiceDuration || req.targetDuration || 30));
  const niche = req.niche || 'General / Tech';
  const style = req.style || 'Viral High Energy';
  const rawCaptionStyle = req.captionStyle || 'karaoke-word-highlight';
  const captionStyle = Registry.getCaptionStyle(rawCaptionStyle) ? rawCaptionStyle : 'karaoke-word-highlight';
  const isTalkingHead = req.mode === 'talking-head';

  // Format caption chunks: max 3 words or 24 characters limit per chunk
  const captionChunks: CaptionChunk[] = [];
  let currentChunkWords: Array<{ word: string; start: number; end: number }> = [];
  let currentLen = 0;

  for (const w of words) {
    const wordLen = w.word.length;
    if (currentChunkWords.length >= 3 || (currentLen + wordLen + 1) > 24) {
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

  const userDescription = req.userPrompt ? `User Edit Instructions: "${req.userPrompt}"` : '';

  const prompt = `You are Reelix Director, an elite AI director for vertical 9:16 Shorts (1080x1920).
Create a vertical video edit plan matching this script and description.
Duration: ${duration.toFixed(1)}s
Niche: ${niche}
Style: ${style}
Mode: ${isTalkingHead ? 'Talking Head (speaker video on screen)' : 'B-Roll & Dynamic Cuts'}
${userDescription}

Script: "${req.script || 'Engaging Short'}"

Return JSON matching this schema:
{
  "title": "Compelling Hook Title",
  "bRollQueries": ["query1", "query2", "query3"],
  "sfxQueries": ["whoosh", "pop", "hit"],
  "directorNotes": "Directing strategy notes",
  "scenes": [
    {
      "name": "Hook Scene",
      "startTime": 0,
      "duration": 3.0,
      "effect": "zoom-punch",
      "transition": "crossfade"
    }
  ]
}`;

  const schema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      bRollQueries: { type: 'ARRAY', items: { type: 'STRING' } },
      sfxQueries: { type: 'ARRAY', items: { type: 'STRING' } },
      directorNotes: { type: 'STRING' },
      scenes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            startTime: { type: 'NUMBER' },
            duration: { type: 'NUMBER' },
            effect: { type: 'STRING' },
            transition: { type: 'STRING' },
          },
        },
      },
    },
    required: ['title', 'bRollQueries', 'scenes'],
  };

  try {
    const parsed = await callGeminiJson<{
      title?: string;
      bRollQueries?: string[];
      sfxQueries?: string[];
      directorNotes?: string;
      scenes?: Array<{
        name?: string;
        startTime?: number;
        duration?: number;
        effect?: string;
        transition?: string;
      }>;
    }>({ contents: [{ parts: [{ text: prompt }] }] }, schema, { kind: 'text' });

    return assembleFullEditPlan(parsed, req, duration, captionChunks, captionStyle, notices);
  } catch (err) {
    console.warn('Gemini director JSON warning, building algorithmic repair plan:', err);
    return buildFallbackPlan(req, duration, captionChunks, captionStyle, notices);
  }
}

function assembleFullEditPlan(
  aiData: {
    title?: string;
    bRollQueries?: string[];
    sfxQueries?: string[];
    directorNotes?: string;
    scenes?: Array<{
      name?: string;
      startTime?: number;
      duration?: number;
      effect?: string;
      transition?: string;
    }>;
  },
  req: DirectorRequest,
  totalDuration: number,
  captionChunks: CaptionChunk[],
  captionStyle: string,
  notices: string[] = []
): DirectorResult {
  const planId = `plan_${Date.now()}`;
  const title = aiData.title || req.script?.slice(0, 32) || 'Reelix Short';
  const bRollQueries = aiData.bRollQueries || ['modern aesthetic', 'inspiring movement', 'neon cinematic'];
  const sfxQueries = aiData.sfxQueries || ['whoosh', 'pop', 'hit'];
  const directorNotes = aiData.directorNotes || 'High energy vertical Short with synchronized cuts.';

  const layers: Layer[] = [];
  const isTalkingHead = req.mode === 'talking-head';

  if (isTalkingHead && req.userVideoUrls && req.userVideoUrls.length > 0) {
    // Talking head mode: main video is primary base track from 0 to D lip-synced
    layers.push({
      id: 'talking_head_primary',
      name: 'Speaker Talking Head',
      type: 'video',
      trackIndex: 0,
      startTime: 0,
      duration: totalDuration,
      src: req.userVideoUrls[0],
      trimIn: 0,
      trimOut: totalDuration,
      volume: 0,
      opacity: 1,
      effects: [{ effectId: 'color-grade', enabled: true, params: { contrast: 1.05 } }],
    } as VideoLayer);

    // If images or extra clips exist, overlay them during speech
    if (req.userImageUrls && req.userImageUrls.length > 0) {
      const imgDur = 2.5;
      const startAt = Math.min(totalDuration - imgDur, 3.0);
      layers.push({
        id: 'overlay_image_1',
        name: 'Supporting Visual',
        type: 'image',
        trackIndex: 1,
        startTime: startAt,
        duration: imgDur,
        src: req.userImageUrls[0],
        opacity: 0.95,
        animation: 'zoom-in',
        fitMode: 'cover',
      } as ImageLayer);
    }
  } else {
    // B-Roll Tiling: tile 0..D seamlessly with no gaps.
    // Minimum 1.2s, Maximum 5.5s
    const targetDur = 3.2;
    const sceneCount = Math.max(1, Math.round(totalDuration / targetDur));
    const sceneDur = totalDuration / sceneCount;

    const availableVideos = req.userVideoUrls || [];
    const availableImages = req.userImageUrls || [];

    let clipCursor = 0;
    let imgCursor = 0;

    for (let i = 0; i < sceneCount; i++) {
      const sStart = Number((i * sceneDur).toFixed(2));
      const sEnd = i === sceneCount - 1 ? totalDuration : Number(((i + 1) * sceneDur).toFixed(2));
      let sDur = Number((sEnd - sStart).toFixed(2));

      // Code repair constraint: clamp between 1.2s and 5.5s
      sDur = Math.max(1.2, Math.min(5.5, sDur));

      let rawEffect = i === 0 ? 'zoom-punch' : (i % 2 === 1 ? 'vignette' : 'glow');
      if (aiData.scenes?.[i]?.effect && Registry.getEffect(aiData.scenes[i].effect!)) {
        rawEffect = aiData.scenes[i].effect!;
      }
      const effectDef = Registry.getEffect(rawEffect);
      const validatedEffect = effectDef ? rawEffect : 'zoom-punch';

      let rawTrans = i === 0 ? undefined : (i % 3 === 0 ? 'wipe' : 'crossfade');
      if (aiData.scenes?.[i]?.transition && Registry.getTransition(aiData.scenes[i].transition!)) {
        rawTrans = aiData.scenes[i].transition!;
      }
      const transDef = rawTrans ? Registry.getTransition(rawTrans) : undefined;

      // Assign user media or mark for B-roll resolution
      let assignedSrc = '';
      let isImg = false;

      if (availableVideos.length > 0) {
        assignedSrc = availableVideos[clipCursor % availableVideos.length];
        clipCursor++;
      } else if (availableImages.length > 0) {
        assignedSrc = availableImages[imgCursor % availableImages.length];
        imgCursor++;
        isImg = true;
      }

      if (isImg) {
        layers.push({
          id: `scene_img_${i}`,
          name: `Visual Scene ${i + 1}`,
          type: 'image',
          trackIndex: 0,
          startTime: sStart,
          duration: sDur,
          src: assignedSrc,
          opacity: 1,
          animation: i % 2 === 0 ? 'zoom-in' : 'zoom-out',
          fitMode: 'cover',
          transitionIn: transDef ? { type: rawTrans!, duration: 0.4 } : undefined,
          effects: [{ effectId: validatedEffect, enabled: true, params: {} }],
        } as ImageLayer);
      } else {
        layers.push({
          id: `scene_vid_${i}`,
          name: i === 0 ? 'Hook Scene' : `Scene ${i + 1}`,
          type: 'video',
          trackIndex: 0,
          startTime: sStart,
          duration: sDur,
          src: assignedSrc,
          trimIn: 0,
          trimOut: sDur,
          volume: 0,
          opacity: 1,
          transitionIn: transDef ? { type: rawTrans!, duration: 0.4 } : undefined,
          effects: [{ effectId: validatedEffect, enabled: true, params: {} }],
        } as VideoLayer);
      }
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

  // Title Hook Overlay (TrackIndex 3)
  layers.push({
    id: 'layer_title_hook',
    name: 'Viral Title Hook',
    type: 'text',
    trackIndex: 3,
    startTime: 0.15,
    duration: 2.6,
    text: title.toUpperCase(),
    fontSize: 56,
    fontFamily: 'Inter, sans-serif',
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(11, 11, 15, 0.8)',
    backgroundPadding: 16,
    backgroundRadius: 14,
    strokeColor: '#000000',
    strokeWidth: 8,
    animationId: 'kinetic-slam',
    animationDuration: 0.45,
  });

  // Voiceover Audio Layer (TrackIndex 4)
  if (req.voiceUrl) {
    layers.push({
      id: 'layer_voiceover',
      name: 'Primary Voice',
      type: 'audio',
      audioType: 'voiceover',
      trackIndex: 4,
      startTime: 0,
      duration: totalDuration,
      src: req.voiceUrl,
      volume: 1.0,
    });
  }

  // Auto-Ducked Background Music Layer (TrackIndex 5)
  layers.push({
    id: 'layer_bg_music',
    name: 'Background Music',
    type: 'audio',
    audioType: 'music',
    trackIndex: 5,
    startTime: 0,
    duration: totalDuration,
    src: '',
    volume: 0.35,
    fadeIn: 0.5,
    fadeOut: 1.0,
    ducking: {
      duckWhenVoiceOver: true,
      duckVolume: 0.18,
      attackMs: 150,
      releaseMs: 350,
    },
  });

  const fullPlan: EditPlan = {
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

  return {
    editPlan: fullPlan,
    bRollQueries,
    sfxQueries,
    directorNotes,
    notices,
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
      bRollQueries: ['neon cinematic aesthetic', 'energetic visuals', 'urban motion'],
      sfxQueries: ['whoosh', 'hit'],
      directorNotes: 'Standard retention edit with animated cuts.',
      scenes: [],
    },
    req,
    totalDuration,
    captionChunks,
    captionStyle,
    [...notices, 'Director plan auto-repaired to guarantee seamless timeline pacing.']
  );
}
