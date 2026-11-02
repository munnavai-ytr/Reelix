import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { EditPlan, AudioLayer, VideoLayer } from '../engine/types';
import { renderFrame, AssetCache } from '../engine/renderer';
import { computeAudioDuckingVolume } from '../engine/timeline';
import { resolveSrc, seekVideosForExport, ensureWindow } from '../engine/media';
import { Logger } from '../storage/logger';

export interface ExportProgress {
  percentage: number;
  currentFrame: number;
  totalFrames: number;
  phase: 'rendering' | 'encoding_audio' | 'muxing' | 'complete';
  estimatedSecRemaining?: number;
}

export interface ExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timer);
      return val;
    }),
    timeoutPromise,
  ]);
}

export async function exportVideoMp4(
  plan: EditPlan,
  assets: AssetCache,
  onProgress: (p: ExportProgress) => void,
  options: ExportOptions = {}
): Promise<Blob> {
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;
  if (!hasWebCodecs) {
    throw new Error('This device cannot export video (WebCodecs missing). Use Chrome or an updated Android WebView.');
  }

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

  // Request WakeLock to keep screen awake during export
  let wakeLockSentinel: unknown = null;
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }).wakeLock.request('screen');
    } catch {
      // Wake lock request allowed to fail gracefully
    }
  }

  // Warn if user attempts to leave tab during active export
  const preventUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', preventUnload);
  }

  const cleanupExport = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', preventUnload);
    }
    if (wakeLockSentinel && typeof (wakeLockSentinel as { release?: () => Promise<void> }).release === 'function') {
      (wakeLockSentinel as { release: () => Promise<void> }).release().catch(() => {});
    }
  };

  try {
    const result = await exportViaWebCodecs(plan, canvas, ctx, assets, width, height, fps, bitrate, totalFrames, onProgress);
    cleanupExport();
    return result;
  } catch (err) {
    cleanupExport();
    Logger.logError('exportVideoMp4 [WebCodecs Error]', err);
    throw err;
  }
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
  const audioLayers = plan.layers.filter((l) => l.type === 'audio' && (l as AudioLayer).src) as AudioLayer[];
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

  onProgress({
    percentage: 5,
    currentFrame: 0,
    totalFrames,
    phase: 'encoding_audio',
  });

  const mixedAudioBuffer = await mixOfflineAudio(plan, 48000);

  let canEncodeAudio = false;
  if (mixedAudioBuffer && typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined') {
    try {
      const audioSupport = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: 128000,
      });
      canEncodeAudio = !!audioSupport.supported;
    } catch {
      canEncodeAudio = false;
    }
  }

  const muxer = new Muxer({
    target,
    video: {
      codec: chosenCodec.startsWith('vp') ? 'vp9' : 'avc',
      width,
      height,
    },
    ...(canEncodeAudio
      ? {
          audio: {
            codec: 'aac',
            numberOfChannels: 2,
            sampleRate: 48000,
          },
        }
      : {}),
    fastStart: 'in-memory',
  });

  let audioEncoder: AudioEncoder | null = null;
  let videoEncoder: VideoEncoder | null = null;
  let encoderError: Error | null = null;

  try {
    if (canEncodeAudio && mixedAudioBuffer) {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.warn('AudioEncoder error:', e),
      });
      audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: 128000,
      });

      const sampleRate = 48000;
      const totalSamples = mixedAudioBuffer.length;
      const chunkSize = 1024;
      const left = mixedAudioBuffer.getChannelData(0);
      const right = mixedAudioBuffer.numberOfChannels > 1 ? mixedAudioBuffer.getChannelData(1) : left;

      for (let offset = 0; offset < totalSamples; offset += chunkSize) {
        const currentChunkSize = Math.min(chunkSize, totalSamples - offset);
        const chunkData = new Float32Array(currentChunkSize * 2);
        for (let i = 0; i < currentChunkSize; i++) {
          chunkData[i] = left[offset + i];
          chunkData[currentChunkSize + i] = right[offset + i];
        }
        const timestamp = Math.round((offset / sampleRate) * 1_000_000);
        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: currentChunkSize,
          numberOfChannels: 2,
          timestamp,
          data: chunkData,
        });
        audioEncoder.encode(audioData);
        audioData.close();
      }

      await withTimeout(audioEncoder.flush(), 60000, 'Audio encoder flush timed out after 60s');
    }

    videoEncoder = new VideoEncoder({
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

    // Ensure assets for initial frame window
    await ensureWindow(plan, assets, 0);

    const renderStartMs = performance.now();

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (encoderError) {
        throw encoderError;
      }

      while (videoEncoder.encodeQueueSize > 6) {
        await new Promise((r) => setTimeout(r, 16));
      }

      const t = frameIdx / fps;

      // When t enters a video layer that is not yet loaded in assets, await ensureWindow
      const activeVideo = plan.layers.find(
        (l) => l.type === 'video' && (l as VideoLayer).src && t >= l.startTime && t < l.startTime + l.duration
      ) as VideoLayer | undefined;

      if (activeVideo && !assets.videos.has(activeVideo.src)) {
        await ensureWindow(plan, assets, t);
      }

      await seekVideosForExport(plan, t, assets);
      renderFrame(ctx, plan, t, width, height, assets);

      const timestampMicros = Math.round(t * 1_000_000);
      const frameDurationMicros = Math.round(1_000_000 / fps);
      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: frameDurationMicros,
      });
      // Keyframe every 2 seconds
      const isKeyFrame = frameIdx % (fps * 2) === 0;

      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      const elapsedSec = (performance.now() - renderStartMs) / 1000;
      const measuredFps = (frameIdx + 1) / Math.max(0.001, elapsedSec);
      const estimatedSecRemaining = Math.max(0, Math.ceil((totalFrames - frameIdx - 1) / Math.max(1, measuredFps)));

      const pct = Math.floor(10 + (frameIdx / totalFrames) * 82);
      onProgress({
        percentage: pct,
        currentFrame: frameIdx,
        totalFrames,
        phase: 'rendering',
        estimatedSecRemaining,
      });

      if (frameIdx % 15 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (encoderError) {
      throw encoderError;
    }

    onProgress({
      percentage: 95,
      currentFrame: totalFrames,
      totalFrames,
      phase: 'muxing',
    });

    await withTimeout(videoEncoder.flush(), 60000, 'Video encoder flush timed out after 60s');

    muxer.finalize();
    const buffer = target.buffer;
    return new Blob([buffer], { type: chosenCodec.startsWith('vp') ? 'video/webm' : 'video/mp4' });
  } finally {
    if (audioEncoder && (audioEncoder as unknown as { state?: string }).state !== 'closed') {
      try {
        audioEncoder.close();
      } catch {}
    }
    if (videoEncoder && (videoEncoder as unknown as { state?: string }).state !== 'closed') {
      try {
        videoEncoder.close();
      } catch {}
    }
  }
}

export async function downloadOrShareVideo(blob: Blob, filename: string): Promise<void> {
  const isCapacitorNative =
    typeof window !== 'undefined' &&
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  if (isCapacitorNative) {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });
      const base64Data = await base64Promise;

      const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, any> } }).Capacitor?.Plugins;
      const filesystem = plugins?.Filesystem;
      const share = plugins?.Share;

      if (filesystem) {
        const targetName = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
        const writeResult = await filesystem.writeFile({
          path: targetName,
          data: base64Data,
          directory: 'CACHE',
        });

        if (share) {
          await share.share({
            title: 'Reelix Short Video',
            url: writeResult.uri,
          });
          return;
        }
      }
    } catch (e) {
      console.warn('Native filesystem share failed, falling back to browser download:', e);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
