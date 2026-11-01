// Media resolution, preloading, video drift sync & export seeking
import { EditPlan, Layer, VideoLayer } from './types';
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

export function layerVideoTime(l: VideoLayer, t: number, video?: HTMLVideoElement): number {
  const trimIn = l.trimIn || 0;
  const elapsed = t - l.startTime;
  let target = trimIn + elapsed;
  if (video && video.duration && target >= video.duration) {
    if (l.loop) {
      target = trimIn + (elapsed % Math.max(0.1, video.duration - trimIn));
    } else {
      target = Math.min(target, Math.max(0, video.duration - 0.05));
    }
  }
  return Math.max(0, target);
}

export async function ensureAssets(
  plan: EditPlan,
  existingAssets?: AssetCache,
  onChange?: () => void
): Promise<AssetCache> {
  const cache: AssetCache = {
    videos: existingAssets?.videos ? new Map(existingAssets.videos) : new Map(),
    images: existingAssets?.images ? new Map(existingAssets.images) : new Map(),
  };

  const loadPromises: Promise<void>[] = [];
  let newLoadedCount = 0;

  for (const layer of plan.layers) {
    if (layer.type === 'video' && layer.src) {
      const srcKey = layer.src;
      if (!cache.videos.has(srcKey)) {
        const p = (async () => {
          const resolved = await resolveSrc(srcKey);
          if (!resolved) return;
          const v = document.createElement('video');
          v.src = resolved;
          v.crossOrigin = 'anonymous';
          v.muted = true;
          v.playsInline = true;
          v.preload = 'auto';
          await new Promise<void>((resolve) => {
            if (v.readyState >= 2) {
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
                v.removeEventListener('loadeddata', onLoaded);
                v.removeEventListener('canplay', onLoaded);
                v.removeEventListener('error', onError);
                clearTimeout(timer);
              };
              v.addEventListener('loadeddata', onLoaded);
              v.addEventListener('canplay', onLoaded);
              v.addEventListener('error', onError);
            }
          });
          cache.videos.set(srcKey, v);
          if (resolved !== srcKey) {
            cache.videos.set(resolved, v);
          }
          newLoadedCount++;
          onChange?.();
        })();
        loadPromises.push(p);
      }
    } else if (layer.type === 'image' && layer.src) {
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
        const isActive = currentTime >= layer.startTime && currentTime <= (layer.startTime + layer.duration);
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
      const isActive = currentTime >= layer.startTime && currentTime < (layer.startTime + layer.duration);
      if (isActive) {
        const video = assets.videos.get(layer.src);
        if (video) {
          const targetTime = layerVideoTime(layer, currentTime, video);
          if (Math.abs(video.currentTime - targetTime) > 0.03) {
            promises.push(
              new Promise<void>((resolve) => {
                const onSeeked = () => {
                  cleanup();
                  resolve();
                };
                const timer = setTimeout(() => {
                  cleanup();
                  resolve();
                }, 250);
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
