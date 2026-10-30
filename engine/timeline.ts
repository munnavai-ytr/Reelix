// Timeline and keyframe interpolation helper
import { Layer, KeyframePoint, AudioLayer, AudioDuckingConfig } from './types';
import { evaluateEasing } from './easing';

export function isLayerActive(layer: Layer, currentTime: number): boolean {
  if (layer.hidden) return false;
  return currentTime >= layer.startTime && currentTime <= (layer.startTime + layer.duration);
}

export function interpolateKeyframe(
  keyframes: KeyframePoint[] | undefined,
  layerRelativeTime: number,
  defaultValue: number
): number {
  if (!keyframes || keyframes.length === 0) return defaultValue;
  if (keyframes.length === 1) return keyframes[0].value;

  // Sorted keyframes
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  if (layerRelativeTime <= sorted[0].time) return sorted[0].value;
  if (layerRelativeTime >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  // Find surrounding pair
  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (layerRelativeTime >= k1.time && layerRelativeTime <= k2.time) {
      const span = k2.time - k1.time;
      if (span <= 0) return k1.value;
      const progress = (layerRelativeTime - k1.time) / span;
      const easedProgress = evaluateEasing(progress, k2.easing || 'linear');
      return k1.value + (k2.value - k1.value) * easedProgress;
    }
  }

  return defaultValue;
}

export function computeAudioDuckingVolume(
  audioLayer: AudioLayer,
  currentTime: number,
  allLayers: Layer[]
): number {
  let baseVolume = audioLayer.volume ?? 1;

  // Check keyframes for volume
  if (audioLayer.keyframes?.volume) {
    const relTime = currentTime - audioLayer.startTime;
    baseVolume = interpolateKeyframe(audioLayer.keyframes.volume, relTime, baseVolume);
  }

  // Handle fadeIn / fadeOut
  const relTime = currentTime - audioLayer.startTime;
  if (audioLayer.fadeIn && audioLayer.fadeIn > 0 && relTime < audioLayer.fadeIn) {
    baseVolume *= (relTime / audioLayer.fadeIn);
  }
  const timeLeft = audioLayer.duration - relTime;
  if (audioLayer.fadeOut && audioLayer.fadeOut > 0 && timeLeft < audioLayer.fadeOut) {
    baseVolume *= Math.max(0, timeLeft / audioLayer.fadeOut);
  }

  // Auto-ducking for background music
  if (audioLayer.audioType === 'music' && audioLayer.ducking?.duckWhenVoiceOver) {
    const ducking: AudioDuckingConfig = audioLayer.ducking;
    // Check if any voiceover layer is currently active
    const isVoiceActive = allLayers.some(
      (l) => l.type === 'audio' && (l as AudioLayer).audioType === 'voiceover' && isLayerActive(l, currentTime)
    );

    if (isVoiceActive) {
      baseVolume *= ducking.duckVolume;
    }
  }

  return Math.max(0, Math.min(1, baseVolume));
}
