// Step 1: Ingestion, Audio Extraction, and OPFS Persistence
import { IngestedMedia } from './types';
import { OpfsService } from '../storage/opfs';
import { encode16BitWav } from '../ai/whisper';

export async function extractAudioFromVideo(
  videoFile: File | Blob
): Promise<{ wavBlob: Blob; duration: number } | null> {
  try {
    const arrayBuffer = await videoFile.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();

    const targetSampleRate = 16000;
    const targetLength = Math.ceil(decoded.duration * targetSampleRate);
    const offlineCtx = new OfflineAudioContext(1, Math.max(1, targetLength), targetSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    const channelData = rendered.getChannelData(0);
    const wavBuffer = encode16BitWav(channelData, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    return { wavBlob, duration: decoded.duration };
  } catch (err) {
    console.warn('Could not extract audio track from video file:', err);
    return null;
  }
}

export async function ingestMediaInputs(inputs: {
  audioFile?: File | Blob;
  script?: string;
  videoFiles?: File[];
  imageFiles?: File[];
  musicFile?: File | Blob;
}): Promise<IngestedMedia> {
  let audioUrl = '';
  let audioBlob: Blob | undefined = undefined;
  let audioDuration = 0;
  let isTalkingHead = false;

  // 1. Process Video Files first
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

  // 2. Process Voice Audio
  if (inputs.audioFile) {
    audioBlob = inputs.audioFile;
    const filename = `voice_${Date.now()}.wav`;
    const storedUri = await OpfsService.writeFile(filename, audioBlob);
    audioUrl = await OpfsService.resolveToBlobUrl(storedUri);

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const ab = await audioBlob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab);
      audioDuration = decoded.duration;
      await ctx.close();
    } catch {
      audioDuration = 10;
    }
  } else if (inputs.videoFiles && inputs.videoFiles.length > 0) {
    // If no separate voice audio provided, extract audio from the first video clip
    const extracted = await extractAudioFromVideo(inputs.videoFiles[0]);
    if (extracted && extracted.duration > 0.5) {
      audioBlob = extracted.wavBlob;
      audioDuration = extracted.duration;
      const filename = `voice_extracted_${Date.now()}.wav`;
      const storedUri = await OpfsService.writeFile(filename, audioBlob);
      audioUrl = await OpfsService.resolveToBlobUrl(storedUri);
      isTalkingHead = true;
    }
  }

  // If still no voice audio and no video with audio, fail honestly according to product rules
  if (!audioBlob || audioDuration < 0.2) {
    throw new Error('Please upload a voice recording, audio file, or video clip with speech.');
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

  // 4. Process Optional Music File
  let musicUrl: string | undefined;
  if (inputs.musicFile) {
    const filename = `music_${Date.now()}.mp3`;
    const uri = await OpfsService.writeFile(filename, inputs.musicFile);
    musicUrl = await OpfsService.resolveToBlobUrl(uri);
  }

  return {
    audioBlob,
    audioUrl,
    audioDuration,
    videoUrls,
    imageUrls,
    musicUrl,
    scriptText: inputs.script,
    isTalkingHead,
  };
}
