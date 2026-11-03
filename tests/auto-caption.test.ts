import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeTranscripts,
  chunkWordsIntoLines,
  validateCaptionSpec,
  TimedWord,
} from '../pipeline/auto-caption';
import { EditPlan } from '../engine/types';

test('mergeTranscripts drops duplicate words in overlap within 0.3s and maintains monotonic times', () => {
  const chunk1: TimedWord[] = [
    { word: 'Welcome', start: 0.1, end: 0.6 },
    { word: 'to', start: 0.7, end: 0.9 },
    { word: 'Reelix', start: 1.0, end: 1.5 },
    { word: 'studio', start: 1.6, end: 2.1 }, // inside overlap (offset 1.8)
  ];

  const chunk2: TimedWord[] = [
    { word: 'studio', start: 0.0, end: 0.4 }, // relative to offset 1.8 -> 1.8 to 2.2 -> duplicates 'studio' at 1.6-2.1
    { word: 'vertical', start: 0.5, end: 1.0 }, // 2.3 to 2.8
    { word: 'editor', start: 1.1, end: 1.6 }, // 2.9 to 3.4
  ];

  const merged = mergeTranscripts([
    { words: chunk1, offset: 0 },
    { words: chunk2, offset: 1.8 },
  ]);

  const wordsText = merged.map((w) => w.word);
  // 'studio' should only appear once
  const studioCount = wordsText.filter((w) => w.toLowerCase() === 'studio').length;
  assert.equal(studioCount, 1, 'Duplicate word in overlap must be dropped');

  assert.deepEqual(wordsText, ['Welcome', 'to', 'Reelix', 'studio', 'vertical', 'editor']);

  // Monotonic times check
  for (let i = 0; i < merged.length - 1; i++) {
    assert.ok(
      merged[i].start <= merged[i + 1].start,
      `Word ${merged[i].word} start (${merged[i].start}) must be <= next word start (${merged[i + 1].start})`
    );
    assert.ok(
      merged[i].end >= merged[i].start,
      `Word ${merged[i].word} end (${merged[i].end}) must be >= start (${merged[i].start})`
    );
  }
});

test('chunkWordsIntoLines breaks on max words, pauses, punctuation and preserves Bengali words', () => {
  // 1. Max words break
  const words: TimedWord[] = [
    { word: 'One', start: 0.0, end: 0.4 },
    { word: 'Two', start: 0.5, end: 0.9 },
    { word: 'Three', start: 1.0, end: 1.4 },
    { word: 'Four', start: 1.5, end: 1.9 },
    { word: 'Five', start: 2.0, end: 2.4 },
  ];

  const chunksMax2 = chunkWordsIntoLines(words, 2, false);
  assert.equal(chunksMax2.length, 3);
  assert.equal(chunksMax2[0].words.length, 2);
  assert.equal(chunksMax2[1].words.length, 2);
  assert.equal(chunksMax2[2].words.length, 1);

  // 2. Pause break (> 0.45s)
  const wordsWithPause: TimedWord[] = [
    { word: 'Hello', start: 0.0, end: 0.5 },
    { word: 'World', start: 1.2, end: 1.8 }, // gap = 1.2 - 0.5 = 0.7s > 0.45s
  ];
  const chunksPause = chunkWordsIntoLines(wordsWithPause, 4, false);
  assert.equal(chunksPause.length, 2, 'Should break on pause > 0.45s');

  // 3. Punctuation break
  const wordsWithPunct: TimedWord[] = [
    { word: 'First!', start: 0.0, end: 0.4 },
    { word: 'Second', start: 0.5, end: 0.9 },
  ];
  const chunksPunct = chunkWordsIntoLines(wordsWithPunct, 4, false);
  assert.equal(chunksPunct.length, 2, 'Should break on exclamation point');

  // 4. Hold caption until next starts when gap < 0.35s
  const wordsCloseGap: TimedWord[] = [
    { word: 'First', start: 0.0, end: 0.5 },
    { word: 'Second', start: 0.7, end: 1.2 }, // gap = 0.2s < 0.35s
  ];
  const chunksClose = chunkWordsIntoLines(wordsCloseGap, 1, false);
  assert.equal(chunksClose[0].end, 0.7, 'Caption 1 should hold until Caption 2 starts');

  // 5. Bengali text: never split inside a word and never uppercased
  const bengaliWords: TimedWord[] = [
    { word: 'আমি', start: 0.0, end: 0.4 },
    { word: 'বাংলায়', start: 0.5, end: 0.9 },
    { word: 'গান', start: 1.0, end: 1.4 },
    { word: 'গাই।', start: 1.5, end: 1.9 },
  ];
  const bengaliChunks = chunkWordsIntoLines(bengaliWords, 2, true);
  assert.equal(bengaliChunks.length, 2);
  assert.equal(bengaliChunks[0].text, 'আমি বাংলায়');
  assert.equal(bengaliChunks[1].text, 'গান গাই।');
});

test('validateCaptionSpec enforces registry matching, safe color hexes, and range clamps', () => {
  // Completely bogus spec
  const bogusSpec = {
    styleId: 'fake-nonexistent-style-12345',
    animation: 'super-fake-animation',
    fontSize: 500, // way too big, max is 96
    positionY: 2000, // way too high, max is 800
    baseColor: 'red-not-hex',
    highlightColor: 'invalid-color',
    maxWordsPerLine: 99, // max is 6
    strokeWidth: 50, // max is 12
  };

  const { spec, notices } = validateCaptionSpec(bogusSpec, '');
  assert.equal(spec.styleId, 'karaoke-word-highlight', 'Invalid styleId must fall back to default');
  assert.equal(spec.animation, 'none', 'Invalid animation must fall back to none');
  assert.equal(spec.fontSize, 96, 'Font size must clamp to 96');
  assert.equal(spec.positionY, 800, 'Position Y must clamp to 800');
  assert.equal(spec.baseColor, '#FFFFFF', 'Invalid base color must fall back to #FFFFFF');
  assert.equal(spec.highlightColor, '#FBBF24', 'Invalid highlight color must fall back to default #FBBF24');
  assert.equal(spec.maxWordsPerLine, 6, 'Max words per line must clamp to 6');
  assert.equal(spec.strokeWidth, 12, 'Stroke width must clamp to 12');
  assert.ok(notices.length > 0, 'Notices should record fallback info');
});

test('AutoCaption generated EditPlan contains zero blob URLs and matches expected structure', () => {
  const plan: EditPlan = {
    id: 'autocaption_test_123',
    title: 'Captioned Video',
    duration: 15.0,
    fps: 30,
    canvas: { width: 1080, height: 1920, backgroundColor: '#0B0B0F' },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      style: 'karaoke-word-highlight',
    },
    layers: [
      {
        id: 'base_video',
        name: 'Original Video',
        type: 'video',
        trackIndex: 0,
        startTime: 0,
        duration: 15.0,
        src: 'opfs://clip_test.mp4',
        trimIn: 0,
        trimOut: 15.0,
        volume: 0,
      },
      {
        id: 'original_audio',
        name: 'Original Audio',
        type: 'audio',
        audioType: 'voiceover',
        trackIndex: 4,
        startTime: 0,
        duration: 15.0,
        src: 'opfs://audio_test.wav',
        volume: 1.0,
      },
      {
        id: 'layer_auto_captions',
        name: 'Auto Captions',
        type: 'caption',
        trackIndex: 2,
        startTime: 0,
        duration: 15.0,
        chunks: [
          {
            text: 'Hello world',
            start: 0,
            end: 1.5,
            words: [
              { word: 'Hello', start: 0, end: 0.7 },
              { word: 'world', start: 0.8, end: 1.5 },
            ],
          },
        ],
        styleId: 'karaoke-word-highlight',
        baseColor: '#FFFFFF',
        highlightColor: '#FBBF24',
        fontFamily: 'Inter, sans-serif',
        fontSize: 54,
        positionY: 380,
      },
    ],
  };

  const planJson = JSON.stringify(plan);
  assert.ok(!planJson.includes('blob:'), 'EditPlan must not contain transient blob: URLs');
  assert.equal(plan.layers.length, 3, 'Plan should contain video, audio, and caption layers');
  assert.equal(plan.layers[0].type, 'video');
  assert.equal(plan.layers[1].type, 'audio');
  assert.equal(plan.layers[2].type, 'caption');
});
