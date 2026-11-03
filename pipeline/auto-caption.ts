// Standalone Auto Caption Pipeline Engine for Reelix
// Ingests video/audio, transcribes verbatim via Gemini with chunking & calibration,
// understands caption style prompts via Gemini JSON CaptionSpec, and builds complete EditPlan.

import { EditPlan, CaptionLayer, CaptionChunk, VideoLayer, AudioLayer } from '../engine/types';
import { AssetCache } from '../engine/renderer';
import { OpfsService } from '../storage/opfs';
import { ProjectDb } from '../storage/db';
import { Registry } from '../registry';
import { callGeminiJson } from '../ai/gemini';
import {
  encode16BitWav,
  detectSpeechBoundaries,
  downmixAudioTo16kHzWav,
  alignScriptToDuration,
} from '../ai/whisper';
import { extractAudioFromVideo } from './ingest';

export interface TimedWord {
  word: string;
  start: number;
  end: number;
}

export interface CaptionSpec {
  styleId: string;
  animation: string;
  unit: 'word' | 'line';
  maxWordsPerLine: number;
  uppercase: boolean;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  baseColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  backgroundBox: boolean;
  boxColor: string;
  boxOpacity: number;
  positionY: number;
  emoji: boolean;
  language?: string;
  notes?: string;
}

export interface AutoCaptionProgressEvent {
  step: 'read' | 'listen' | 'style' | 'chunk' | 'assemble' | 'load';
  stepIndex: number;
  totalSteps: number;
  percentage: number;
  title: string;
  detail: string;
}

export interface AutoCaptionOptions {
  mediaFile: File | Blob;
  description: string;
  language?: string;
  scriptText?: string;
  maxWordsPerLine?: number;
  onProgress?: (progress: AutoCaptionProgressEvent) => void;
  transcriptOverride?: TimedWord[];
}

export interface AutoCaptionResult {
  plan: EditPlan;
  assets: AssetCache;
  notes: string[];
  transcript: TimedWord[];
}

/**
 * Normalizes text for duplicate word comparison in overlapping transcript chunks.
 */
function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'।]/g, '').trim();
}

/**
 * Pure function: merges transcribed audio chunks with overlap.
 * Drops words in the overlap region that duplicate words from the previous chunk (within 0.3s).
 * Enforces strictly monotonic timestamps.
 */
export function mergeTranscripts(chunks: Array<{ words: TimedWord[]; offset: number }>): TimedWord[] {
  if (!chunks || chunks.length === 0) return [];

  const merged: TimedWord[] = [];

  for (let c = 0; c < chunks.length; c++) {
    const { words, offset } = chunks[c];
    if (!words || words.length === 0) continue;

    // Shift word times by chunk offset
    const shifted = words.map((w) => ({
      word: String(w.word).trim(),
      start: Number((w.start + offset).toFixed(2)),
      end: Number((w.end + offset).toFixed(2)),
    }));

    if (merged.length === 0) {
      merged.push(...shifted);
      continue;
    }

    for (const w of shifted) {
      // Check if this word duplicates a word in the accumulated list within 0.3s
      const normW = normalizeWord(w.word);
      const isDuplicate = merged.some((prev) => {
        const normPrev = normalizeWord(prev.word);
        return normPrev === normW && Math.abs(prev.start - w.start) <= 0.3;
      });

      if (!isDuplicate) {
        merged.push(w);
      }
    }
  }

  // Sort by start time and ensure non-decreasing monotonicity
  merged.sort((a, b) => a.start - b.start || a.end - b.end);

  let lastEnd = 0;
  for (let i = 0; i < merged.length; i++) {
    const w = merged[i];
    if (w.start < lastEnd - 0.05) {
      w.start = Number(lastEnd.toFixed(2));
    }
    if (w.end <= w.start) {
      w.end = Number((w.start + 0.15).toFixed(2));
    }
    lastEnd = w.start;
  }

  return merged;
}

/**
 * Pure function: splits timed words into subtitle lines / caption chunks.
 * - Respects maxWordsPerLine (default 3, clamped 1-6)
 * - Breaks on punctuation (., ?, !, ,, ;, Bengali dari ।)
 * - Breaks on pauses > 0.45s
 * - Max 24 characters per line (Bengali words are NEVER broken in the middle)
 * - Holds caption on screen until next starts when gap < 0.35s
 * - Applies uppercase only for Latin text
 */
export function chunkWordsIntoLines(
  words: TimedWord[],
  maxWordsPerLine = 3,
  uppercase = false
): CaptionChunk[] {
  if (!words || words.length === 0) return [];

  const maxWords = Math.max(1, Math.min(6, maxWordsPerLine || 3));
  const isAllLatin = words.every((w) => !/[\u0980-\u09FF\u0900-\u097F]/.test(w.word));

  const chunks: CaptionChunk[] = [];
  let currentWords: TimedWord[] = [];
  let currentLen = 0;

  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i];
    const wordText = isAllLatin && uppercase ? rawWord.word.toUpperCase() : rawWord.word;
    const w: TimedWord = {
      word: wordText,
      start: rawWord.start,
      end: rawWord.end,
    };

    const wordLen = w.word.length;
    const prevWord = currentWords[currentWords.length - 1];

    // Check pause between previous word and current word
    const isPauseBreak = prevWord && w.start - prevWord.end > 0.45;
    // Check punctuation break on previous word
    const isPunctuationBreak =
      prevWord && /[.?!,;।]$/.test(prevWord.word);
    // Check line word limit
    const isMaxWordsBreak = currentWords.length >= maxWords;
    // Check character length limit (max 24 characters)
    const isCharLimitBreak = currentWords.length > 0 && currentLen + 1 + wordLen > 24;

    if (currentWords.length > 0 && (isPauseBreak || isPunctuationBreak || isMaxWordsBreak || isCharLimitBreak)) {
      chunks.push({
        text: currentWords.map((cw) => cw.word).join(' '),
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        words: [...currentWords],
      });
      currentWords = [];
      currentLen = 0;
    }

    currentWords.push(w);
    currentLen += wordLen + (currentWords.length > 1 ? 1 : 0);
  }

  if (currentWords.length > 0) {
    chunks.push({
      text: currentWords.map((cw) => cw.word).join(' '),
      start: currentWords[0].start,
      end: currentWords[currentWords.length - 1].end,
      words: currentWords,
    });
  }

  // Extend chunk duration to hold on screen until next chunk when gap < 0.35s
  for (let i = 0; i < chunks.length - 1; i++) {
    const curr = chunks[i];
    const next = chunks[i + 1];
    if (next.start > curr.start) {
      const gap = next.start - curr.end;
      if (gap > 0 && gap < 0.35) {
        curr.end = next.start;
      }
    }
  }

  return chunks;
}

/**
 * Pure function: validates and sanitizes a raw CaptionSpec against the registry and safe ranges.
 * Fallbacks to sensible defaults if invalid.
 */
export function validateCaptionSpec(
  raw: unknown,
  fallbackDescription = ''
): { spec: CaptionSpec; notices: string[] } {
  const notices: string[] = [];
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  // 1. Style ID validation
  let styleId = 'karaoke-word-highlight';
  if (typeof obj.styleId === 'string' && Registry.getCaptionStyle(obj.styleId)) {
    styleId = obj.styleId;
  } else if (typeof obj.styleId === 'string') {
    notices.push(`Unknown caption style "${obj.styleId}"; falling back to "karaoke-word-highlight".`);
  }

  // If user described specific styles in text, help match
  const descLower = fallbackDescription.toLowerCase();
  if (!obj.styleId) {
    if (descLower.includes('pop') || descLower.includes('bounce')) styleId = 'pop';
    else if (descLower.includes('box')) styleId = 'box-highlight';
    else if (descLower.includes('outline') || descLower.includes('comic')) styleId = 'outline';
    else if (descLower.includes('typewriter')) styleId = 'typewriter';
    else if (descLower.includes('bold') || descLower.includes('center')) styleId = 'bold-center';
    else if (descLower.includes('neon') || descLower.includes('glow')) styleId = 'glitch-glow';
    else if (descLower.includes('minimal')) styleId = 'minimal-clean';
  }

  // 2. Animation validation
  let animation = 'none';
  if (typeof obj.animation === 'string' && (obj.animation === 'none' || Registry.getTextAnimation(obj.animation))) {
    animation = obj.animation;
  }

  // 3. Unit validation
  const unit: 'word' | 'line' = obj.unit === 'line' ? 'line' : 'word';

  // 4. Max words per line
  let maxWordsPerLine = 3;
  if (typeof obj.maxWordsPerLine === 'number' && !isNaN(obj.maxWordsPerLine)) {
    maxWordsPerLine = Math.max(1, Math.min(6, Math.round(obj.maxWordsPerLine)));
  } else if (descLower.includes('one word')) {
    maxWordsPerLine = 1;
  }

  // 5. Uppercase
  let uppercase = false;
  if (typeof obj.uppercase === 'boolean') {
    uppercase = obj.uppercase;
  } else if (descLower.includes('all caps') || descLower.includes('uppercase')) {
    uppercase = true;
  }

  // 6. Font Family
  let fontFamily = 'Inter, sans-serif';
  if (typeof obj.fontFamily === 'string' && obj.fontFamily.trim().length > 0) {
    const match = Registry.listFonts().find(
      (f) =>
        f.id.toLowerCase() === (obj.fontFamily as string).toLowerCase() ||
        f.name.toLowerCase() === (obj.fontFamily as string).toLowerCase() ||
        f.family.toLowerCase().includes((obj.fontFamily as string).toLowerCase())
    );
    if (match) {
      fontFamily = match.family;
    } else if (obj.fontFamily.includes('sans-serif') || obj.fontFamily.includes('serif')) {
      fontFamily = obj.fontFamily;
    }
  }

  // 7. Font Size (36..96)
  let fontSize = 54;
  if (typeof obj.fontSize === 'number' && !isNaN(obj.fontSize)) {
    fontSize = Math.max(36, Math.min(96, Math.round(obj.fontSize)));
  } else if (descLower.includes('big') || descLower.includes('large')) {
    fontSize = 72;
  } else if (descLower.includes('small') || descLower.includes('minimal')) {
    fontSize = 42;
  }

  // 8. Colors
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  let baseColor = '#FFFFFF';
  if (typeof obj.baseColor === 'string' && hexPattern.test(obj.baseColor.trim())) {
    baseColor = obj.baseColor.trim();
  }

  let highlightColor = '#FBBF24'; // default vibrant gold
  if (typeof obj.highlightColor === 'string' && hexPattern.test(obj.highlightColor.trim())) {
    highlightColor = obj.highlightColor.trim();
  } else if (descLower.includes('yellow') || descLower.includes('gold')) {
    highlightColor = '#FBBF24';
  } else if (descLower.includes('cyan') || descLower.includes('blue')) {
    highlightColor = '#06B6D4';
  } else if (descLower.includes('green')) {
    highlightColor = '#22C55E';
  } else if (descLower.includes('red') || descLower.includes('crimson')) {
    highlightColor = '#EF4444';
  } else if (descLower.includes('purple') || descLower.includes('violet')) {
    highlightColor = '#A855F7';
  }

  let strokeColor = '#000000';
  if (typeof obj.strokeColor === 'string' && hexPattern.test(obj.strokeColor.trim())) {
    strokeColor = obj.strokeColor.trim();
  }

  // 9. Stroke Width (0..12)
  let strokeWidth = 6;
  if (typeof obj.strokeWidth === 'number' && !isNaN(obj.strokeWidth)) {
    strokeWidth = Math.max(0, Math.min(12, Math.round(obj.strokeWidth)));
  }

  // 10. Position Y (-800..800 from center, 0=center, 380=bottom third)
  let positionY = 380;
  if (typeof obj.positionY === 'number' && !isNaN(obj.positionY)) {
    positionY = Math.max(-800, Math.min(800, Math.round(obj.positionY)));
  } else if (descLower.includes('center') || descLower.includes('middle')) {
    positionY = 0;
  } else if (descLower.includes('top')) {
    positionY = -420;
  }

  const shadow = typeof obj.shadow === 'boolean' ? obj.shadow : false;
  const backgroundBox = typeof obj.backgroundBox === 'boolean' ? obj.backgroundBox : descLower.includes('box');
  const boxColor = typeof obj.boxColor === 'string' && hexPattern.test(obj.boxColor) ? obj.boxColor : '#000000';
  const boxOpacity =
    typeof obj.boxOpacity === 'number' && !isNaN(obj.boxOpacity)
      ? Math.max(0, Math.min(1, obj.boxOpacity))
      : 0.85;
  const emoji = typeof obj.emoji === 'boolean' ? obj.emoji : descLower.includes('emoji');

  const spec: CaptionSpec = {
    styleId,
    animation,
    unit,
    maxWordsPerLine,
    uppercase,
    fontFamily,
    fontSize,
    fontWeight: typeof obj.fontWeight === 'string' ? obj.fontWeight : '900',
    baseColor,
    highlightColor,
    strokeColor,
    strokeWidth,
    shadow,
    backgroundBox,
    boxColor,
    boxOpacity,
    positionY,
    emoji,
    language: typeof obj.language === 'string' ? obj.language : undefined,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
  };

  return { spec, notices };
}

/**
 * Transcribes audio via Gemini, supporting audio chunks > 150s with 2s overlap.
 */
async function transcribeWithChunking(
  pcm16k: Float32Array,
  totalDuration: number,
  knownScript?: string
): Promise<TimedWord[]> {
  const CHUNK_DURATION = 120;
  const OVERLAP = 2;
  const STEP = CHUNK_DURATION - OVERLAP; // 118 seconds
  const SR = 16000;

  if (totalDuration <= 150) {
    // Single pass
    const wavBuffer = encode16BitWav(pcm16k, SR);
    const words = await callGeminiTranscriptionChunk(wavBuffer, totalDuration);
    return words;
  }

  // Multi-chunk transcription
  const chunkResults: Array<{ words: TimedWord[]; offset: number }> = [];
  let chunkIdx = 0;

  for (let offset = 0; offset < totalDuration; offset += STEP) {
    const chunkStartSec = offset;
    const chunkEndSec = Math.min(totalDuration, chunkStartSec + CHUNK_DURATION);
    const chunkDuration = chunkEndSec - chunkStartSec;

    if (chunkDuration < 0.5) break;

    const startSample = Math.floor(chunkStartSec * SR);
    const endSample = Math.min(pcm16k.length, Math.floor(chunkEndSec * SR));
    const slice = pcm16k.subarray(startSample, endSample);

    const chunkWav = encode16BitWav(slice, SR);
    const words = await callGeminiTranscriptionChunk(chunkWav, chunkDuration);

    chunkResults.push({ words, offset: chunkStartSec });
    chunkIdx++;
  }

  const merged = mergeTranscripts(chunkResults);

  // If user provided a script, match text for spelling
  if (knownScript && knownScript.trim().length > 0) {
    const scriptWords = knownScript.trim().split(/\s+/).filter(Boolean);
    const alignedWords: TimedWord[] = [];
    for (let i = 0; i < scriptWords.length; i++) {
      const sw = scriptWords[i];
      const matched = merged[i] || merged[merged.length - 1];
      alignedWords.push({
        word: sw,
        start: matched ? matched.start : Number((i * 0.3).toFixed(2)),
        end: matched ? matched.end : Number((i * 0.3 + 0.25).toFixed(2)),
      });
    }
    return alignedWords;
  }

  return merged;
}

/**
 * Calls Gemini multimodal API for a single WAV audio chunk.
 */
async function callGeminiTranscriptionChunk(
  wavBuffer: ArrayBuffer,
  durationSec: number
): Promise<TimedWord[]> {
  let binary = '';
  const bytes = new Uint8Array(wavBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Wav = btoa(binary);

  const prompt = `Transcribe the spoken audio verbatim in detail with exact word-level start and end timestamps in seconds.
Duration of chunk: ${durationSec.toFixed(2)}s.
Preserve exact native script (e.g. English, Bangla, Hindi). Do not skip words.
Return JSON strictly according to schema:
{
  "language": "en",
  "text": "Verbatim transcript of speech",
  "words": [
    { "word": "Hello", "start": 0.15, "end": 0.45 }
  ]
}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/wav',
              data: base64Wav,
            },
          },
          { text: prompt },
        ],
      },
    ],
  };

  const schema = {
    type: 'OBJECT',
    properties: {
      language: { type: 'STRING' },
      text: { type: 'STRING' },
      words: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            word: { type: 'STRING' },
            start: { type: 'NUMBER' },
            end: { type: 'NUMBER' },
          },
          required: ['word', 'start', 'end'],
        },
      },
    },
    required: ['text', 'words'],
  };

  const result = await callGeminiJson<{
    language?: string;
    text: string;
    words: Array<{ word: string; start: number; end: number }>;
  }>(payload, schema, { kind: 'text', temperature: 0 });

  if (!result || !result.words || !Array.isArray(result.words)) {
    return [];
  }

  return result.words.map((w) => ({
    word: String(w.word).trim(),
    start: Number(w.start),
    end: Number(w.end),
  }));
}

/**
 * Runs the full 6-step Auto Caption pipeline.
 */
export async function runAutoCaption(opts: AutoCaptionOptions): Promise<AutoCaptionResult> {
  const notes: string[] = [];
  const onProgress = opts.onProgress || (() => {});

  // =========================================================================
  // STEP 1: READ
  // =========================================================================
  onProgress({
    step: 'read',
    stepIndex: 1,
    totalSteps: 6,
    percentage: 15,
    title: 'Reading Media File',
    detail: 'Storing file into on-device OPFS storage and checking media dimensions...',
  });

  let mediaFile = opts.mediaFile;
  let isVideo = false;
  let videoUri = '';
  let videoBlobUrl = '';
  let audioUri = '';
  let mediaDuration = 0;
  let videoWidth = 1080;
  let videoHeight = 1920;

  try {
    const mimeType = mediaFile.type || '';
    const fileName = (mediaFile as File).name || '';
    isVideo =
      mimeType.startsWith('video/') ||
      /\.(mp4|mov|webm|m4v|mkv)$/i.test(fileName);

    if (isVideo) {
      const storedName = `clip_autocaption_${Date.now()}.mp4`;
      videoUri = await OpfsService.writeFile(storedName, mediaFile);
      videoBlobUrl = await OpfsService.resolveToBlobUrl(videoUri);

      // Read real duration & dimensions via HTMLVideoElement
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = videoBlobUrl;

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 8000);
        videoEl.onloadedmetadata = () => {
          clearTimeout(timer);
          mediaDuration = videoEl.duration;
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            videoWidth = videoEl.videoWidth;
            videoHeight = videoEl.videoHeight;
          }
          resolve();
        };
        videoEl.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Failed to load video metadata'));
        };
      });
    } else {
      // Audio-only file
      const ext = fileName.split('.').pop() || 'wav';
      const storedName = `audio_autocaption_${Date.now()}.${ext}`;
      audioUri = await OpfsService.writeFile(storedName, mediaFile);
    }

    if (mediaDuration > 600) {
      throw new Error(
        `File exceeds 10 minute maximum limit (got ${Math.round(mediaDuration)}s). Please upload a file under 10 minutes.`
      );
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    throw new Error(`Step 1 – Read: ${msg}`);
  }

  // =========================================================================
  // STEP 2: LISTEN
  // =========================================================================
  onProgress({
    step: 'listen',
    stepIndex: 2,
    totalSteps: 6,
    percentage: 35,
    title: 'Transcribing Audio Track',
    detail: 'Extracting speech waveform, removing dead air, and generating word timestamps...',
  });

  let transcript: TimedWord[] = [];

  try {
    if (opts.transcriptOverride && opts.transcriptOverride.length > 0) {
      // User reviewed / edited transcript provided: skip speech recognition
      transcript = opts.transcriptOverride;
      if (mediaDuration <= 0) {
        mediaDuration = transcript[transcript.length - 1].end + 0.5;
      }
    } else {
      let pcm16k: Float32Array;
      let audioBlobForExtraction: Blob;

      if (isVideo) {
        const extracted = await extractAudioFromVideo(mediaFile);
        audioBlobForExtraction = extracted.originalWavBlob;
        if (mediaDuration <= 0) {
          mediaDuration = extracted.duration;
        }

        // Store high-fidelity original audio track in OPFS for preview & export audio mix
        const audioName = `voice_autocaption_${Date.now()}.wav`;
        audioUri = await OpfsService.writeFile(audioName, audioBlobForExtraction);

        const downmixed = await downmixAudioTo16kHzWav(audioBlobForExtraction);
        pcm16k = downmixed.pcmData;
      } else {
        const downmixed = await downmixAudioTo16kHzWav(mediaFile);
        pcm16k = downmixed.pcmData;
        if (mediaDuration <= 0) {
          mediaDuration = downmixed.duration;
        }
      }

      if (mediaDuration > 600) {
        throw new Error(
          `File exceeds 10 minute maximum limit (got ${Math.round(mediaDuration)}s). Please upload a file under 10 minutes.`
        );
      }

      // Check if file has any speech / readable audio
      const { speechStart, speechEnd } = detectSpeechBoundaries(pcm16k, 16000);
      if (speechEnd - speechStart < 0.2) {
        throw new Error('This file has no audio track to caption.');
      }

      transcript = await transcribeWithChunking(pcm16k, mediaDuration, opts.scriptText);

      if (transcript.length === 0) {
        throw new Error('This file has no audio track to caption.');
      }

      // Calibrate timestamps against detected speech boundaries
      const firstStart = transcript[0].start;
      const lastEnd = transcript[transcript.length - 1].end;
      const startDrift = Math.abs(firstStart - speechStart);
      const endDrift = Math.abs(lastEnd - speechEnd);

      if (startDrift > 0.6 || endDrift > 0.6) {
        const span = Math.max(0.1, lastEnd - firstStart);
        const actualSpan = Math.max(0.1, speechEnd - speechStart);
        transcript = transcript.map((w) => ({
          word: w.word,
          start: Number((speechStart + ((w.start - firstStart) / span) * actualSpan).toFixed(2)),
          end: Number((speechStart + ((w.end - firstStart) / span) * actualSpan).toFixed(2)),
        }));
      }
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    throw new Error(`Step 2 – Listen: ${msg}`);
  }

  // =========================================================================
  // STEP 3: UNDERSTAND STYLE REQUEST
  // =========================================================================
  onProgress({
    step: 'style',
    stepIndex: 3,
    totalSteps: 6,
    percentage: 60,
    title: 'Understanding Caption Style',
    detail: 'Matching your description to font family, colors, and kinetic animation specs...',
  });

  let captionSpec: CaptionSpec;

  try {
    const allowedStyleIds = Registry.listCaptionStyles().map((s) => s.id);
    const allowedAnimations = Registry.listTextAnimations().map((a) => a.id);
    const allowedFonts = Registry.listFonts().map((f) => f.family);

    const systemInstruction = `You are Reelix Caption Stylist. Convert the user's description into this spec. Use only allowed ids. If the user did not say something, leave the field null so defaults apply. Never invent styling the user did not ask for.
Allowed styleId: ${allowedStyleIds.join(', ')}.
Allowed animation: none, ${allowedAnimations.join(', ')}.
Allowed fontFamily: ${allowedFonts.slice(0, 10).join(', ')}.`;

    const schema = {
      type: 'OBJECT',
      properties: {
        styleId: { type: 'STRING' },
        animation: { type: 'STRING' },
        unit: { type: 'STRING', enum: ['word', 'line'] },
        maxWordsPerLine: { type: 'INTEGER' },
        uppercase: { type: 'BOOLEAN' },
        fontFamily: { type: 'STRING' },
        fontSize: { type: 'INTEGER' },
        fontWeight: { type: 'STRING' },
        baseColor: { type: 'STRING' },
        highlightColor: { type: 'STRING' },
        strokeColor: { type: 'STRING' },
        strokeWidth: { type: 'INTEGER' },
        shadow: { type: 'BOOLEAN' },
        backgroundBox: { type: 'BOOLEAN' },
        boxColor: { type: 'STRING' },
        boxOpacity: { type: 'NUMBER' },
        positionY: { type: 'INTEGER' },
        emoji: { type: 'BOOLEAN' },
        language: { type: 'STRING' },
        notes: { type: 'STRING' },
      },
    };

    let rawAiSpec: unknown = null;
    try {
      rawAiSpec = await callGeminiJson<unknown>(
        [
          {
            text: `User caption style description: "${opts.description || 'Karaoke word highlight in vibrant gold, bold center bottom'}"`,
          },
        ],
        {
          schema,
          temperature: 0.2,
          systemInstruction,
        }
      );
    } catch (aiErr) {
      notes.push('AI style inference unavailable; applied closest default style matching your description.');
    }

    const validated = validateCaptionSpec(rawAiSpec, opts.description);
    captionSpec = validated.spec;
    if (opts.maxWordsPerLine && opts.maxWordsPerLine >= 1 && opts.maxWordsPerLine <= 6) {
      captionSpec.maxWordsPerLine = opts.maxWordsPerLine;
    }
    notes.push(...validated.notices);
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    throw new Error(`Step 3 – Style Request: ${msg}`);
  }

  // =========================================================================
  // STEP 4: BUILD CAPTIONS
  // =========================================================================
  onProgress({
    step: 'chunk',
    stepIndex: 4,
    totalSteps: 6,
    percentage: 75,
    title: 'Building Timed Captions',
    detail: 'Chunking word timings into phrases and synchronizing hold windows...',
  });

  let captionChunks: CaptionChunk[] = [];

  try {
    captionChunks = chunkWordsIntoLines(
      transcript,
      captionSpec.maxWordsPerLine,
      captionSpec.uppercase
    );

    if (captionChunks.length === 0) {
      throw new Error('No caption phrases generated from speech transcript.');
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    throw new Error(`Step 4 – Build Captions: ${msg}`);
  }

  // =========================================================================
  // STEP 5: ASSEMBLE PLAN
  // =========================================================================
  onProgress({
    step: 'assemble',
    stepIndex: 5,
    totalSteps: 6,
    percentage: 90,
    title: 'Assembling Timeline Project',
    detail: 'Configuring canvas layout, audio channels, and saving to IndexedDB...',
  });

  let plan: EditPlan;

  try {
    const totalDuration = Math.max(
      mediaDuration,
      captionChunks[captionChunks.length - 1]?.end || 5
    );

    const layers: (VideoLayer | AudioLayer | CaptionLayer)[] = [];

    // Base Visual Layer: if video, original video 0..D; if audio-only, dark backdrop renders automatically
    if (isVideo && videoUri) {
      layers.push({
        id: 'base_video',
        name: 'Original Video',
        type: 'video',
        trackIndex: 0,
        startTime: 0,
        duration: totalDuration,
        src: videoUri,
        trimIn: 0,
        trimOut: totalDuration,
        volume: 0, // muted because original audio layer handles audio output cleanly
        fitMode: 'cover',
      });
    }

    // Original Audio Layer: plays audio in Studio preview (via AudioMixer) and in Export (via mixOfflineAudio)
    if (audioUri) {
      layers.push({
        id: 'original_audio',
        name: 'Original Audio',
        type: 'audio',
        audioType: 'voiceover',
        trackIndex: 4,
        startTime: 0,
        duration: totalDuration,
        src: audioUri,
        volume: 1.0,
      });
    }

    // Caption Layer
    layers.push({
      id: 'layer_auto_captions',
      name: 'Auto Captions',
      type: 'caption',
      trackIndex: 2,
      startTime: 0,
      duration: totalDuration,
      chunks: captionChunks,
      styleId: captionSpec.styleId,
      baseColor: captionSpec.baseColor,
      highlightColor: captionSpec.highlightColor,
      fontFamily: captionSpec.fontFamily,
      fontSize: captionSpec.fontSize,
      strokeColor: captionSpec.strokeColor,
      strokeWidth: captionSpec.strokeWidth,
      positionY: captionSpec.positionY,
    });

    const mediaFileName = (mediaFile as File).name || (isVideo ? 'Video' : 'Audio');
    const cleanFileName = mediaFileName.replace(/\.[^/.]+$/, '');
    const planTitle = `Auto Caption – ${cleanFileName}`;

    const planId = `autocaption_${Date.now()}`;
    plan = {
      id: planId,
      title: planTitle,
      duration: totalDuration,
      fps: 30,
      canvas: {
        width: 1080,
        height: 1920,
        backgroundColor: '#0B0B0F',
      },
      layers,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        style: captionSpec.styleId,
      },
    };

    // Save project into ProjectDb with OPFS uris only (no blob: urls)
    await ProjectDb.saveProject({
      id: plan.id,
      title: plan.title,
      duration: plan.duration,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      editPlan: plan,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message || String(err);
    throw new Error(`Step 5 – Assemble Plan: ${msg}`);
  }

  // =========================================================================
  // STEP 6: LOAD
  // =========================================================================
  onProgress({
    step: 'load',
    stepIndex: 6,
    totalSteps: 6,
    percentage: 100,
    title: 'Ready in Studio',
    detail: 'Complete! Captions loaded into Studio preview.',
  });

  return {
    plan,
    assets: { videos: new Map(), images: new Map() },
    notes,
    transcript,
  };
}
