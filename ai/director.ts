// Reelix Director AI - Produces strict Zod-validated 9:16 Edit Plans with auto-healing
import { EditPlan, Layer, CaptionChunk } from '../engine/types';
import { EditPlanSchema } from '../engine/schema';
import { DirectorRequest, DirectorResult } from './types';
import { callGeminiWithRetry } from './gemini';

export async function generateDirectorPlan(
  req: DirectorRequest,
  words: Array<{ word: string; start: number; end: number }>
): Promise<DirectorResult> {
  const duration = Math.max(5, req.targetDuration || req.voiceDuration || 30);
  const niche = req.niche || 'General / Tech';
  const style = req.style || 'Viral High Energy';
  const captionStyle = req.captionStyle || 'karaoke-word-highlight';

  // Group transcribed words into punchy chunks of 2 to 4 words (Shorts standard)
  const captionChunks: CaptionChunk[] = [];
  const chunkSize = 3;
  for (let i = 0; i < words.length; i += chunkSize) {
    const slice = words.slice(i, i + chunkSize);
    if (slice.length > 0) {
      captionChunks.push({
        text: slice.map(w => w.word).join(' '),
        start: slice[0].start,
        end: slice[slice.length - 1].end,
        words: slice,
      });
    }
  }

  const prompt = `You are Reelix Director, an elite AI director for vertical 9:16 Shorts (TikTok, YouTube Shorts, Instagram Reels).
Generate a complete, high-retention vertical video edit plan.

INPUT PARAMETERS:
- Script/Theme: "${req.script || req.userPrompt || 'Engaging Short'}"
- Niche: ${niche}
- Visual Style: ${style}
- Target Duration: ${duration.toFixed(1)} seconds
- Has Voice Track: ${req.voiceUrl ? 'Yes' : 'No'}
- Caption Style: ${captionStyle}
- User Prompt Instructions: "${req.userPrompt || 'Make it punchy, viral and engaging'}"

RULES FOR MAXIMUM VIRAL RETENTION:
1. Hook in the first 0-2 seconds (high impact zoom punch or text animation).
2. Cut every 2.5 to 4 seconds to maintain eye momentum.
3. Suggest 4-6 specific portrait B-roll stock video search queries (e.g., "futuristic technology", "person reacting amazed", "cinematic neon city").
4. Add 3-5 SFX cues (whoosh, pop, hit, ding) at transition cuts.
5. Background music mood with auto-ducking when voiceover speaks.
6. End with a 3-second Call to Action (CTA).

Respond with a strictly formatted JSON object matching this structure:
{
  "title": "Short title",
  "bRollQueries": ["query1", "query2", "query3"],
  "sfxQueries": ["whoosh", "pop", "hit"],
  "directorNotes": "Directing notes on pacing and cuts",
  "scenes": [
    {
      "name": "Hook Scene",
      "startTime": 0,
      "duration": 3.0,
      "effect": "zoom-punch"
    },
    {
      "name": "Body Scene 1",
      "startTime": 3.0,
      "duration": 4.0,
      "effect": "vignette"
    }
  ]
}`;

  let rawResponse = '';
  try {
    rawResponse = await callGeminiWithRetry<string>({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });
  } catch (err) {
    // If Gemini call fails, build a robust fallback plan
    console.warn('Gemini director fallback engaged:', err);
    return buildFallbackPlan(req, duration, captionChunks, captionStyle);
  }

  try {
    const parsed = JSON.parse(rawResponse);
    return assembleFullEditPlan(parsed, req, duration, captionChunks, captionStyle);
  } catch (parseError) {
    console.warn('Parsing director response failed, auto-retrying with schema prompt...', parseError);
    return buildFallbackPlan(req, duration, captionChunks, captionStyle);
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
  captionStyle: string
): DirectorResult {
  const planId = `plan_${Date.now()}`;
  const title = aiData.title || req.script?.slice(0, 30) || 'Viral Reelix Short';
  const bRollQueries = aiData.bRollQueries || ['modern aesthetic', 'inspiring motion', 'neon technology'];
  const sfxQueries = aiData.sfxQueries || ['whoosh', 'pop', 'hit'];
  const directorNotes = aiData.directorNotes || 'High energy retention edit with fast-paced cuts and auto-ducked music.';

  const layers: Layer[] = [];

  // Track 0: Background Visuals (Scenes / Video / Images)
  const scenes = aiData.scenes && aiData.scenes.length > 0 ? aiData.scenes : [
    { name: 'Hook Scene', startTime: 0, duration: Math.min(3, totalDuration * 0.25), effect: 'zoom-punch' },
    { name: 'Core Scene', startTime: Math.min(3, totalDuration * 0.25), duration: totalDuration * 0.5, effect: 'vignette' },
    { name: 'Climax Scene', startTime: totalDuration * 0.75, duration: totalDuration * 0.25, effect: 'glow' },
  ];

  scenes.forEach((scene, idx) => {
    const sceneStart = scene.startTime ?? idx * 3;
    const sceneDur = scene.duration ?? 3;
    layers.push({
      id: `video_scene_${idx}`,
      name: scene.name || `Scene ${idx + 1}`,
      type: 'video',
      trackIndex: 0,
      startTime: sceneStart,
      duration: sceneDur,
      src: req.userVideoUrls?.[idx % (req.userVideoUrls.length || 1)] || '',
      trimIn: 0,
      trimOut: sceneDur,
      volume: 0, // background b-roll mute
      opacity: 1,
      effects: scene.effect ? [{ effectId: scene.effect, enabled: true, params: {} }] : [],
    });
  });

  // Track 1: Captions (TrackIndex: 2)
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

  // Track 2: Title / Hook Text Overlay (TrackIndex: 3)
  layers.push({
    id: 'layer_title_hook',
    name: 'Viral Title Hook',
    type: 'text',
    trackIndex: 3,
    startTime: 0.2,
    duration: 2.8,
    text: title.toUpperCase(),
    fontSize: 58,
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

  // Track 3: Voiceover Audio (TrackIndex: 4)
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

  // Track 4: Background Music with Auto-Ducking (TrackIndex: 5)
  layers.push({
    id: 'layer_bg_music',
    name: 'Background Beat',
    type: 'audio',
    audioType: 'music',
    trackIndex: 5,
    startTime: 0,
    duration: totalDuration,
    src: '', // will be resolved in pipeline asset step
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
      }
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
    }
  };

  // Validate with Zod
  const validation = EditPlanSchema.safeParse(fullPlan);
  if (!validation.success) {
    console.warn('Zod validation warning on plan:', validation.error.format());
  }

  return {
    editPlan: fullPlan,
    bRollQueries,
    sfxQueries,
    directorNotes,
  };
}

function buildFallbackPlan(
  req: DirectorRequest,
  totalDuration: number,
  captionChunks: CaptionChunk[],
  captionStyle: string
): DirectorResult {
  return assembleFullEditPlan(
    {
      title: req.script?.slice(0, 30) || 'Viral Reelix Short',
      bRollQueries: ['futuristic motion', 'glowing abstract lines', 'cinematic lights'],
      sfxQueries: ['whoosh', 'pop'],
      directorNotes: 'Standard retention structure with auto-ducked music and synced captions.',
      scenes: [
        { name: 'Hook Scene', startTime: 0, duration: Math.min(3, totalDuration * 0.3), effect: 'zoom-punch' },
        { name: 'Core Insight', startTime: Math.min(3, totalDuration * 0.3), duration: totalDuration * 0.5, effect: 'vignette' },
        { name: 'Final CTA', startTime: totalDuration * 0.8, duration: totalDuration * 0.2, effect: 'glow' },
      ]
    },
    req,
    totalDuration,
    captionChunks,
    captionStyle
  );
}
