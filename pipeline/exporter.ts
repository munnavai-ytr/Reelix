// Robust WebCodecs + mp4-muxer Exporter with Codec Probing, Backpressure, Audio Mixdown, and Presets
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { EditPlan, AudioLayer } from '../engine/types';
import { renderFrame, AssetCache } from '../engine/renderer';
import { computeAudioDuckingVolume } from '../engine/timeline';
import { resolveSrc } from '../engine/media';

export interface ExportProgress {
  percentage: number;
  currentFrame: number;
  totalFrames: number;
  phase: 'rendering' | 'encoding_audio' | 'muxing' | 'complete';
}

export interface ExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
}

export async function exportVideoMp4(
  plan: EditPlan,
  assets: AssetCache,
  onProgress: (p: ExportProgress) => void,
  options: ExportOptions = {}
): Promise<Blob> {
  const width = options.width || 1080;
  const height = options.height || 1920;
  const fps = options.fps || 30;
  const bitrate = options.bitrate || 8_000_000;
  const totalFrames = Math.max(1, Math.floor(plan.duration * fps));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('Could not create 2D canvas context for export');

  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;

  if (hasWebCodecs) {
    try {
      return await exportViaWebCodecs(plan, canvas, ctx, assets, width, height, fps, bitrate, totalFrames, onProgress);
    } catch (err) {
      console.warn('WebCodecs export failed, attempting MediaRecorder fallback:', err);
    }
  }

  return await exportViaMediaRecorder(plan, canvas, ctx, assets, width, height, fps, bitrate, totalFrames, onProgress);
}

async function probeBestSupportedVideoCodec(width: number, height: number, fps: number, bitrate: number): Promise<string> {
  const candidates = [
    'avc1.64002A', // H.264 High Profile 4.2
    'avc1.4D0028', // H.264 Main Profile 4.0
    'avc1.42E01F', // H.264 Baseline 3.1
    'vp09.00.40.08', // VP9 Profile 0
  ];

  for (const codec of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (support.supported) {
        return codec;
      }
    } catch {
      // ignore
    }
  }

  return 'avc1.42E01F'; // default safe baseline
}

async function mixOfflineAudio(plan: EditPlan, sampleRate = 48000): Promise<AudioBuffer | null> {
  const audioLayers = plan.layers.filter(l => l.type === 'audio' && l.src) as AudioLayer[];
  if (audioLayers.length === 0) return null;

  const totalLengthSamples = Math.ceil(plan.duration * sampleRate);
  if (totalLengthSamples <= 0) return null;

  const offlineCtx = new OfflineAudioContext(2, Math.max(100, totalLengthSamples), sampleRate);

  const decodedBuffers = new Map<string, AudioBuffer>();
  for (const layer of audioLayers) {
    if (!decodedBuffers.has(layer.src)) {
      try {
        const resolvedUrl = await resolveSrc(layer.src);
        const res = await fetch(resolvedUrl);
        const arrayBuf = await res.arrayBuffer();
        const decoded = await offlineCtx.decodeAudioData(arrayBuf);
        decodedBuffers.set(layer.src, decoded);
      } catch (err) {
        console.warn('Failed to load audio for export mixdown:', layer.src, err);
      }
    }
  }

  for (const layer of audioLayers) {
    const buffer = decodedBuffers.get(layer.src);
    if (!buffer) continue;

    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = buffer;

    const gainNode = offlineCtx.createGain();
    const vol = computeAudioDuckingVolume(layer, layer.startTime + 0.1, plan.layers);
    gainNode.gain.setValueAtTime(vol, 0);

    sourceNode.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    const startTime = Math.max(0, layer.startTime);
    const trimIn = layer.trimIn || 0;
    const duration = Math.min(layer.duration, buffer.duration - trimIn);

    if (duration > 0) {
      sourceNode.start(startTime, trimIn, duration);
    }
  }

  try {
    return await offlineCtx.startRendering();
  } catch (err) {
    console.warn('Offline audio rendering error:', err);
    return null;
  }
}

async function exportViaWebCodecs(
  plan: EditPlan,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  assets: AssetCache,
  width: number,
  height: number,
  fps: number,
  bitrate: number,
  totalFrames: number,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  const chosenCodec = await probeBestSupportedVideoCodec(width, height, fps, bitrate);
  const target = new ArrayBufferTarget();

  // Render offline audio mixdown
  onProgress({
    percentage: 5,
    currentFrame: 0,
    totalFrames,
    phase: 'encoding_audio',
  });

  const mixedAudioBuffer = await mixOfflineAudio(plan, 48000);

  const muxer = new Muxer({
    target,
    video: {
      codec: chosenCodec.startsWith('vp') ? 'vp9' : 'avc',
      width,
      height,
    },
    ...(mixedAudioBuffer ? {
      audio: {
        codec: 'aac',
        numberOfChannels: 2,
        sampleRate: 48000,
      }
    } : {}),
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      console.error('VideoEncoder error:', e);
      encoderError = e;
    },
  });

  videoEncoder.configure({
    codec: chosenCodec,
    width,
    height,
    bitrate,
    framerate: fps,
  });

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (encoderError) {
      throw encoderError;
    }

    // Handle encoder backpressure to prevent memory exhaustion and hanging
    while (videoEncoder.encodeQueueSize > 8) {
      await new Promise(r => setTimeout(r, 20));
    }

    const t = frameIdx / fps;
    renderFrame(ctx, plan, t, width, height, assets);

    const timestampMicros = Math.round(t * 1_000_000);
    const videoFrame = new VideoFrame(canvas, { timestamp: timestampMicros });
    const isKeyFrame = frameIdx % 60 === 0;

    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    const pct = Math.floor(10 + (frameIdx / totalFrames) * 80);
    onProgress({
      percentage: pct,
      currentFrame: frameIdx,
      totalFrames,
      phase: 'rendering',
    });

    if (frameIdx % 15 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  onProgress({
    percentage: 95,
    currentFrame: totalFrames,
    totalFrames,
    phase: 'muxing',
  });

  await videoEncoder.flush();
  videoEncoder.close();

  muxer.finalize();
  const buffer = target.buffer;
  return new Blob([buffer], { type: chosenCodec.startsWith('vp') ? 'video/webm' : 'video/mp4' });
}

async function exportViaMediaRecorder(
  plan: EditPlan,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  assets: AssetCache,
  width: number,
  height: number,
  fps: number,
  bitrate: number,
  totalFrames: number,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  const stream = canvas.captureStream(fps);
  const chunks: Blob[] = [];

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : 'video/webm;codecs=vp9';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: bitrate,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingFinished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const t = frameIdx / fps;
    renderFrame(ctx, plan, t, width, height, assets);

    const pct = Math.floor((frameIdx / totalFrames) * 95);
    onProgress({
      percentage: pct,
      currentFrame: frameIdx,
      totalFrames,
      phase: 'rendering',
    });

    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  const resultBlob = await recordingFinished;

  onProgress({
    percentage: 100,
    currentFrame: totalFrames,
    totalFrames,
    phase: 'complete',
  });

  return resultBlob;
}

export async function downloadOrShareVideo(blob: Blob, filename: string): Promise<void> {
  const isCapacitorNative = typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  const url = URL.createObjectURL(blob);

  if (isCapacitorNative) {
    const capacitor = (window as unknown as { Capacitor?: { Plugins?: { Share?: { share: (opts: { title: string; url: string }) => Promise<void> } } } })?.Capacitor;
    if (capacitor?.Plugins?.Share) {
      try {
        await capacitor.Plugins.Share.share({
          title: 'Reelix Short Video',
          url,
        });
        return;
      } catch {
        // fallback
      }
    }
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
