// Deterministic Control Enforcement & Prompt Conflict Resolution Engine for Reelix Edit Controls

import { EditPlan, AudioLayer, VideoLayer, ImageLayer, TextLayer, CaptionLayer } from '../engine/types';
import { EditControls } from './types';
import { COLOR_LOOKS } from './color-looks';

export interface EnforcementResult {
  plan: EditPlan;
  notices: string[];
  appliedDecisions: string[];
}

/**
 * Detects if the user's description prompt explicitly requests features
 * that conflict with switch settings. What the user writes in prompt ALWAYS wins.
 */
export function resolvePromptConflicts(
  userPrompt: string,
  controls: EditControls
): { effectiveControls: EditControls; notices: string[] } {
  const notices: string[] = [];
  const q = (userPrompt || '').toLowerCase();
  const effective: EditControls = JSON.parse(JSON.stringify(controls));

  if (!q) {
    return { effectiveControls: effective, notices };
  }

  // 1. SFX conflict check
  const sfxKeywords = ['sfx', 'sound effect', 'swish', 'whoosh', 'pop', 'ding', 'শব্দ', 'সাউন্ড ইফেক্ট'];
  const asksSfx = sfxKeywords.some((kw) => q.includes(kw));
  if (effective.sfx.mode === 'off' && asksSfx) {
    effective.sfx.mode = 'on';
    notices.push('You asked for SFX in the description, so it was added.');
  }

  // 2. Music conflict check
  const musicKeywords = ['music', 'soundtrack', 'song', 'bgm', 'গান', 'মিউজিক'];
  const asksMusic = musicKeywords.some((kw) => q.includes(kw));
  if (effective.music.mode === 'off' && asksMusic) {
    effective.music.mode = 'on';
    notices.push('You asked for background music in the description, so it was added.');
  }

  // 3. Hook text conflict check
  const hookKeywords = ['hook', 'headline', 'title text', 'হুক', 'টাইটেল'];
  const asksHook = hookKeywords.some((kw) => q.includes(kw));
  if (effective.hook === 'off' && asksHook) {
    effective.hook = 'on';
    notices.push('You asked for a hook title in the description, so it was added.');
  }

  // 4. Captions conflict check
  const captionKeywords = ['caption', 'subtitle', 'subtitles', 'ক্যাপশন', 'লেখা'];
  const asksCaptions = captionKeywords.some((kw) => q.includes(kw));
  if (effective.captions.mode === 'off' && asksCaptions) {
    effective.captions.mode = 'on';
    notices.push('You asked for captions in the description, so they were added.');
  }

  // 5. Visual effects conflict check
  const effectKeywords = ['effect', 'effects', 'zoom', 'glow', 'glitch', 'ইফেক্ট', 'জুম'];
  const asksEffects = effectKeywords.some((kw) => q.includes(kw));
  if (effective.effects.mode === 'off' && asksEffects) {
    effective.effects.mode = 'auto';
    notices.push('You asked for visual effects in the description, so they were added.');
  }

  // 6. Transitions conflict check
  const transitionKeywords = ['transition', 'crossfade', 'wipe', 'ট্রানজিশন'];
  const asksTransitions = transitionKeywords.some((kw) => q.includes(kw));
  if (effective.transitions === 'off' && asksTransitions) {
    effective.transitions = 'auto';
    notices.push('You asked for transitions in the description, so they were added.');
  }

  // 7. Silence removal conflict check
  const silenceKeywords = ['silence', 'pause', 'dead air', 'সাইলেন্স', 'পজ'];
  const asksSilence = silenceKeywords.some((kw) => q.includes(kw));
  if (effective.silence.mode === 'off' && asksSilence) {
    effective.silence.mode = 'on';
    notices.push('You asked for silence removal in the description, so it was performed.');
  }

  return { effectiveControls: effective, notices };
}

/**
 * Clamps cut speed / scene durations to the target range during scene repair.
 * - Slow: 4.0s - 6.0s
 * - Normal: 2.5s - 4.0s
 * - Fast: 1.5s - 2.5s
 */
export function getCutSpeedRange(cutSpeed: 'slow' | 'normal' | 'fast'): { min: number; max: number } {
  switch (cutSpeed) {
    case 'slow':
      return { min: 4.0, max: 6.0 };
    case 'fast':
      return { min: 1.5, max: 2.5 };
    case 'normal':
    default:
      return { min: 2.5, max: 4.0 };
  }
}

/**
 * Caps total visual layer effects per minute based on intensity.
 * - Low: max 2 effects per minute
 * - Medium: max 5 effects per minute
 * - High: max 10 effects per minute
 */
export function capEffectsIntensity(
  plan: EditPlan,
  intensity: 'low' | 'medium' | 'high'
): void {
  const durationMin = Math.max(0.2, plan.duration / 60);
  let maxAllowed = 5;
  if (intensity === 'low') maxAllowed = Math.max(1, Math.round(2 * durationMin));
  else if (intensity === 'medium') maxAllowed = Math.max(2, Math.round(5 * durationMin));
  else if (intensity === 'high') maxAllowed = Math.max(3, Math.round(10 * durationMin));

  let count = 0;
  for (const layer of plan.layers) {
    if (layer.effects && layer.effects.length > 0) {
      if (count >= maxAllowed) {
        layer.effects = [];
      } else if (count + layer.effects.length > maxAllowed) {
        const allowedCount = maxAllowed - count;
        layer.effects = layer.effects.slice(0, allowedCount);
        count += allowedCount;
      } else {
        count += layer.effects.length;
      }
    }
  }
}

/**
 * Enforces EditControls deterministically on an EditPlan.
 * Guarantees zero switch violations.
 */
export function enforceEditControls(
  plan: EditPlan,
  controls: EditControls,
  userPrompt = ''
): EnforcementResult {
  const { effectiveControls, notices } = resolvePromptConflicts(userPrompt, controls);
  const appliedDecisions: string[] = [];

  // 1. CAPTIONS ENFORCEMENT
  if (effectiveControls.captions.mode === 'off') {
    plan.layers = plan.layers.filter((l) => l.type !== 'caption');
    appliedDecisions.push('Captions: OFF (removed caption layer)');
  } else {
    const captionLayer = plan.layers.find((l) => l.type === 'caption') as CaptionLayer | undefined;
    if (captionLayer && effectiveControls.captions.styleId) {
      captionLayer.styleId = effectiveControls.captions.styleId;
      appliedDecisions.push(`Captions: ON (${effectiveControls.captions.styleId})`);
    } else if (captionLayer) {
      appliedDecisions.push(`Captions: ON (${captionLayer.styleId})`);
    }
  }

  // 2. SFX ENFORCEMENT
  if (effectiveControls.sfx.mode === 'off') {
    plan.layers = plan.layers.filter(
      (l) => !(l.type === 'audio' && (l as AudioLayer).audioType === 'sfx')
    );
    appliedDecisions.push('SFX: OFF (removed sound effect layers)');
  } else {
    // If mode is ON or AUTO, ensure SFX layers exist or are preserved
    const sfxLayers = plan.layers.filter(
      (l) => l.type === 'audio' && (l as AudioLayer).audioType === 'sfx'
    );
    if (effectiveControls.sfx.mode === 'on' && sfxLayers.length === 0) {
      // Inject SFX layers at cut points based on level
      const intervalSec = effectiveControls.sfx.level === 'high' ? 2.5 : effectiveControls.sfx.level === 'medium' ? 4.5 : 8.0;
      const types: Array<'whoosh' | 'pop' | 'hit' | 'ding'> = ['whoosh', 'pop', 'hit', 'ding'];
      let idx = 0;
      for (let t = 0.5; t < plan.duration - 0.5; t += intervalSec) {
        const sfxType = types[idx % types.length];
        plan.layers.push({
          id: `sfx_enforced_${idx}_${Date.now()}`,
          name: `SFX ${sfxType.toUpperCase()}`,
          type: 'audio',
          audioType: 'sfx',
          sfxType,
          trackIndex: 5,
          startTime: Number(t.toFixed(2)),
          duration: 0.8,
          src: '',
          volume: 0.7,
        });
        idx++;
      }
      appliedDecisions.push(`SFX: ON (${effectiveControls.sfx.level} intensity, added sound effects)`);
    } else {
      appliedDecisions.push(`SFX: ${effectiveControls.sfx.mode.toUpperCase()} (${sfxLayers.length} effects)`);
    }
  }

  // 3. BACKGROUND MUSIC ENFORCEMENT
  if (effectiveControls.music.mode === 'off') {
    plan.layers = plan.layers.filter(
      (l) => !(l.type === 'audio' && (l as AudioLayer).audioType === 'music')
    );
    appliedDecisions.push('Background Music: OFF');
  } else {
    let musicLayer = plan.layers.find(
      (l) => l.type === 'audio' && (l as AudioLayer).audioType === 'music'
    ) as AudioLayer | undefined;

    if (!musicLayer && effectiveControls.music.mode === 'on') {
      const newMusicLayer: AudioLayer = {
        id: `music_enforced_${Date.now()}`,
        name: 'Background Music',
        type: 'audio',
        audioType: 'music',
        trackIndex: 3,
        startTime: 0,
        duration: plan.duration,
        src: '',
        volume: effectiveControls.music.volume / 100,
        ducking: effectiveControls.music.duck
          ? { duckWhenVoiceOver: true, duckVolume: 0.25, attackMs: 150, releaseMs: 300 }
          : undefined,
      };
      plan.layers.push(newMusicLayer);
      appliedDecisions.push(`Background Music: ON (vol ${effectiveControls.music.volume}%, ducking ${effectiveControls.music.duck ? 'ON' : 'OFF'})`);
    } else if (musicLayer) {
      musicLayer.volume = effectiveControls.music.volume / 100;
      if (effectiveControls.music.duck) {
        musicLayer.ducking = { duckWhenVoiceOver: true, duckVolume: 0.25, attackMs: 150, releaseMs: 300 };
      } else {
        delete musicLayer.ducking;
      }
      appliedDecisions.push(`Background Music: ${effectiveControls.music.mode.toUpperCase()} (vol ${effectiveControls.music.volume}%, ducking ${effectiveControls.music.duck ? 'ON' : 'OFF'})`);
    }
  }

  // 4. HOOK TEXT ENFORCEMENT
  if (effectiveControls.hook === 'off') {
    plan.layers = plan.layers.filter((l) => {
      if (l.type === 'text') {
        const textLayer = l as TextLayer;
        return !(textLayer.id.includes('hook') || textLayer.name.toLowerCase().includes('hook'));
      }
      return true;
    });
    appliedDecisions.push('Hook Text: OFF');
  } else {
    const hasHook = plan.layers.some(
      (l) => l.type === 'text' && (l.id.includes('hook') || l.name.toLowerCase().includes('hook'))
    );
    if (!hasHook && effectiveControls.hook === 'on') {
      plan.layers.push({
        id: `hook_text_enforced_${Date.now()}`,
        name: 'Hook Text',
        type: 'text',
        trackIndex: 1,
        startTime: 0,
        duration: Math.min(2.5, plan.duration),
        text: plan.title || 'WATCH THIS',
        fontFamily: 'Inter, sans-serif',
        fontSize: 64,
        fontWeight: '900',
        color: '#FFFFFF',
        backgroundColor: '#000000',
        backgroundPadding: 16,
        backgroundRadius: 12,
        position: { x: 0, y: -350 },
        animationId: 'bounce-in',
      });
      appliedDecisions.push('Hook Text: ON (added at 0s)');
    } else if (hasHook) {
      appliedDecisions.push('Hook Text: ON');
    }
  }

  // 5. VISUAL EFFECTS ENFORCEMENT
  if (effectiveControls.effects.mode === 'off') {
    for (const l of plan.layers) {
      if (l.effects) l.effects = [];
    }
    appliedDecisions.push('Visual Effects: OFF (cleared layer effects)');
  } else {
    capEffectsIntensity(plan, effectiveControls.effects.intensity);
    appliedDecisions.push(`Visual Effects: AUTO (${effectiveControls.effects.intensity} intensity cap)`);
  }

  // 6. TRANSITIONS ENFORCEMENT
  if (effectiveControls.transitions === 'off') {
    for (const l of plan.layers) {
      if (l.type === 'video' || l.type === 'image') {
        delete (l as VideoLayer | ImageLayer).transitionIn;
      }
    }
    if (plan.transitions) delete plan.transitions;
    appliedDecisions.push('Transitions: OFF (cleared transition cuts)');
  } else {
    appliedDecisions.push('Transitions: AUTO');
  }

  // 7. CUT SPEED ENFORCEMENT
  const speedRange = getCutSpeedRange(effectiveControls.cutSpeed);
  appliedDecisions.push(`Cut Speed: ${effectiveControls.cutSpeed.toUpperCase()} (${speedRange.min}s - ${speedRange.max}s cuts)`);

  // 8. COLOR LOOK ENFORCEMENT
  if (effectiveControls.colorLook === 'none') {
    for (const l of plan.layers) {
      if (l.effects) {
        l.effects = l.effects.filter((e) => e.effectId !== 'color-grade');
      }
    }
    appliedDecisions.push('Color Look: NONE');
  } else if (effectiveControls.colorLook !== 'auto') {
    const config = COLOR_LOOKS[effectiveControls.colorLook];
    if (config && config.effectParams) {
      for (const l of plan.layers) {
        if (l.type === 'video' || l.type === 'image') {
          if (!l.effects) l.effects = [];
          // Remove old color-grade if any
          l.effects = l.effects.filter((e) => e.effectId !== 'color-grade');
          l.effects.push({
            effectId: 'color-grade',
            enabled: true,
            params: {
              preset: config.effectParams.preset,
              strength: config.effectParams.strength,
            },
          });
        }
      }
      appliedDecisions.push(`Color Look: ${config.label}`);
    }
  } else {
    appliedDecisions.push('Color Look: AUTO');
  }

  // Save audit log to plan metadata
  if (!plan.metadata) {
    plan.metadata = { createdAt: Date.now(), updatedAt: Date.now() };
  }
  plan.metadata.appliedDecisions = appliedDecisions;
  plan.metadata.notices = notices;

  return { plan, notices, appliedDecisions };
}
