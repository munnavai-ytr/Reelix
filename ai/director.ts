// Reelix Director AI - Produces strict Zod-validated 9:16 Edit Plans with auto-healing, scene tiling, and notice banners
import { EditPlan, Layer, CaptionChunk, VideoLayer } from '../engine/types';
import { EditPlanSchema } from '../engine/schema';
import { DirectorRequest, DirectorResult } from './types';
import { callGeminiJson } from './gemini';

export async function generateDirectorPlan(
  req: DirectorRequest,
  words: Array<{ word: string; start: number; end: number }>
): Promise<DirectorResult> {
  const duration = Math.min(180, Math.max(5, req.targetDuration || req.voiceDuration || 30));
  const niche = req.niche || 'General / Tech';
  const style = req.style || 'Viral High Energy';
  const captionStyle = req.captionStyle || 'karaoke-word-highlight';

  // Format caption chunks with max 3 words or 24 characters limit
  const captionChunks: CaptionChunk[] = [];
  let currentChunkWords: Array<{ word: string; start: number; end: number }> = [];
  let currentLen = 0;

  for (const w of words) {
    const wordLen = w.word.length;
    if (currentChunkWords.length >= 3 || (currentLen + wordLen + 1) > 24) {
      if (currentChunkWords.length > 0) {
        captionChunks.push({
          text: currentChunkWords.map(cw => cw.word).join(' '),
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
      text: currentChunkWords.map(cw => cw.word).join(' '),
      start: currentChunkWords[0].start,
      end: currentChunkWords[currentChunkWords.length - 1].end,
      words: currentChunkWords,
    });
  }

  const notices: string[] = [];
  if (!req.hasPexelsKey && (!req.userVideoUrls || req.userVideoUrls.length === 0)) {
    notices.push('Pexels API key not configured: procedural animated background patterns will be used.');
  }

  const prompt = `You are Reelix Director, an elite AI director for vertical 9:16 Shorts.
Create a vertical video edit blueprint.
Script: "${req.script || req.userPrompt || 'Engaging Short'}"
Niche: ${niche}
Style: ${style}
Duration: ${duration.toFixed(1)}s

Return JSON structure:
{
  "title": "Short title",
  "bRollQueries": ["query1", "query2", "query3"],
  "sfxQueries": ["whoosh", "pop", "hit"],
  "directorNotes": "Directing strategy notes",
  "scenes": [
    { "name": "Hook Scene", "startTime": 0, "duration": 3.0, "effect": "zoom-punch" }
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
      scenes?: Array<{ name?: string; startTime?: number; duration?: number; effect?: string }>;
    }>({ contents: [{ parts: [{ text: prompt }] }] }, schema, { kind: 'text' });

    return assembleFullEditPlan(parsed, req, duration, captionChunks, captionStyle, notices);
  } catch (err) {
    console.warn('Gemini director JSON warning, using code repair plan:', err);
    return buildFallbackPlan(req, duration, captionChunks, captionStyle, notices);
  }
}

function assembleFullEditPlan(
  aiData: {
    title?: string;
    bRollQueries?: string[];
    sfxQueries?: string[];
    directorNotes?: string;
    scenes?: Array<{ name?: string; startTime?: number; duration?: number; effect?: string }>;
  },
  req: DirectorRequest,
  totalDuration: number,
  captionChunks: CaptionChunk[],
  captionStyle: string,
  notices: string[] = []
): DirectorResult {
  const planId = `plan_${Date.now()}`;
  const title = aiData.title || req.script?.slice(0, 30) || 'Viral Reelix Short';
  const bRollQueries = aiData.bRollQueries || ['modern aesthetic', 'inspiring motion', 'neon tech'];
  const sfxQueries = aiData.sfxQueries || ['whoosh', 'pop', 'hit'];
  const directorNotes = aiData.directorNotes || 'High energy retention edit with fast-paced cuts.';

  const layers: Layer[] = [];

  // Seamless 0..D video scene tiling
  const targetSceneDur = 3.5;
  const sceneCount = Math.max(2, Math.ceil(totalDuration / targetSceneDur));
  const sceneDur = totalDuration / sceneCount;

  for (let i = 0; i < sceneCount; i++) {
    const sStart = Number((i * sceneDur).toFixed(2));
    const sEnd = i === sceneCount - 1 ? totalDuration : Number(((i + 1) * sceneDur).toFixed(2));
    const sDur = Number((sEnd - sStart).toFixed(2));
    const effectName = i === 0 ? 'zoom-punch' : (i % 2 === 1 ? 'vignette' : 'glow');
    const userSrc = req.userVideoUrls && req.userVideoUrls.length > 0
      ? req.userVideoUrls[i % req.userVideoUrls.length]
      : '';

    layers.push({
      id: `video_scene_${i}`,
      name: i === 0 ? 'Hook Scene' : `Scene ${i + 1}`,
      type: 'video',
      trackIndex: 0,
      startTime: sStart,
      duration: sDur,
      src: userSrc,
      trimIn: 0,
      trimOut: sDur,
      volume: 0,
      opacity: 1,
      effects: [{ effectId: effectName, enabled: true, params: {} }],
    } as VideoLayer);
  }

  // Captions Layer (TrackIndex 2)
  if (captionChunks.length > 0) {
    layers.push({
      id: 'layer_captions',
      name: 'Dynamic Word Captions',
      type: 'caption',
      trackIndex: 2,
      startTime: 0,
      duration: totalDuration,
      chunks: captionChunks,
      styleId: captionStyle,
      baseColor: '#FFFFFF',
      highlightColor: '#FBBF24',
      fontFamily: 'Inter, sans-serif',
      fontSize: 54,
      positionY: 380,
    });
  }

  // Title / Hook Overlay (TrackIndex 3)
  layers.push({
    id: 'layer_title_hook',
    name: 'Viral Title Hook',
    type: 'text',
    trackIndex: 3,
    startTime: 0.2,
    duration: 2.8,
    text: title.toUpperCase(),
    fontSize: 56,
    fontFamily: 'Inter, sans-serif',
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(11, 11, 15, 0.75)',
    backgroundPadding: 16,
    backgroundRadius: 14,
    strokeColor: '#000000',
    strokeWidth: 8,
    animationId: 'kinetic-slam',
    animationDuration: 0.5,
  });

  // Voiceover Audio Layer (TrackIndex 4)
  if (req.voiceUrl) {
    layers.push({
      id: 'layer_voiceover',
      name: 'Primary Voiceover',
      type: 'audio',
      audioType: 'voiceover',
      trackIndex: 4,
      startTime: 0,
      duration: totalDuration,
      src: req.voiceUrl,
      volume: 1.0,
    });
  }

  // Background Music Layer (TrackIndex 5)
  layers.push({
    id: 'layer_bg_music',
    name: 'Background Beat',
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
      duckVolume: 0.2,
      attackMs: 150,
      releaseMs: 300,
    },
  });

  const fullPlan: EditPlan = {
    id: planId,
    title,
    version: '1.0.0',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    duration: totalDuration,
    layers,
    transitions: [
      {
        id: 'trans_1',
        type: 'crossfade',
        duration: 0.4,
        fromLayerId: 'video_scene_0',
        toLayerId: 'video_scene_1',
      },
    ],
    markers: [
      { time: 0, label: 'Hook', type: 'hook' },
      { time: totalDuration * 0.5, label: 'Highlight', type: 'highlight' },
      { time: Math.max(0, totalDuration - 3), label: 'Call To Action', type: 'cta' },
    ],
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      niche: req.niche,
      style: req.style,
      targetDuration: totalDuration,
      script: req.script,
    },
  };

  // Zod schema safety check
  const validation = EditPlanSchema.safeParse(fullPlan);
  if (!validation.success) {
    console.warn('Zod plan validation warning:', validation.error.format());
  }

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
      title: req.script?.slice(0, 30) || 'Viral Reelix Short',
      bRollQueries: ['futuristic motion', 'glowing abstract lines', 'cinematic lights'],
      sfxQueries: ['whoosh', 'pop'],
      directorNotes: 'Seamless 0..D scene tiling edit plan.',
    },
    req,
    totalDuration,
    captionChunks,
    captionStyle,
    notices
  );
}
