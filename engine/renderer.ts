// Unified Canvas 2D Frame Renderer - Shared by Live Preview & WebCodecs MP4 Export
import { EditPlan, Layer, VideoLayer, ImageLayer, TextLayer, CaptionLayer, ShapeLayer } from './types';
import { isLayerActive, interpolateKeyframe } from './timeline';
import { Registry } from '../registry';

export interface AssetCache {
  videos: Map<string, HTMLVideoElement>;
  images: Map<string, HTMLImageElement>;
  bitmaps?: Map<string, ImageBitmap>;
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

  // Scale the entire coordinate space to canonical 1080x1920 for consistent layout
  ctx.scale(scaleRatioX, scaleRatioY);

  const CANONICAL_W = 1080;
  const CANONICAL_H = 1920;

  // Sort layers by trackIndex ascending
  const sortedLayers = [...plan.layers].sort((a, b) => a.trackIndex - b.trackIndex);

  // Check for active transitions
  const activeTransitions = plan.transitions.filter(
    tr => currentTime >= tr.duration && false // helper: transitions usually occur around clip cut points
  );

  for (const layer of sortedLayers) {
    if (!isLayerActive(layer, currentTime)) continue;

    const layerRelTime = currentTime - layer.startTime;
    const layerProgress = Math.max(0, Math.min(1, layerRelTime / Math.max(0.01, layer.duration)));

    // Calculate layer transform and opacity
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

    // Base layer transform from canvas center
    const originX = CANONICAL_W / 2 + posX;
    const originY = CANONICAL_H / 2 + posY;
    ctx.translate(originX, originY);
    if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.translate(-originX, -originY);

    // Apply pre-draw layer effects (e.g., zoom punch, shake)
    if (layer.effects && layer.effects.length > 0) {
      for (const eff of layer.effects) {
        if (!eff.enabled) continue;
        const effectDef = Registry.getEffect(eff.effectId);
        if (effectDef) {
          effectDef.apply(ctx, CANONICAL_W, CANONICAL_H, eff.params, layerProgress, currentTime);
        }
      }
    }

    // Render by layer type
    switch (layer.type) {
      case 'video':
        renderVideoLayer(ctx, layer, layerRelTime, CANONICAL_W, CANONICAL_H, assets);
        break;
      case 'image':
        renderImageLayer(ctx, layer, layerProgress, CANONICAL_W, CANONICAL_H, assets);
        break;
      case 'shape':
        renderShapeLayer(ctx, layer, CANONICAL_W, CANONICAL_H);
        break;
      case 'text':
        renderTextLayer(ctx, layer, layerRelTime, CANONICAL_W, CANONICAL_H);
        break;
      case 'caption':
        renderCaptionLayer(ctx, layer, currentTime, CANONICAL_W, CANONICAL_H);
        break;
      default:
        break;
    }

    // Apply post-draw layer effects (e.g., vignette, film grain, glow, glitch)
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
    // Elegant procedural placeholder while loading
    drawProceduralVideoPlaceholder(ctx, layer.name, canvasW, canvasH);
    return;
  }

  // Draw video centered covering the 9:16 frame
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
    // Cover with focal point reframing
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
    drawProceduralVideoPlaceholder(ctx, layer.name, canvasW, canvasH);
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
  if (!img || !img.complete) {
    drawProceduralVideoPlaceholder(ctx, layer.name, canvasW, canvasH);
    return;
  }

  let scale = 1;
  let panX = 0;
  let panY = 0;

  // Ken Burns zoom/pan
  if (layer.kenBurns?.enabled) {
    const kb = layer.kenBurns;
    scale = kb.startScale + (kb.endScale - kb.startScale) * progress;
    panX = (kb.startX + (kb.endX - kb.startX) * progress) * canvasW;
    panY = (kb.startY + (kb.endY - kb.startY) * progress) * canvasH;
  }

  const iw = img.naturalWidth || 1080;
  const ih = img.naturalHeight || 1920;
  const imgAspect = iw / ih;
  const canvasAspect = canvasW / canvasH;

  let drawW = canvasW * scale;
  let drawH = canvasH * scale;
  if (imgAspect > canvasAspect) {
    drawH = canvasH * scale;
    drawW = (canvasH * imgAspect) * scale;
  } else {
    drawW = canvasW * scale;
    drawH = (canvasW / imgAspect) * scale;
  }

  const posX = (canvasW - drawW) / 2 + panX;
  const posY = (canvasH - drawH) / 2 + panY;

  try {
    ctx.drawImage(img, posX, posY, drawW, drawH);
  } catch {
    drawProceduralVideoPlaceholder(ctx, layer.name, canvasW, canvasH);
  }
}

function renderShapeLayer(ctx: CanvasRenderingContext2D, layer: ShapeLayer, canvasW: number, canvasH: number) {
  const x = (canvasW - layer.width) / 2;
  const y = (canvasH - layer.height) / 2;
  ctx.save();
  ctx.fillStyle = layer.color;
  if (layer.strokeColor && layer.strokeWidth) {
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = layer.strokeWidth;
  }

  if (layer.shapeType === 'rect') {
    ctx.beginPath();
    ctx.roundRect(x, y, layer.width, layer.height, layer.borderRadius ?? 0);
    ctx.fill();
    if (layer.strokeColor) ctx.stroke();
  } else if (layer.shapeType === 'circle') {
    ctx.beginPath();
    ctx.arc(canvasW / 2, canvasH / 2, Math.min(layer.width, layer.height) / 2, 0, Math.PI * 2);
    ctx.fill();
    if (layer.strokeColor) ctx.stroke();
  }
  ctx.restore();
}

function renderTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, relTime: number, canvasW: number, canvasH: number) {
  ctx.save();
  let renderedText = layer.text;
  let textOpacity = 1;
  let textScale = 1;
  let textOffsetX = 0;
  let textOffsetY = 0;

  if (layer.animationId) {
    const animDef = Registry.getTextAnimation(layer.animationId);
    if (animDef) {
      const animDur = layer.animationDuration ?? 0.5;
      const progress = Math.max(0, Math.min(1, relTime / animDur));
      const animRes = animDef.apply(ctx, progress, layer.text, layer.fontSize);
      renderedText = animRes.renderedText;
      textOpacity = animRes.opacity;
      textScale = animRes.scale;
      textOffsetX = animRes.offsetX;
      textOffsetY = animRes.offsetY;
      if (animRes.blurRadius && animRes.blurRadius > 0) {
        ctx.filter = `blur(${animRes.blurRadius}px)`;
      }
    }
  }

  ctx.globalAlpha *= textOpacity;
  const x = canvasW / 2 + textOffsetX;
  const y = canvasH / 2 + textOffsetY;

  ctx.translate(x, y);
  if (textScale !== 1) ctx.scale(textScale, textScale);
  ctx.translate(-x, -y);

  ctx.font = `${layer.fontWeight ?? '800'} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.textAlign = layer.textAlign ?? 'center';
  ctx.textBaseline = 'middle';

  // Background box if present
  if (layer.backgroundColor) {
    const metrics = ctx.measureText(renderedText);
    const pad = layer.backgroundPadding ?? 16;
    const bw = metrics.width + pad * 2;
    const bh = layer.fontSize + pad * 1.5;
    ctx.save();
    ctx.fillStyle = layer.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, layer.backgroundRadius ?? 12);
    ctx.fill();
    ctx.restore();
  }

  // Stroke
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
  // Find current chunk
  const activeChunk = layer.chunks.find(c => currentTime >= c.start && currentTime <= c.end);
  if (!activeChunk) return;

  const styleDef = Registry.getCaptionStyle(layer.styleId) || Registry.getCaptionStyle('karaoke-word-highlight');
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

function drawProceduralVideoPlaceholder(ctx: CanvasRenderingContext2D, title: string, width: number, height: number) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#13131F');
  grad.addColorStop(1, '#08080C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 36px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title || 'Video Track', width / 2, height / 2);
  ctx.restore();
}
