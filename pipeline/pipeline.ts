// 6-Step Pipeline Orchestrator for Reelix One-Click Shorts Creator with detailed error visibility
import { PipelineProgressEvent } from './types';
import { ingestMediaInputs } from './ingest';
import { transcribeAudio } from '../ai/whisper';
import { analyzeVideoClipsWithGemini } from '../ai/clip-analysis';
import { generateDirectorPlan } from '../ai/director';
import { resolveStockVideos, resolveBackgroundMusic, resolveSfx } from './assets';
import { EditPlan, AudioLayer, VideoLayer } from '../engine/types';
import { AssetCache } from '../engine/renderer';
import { ensureAssets, releaseAssetCache } from '../engine/media';
import { ApiKeysService } from '../storage/keys';
import { OpfsService } from '../storage/opfs';
import { ProjectDb } from '../storage/db';

export interface GenerateShortsOptions {
  audioFile?: File | Blob;
  scriptText?: string;
  videoFiles?: File[];
  imageFiles?: File[];
  musicFile?: File | Blob;
  removeSilence?: boolean;
  niche?: string;
  style?: string;
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

  // STEP 1: INGEST & OPFS
  onProgress({
    step: 'ingest',
    stepIndex: 1,
    totalSteps: 6,
    percentage: 14,
    title: 'Reading Files & Media Analysis',
    detail: 'Caching video clips, audio tracks, and images to high-speed local OPFS...',
  });

  let ingested;
  try {
    ingested = await ingestMediaInputs({
      audioFile: opts.audioFile,
      script: opts.scriptText,
      videoFiles: opts.videoFiles,
      imageFiles: opts.imageFiles,
      musicFile: opts.musicFile,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    console.error('[Pipeline Error] Step 1 – Reading files:', err);
    throw new Error(`Step 1 – Reading files: ${msg}`);
  }

  // Check user prompt for silence keywords
  const promptLower = (opts.userPrompt || '').toLowerCase();
  const silenceRequested =
    opts.removeSilence ||
    promptLower.includes('silence') ||
    promptLower.includes('pause') ||
    promptLower.includes('gap') ||
    promptLower.includes('dead air') ||
    promptLower.includes('সাইলেন্স');

  // STEP 2: TRANSCRIBE & SILENCE COMPACTION
  onProgress({
    step: 'transcribe',
    stepIndex: 2,
    totalSteps: 6,
    percentage: 32,
    title: silenceRequested ? 'Listening to Voice & Removing Silences' : 'Listening to Voice & Word Alignment',
    detail: silenceRequested
      ? 'Detecting 20ms silence windows, compacting speech segments, and extracting verbatim words...'
      : 'Generating word-level timestamps and timing boundaries with Gemini...',
  });

  let transcription;
  let finalDuration = ingested.audioDuration;
  let finalVoiceUrl = ingested.audioUrl;
  let finalVoiceUri = ingested.audioUri || ingested.audioUrl;

  try {
    transcription = await transcribeAudio(
      ingested.audioBlob!,
      ingested.audioDuration,
      opts.scriptText,
      silenceRequested
    );

    if (transcription.processedBlob && transcription.processedDuration) {
      finalDuration = transcription.processedDuration;
      try {
        const filename = `voice_compacted_${Date.now()}.wav`;
        const uri = await OpfsService.writeFile(filename, transcription.processedBlob);
        finalVoiceUri = uri;
        finalVoiceUrl = await OpfsService.resolveToBlobUrl(uri);
      } catch {
        finalVoiceUrl = URL.createObjectURL(transcription.processedBlob);
        finalVoiceUri = finalVoiceUrl;
      }
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    console.error('[Pipeline Error] Step 2 – Listening to voice:', err);
    throw new Error(`Step 2 – Listening to voice: ${msg}`);
  }

  // STEP 3: UNDERSTAND CLIPS
  onProgress({
    step: 'analyze',
    stepIndex: 3,
    totalSteps: 6,
    percentage: 48,
    title: 'Understanding Video Clips',
    detail: ingested.videoUrls.length > 0
      ? `Sampling video frames across ${ingested.videoUrls.length} clips and analyzing focal centers...`
      : 'Setting up dynamic 9:16 layout structure...',
  });

  let clipAnalysis;
  try {
    if (ingested.videoUrls.length > 0) {
      clipAnalysis = await analyzeVideoClipsWithGemini(ingested.videoUrls);
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    console.error('[Pipeline Error] Step 3 – Understanding clips:', err);
    throw new Error(`Step 3 – Understanding clips: ${msg}`);
  }

  // STEP 4: DIRECTOR PLANNING
  onProgress({
    step: 'director',
    stepIndex: 4,
    totalSteps: 6,
    percentage: 66,
    title: 'Director AI Planning Cut Sequence',
    detail: 'Structuring 2s viral hook, matching pacing rhythm, and locking timeline cut points...',
  });

  let directorResult;
  let plan: EditPlan;
  try {
    const keys = ApiKeysService.getKeys();
    directorResult = await generateDirectorPlan(
      {
        script: opts.scriptText || transcription.text,
        voiceUrl: finalVoiceUrl,
        voiceUri: finalVoiceUri,
        voiceDuration: finalDuration,
        userVideoUrls: ingested.videoUrls,
        userVideoUris: ingested.videoUris,
        userImageUrls: ingested.imageUrls,
        userImageUris: ingested.imageUris,
        musicUrl: ingested.musicUrl,
        musicUri: ingested.musicUri,
        clipAnalysis,
        mode: ingested.isTalkingHead ? 'talking-head' : 'broll',
        niche: opts.niche,
        style: opts.style,
        targetDuration: finalDuration,
        captionStyle: opts.captionStyle,
        userPrompt: opts.userPrompt,
        language: opts.language,
        hasPexelsKey: !!(keys.pexels && keys.pexels.length > 5),
      },
      transcription.words
    );
    plan = directorResult.editPlan;
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    console.error('[Pipeline Error] Step 4 – Director planning:', err);
    throw new Error(`Step 4 – Director planning: ${msg}`);
  }

  // STEP 5: COLLECTING ASSETS
  onProgress({
    step: 'assets',
    stepIndex: 5,
    totalSteps: 6,
    percentage: 84,
    title: 'Collecting B-Roll & Soundtrack',
    detail: 'Assigning media layers and setting up auto-ducking audio parameters...',
  });

  try {
    if (!ingested.isTalkingHead && plan.layers.some((l) => l.type === 'video' && !(l as VideoLayer).src)) {
      const stockVideos = await resolveStockVideos(directorResult.bRollQueries);
      let stockIdx = 0;
      for (const layer of plan.layers) {
        if (layer.type === 'video' && !(layer as VideoLayer).src) {
          if (stockVideos[stockIdx]) {
            (layer as VideoLayer).src = stockVideos[stockIdx];
            stockIdx++;
          } else if (ingested.videoUrls.length > 0) {
            (layer as VideoLayer).src = ingested.videoUrls[stockIdx % ingested.videoUrls.length];
          }
        }
      }
    }

    // Soundtrack: use user uploaded music or resolve default background track
    const musicLayer = plan.layers.find(
      (l) => l.type === 'audio' && (l as AudioLayer).audioType === 'music'
    ) as AudioLayer | undefined;

    if (musicLayer) {
      if (ingested.musicUrl) {
        musicLayer.src = ingested.musicUrl;
      } else {
        const mood = directorResult.musicMood || (opts.style === 'Viral High Energy' ? 'hype' : 'upbeat');
        const bgMusicUrl = await resolveBackgroundMusic(mood, plan.duration);
        musicLayer.src = bgMusicUrl;
      }
    }

    // Resolve SFX audio layers (swishes, impacts, risers, cut whooshes)
    const sfxLayers = plan.layers.filter(
      (l) => l.type === 'audio' && (l as AudioLayer).audioType === 'sfx'
    ) as AudioLayer[];

    if (sfxLayers.length > 0) {
      const typesToResolve = sfxLayers.map((l) => l.sfxType || 'whoosh');
      try {
        const resolvedMap = await resolveSfx(typesToResolve);
        for (const l of sfxLayers) {
          const sfxType = l.sfxType || 'whoosh';
          if (!l.src || l.src.startsWith('sfx:')) {
            l.src = resolvedMap[sfxType] || resolvedMap['whoosh'] || '';
          }
        }
      } catch (e) {
        console.warn('[Pipeline] SFX resolve failed:', e);
      }
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    console.error('[Pipeline Error] Step 5 – Collecting assets:', err);
    throw new Error(`Step 5 – Collecting assets: ${msg}`);
  }

  // STEP 6: LOADING PREVIEW
  onProgress({
    step: 'preview',
    stepIndex: 6,
    totalSteps: 6,
    percentage: 96,
    title: 'Loading Preview & Initializing Decoders',
    detail: 'Preloading canvas assets and saving project to IndexedDB...',
  });

  try {
    const warmUpCache = await ensureAssets(plan);
    releaseAssetCache(warmUpCache);

    await ProjectDb.saveProject({
      id: plan.id,
      title: plan.title,
      duration: plan.duration,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      editPlan: plan,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    console.error('[Pipeline Error] Step 6 – Loading preview:', err);
    throw new Error(`Step 6 – Loading preview: ${msg}`);
  }

  onProgress({
    step: 'preview',
    stepIndex: 6,
    totalSteps: 6,
    percentage: 100,
    title: 'Ready for Live Preview & Editing',
    detail: 'Complete! Your vertical Short is ready in the studio.',
  });

  return { plan, assets: { videos: new Map(), images: new Map() } };
}
