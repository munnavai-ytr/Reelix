import test from 'node:test';
import assert from 'node:assert/strict';

import { detectSilences, compactSpeechAudio, alignScriptToDuration } from '../ai/whisper';
import { isLayerActive, interpolateKeyframe, computeAudioDuckingVolume } from '../engine/timeline';
import { layerVideoTime } from '../engine/media';
import { Layer, AudioLayer, VideoLayer, CaptionChunk } from '../engine/types';
import { repairDirectorScenes, assembleFullEditPlan, RawAiScene } from '../ai/director';
import { DirectorRequest } from '../ai/types';
import { Registry } from '../registry';

test('detectSilences identifies speech vs silence windows correctly', () => {
  const sampleRate = 16000;
  // 1s silence, 1s tone (speech), 1s silence
  const length = 3 * sampleRate;
  const pcm = new Float32Array(length);
  for (let i = sampleRate; i < 2 * sampleRate; i++) {
    pcm[i] = Math.sin((i * 440 * 2 * Math.PI) / sampleRate) * 0.1; // active speech
  }

  const { silences, speechSegments } = detectSilences(pcm, sampleRate, 0.015, 0.35);

  assert.ok(speechSegments.length >= 1, 'Should detect at least one speech segment');
  assert.ok(silences.length >= 1, 'Should detect silence regions');
  assert.ok(speechSegments[0].start >= 0.9, 'Speech segment should start near 1.0s');
  assert.ok(speechSegments[0].end <= 2.1, 'Speech segment should end near 2.0s');
});

test('compactSpeechAudio compacts speech and maps original time correctly', () => {
  const sampleRate = 16000;
  const length = 4 * sampleRate;
  const pcm = new Float32Array(length);

  const speechSegments = [
    { start: 1.0, end: 2.0 },
    { start: 3.0, end: 4.0 },
  ];

  const compacted = compactSpeechAudio(pcm, sampleRate, speechSegments);

  assert.equal(compacted.compactedDuration, 2.0, 'Compacted duration should equal sum of speech segments');
  // Time mapping
  assert.equal(compacted.mapTimeToCompacted(0.5), 0.0, 'Before first segment maps to 0');
  assert.equal(compacted.mapTimeToCompacted(1.5), 0.5, 'Middle of first segment maps to 0.5');
  assert.equal(compacted.mapTimeToCompacted(2.5), 1.0, 'Between segments maps to end of first segment');
  assert.equal(compacted.mapTimeToCompacted(3.5), 1.5, 'Middle of second segment maps to 1.5');
});

test('compactSpeechAudio edge cases (buffer end, fractional boundaries, single segment)', () => {
  const sampleRate = 16000;
  const length = 4 * sampleRate;
  const pcm = new Float32Array(length);

  // Single segment touching end of buffer with fractional boundary
  const segs = [{ start: 1.333, end: 4.0 }];
  const res = compactSpeechAudio(pcm, sampleRate, segs);

  assert.ok(res.compactedPcm.length > 0, 'Compacted PCM should have valid non-zero length');
  assert.equal(res.compactedPcm.length, res.ranges[0].b - res.ranges[0].a, 'Compacted length must strictly match range delta');
  assert.equal(res.mapTimeToCompacted(1.333), 0, 'Start of range maps to 0');
  assert.ok(res.mapTimeToCompacted(4.0) >= (res.ranges[0].b - res.ranges[0].a) / sampleRate, 'End of range maps to full duration');
});

test('alignScriptToDuration aligns script words to target duration boundaries', () => {
  const script = 'Welcome to Reelix AI vertical video editor';
  const duration = 10;

  const result = alignScriptToDuration(script, duration, 0.5, 9.5);

  assert.equal(result.text, script);
  assert.equal(result.duration, duration);
  assert.equal(result.words.length, 7);
  assert.equal(result.words[0].start, 0.5);
  assert.ok(result.words[result.words.length - 1].end <= 10);
});

test('isLayerActive computes temporal overlap accurately', () => {
  const layer: Layer = {
    id: 'l1',
    name: 'Test',
    type: 'video',
    trackIndex: 0,
    startTime: 2.0,
    duration: 5.0,
    src: 'opfs://test.mp4',
    trimIn: 0,
    trimOut: 0,
    volume: 1.0,
  };

  assert.equal(isLayerActive(layer, 1.0), false);
  assert.equal(isLayerActive(layer, 2.0), true);
  assert.equal(isLayerActive(layer, 4.5), true);
  assert.equal(isLayerActive(layer, 7.0), true);
  assert.equal(isLayerActive(layer, 7.1), false);

  const hiddenLayer: Layer = { ...layer, hidden: true };
  assert.equal(isLayerActive(hiddenLayer, 4.5), false);
});

test('interpolateKeyframe calculates linear and eased keyframe values', () => {
  const keyframes = [
    { time: 0, value: 0, easing: 'linear' as const },
    { time: 2, value: 100, easing: 'linear' as const },
  ];

  assert.equal(interpolateKeyframe(keyframes, -1.0, 0), 0);
  assert.equal(interpolateKeyframe(keyframes, 0.0, 0), 0);
  assert.equal(interpolateKeyframe(keyframes, 1.0, 0), 50);
  assert.equal(interpolateKeyframe(keyframes, 2.0, 0), 100);
  assert.equal(interpolateKeyframe(keyframes, 3.0, 0), 100);
});

test('computeAudioDuckingVolume applies keyframes, fades, and auto-ducking', () => {
  const musicLayer: AudioLayer = {
    id: 'bgm',
    name: 'Music',
    type: 'audio',
    audioType: 'music',
    trackIndex: 5,
    startTime: 0,
    duration: 10,
    src: 'opfs://bgm.mp3',
    volume: 1.0,
    fadeIn: 2.0,
    fadeOut: 2.0,
    ducking: {
      duckWhenVoiceOver: true,
      duckVolume: 0.2,
      attackMs: 100,
      releaseMs: 300,
    },
  };

  const voiceLayer: AudioLayer = {
    id: 'voice',
    name: 'Voice',
    type: 'audio',
    audioType: 'voiceover',
    trackIndex: 4,
    startTime: 3.0,
    duration: 4.0,
    src: 'opfs://voice.wav',
    volume: 1.0,
  };

  const allLayers: Layer[] = [musicLayer, voiceLayer];

  // At 1.0s (in fade-in period, no voice active) -> volume should be 0.5
  assert.equal(computeAudioDuckingVolume(musicLayer, 1.0, allLayers), 0.5);

  // At 4.0s (full fade, voice IS active at 3-7s) -> volume should be 1.0 * duckVolume(0.2) = 0.2
  assert.equal(computeAudioDuckingVolume(musicLayer, 4.0, allLayers), 0.2);

  // At 8.0s (voice finished, fadeOut started at 8-10s) -> volume should be 1.0 * (2/2) = 1.0
  assert.equal(computeAudioDuckingVolume(musicLayer, 8.0, allLayers), 1.0);
});

test('layerVideoTime computes trim and loop offsets correctly', () => {
  const layer: VideoLayer = {
    id: 'v1',
    name: 'Clip',
    type: 'video',
    trackIndex: 0,
    startTime: 2.0,
    duration: 6.0,
    src: 'opfs://video.mp4',
    trimIn: 1.5,
    trimOut: 0,
    volume: 1.0,
  };

  // At t = 3.0s, elapsed = 1.0s -> target = 1.5 + 1.0 = 2.5s
  assert.equal(layerVideoTime(layer, 3.0), 2.5);

  // With mock video element duration of 3.0s and loop enabled
  const loopingLayer: VideoLayer = { ...layer, loop: true };
  const mockVideo = { duration: 3.0 } as HTMLVideoElement;

  // Elapsed 2.0s -> trim 1.5 + 2.0 = 3.5s >= duration 3.0s -> loop offset
  const videoTime = layerVideoTime(loopingLayer, 4.0, mockVideo);
  assert.ok(videoTime >= 0 && videoTime < 3.0, 'Looping video time must stay within video duration');
});

test('repairDirectorScenes guarantees strict 0..D tiling with no gaps or overlaps', () => {
  const totalDuration = 18.0;
  const rawScenes: RawAiScene[] = [
    { start: 0.5, end: 1.0, effect: 'zoom-in' }, // short scene (<1.2s)
    { start: 2.0, end: 10.0, effect: 'invalid-effect' }, // gap before it, and long (>5.5s)
    { start: 12.0, end: 15.0, effect: 'color-grade' },
  ];
  const clipsMeta = [{ duration: 120.0 }];

  const repaired = repairDirectorScenes(rawScenes, totalDuration, clipsMeta, 0, 'broll');

  assert.ok(repaired.length > 0, 'Repaired scenes must not be empty');
  assert.equal(repaired[0].start, 0, 'First scene must start at 0');
  assert.equal(repaired[repaired.length - 1].end, totalDuration, 'Last scene must end at totalDuration');

  // Verify contiguous tiling
  for (let i = 0; i < repaired.length - 1; i++) {
    assert.equal(
      repaired[i].end,
      repaired[i + 1].start,
      `Scene ${i} end (${repaired[i].end}) must exactly equal scene ${i + 1} start (${repaired[i + 1].start})`
    );
  }

  // Verify scene duration bounds (min >= 1.2s, max <= 5.5s)
  for (const sc of repaired) {
    assert.ok(
      sc.duration >= 1.19,
      `Scene duration ${sc.duration}s should be >= 1.2s (or bounded by total duration)`
    );
    assert.ok(
      sc.duration <= 5.51,
      `Scene duration ${sc.duration}s should be <= 5.5s`
    );
  }
});

test('repairDirectorScenes walks cursor through 120s clip and wraps correctly', () => {
  const totalDuration = 20.0;
  // Multiple scenes referencing clip 0
  const rawScenes: RawAiScene[] = [
    { start: 0, end: 3.5, clipIndex: 0 },
    { start: 3.5, end: 7.0, clipIndex: 0 },
    { start: 7.0, end: 10.5, clipIndex: 0 },
    { start: 10.5, end: 14.0, clipIndex: 0 },
    { start: 14.0, end: 20.0, clipIndex: 0 },
  ];
  const clipsMeta = [{ duration: 120.0 }];

  const repaired = repairDirectorScenes(rawScenes, totalDuration, clipsMeta, 0, 'broll');

  let previousClipStart = -1;
  for (const sc of repaired) {
    assert.equal(sc.clipIndex, 0);
    assert.ok(
      sc.clipStart >= previousClipStart,
      `Clip cursor should advance forward through clip: previous=${previousClipStart}, current=${sc.clipStart}`
    );
    assert.ok(
      sc.clipStart + sc.duration <= 120.0,
      `Clip trim range [${sc.clipStart}, ${sc.clipStart + sc.duration}] must stay within 120s clip duration`
    );
    previousClipStart = sc.clipStart;
  }
});

test('repairDirectorScenes handles 20s clip looping smoothly', () => {
  const totalDuration = 35.0; // Needs to loop 20s clip
  const clipsMeta = [{ duration: 20.0 }];

  // Provide empty scenes to trigger full automatic timeline tiling
  const repaired = repairDirectorScenes([], totalDuration, clipsMeta, 0, 'broll');

  assert.equal(repaired[0].start, 0);
  assert.equal(repaired[repaired.length - 1].end, totalDuration);

  for (const sc of repaired) {
    assert.ok(
      sc.clipStart + sc.duration <= 20.05,
      `Scene clip range [${sc.clipStart}, ${sc.clipStart + sc.duration}] must not exceed 20s clip duration`
    );
  }
});

test('repairDirectorScenes gracefully repairs invalid AI output (bad indices and invalid effects)', () => {
  const totalDuration = 10.0;
  const rawScenes: RawAiScene[] = [
    { start: 0, end: 5.0, clipIndex: 999, imageIndex: 999, effect: 'hallucinated-effect', transition: 'hallucinated-transition' },
    { start: 5.0, end: 10.0, clipIndex: -5, effect: 'non-existent', transition: 'fake' },
  ];
  const clipsMeta = [{ duration: 15.0 }];

  const repaired = repairDirectorScenes(rawScenes, totalDuration, clipsMeta, 1, 'broll');

  for (const sc of repaired) {
    assert.ok(sc.clipIndex >= 0 && sc.clipIndex < clipsMeta.length, 'Clip index must be clamped within bounds');
    assert.ok(Registry.getEffect(sc.effect) !== undefined, `Effect "${sc.effect}" must be valid registry effect`);
    if (sc.transition) {
      assert.ok(Registry.getTransition(sc.transition) !== undefined, `Transition "${sc.transition}" must be valid registry transition`);
    }
  }
});

test('assembleFullEditPlan with OPFS URIs produces a plan containing zero blob URLs and handles missing niche/style', () => {
  const req: DirectorRequest = {
    script: 'Check out this awesome Reelix vertical video editing workflow.',
    voiceUrl: 'blob:http://localhost:3000/temp-voice',
    voiceUri: 'opfs://voice_1700000000.wav',
    voiceDuration: 15.0,
    userVideoUrls: ['blob:http://localhost:3000/temp-clip-0'],
    userVideoUris: ['opfs://clip_0.mp4'],
    userImageUrls: ['blob:http://localhost:3000/temp-img-0'],
    userImageUris: ['opfs://img_0.png'],
    musicUrl: 'blob:http://localhost:3000/temp-music',
    musicUri: 'opfs://soundtrack.mp3',
    // intentionally omit niche and style to test Bug 1 fix
  };

  const captionChunks: CaptionChunk[] = [
    { text: 'Check out this', start: 0, end: 1.5, words: [{ word: 'Check', start: 0, end: 0.5 }, { word: 'out', start: 0.5, end: 1.0 }, { word: 'this', start: 1.0, end: 1.5 }] },
    { text: 'awesome Reelix', start: 1.5, end: 3.0, words: [{ word: 'awesome', start: 1.5, end: 2.2 }, { word: 'Reelix', start: 2.2, end: 3.0 }] },
  ];

  const rawAiPlan = {
    title: 'Awesome Reelix Demo',
    scenes: [
      { start: 0, end: 7.5, clipIndex: 0, effect: 'zoom-in' },
      { start: 7.5, end: 15.0, clipIndex: 0, effect: 'color-grade' },
    ],
  };

  const result = assembleFullEditPlan(rawAiPlan, req, 15.0, captionChunks, 'karaoke-word-highlight', []);
  const planJson = JSON.stringify(result.editPlan);

  assert.ok(result.editPlan.layers.length > 0, 'Edit plan must contain layers');
  assert.ok(!planJson.includes('blob:'), 'Persisted EditPlan must not contain any transient blob: URLs');

  // Verify voice layer has opfs uri
  const voiceLayer = result.editPlan.layers.find((l) => l.type === 'audio' && (l as AudioLayer).audioType === 'voiceover') as AudioLayer;
  assert.ok(voiceLayer, 'Must have voiceover layer');
  assert.equal(voiceLayer.src, 'opfs://voice_1700000000.wav');

  // Verify video layer has opfs uri
  const videoLayer = result.editPlan.layers.find((l) => l.type === 'video') as VideoLayer;
  assert.ok(videoLayer, 'Must have video layer');
  assert.equal(videoLayer.src, 'opfs://clip_0.mp4');

  // Verify music layer has opfs uri
  const musicLayer = result.editPlan.layers.find((l) => l.type === 'audio' && (l as AudioLayer).audioType === 'music') as AudioLayer;
  assert.ok(musicLayer, 'Must have music layer');
  assert.equal(musicLayer.src, 'opfs://soundtrack.mp3');
});
