// Unified Canvas 2D Frame Renderer - Shared by Live Preview & WebCodecs MP4 Export
import { EditPlan, Layer, VideoLayer, ImageLayer, TextLayer, CaptionLayer, ShapeLayer } from './types';
import { isLayerActive, interpolateKeyframe } from './timeline';
import { Registry } from '../registry';

export interface AssetCache {
  videos: Map<string, HTMLVideoElement>;
  images: Map<string, HTMLImageElement>;
  bitmaps?: Map<string, ImageBitmap>;
}

// Module-level snapshot canvas cache for transition rendering
const transitionSnapshotCanvas: HTMLCanvasElement | null =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (transitionSnapshotCanvas) {
  transitionSnapshotCanvas.width = 1080;
  transitionSnapshotCanvas.height = 1920;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  plan: EditPlan,
  currentTime: number,
  targetWidth: number,
  targetHeight: number,
  assets: AssetCache
): void {
  // Clear frame
  ctx.save();
  ctx.fillStyle = '#0B0B0F';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Resolution scale factor from canonical 1080x1920
  const scaleRatioX = targetWidth / 1080;
  const scaleRatioY = targetHeight / 1920;

  ctx.scale(scaleRatioX, scaleRatioY);

  const CANONICAL_W = 1080;
  const CANONICAL_H = 1920;

  const sortedLayers = [...plan.layers].sort((a, b) => a.trackIndex - b.trackIndex);

  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i];
    if (!isLayerActive(layer, currentTime)) continue;

    const layerRelTime = currentTime - layer.startTime;
    const layerProgress = Math.max(0, Math.min(1, layerRelTime / Math.max(0.01, layer.duration)));

    let opacity = layer.opacity ?? 1;
    if (layer.keyframes?.opacity) {
      opacity = interpolateKeyframe(layer.keyframes.opacity, layerRelTime, opacity);
    }
    if (opacity <= 0) continue;

    let posX = layer.transform?.x ?? 0;
    let posY = layer.transform?.y ?? 0;
    let scale = layer.transform?.scale ?? 1;
    let rotation = layer.transform?.rotation ?? 0;

    if (layer.keyframes?.x) posX = interpolateKeyframe(layer.keyframes.x, layerRelTime, posX);
    if (layer.keyframes?.y) posY = interpolateKeyframe(layer.keyframes.y, layerRelTime, posY);
    if (layer.keyframes?.scale) scale = interpolateKeyframe(layer.keyframes.scale, layerRelTime, scale);
    if (layer.keyframes?.rotation) rotation = interpolateKeyframe(layer.keyframes.rotation, layerRelTime, rotation);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    // Base layer transform from canvas center with exact x/y translation offset
    const originX = CANONICAL_W / 2 + posX;
    const originY = CANONICAL_H / 2 + posY;
    ctx.translate(originX, originY);
    if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.translate(-CANONICAL_W / 2, -CANONICAL_H / 2);

    // Apply pre-draw layer effects
    if (layer.effects && layer.effects.length > 0) {
      for (const eff of layer.effects) {
        if (!eff.enabled) continue;
        const effectDef = Registry.getEffect(eff.effectId);
        if (effectDef) {
          effectDef.apply(ctx, CANONICAL_W, CANONICAL_H, eff.params, layerProgress, currentTime);
        }
      }
    }

    // Check transition on visual layers
    const transition = (layer as VideoLayer | ImageLayer).transitionIn;
    const isTransitioning =
      transition &&
      transition.type &&
      transition.duration > 0 &&
      layerRelTime < transition.duration;

    if (isTransitioning) {
      const transDef = Registry.getTransition(transition.type);
      if (transDef) {
        const transProgress = Math.max(0, Math.min(1, layerRelTime / transition.duration));
        const previousVisualLayer = sortedLayers
          .slice(0, i)
          .reverse()
          .find((l) => (l.type === 'video' || l.type === 'image') && l.startTime + l.duration <= layer.startTime + 0.1);

        const renderTo = () => {
          renderLayerContent(ctx, layer, layerRelTime, layerProgress, currentTime, CANONICAL_W, CANONICAL_H, assets);
        };

        const renderFrom = () => {
          if (previousVisualLayer) {
            renderLayerContent(ctx, previousVisualLayer, previousVisualLayer.duration, 1, previousVisualLayer.startTime + previousVisualLayer.duration, CANONICAL_W, CANONICAL_H, assets);
          } else {
            drawDarkAmbientBackground(ctx, CANONICAL_W, CANONICAL_H);
          }
        };

        transDef.render(ctx, CANONICAL_W, CANONICAL_H, transProgress, renderFrom, renderTo);
      } else {
        renderLayerContent(ctx, layer, layerRelTime, layerProgress, currentTime, CANONICAL_W, CANONICAL_H, assets);
      }
    } else {
      renderLayerContent(ctx, layer, layerRelTime, layerProgress, currentTime, CANONICAL_W, CANONICAL_H, assets);
    }

    // Apply post-draw layer effects
    if (layer.effects && layer.effects.length > 0) {
      for (const eff of layer.effects) {
        if (!eff.enabled) continue;
        if (['vignette', 'film-grain', 'glow', 'glitch', 'color-grade'].includes(eff.effectId)) {
          const effectDef = Registry.getEffect(eff.effectId);
          if (effectDef) {
            effectDef.apply(ctx, CANONICAL_W, CANONICAL_H, eff.params, layerProgress, currentTime);
          }
        }
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

function renderLayerContent(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  layerRelTime: number,
  layerProgress: number,
  currentTime: number,
  canvasW: number,
  canvasH: number,
  assets: AssetCache
) {
  switch (layer.type) {
    case 'video':
      renderVideoLayer(ctx, layer, layerRelTime, canvasW, canvasH, assets);
      break;
    case 'image':
      renderImageLayer(ctx, layer, layerProgress, canvasW, canvasH, assets);
      break;
    case 'shape':
      renderShapeLayer(ctx, layer, canvasW, canvasH);
      break;
    case 'text':
      renderTextLayer(ctx, layer, layerRelTime, canvasW, canvasH);
      break;
    case 'caption':
      renderCaptionLayer(ctx, layer, currentTime, canvasW, canvasH);
      break;
    default:
      break;
  }
}

function renderVideoLayer(
  ctx: CanvasRenderingContext2D,
  layer: VideoLayer,
  relTime: number,
  canvasW: number,
  canvasH: number,
  assets: AssetCache
) {
  const video = assets.videos.get(layer.src);
  if (!video || video.readyState < 2) {
    drawDarkAmbientBackground(ctx, canvasW, canvasH);
    return;
  }

  const vw = video.videoWidth || 1080;
  const vh = video.videoHeight || 1920;
  const videoAspect = vw / vh;
  const canvasAspect = canvasW / canvasH;

  let drawW = canvasW;
  let drawH = canvasH;
  let offsetX = 0;
  let offsetY = 0;

  if (layer.fitMode === 'contain') {
    if (videoAspect > canvasAspect) {
      drawW = canvasW;
      drawH = canvasW / videoAspect;
      offsetY = (canvasH - drawH) / 2;
    } else {
      drawH = canvasH;
      drawW = canvasH * videoAspect;
      offsetX = (canvasW - drawW) / 2;
    }
  } else {
    if (videoAspect > canvasAspect) {
      drawH = canvasH;
      drawW = canvasH * videoAspect;
      const focusX = layer.focusPoint?.x ?? 0.5;
      offsetX = (canvasW - drawW) * focusX;
    } else {
      drawW = canvasW;
      drawH = canvasW / videoAspect;
      const focusY = layer.focusPoint?.y ?? 0.5;
      offsetY = (canvasH - drawH) * focusY;
    }
  }

  try {
    ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
  } catch {
    drawDarkAmbientBackground(ctx, canvasW, canvasH);
  }
}

function renderImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  progress: number,
  canvasW: number,
  canvasH: number,
  assets: AssetCache
) {
  const img = assets.images.get(layer.src);
  if (!img || !img.complete || img.naturalWidth === 0) {
    drawDarkAmbientBackground(ctx, canvasW, canvasH);
    return;
  }

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const imgAspect = iw / ih;
  const canvasAspect = canvasW / canvasH;

  let drawW = canvasW;
  let drawH = canvasH;
  let offsetX = 0;
  let offsetY = 0;

  if (layer.fitMode === 'contain') {
    if (imgAspect > canvasAspect) {
      drawW = canvasW;
      drawH = canvasW / imgAspect;
      offsetY = (canvasH - drawH) / 2;
    } else {
      drawH = canvasH;
      drawW = canvasH * imgAspect;
      offsetX = (canvasW - drawW) / 2;
    }
  } else {
    if (imgAspect > canvasAspect) {
      drawH = canvasH;
      drawW = canvasH * imgAspect;
      offsetX = (canvasW - drawW) / 2;
    } else {
      drawW = canvasW;
      drawH = canvasW / imgAspect;
      offsetY = (canvasH - drawH) / 2;
    }
  }

  // Ken Burns subtle zoom animation
  if (layer.animation === 'zoom-in') {
    const scale = 1 + progress * 0.08;
    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvasW / 2, -canvasH / 2);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.restore();
  } else if (layer.animation === 'zoom-out') {
    const scale = 1.08 - progress * 0.08;
    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvasW / 2, -canvasH / 2);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }
}

function renderShapeLayer(ctx: CanvasRenderingContext2D, layer: ShapeLayer, canvasW: number, canvasH: number) {
  const x = (canvasW / 2) + (layer.position?.x ?? 0);
  const y = (canvasH / 2) + (layer.position?.y ?? 0);
  const w = layer.width ?? 300;
  const h = layer.height ?? 300;

  ctx.save();
  ctx.fillStyle = layer.fillColor || '#8B5CF6';

  if (layer.shapeType === 'circle') {
    ctx.beginPath();
    ctx.arc(x, y, w / 2, 0, Math.PI * 2);
    ctx.fill();
    if (layer.strokeColor && layer.strokeWidth) {
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth;
      ctx.stroke();
    }
  } else {
    const radius = layer.borderRadius || 0;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, radius);
    ctx.fill();
    if (layer.strokeColor && layer.strokeWidth) {
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function renderTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, relTime: number, canvasW: number, canvasH: number) {
  const x = (canvasW / 2) + (layer.position?.x ?? 0);
  const y = (canvasH / 2) + (layer.position?.y ?? 0);

  ctx.save();
  ctx.font = `${layer.fontWeight || '700'} ${layer.fontSize}px ${layer.fontFamily || 'Inter, sans-serif'}`;
  ctx.textAlign = (layer.textAlign as CanvasTextAlign) || 'center';
  ctx.textBaseline = 'middle';

  const animDef = Registry.getTextAnimation(layer.animationId || 'fade-in');
  let renderedText = layer.text;

  if (animDef) {
    const animProgress = Math.max(0, Math.min(1, relTime / (layer.animationDuration || 0.4)));
    animDef.apply(ctx, animProgress, layer.text, x, y, layer.fontSize);
  }

  // Draw background badge if configured
  if (layer.backgroundColor) {
    const metrics = ctx.measureText(renderedText);
    const pad = layer.backgroundPadding || 12;
    const rad = layer.backgroundRadius || 8;
    const bgW = metrics.width + pad * 2;
    const bgH = layer.fontSize * 1.35 + pad;

    ctx.save();
    ctx.fillStyle = layer.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x - bgW / 2, y - bgH / 2, bgW, bgH, rad);
    ctx.fill();
    ctx.restore();
  }

  // Text Stroke
  if (layer.strokeColor && layer.strokeWidth) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = layer.strokeWidth;
    ctx.strokeText(renderedText, x, y);
  }

  ctx.fillStyle = layer.color;
  ctx.fillText(renderedText, x, y);
  ctx.restore();
}

function renderCaptionLayer(ctx: CanvasRenderingContext2D, layer: CaptionLayer, currentTime: number, canvasW: number, canvasH: number) {
  const activeChunk = layer.chunks.find(c => currentTime >= c.start && currentTime <= c.end);
  if (!activeChunk) return;

  const styleDef =
    Registry.getCaptionStyle(layer.styleId) || Registry.getCaptionStyle('karaoke-word-highlight');
  if (!styleDef) return;

  styleDef.render(
    ctx,
    activeChunk,
    currentTime,
    layer.baseColor,
    layer.highlightColor,
    layer.fontFamily,
    layer.fontSize,
    layer.positionY,
    canvasW,
    canvasH
  );
}

function drawDarkAmbientBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0F0F17');
  grad.addColorStop(0.5, '#161326');
  grad.addColorStop(1, '#0B0B10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 160, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
