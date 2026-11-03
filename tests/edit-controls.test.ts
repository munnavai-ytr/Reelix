import { describe, test, expect } from 'vitest';
import { DEFAULT_EDIT_CONTROLS, EditControls } from '../pipeline/types';
import {
  resolvePromptConflicts,
  getCutSpeedRange,
  capEffectsIntensity,
  enforceEditControls,
} from '../pipeline/enforce-controls';
import { repairDirectorScenes } from '../ai/director';
import { EditPlan, VideoLayer, AudioLayer, CaptionLayer, TextLayer } from '../engine/types';

describe('Edit Controls & Deterministic Enforcement Engine', () => {
  test('DEFAULT_EDIT_CONTROLS provides expected auto defaults', () => {
    expect(DEFAULT_EDIT_CONTROLS.silence.mode).toBe('auto');
    expect(DEFAULT_EDIT_CONTROLS.sfx.mode).toBe('auto');
    expect(DEFAULT_EDIT_CONTROLS.music.mode).toBe('auto');
    expect(DEFAULT_EDIT_CONTROLS.hook).toBe('auto');
    expect(DEFAULT_EDIT_CONTROLS.captions.mode).toBe('auto');
    expect(DEFAULT_EDIT_CONTROLS.effects.mode).toBe('auto');
    expect(DEFAULT_EDIT_CONTROLS.transitions).toBe('auto');
    expect(DEFAULT_EDIT_CONTROLS.cutSpeed).toBe('normal');
    expect(DEFAULT_EDIT_CONTROLS.colorLook).toBe('auto');
  });

  test('resolvePromptConflicts: User prompt ALWAYS overrides OFF switches', () => {
    const controls: EditControls = {
      ...DEFAULT_EDIT_CONTROLS,
      sfx: { mode: 'off', level: 'medium' },
      music: { mode: 'off', volume: 35, duck: true },
      hook: 'off',
      captions: { mode: 'off', styleId: 'karaoke-word-highlight' },
      effects: { mode: 'off', intensity: 'medium' },
      transitions: 'off',
      silence: { mode: 'off', minSec: 0.45 },
    };

    const prompt = 'Add epic music, whoosh sound effects, a title hook, Bangla captions, fast zoom effects, crossfade transitions, and cut pauses';

    const { effectiveControls, notices } = resolvePromptConflicts(prompt, controls);

    expect(effectiveControls.sfx.mode).toBe('on');
    expect(effectiveControls.music.mode).toBe('on');
    expect(effectiveControls.hook).toBe('on');
    expect(effectiveControls.captions.mode).toBe('on');
    expect(effectiveControls.effects.mode).toBe('auto');
    expect(effectiveControls.transitions).toBe('auto');
    expect(effectiveControls.silence.mode).toBe('on');

    expect(notices.length).toBeGreaterThanOrEqual(6);
    expect(notices.some((n) => n.includes('SFX'))).toBe(true);
    expect(notices.some((n) => n.includes('music'))).toBe(true);
    expect(notices.some((n) => n.includes('hook'))).toBe(true);
    expect(notices.some((n) => n.includes('captions'))).toBe(true);
  });

  test('getCutSpeedRange returns correct min/max durations for slow, normal, fast', () => {
    const slow = getCutSpeedRange('slow');
    expect(slow.min).toBe(4.0);
    expect(slow.max).toBe(6.0);

    const normal = getCutSpeedRange('normal');
    expect(normal.min).toBe(2.5);
    expect(normal.max).toBe(4.0);

    const fast = getCutSpeedRange('fast');
    expect(fast.min).toBe(1.5);
    expect(fast.max).toBe(2.5);
  });

  test('capEffectsIntensity caps layer effects per minute', () => {
    const plan: EditPlan = {
      id: 'test_plan',
      title: 'Test',
      duration: 60,
      fps: 30,
      canvas: { width: 1080, height: 1920, backgroundColor: '#000000' },
      metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      layers: [
        { id: 'v1', name: 'v1', type: 'video', trackIndex: 0, startTime: 0, duration: 10, src: '', trimIn: 0, trimOut: 10, volume: 1, effects: [{ effectId: 'e1', enabled: true, params: {} }, { effectId: 'e2', enabled: true, params: {} }] },
        { id: 'v2', name: 'v2', type: 'video', trackIndex: 0, startTime: 10, duration: 10, src: '', trimIn: 0, trimOut: 10, volume: 1, effects: [{ effectId: 'e3', enabled: true, params: {} }, { effectId: 'e4', enabled: true, params: {} }] },
        { id: 'v3', name: 'v3', type: 'video', trackIndex: 0, startTime: 20, duration: 10, src: '', trimIn: 0, trimOut: 10, volume: 1, effects: [{ effectId: 'e5', enabled: true, params: {} }] },
      ],
    };

    capEffectsIntensity(plan, 'low');
    const totalEffects = plan.layers.reduce((acc, l) => acc + (l.effects?.length || 0), 0);
    expect(totalEffects).toBeLessThanOrEqual(2);
  });

  test('enforceEditControls strips layers when set to OFF', () => {
    const plan: EditPlan = {
      id: 'test_plan',
      title: 'Test',
      duration: 30,
      fps: 30,
      canvas: { width: 1080, height: 1920, backgroundColor: '#000000' },
      metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      layers: [
        { id: 'v1', name: 'v1', type: 'video', trackIndex: 0, startTime: 0, duration: 30, src: '', trimIn: 0, trimOut: 30, volume: 1, transitionIn: { type: 'crossfade', duration: 0.4 }, effects: [{ effectId: 'glow', enabled: true, params: {} }] } as VideoLayer,
        { id: 'c1', name: 'c1', type: 'caption', trackIndex: 1, startTime: 0, duration: 30, chunks: [], styleId: 'bold', baseColor: '#FFF', highlightColor: '#00F', fontFamily: 'Inter', fontSize: 40, positionY: 300 } as CaptionLayer,
        { id: 'h1', name: 'Hook Text', type: 'text', trackIndex: 2, startTime: 0, duration: 2, text: 'Hook', color: '#FFF', fontSize: 40, fontFamily: 'Inter' } as TextLayer,
        { id: 'm1', name: 'm1', type: 'audio', audioType: 'music', trackIndex: 3, startTime: 0, duration: 30, src: '', volume: 0.3 } as AudioLayer,
        { id: 's1', name: 's1', type: 'audio', audioType: 'sfx', trackIndex: 4, startTime: 0, duration: 1, src: '', volume: 0.5 } as AudioLayer,
      ],
    };

    const controls: EditControls = {
      silence: { mode: 'off', minSec: 0.45 },
      sfx: { mode: 'off', level: 'medium' },
      music: { mode: 'off', volume: 35, duck: true },
      hook: 'off',
      captions: { mode: 'off', styleId: 'karaoke-word-highlight' },
      effects: { mode: 'off', intensity: 'medium' },
      transitions: 'off',
      cutSpeed: 'normal',
      colorLook: 'none',
    };

    const result = enforceEditControls(plan, controls, '');

    expect(result.plan.layers.some((l) => l.type === 'caption')).toBe(false);
    expect(result.plan.layers.some((l) => l.type === 'audio' && (l as AudioLayer).audioType === 'sfx')).toBe(false);
    expect(result.plan.layers.some((l) => l.type === 'audio' && (l as AudioLayer).audioType === 'music')).toBe(false);
    expect(result.plan.layers.some((l) => l.type === 'text' && l.id.includes('hook'))).toBe(false);

    const videoLayer = result.plan.layers.find((l) => l.type === 'video') as VideoLayer;
    expect(videoLayer.transitionIn).toBeUndefined();
    expect(videoLayer.effects?.length || 0).toBe(0);
  });

  test('enforceEditControls applies requested Color Look', () => {
    const plan: EditPlan = {
      id: 'test_plan',
      title: 'Test',
      duration: 20,
      fps: 30,
      canvas: { width: 1080, height: 1920, backgroundColor: '#000000' },
      metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      layers: [
        { id: 'v1', name: 'v1', type: 'video', trackIndex: 0, startTime: 0, duration: 20, src: '', trimIn: 0, trimOut: 20, volume: 1, effects: [] } as VideoLayer,
      ],
    };

    const controls: EditControls = {
      ...DEFAULT_EDIT_CONTROLS,
      colorLook: 'cinematic',
    };

    const result = enforceEditControls(plan, controls, '');
    const videoLayer = result.plan.layers.find((l) => l.type === 'video') as VideoLayer;
    const colorGradeEffect = videoLayer.effects?.find((e) => e.effectId === 'color-grade');

    expect(colorGradeEffect).toBeDefined();
    expect(colorGradeEffect?.params?.preset).toBe('teal-orange');
  });

  test('repairDirectorScenes clamps scene durations per cutSpeed', () => {
    const totalDuration = 20;
    const clipsMeta = [{ duration: 15 }];

    // Fast speed: maxCut = 2.5s
    const fastScenes = repairDirectorScenes(undefined, totalDuration, clipsMeta, 0, 'broll', 'fast');
    for (const sc of fastScenes) {
      expect(sc.duration).toBeLessThanOrEqual(2.55);
    }

    // Slow speed: minCut = 4.0s
    const slowScenes = repairDirectorScenes(undefined, totalDuration, clipsMeta, 0, 'broll', 'slow');
    for (const sc of slowScenes) {
      expect(sc.duration).toBeGreaterThanOrEqual(3.9);
    }
  });
});
