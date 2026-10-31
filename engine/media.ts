// Media resolution & preloading service for OPFS, Object URLs, and Preview Syncing
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

export async function ensureAssets(plan: EditPlan, existingAssets?: AssetCache): Promise<AssetCache> {
  const cache: AssetCache = {
    videos: existingAssets?.videos ? new Map(existingAssets.videos) : new Map(),
    images: existingAssets?.images ? new Map(existingAssets.images) : new Map(),
  };

  const loadPromises: Promise<void>[] = [];

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
          await new Promise((resolve) => {
            if (v.readyState >= 2) {
              resolve(true);
            } else {
              v.onloadeddata = () => resolve(true);
              v.onerror = () => resolve(false);
              setTimeout(() => resolve(false), 3000); // 3s timeout cap
            }
          });
          cache.videos.set(srcKey, v);
          if (resolved !== srcKey) {
            cache.videos.set(resolved, v);
          }
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
          await new Promise((resolve) => {
            if (img.complete) {
              resolve(true);
            } else {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);
              setTimeout(() => resolve(false), 3000);
            }
          });
          cache.images.set(srcKey, img);
          if (resolved !== srcKey) {
            cache.images.set(resolved, img);
          }
        })();
        loadPromises.push(p);
      }
    }
  }

  await Promise.allSettled(loadPromises);
  return cache;
}

export function syncPreviewVideos(plan: EditPlan, currentTime: number, assets: AssetCache, isPlaying: boolean): void {
  for (const layer of plan.layers) {
    if (layer.type === 'video' && layer.src) {
      const video = assets.videos.get(layer.src);
      if (video) {
        const isActive = currentTime >= layer.startTime && currentTime <= (layer.startTime + layer.duration);
        if (isActive) {
          const trimIn = layer.trimIn || 0;
          const targetVideoTime = trimIn + (currentTime - layer.startTime);
          const drift = Math.abs(video.currentTime - targetVideoTime);
          if (drift > 0.05) {
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
