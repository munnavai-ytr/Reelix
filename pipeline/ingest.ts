// Step 1: Ingestion, Audio Extraction, and OPFS Persistence
import { IngestedMedia } from './types';
import { OpfsService } from '../storage/opfs';
import { encode16BitWav } from '../ai/whisper';

export async function extractAudioFromVideo(
  videoFile: File | Blob
): Promise<{ wavBlob: Blob; duration: number; originalWavBlob: Blob }> {
  try {
    const arrayBuffer = await videoFile.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();

    if (!decoded || decoded.duration < 0.2) {
      throw new Error('This video has no readable audio track');
    }

    // 1. High-fidelity audio at original sample rate for the project voiceover track
    const origSampleRate = decoded.sampleRate;
    const origLength = Math.max(1, decoded.length);
    const origOfflineCtx = new OfflineAudioContext(1, origLength, origSampleRate);
    const origSource = origOfflineCtx.createBufferSource();
    origSource.buffer = decoded;
    origSource.connect(origOfflineCtx.destination);
    origSource.start(0);
    const origRendered = await origOfflineCtx.startRendering();
    const origChannel = origRendered.getChannelData(0);
    const origWavBuffer = encode16BitWav(origChannel, origSampleRate);
    const originalWavBlob = new Blob([origWavBuffer], { type: 'audio/wav' });

    // 2. 16kHz mono WAV for Gemini multimodal transcription
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

    return { wavBlob, duration: decoded.duration, originalWavBlob };
  } catch (err: unknown) {
    const msg = (err as Error)?.message;
    if (msg?.includes('audio track')) {
      throw err;
    }
    throw new Error('This video has no readable audio track');
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
  let audioUri = '';
  let audioBlob: Blob | undefined = undefined;
  let audioDuration = 0;
  let isTalkingHead = false;

  // 1. Process Video Files first
  const videoUrls: string[] = [];
  const videoUris: string[] = [];
  if (inputs.videoFiles && inputs.videoFiles.length > 0) {
    for (let i = 0; i < inputs.videoFiles.length; i++) {
      const file = inputs.videoFiles[i];
      const filename = `clip_${i}_${Date.now()}.mp4`;
      const uri = await OpfsService.writeFile(filename, file);
      const url = await OpfsService.resolveToBlobUrl(uri);
      videoUris.push(uri);
      videoUrls.push(url);
    }
  }

  // 2. Process Voice Audio
  if (inputs.audioFile) {
    audioBlob = inputs.audioFile;
    const filename = `voice_${Date.now()}.wav`;
    const storedUri = await OpfsService.writeFile(filename, audioBlob);
    audioUri = storedUri;
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
      // Use original high-fidelity sample rate for project track
      audioBlob = extracted.originalWavBlob;
      audioDuration = extracted.duration;
      const filename = `voice_extracted_${Date.now()}.wav`;
      const storedUri = await OpfsService.writeFile(filename, audioBlob);
      audioUri = storedUri;
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
  const imageUris: string[] = [];
  if (inputs.imageFiles && inputs.imageFiles.length > 0) {
    for (let i = 0; i < inputs.imageFiles.length; i++) {
      const file = inputs.imageFiles[i];
      const filename = `img_${i}_${Date.now()}.jpg`;
      const uri = await OpfsService.writeFile(filename, file);
      const url = await OpfsService.resolveToBlobUrl(uri);
      imageUris.push(uri);
      imageUrls.push(url);
    }
  }

  // 4. Process Optional Music File
  let musicUrl: string | undefined;
  let musicUri: string | undefined;
  if (inputs.musicFile) {
    const filename = `music_${Date.now()}.mp3`;
    const uri = await OpfsService.writeFile(filename, inputs.musicFile);
    musicUri = uri;
    musicUrl = await OpfsService.resolveToBlobUrl(uri);
  }

  return {
    audioBlob,
    audioUrl,
    audioUri,
    audioDuration,
    videoUrls,
    videoUris,
    imageUrls,
    imageUris,
    musicUrl,
    musicUri,
    scriptText: inputs.script,
    isTalkingHead,
  };
}
