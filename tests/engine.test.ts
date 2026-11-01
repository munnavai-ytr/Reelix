import test from 'node:test';
import assert from 'node:assert/strict';

import { detectSilences, compactSpeechAudio, alignScriptToDuration } from '../ai/whisper';
import { isLayerActive, interpolateKeyframe, computeAudioDuckingVolume } from '../engine/timeline';
import { layerVideoTime } from '../engine/media';
import { Layer, AudioLayer, VideoLayer } from '../engine/types';

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
    trimIn: 1.5,
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
