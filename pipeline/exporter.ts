// Real WebCodecs + mp4-muxer H.264 MP4 Exporter (1080x1920 @ 30fps)
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { EditPlan, AudioLayer } from '../engine/types';
import { renderFrame, AssetCache } from '../engine/renderer';
import { computeAudioDuckingVolume } from '../engine/timeline';

export interface ExportProgress {
  percentage: number;
  currentFrame: number;
  totalFrames: number;
  phase: 'rendering' | 'encoding_audio' | 'muxing' | 'complete';
}

export async function exportVideoMp4(
  plan: EditPlan,
  assets: AssetCache,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  const width = 1080;
  const height = 1920;
  const fps = 30;
  const totalFrames = Math.max(1, Math.floor(plan.duration * fps));

  // Create high-res 1080x1920 export canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('Could not create 2D canvas context for export');

  // Check if WebCodecs VideoEncoder is supported in this browser
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;

  if (hasWebCodecs) {
    try {
      return await exportViaWebCodecs(plan, canvas, ctx, assets, width, height, fps, totalFrames, onProgress);
    } catch (err) {
      console.warn('WebCodecs export failed, falling back to MediaRecorder stream:', err);
    }
  }

  // Resilient fallback: MediaRecorder with canvas stream
  return await exportViaMediaRecorder(plan, canvas, ctx, assets, width, height, fps, totalFrames, onProgress);
}

async function exportViaWebCodecs(
  plan: EditPlan,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  assets: AssetCache,
  width: number,
  height: number,
  fps: number,
  totalFrames: number,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    fastStart: 'in-memory',
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e),
  });

  videoEncoder.configure({
    codec: 'avc1.640033', // H.264 High Profile Level 5.1
    width,
    height,
    bitrate: 8_000_000, // 8 Mbps for pristine 1080x1920
    framerate: fps,
  });

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const t = frameIdx / fps;

    // Render frame
    renderFrame(ctx, plan, t, width, height, assets);

    // Create VideoFrame
    const timestampMicros = Math.round(t * 1_000_000);
    const videoFrame = new VideoFrame(canvas, { timestamp: timestampMicros });
    const isKeyFrame = frameIdx % 60 === 0;

    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    // Report progress
    const pct = Math.floor((frameIdx / totalFrames) * 90);
    onProgress({
      percentage: pct,
      currentFrame: frameIdx,
      totalFrames,
      phase: 'rendering',
    });

    // Yield to keep UI responsive
    if (frameIdx % 10 === 0) {
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
  return new Blob([buffer], { type: 'video/mp4' });
}

async function exportViaMediaRecorder(
  plan: EditPlan,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  assets: AssetCache,
  width: number,
  height: number,
  fps: number,
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
    videoBitsPerSecond: 8_000_000,
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

    // Match frame time
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
  // Check Capacitor Filesystem / Share for native Android APK
  const capacitor = typeof window !== 'undefined'
    ? (window as unknown as { Capacitor?: { Plugins?: { Share?: { share: (opts: { title: string; url: string }) => Promise<void> } } } })?.Capacitor
    : undefined;

  const url = URL.createObjectURL(blob);

  if (capacitor?.Plugins?.Share) {
    try {
      await capacitor.Plugins.Share.share({
        title: 'Reelix Short Video',
        url,
      });
      return;
    } catch {
      // fallback to download link
    }
  }

  // Standard web browser download trigger
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
