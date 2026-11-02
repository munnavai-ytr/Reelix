// Media resolution, preloading, video element pool management & export seeking
import { EditPlan, VideoLayer } from './types';
import { AssetCache } from './renderer';
import { OpfsService } from '../storage/opfs';

const objectUrlMap = new Map<string, string>();

export async function resolveSrc(src: string): Promise<string> {
  if (!src) return '';
  if (src.startsWith('opfs://')) {
    if (objectUrlMap.has(src)) {
      return objectUrlMap.get(src)!;
    }
    const blobUrl = await OpfsService.resolveToBlobUrl(src);
    if (blobUrl) {
      objectUrlMap.set(src, blobUrl);
      return blobUrl;
    }
  }
  return src;
}

export function releaseObjectUrl(src: string): void {
  if (objectUrlMap.has(src)) {
    const url = objectUrlMap.get(src)!;
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    objectUrlMap.delete(src);
  }
}

export function releaseAssetCache(cache: AssetCache): void {
  for (const [key, video] of cache.videos.entries()) {
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch {}
    releaseObjectUrl(key);
  }
  cache.videos.clear();

  for (const key of cache.images.keys()) {
    releaseObjectUrl(key);
  }
  cache.images.clear();
}

export function releaseAllBlobUrls(): void {
  for (const [, url] of objectUrlMap.entries()) {
    if (url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  }
  objectUrlMap.clear();
}

export function layerVideoTime(l: VideoLayer, t: number, video?: HTMLVideoElement): number {
  const trimIn = l.trimIn || 0;
  const elapsed = t - l.startTime;
  let target = trimIn + elapsed;
  if (video && video.duration && target >= video.duration) {
    if (l.loop) {
      target = trimIn + (elapsed % Math.max(0.1, video.duration - trimIn));
    } else {
      target = Math.min(target, Math.max(0, video.duration - 0.04));
    }
  }
  return Math.max(0, target);
}

function createVideoElement(srcUrl: string): Promise<HTMLVideoElement> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.src = srcUrl;
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';

    if (v.readyState >= 2) {
      resolve(v);
      return;
    }

    const onLoaded = () => {
      cleanup();
      resolve(v);
    };
    const onError = () => {
      cleanup();
      resolve(v);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(v);
    }, 4000);

    const cleanup = () => {
      v.removeEventListener('loadeddata', onLoaded);
      v.removeEventListener('canplay', onLoaded);
      v.removeEventListener('error', onError);
      clearTimeout(timer);
    };

    v.addEventListener('loadeddata', onLoaded);
    v.addEventListener('canplay', onLoaded);
    v.addEventListener('error', onError);
  });
}

export async function ensureWindow(plan: EditPlan, assets: AssetCache, t: number, lookAhead = 6): Promise<void> {
  const need = new Map<string, VideoLayer>();
  for (const l of plan.layers) {
    if (l.type !== 'video' || !(l as VideoLayer).src) continue;
    if (l.startTime <= t + lookAhead && l.startTime + l.duration >= t - 1) need.set((l as VideoLayer).src, l as VideoLayer);
  }
  // unload videos not needed (pause, removeAttribute('src'), load()) but keep at most 3 alive
  for (const [k, v] of Array.from(assets.videos.entries())) {
    if (!need.has(k)) {
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch {}
      assets.videos.delete(k);
    }
  }
  await Promise.all(
    Array.from(need.keys())
      .filter((k) => !assets.videos.has(k))
      .map(async (k) => {
        const url = await resolveSrc(k);
        const v = await createVideoElement(url);
        assets.videos.set(k, v);
      })
  );
}

/**
 * Mobile-optimized Asset Preloader & Video Pool:
 * Ensures active layers near playhead (within ±5.0s) have decoded video elements,
 * while keeping max 3 decoded video elements active at once to prevent memory leaks on phone WebViews.
 */
export async function ensureAssets(
  plan: EditPlan,
  existingAssets?: AssetCache,
  onChange?: () => void,
  currentTime = 0
): Promise<AssetCache> {
  const cache: AssetCache = {
    videos: existingAssets?.videos ? new Map(existingAssets.videos) : new Map(),
    images: existingAssets?.images ? new Map(existingAssets.images) : new Map(),
  };

  // Find all video layers
  const videoLayers = plan.layers.filter((l) => l.type === 'video' && (l as VideoLayer).src) as VideoLayer[];

  // Prioritize video layers active near currentTime (within ±5s)
  const prioritizedLayers = [...videoLayers].sort((a, b) => {
    const distA = Math.abs(currentTime - (a.startTime + a.duration / 2));
    const distB = Math.abs(currentTime - (b.startTime + b.duration / 2));
    return distA - distB;
  });

  // Keep at most 3 video elements alive
  const activeTargets = prioritizedLayers.slice(0, 3);
  const activeSrcSet = new Set(activeTargets.map((l) => l.src));

  // Unload videos outside active window
  for (const [srcKey, video] of Array.from(cache.videos.entries())) {
    if (!activeSrcSet.has(srcKey)) {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {}
      cache.videos.delete(srcKey);
    }
  }

  const loadPromises: Promise<void>[] = [];
  let newLoadedCount = 0;

  for (const layer of activeTargets) {
    const srcKey = layer.src;
    if (!cache.videos.has(srcKey)) {
      const p = (async () => {
        const resolved = await resolveSrc(srcKey);
        if (!resolved) return;
        const v = await createVideoElement(resolved);
        cache.videos.set(srcKey, v);
        newLoadedCount++;
        onChange?.();
      })();
      loadPromises.push(p);
    }
  }

  // Load images
  for (const layer of plan.layers) {
    if (layer.type === 'image' && layer.src) {
      const srcKey = layer.src;
      if (!cache.images.has(srcKey)) {
        const p = (async () => {
          const resolved = await resolveSrc(srcKey);
          if (!resolved) return;
          const img = new Image();
          img.src = resolved;
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              const onLoaded = () => {
                cleanup();
                resolve();
              };
              const onError = () => {
                cleanup();
                resolve();
              };
              const timer = setTimeout(() => {
                cleanup();
                resolve();
              }, 4000);
              const cleanup = () => {
                img.removeEventListener('load', onLoaded);
                img.removeEventListener('error', onError);
                clearTimeout(timer);
              };
              img.addEventListener('load', onLoaded);
              img.addEventListener('error', onError);
            }
          });
          cache.images.set(srcKey, img);
          if (resolved !== srcKey) {
            cache.images.set(resolved, img);
          }
          newLoadedCount++;
          onChange?.();
        })();
        loadPromises.push(p);
      }
    }
  }

  await Promise.allSettled(loadPromises);
  if (newLoadedCount > 0) {
    onChange?.();
  }
  return cache;
}

export function syncPreviewVideos(
  plan: EditPlan,
  currentTime: number,
  assets: AssetCache,
  isPlaying: boolean
): void {
  for (const layer of plan.layers) {
    if (layer.type === 'video' && layer.src) {
      const video = assets.videos.get(layer.src);
      if (video) {
        const isActive = currentTime >= layer.startTime && currentTime <= layer.startTime + layer.duration;
        if (isActive) {
          const targetVideoTime = layerVideoTime(layer, currentTime, video);
          const drift = Math.abs(video.currentTime - targetVideoTime);
          if (drift > 0.08) {
            video.currentTime = targetVideoTime;
          }
          if (isPlaying && video.paused && video.readyState >= 2) {
            video.play().catch(() => {});
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      }
    }
  }
}

export async function seekVideosForExport(
  plan: EditPlan,
  currentTime: number,
  assets: AssetCache
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const layer of plan.layers) {
    if (layer.type === 'video' && layer.src) {
      const isActive = currentTime >= layer.startTime && currentTime < layer.startTime + layer.duration;
      if (isActive) {
        const video = assets.videos.get(layer.src);
        if (video) {
          const targetTime = layerVideoTime(layer, currentTime, video);
          const isFirstFrame = Math.abs(currentTime - layer.startTime) < 0.035;
          const driftThreshold = isFirstFrame ? 0.001 : 0.03;
          if (Math.abs(video.currentTime - targetTime) > driftThreshold) {
            promises.push(
              new Promise<void>((resolve) => {
                const onSeeked = () => {
                  cleanup();
                  resolve();
                };
                const timer = setTimeout(() => {
                  cleanup();
                  resolve();
                }, 3000);
                const cleanup = () => {
                  video.removeEventListener('seeked', onSeeked);
                  clearTimeout(timer);
                };
                video.addEventListener('seeked', onSeeked, { once: true });
                video.currentTime = targetTime;
              })
            );
          }
        }
      }
    }
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}

export async function extractVideoThumbnail(videoUrl: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    const computeLuminance = (): number => {
      if (!ctx) return 0;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        let total = 0;
        const count = data.length / 4;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          total += 0.299 * r + 0.587 * g + 0.114 * b;
        }
        return total / (count / 4);
      } catch {
        return 0;
      }
    };

    const tryCaptureAt = (time: number, attemptsRemaining: number[]) => {
      video.currentTime = time;
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        const lum = computeLuminance();
        if (lum >= 6 || attemptsRemaining.length === 0) {
          try {
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } catch {
            resolve('');
          }
        } else {
          const nextTime = attemptsRemaining.shift()!;
          tryCaptureAt(nextTime, attemptsRemaining);
        }
      };
      video.addEventListener('seeked', onSeeked, { once: true });
    };

    const onMetadata = () => {
      const dur = video.duration || 5;
      const initialSeek = Math.min(0.5, dur * 0.1);
      const retries = [dur * 0.25, dur * 0.5];
      tryCaptureAt(initialSeek, retries);
    };

    video.addEventListener('loadedmetadata', onMetadata, { once: true });
    video.addEventListener('error', () => resolve(''), { once: true });
    setTimeout(() => resolve(''), 5000);
  });
}
