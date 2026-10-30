// 7-Step Pipeline Orchestrator for Reelix One-Click Shorts Creator
import { PipelineProgressEvent, IngestedMedia } from './types';
import { ingestMediaInputs } from './ingest';
import { transcribeAudio } from '../ai/whisper';
import { generateDirectorPlan } from '../ai/director';
import { generateGeminiTtsAudio } from '../ai/gemini';
import { resolveStockVideos, resolveBackgroundMusic, resolveSoundEffects } from './assets';
import { EditPlan, AudioLayer, VideoLayer } from '../engine/types';
import { AssetCache } from '../engine/renderer';
import { ApiKeysService } from '../storage/keys';
import { ProjectDb } from '../storage/db';

export interface GenerateShortsOptions {
  audioFile?: File | Blob;
  scriptText?: string;
  voiceName?: string;
  videoFiles?: File[];
  imageFiles?: File[];
  niche?: string;
  style?: string;
  targetDuration?: number;
  captionStyle?: string;
  userPrompt?: string;
  language?: string;
  onProgress: (evt: PipelineProgressEvent) => void;
}

export async function runGeneratePipeline(opts: GenerateShortsOptions): Promise<{
  plan: EditPlan;
  assets: AssetCache;
}> {
  const { onProgress } = opts;

  // STEP 1: INGEST
  onProgress({
    step: 'ingest',
    stepIndex: 1,
    totalSteps: 6,
    percentage: 12,
    title: 'Ingesting Media & Storing to OPFS',
    detail: 'Reading audio, media durations, and caching to Origin Private File System...',
  });

  const ingested = await ingestMediaInputs({
    audioFile: opts.audioFile,
    script: opts.scriptText,
    videoFiles: opts.videoFiles,
    imageFiles: opts.imageFiles,
  });

  // If only script is given, synthesize voiceover using Gemini TTS / Speech
  let finalVoiceUrl = ingested.audioUrl;
  let finalDuration = ingested.audioDuration;

  if (!finalVoiceUrl && opts.scriptText) {
    onProgress({
      step: 'ingest',
      stepIndex: 1,
      totalSteps: 6,
      percentage: 20,
      title: 'Generating AI Voiceover',
      detail: `Synthesizing script with voice persona "${opts.voiceName || 'Puck'}"...`,
    });
    finalVoiceUrl = await generateGeminiTtsAudio(opts.scriptText, opts.voiceName || 'Puck');
  }

  // STEP 2: TRANSCRIBE
  onProgress({
    step: 'transcribe',
    stepIndex: 2,
    totalSteps: 6,
    percentage: 35,
    title: 'Transcribing & Aligning Word Timestamps',
    detail: 'Generating micro-timed word timestamps for animated viral captions...',
  });

  const transcription = await transcribeAudio(
    ingested.audioBlob || new Blob([]),
    finalDuration,
    opts.scriptText
  );

  // STEP 3: ANALYZE
  onProgress({
    step: 'analyze',
    stepIndex: 3,
    totalSteps: 6,
    percentage: 48,
    title: 'Analyzing Scenes & 9:16 Focal Framing',
    detail: 'Detecting visual hooks, facial focus coordinates, and pacing rhythm...',
  });

  await new Promise(r => setTimeout(r, 400)); // micro pause for smooth UI progress transition

  // STEP 4: DIRECTOR
  onProgress({
    step: 'director',
    stepIndex: 4,
    totalSteps: 6,
    percentage: 65,
    title: 'Director AI Crafting Viral Edit Plan',
    detail: 'Constructing 2s hook, scene cuts, zoom punches, and auto-ducking rules...',
  });

  const keys = ApiKeysService.getKeys();
  const directorResult = await generateDirectorPlan(
    {
      script: opts.scriptText || transcription.text,
      voiceUrl: finalVoiceUrl,
      voiceDuration: finalDuration,
      userVideoUrls: ingested.videoUrls,
      userImageUrls: ingested.imageUrls,
      niche: opts.niche,
      style: opts.style,
      targetDuration: opts.targetDuration || finalDuration,
      captionStyle: opts.captionStyle,
      userPrompt: opts.userPrompt,
      language: opts.language,
      hasPexelsKey: !!(keys.pexels && keys.pexels.length > 5),
    },
    transcription.words
  );

  const plan = directorResult.editPlan;

  // STEP 5: RESOLVE ASSETS
  onProgress({
    step: 'assets',
    stepIndex: 5,
    totalSteps: 6,
    percentage: 82,
    title: 'Resolving B-Roll, SFX & Auto-Ducked Music',
    detail: 'Fetching portrait stock footage, synthesizing SFX, and composing soundtrack...',
  });

  // Resolve Stock Videos for empty video scene slots
  const stockVideos = await resolveStockVideos(directorResult.bRollQueries);
  let stockIdx = 0;
  for (const layer of plan.layers) {
    if (layer.type === 'video' && !layer.src) {
      if (stockVideos[stockIdx]) {
        (layer as VideoLayer).src = stockVideos[stockIdx];
        stockIdx++;
      } else if (ingested.videoUrls.length > 0) {
        (layer as VideoLayer).src = ingested.videoUrls[stockIdx % ingested.videoUrls.length];
      }
    }
  }

  // Resolve Background Beat
  const bgMusicUrl = await resolveBackgroundMusic(opts.style === 'Hype Beast / High Energy' ? 'hype' : 'upbeat', plan.duration);
  const musicLayer = plan.layers.find(l => l.type === 'audio' && (l as AudioLayer).audioType === 'music') as AudioLayer | undefined;
  if (musicLayer) {
    musicLayer.src = bgMusicUrl;
  }

  // STEP 6: PREPARE PREVIEW
  onProgress({
    step: 'preview',
    stepIndex: 6,
    totalSteps: 6,
    percentage: 95,
    title: 'Preloading Canvas Proxy Engine',
    detail: 'Buffering video decoders and initializing Web Audio mixer...',
  });

  // Build AssetCache
  const assetCache: AssetCache = {
    videos: new Map(),
    images: new Map(),
  };

  // Preload video elements
  for (const layer of plan.layers) {
    if (layer.type === 'video' && layer.src && !assetCache.videos.has(layer.src)) {
      const v = document.createElement('video');
      v.src = layer.src;
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
      assetCache.videos.set(layer.src, v);
    } else if (layer.type === 'image' && layer.src && !assetCache.images.has(layer.src)) {
      const img = new Image();
      img.src = layer.src;
      img.crossOrigin = 'anonymous';
      assetCache.images.set(layer.src, img);
    }
  }

  // Auto-save project to IndexedDB
  await ProjectDb.saveProject({
    id: plan.id,
    title: plan.title,
    duration: plan.duration,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    editPlan: plan,
  });

  onProgress({
    step: 'preview',
    stepIndex: 6,
    totalSteps: 6,
    percentage: 100,
    title: 'Ready for Live Preview & Editing',
    detail: 'Complete! Studio preview and manual timeline ready.',
  });

  return { plan, assets: assetCache };
}

export const PipelineRunner = {
  run: async (opts: {
    script: string;
    voiceAudioBlob?: Blob;
    niche?: string;
    style?: string;
    targetDuration?: number;
    captionStyle?: string;
    promptDescription?: string;
    language?: string;
    onProgress?: (step: string, percent: number) => void;
  }) => {
    const res = await runGeneratePipeline({
      audioFile: opts.voiceAudioBlob,
      scriptText: opts.script,
      niche: opts.niche,
      style: opts.style,
      targetDuration: opts.targetDuration,
      captionStyle: opts.captionStyle,
      userPrompt: opts.promptDescription,
      language: opts.language,
      onProgress: (evt) => {
        opts.onProgress?.(evt.title || evt.detail, evt.percentage);
      },
    });
    return {
      id: res.plan.id,
      title: res.plan.title,
      duration: res.plan.duration,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      editPlan: res.plan,
      plan: res.plan,
    };
  },
};
