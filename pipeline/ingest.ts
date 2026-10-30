// Step 1: Ingestion & Media Analysis
import { IngestedMedia } from './types';
import { OpfsService } from '../storage/opfs';

export async function ingestMediaInputs(inputs: {
  audioFile?: File | Blob;
  script?: string;
  videoFiles?: File[];
  imageFiles?: File[];
}): Promise<IngestedMedia> {
  let audioUrl = '';
  let audioBlob: Blob | undefined = undefined;
  let audioDuration = 0;

  // 1. Process Voice Audio
  if (inputs.audioFile) {
    audioBlob = inputs.audioFile;
    const filename = `voice_${Date.now()}.wav`;
    const storedUri = await OpfsService.writeFile(filename, audioBlob);
    audioUrl = await OpfsService.resolveToBlobUrl(storedUri);

    // Get exact audio duration via AudioContext
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const ab = await audioBlob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab);
      audioDuration = decoded.duration;
      await ctx.close();
    } catch {
      audioDuration = 30; // fallback default
    }
  } else if (inputs.script) {
    // Estimate 140 words per minute ~ 2.3 words/sec
    const words = inputs.script.trim().split(/\s+/).length;
    audioDuration = Math.max(5, words * 0.42);
  }

  // 2. Process Video Files
  const videoUrls: string[] = [];
  if (inputs.videoFiles && inputs.videoFiles.length > 0) {
    for (let i = 0; i < inputs.videoFiles.length; i++) {
      const file = inputs.videoFiles[i];
      const filename = `clip_${i}_${Date.now()}.mp4`;
      const uri = await OpfsService.writeFile(filename, file);
      const url = await OpfsService.resolveToBlobUrl(uri);
      videoUrls.push(url);
    }
  }

  // 3. Process Image Files
  const imageUrls: string[] = [];
  if (inputs.imageFiles && inputs.imageFiles.length > 0) {
    for (let i = 0; i < inputs.imageFiles.length; i++) {
      const file = inputs.imageFiles[i];
      const filename = `img_${i}_${Date.now()}.jpg`;
      const uri = await OpfsService.writeFile(filename, file);
      const url = await OpfsService.resolveToBlobUrl(uri);
      imageUrls.push(url);
    }
  }

  return {
    audioBlob,
    audioUrl,
    audioDuration,
    videoUrls,
    imageUrls,
    scriptText: inputs.script,
  };
}
