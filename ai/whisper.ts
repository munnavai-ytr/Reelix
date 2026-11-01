// Audio Transcriber with 16kHz Mono Downmixing, Silence Compaction, RMS Speech Detection, Gemini Multimodal Transcription, and Script Alignment
import { TranscriptionResult, TranscriptionWord } from './types';
import { callGeminiJson } from './gemini';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function encode16BitWav(channelData: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = channelData.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  // data subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export interface AudioSegment {
  start: number;
  end: number;
}

/**
 * Detect silence regions in audio via 20ms RMS windows.
 * Any quiet window longer than minSilenceDuration (default 0.35s) is considered silence.
 */
export function detectSilences(
  pcmData: Float32Array,
  sampleRate: number,
  thresholdRms = 0.015,
  minSilenceDuration = 0.35
): { silences: AudioSegment[]; speechSegments: AudioSegment[] } {
  const windowSize = Math.floor(sampleRate * 0.02); // 20ms
  const totalWindows = Math.floor(pcmData.length / windowSize);
  const totalDuration = pcmData.length / sampleRate;

  const isSpeech = new Uint8Array(totalWindows);

  for (let w = 0; w < totalWindows; w++) {
    let sumSq = 0;
    const startIdx = w * windowSize;
    for (let i = 0; i < windowSize; i++) {
      const s = pcmData[startIdx + i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / windowSize);
    if (rms >= thresholdRms) {
      isSpeech[w] = 1;
    }
  }

  // Smooth speech windows with 80ms padding
  const padWindows = Math.ceil(0.08 / 0.02);
  const smoothed = new Uint8Array(totalWindows);
  for (let w = 0; w < totalWindows; w++) {
    if (isSpeech[w]) {
      const start = Math.max(0, w - padWindows);
      const end = Math.min(totalWindows, w + padWindows + 1);
      for (let p = start; p < end; p++) {
        smoothed[p] = 1;
      }
    }
  }

  const speechSegments: AudioSegment[] = [];
  let currentStart = -1;

  for (let w = 0; w < totalWindows; w++) {
    if (smoothed[w] === 1 && currentStart === -1) {
      currentStart = w * 0.02;
    } else if (smoothed[w] === 0 && currentStart !== -1) {
      const rawEnd = w * 0.02;
      const start = Math.max(0, currentStart);
      const end = Math.min(totalDuration, rawEnd);
      if (end - start >= 0.1) {
        speechSegments.push({ start, end });
      }
      currentStart = -1;
    }
  }

  if (currentStart !== -1) {
    const start = Math.max(0, currentStart);
    const end = totalDuration;
    if (end - start >= 0.1) {
      speechSegments.push({ start, end });
    }
  }

  // Determine silences between speech segments
  const silences: AudioSegment[] = [];
  let cursor = 0;
  for (const seg of speechSegments) {
    if (seg.start - cursor >= minSilenceDuration) {
      silences.push({ start: cursor, end: seg.start });
    }
    cursor = seg.end;
  }
  if (totalDuration - cursor >= minSilenceDuration) {
    silences.push({ start: cursor, end: totalDuration });
  }

  return { silences, speechSegments };
}

/**
 * Compact speech segments by removing silences and concatenating speech back-to-back.
 */
export function compactSpeechAudio(
  pcm: Float32Array,
  sr: number,
  segs: AudioSegment[]
): {
  compactedPcm: Float32Array;
  compactedDuration: number;
  mapTimeToCompacted: (originalTime: number) => number;
  ranges: { a: number; b: number }[];
} {
  const ranges = segs
    .map((s) => ({
      a: Math.max(0, Math.floor(s.start * sr)),
      b: Math.min(pcm.length, Math.floor(s.end * sr)),
    }))
    .filter((r) => r.b > r.a);

  if (ranges.length === 0) {
    return {
      compactedPcm: pcm,
      compactedDuration: pcm.length / sr,
      mapTimeToCompacted: (t: number) => t,
      ranges: [] as { a: number; b: number }[],
    };
  }

  const fade = Math.floor(sr * 0.012); // 12 ms fade to avoid clicks at cuts

  // calculate exact output total length
  let totalLen = 0;
  for (const r of ranges) totalLen += r.b - r.a;
  const compactedPcm = new Float32Array(totalLen);

  let writeOffset = 0;
  // accumulate mapped boundaries for time mapping function
  const cumulativeOutputStart: number[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const len = r.b - r.a;
    cumulativeOutputStart.push(writeOffset / sr);

    // copy slice
    const slice = pcm.subarray(r.a, r.b);
    compactedPcm.set(slice, writeOffset);

    // Apply 12ms fade in at start of segment (except very first segment if starting at 0)
    if (r.a > 0 && len > fade * 2) {
      for (let k = 0; k < fade; k++) {
        compactedPcm[writeOffset + k] *= k / fade;
      }
    }
    // Apply 12ms fade out at end of segment (except very end of audio)
    if (r.b < pcm.length && len > fade * 2) {
      for (let k = 0; k < fade; k++) {
        compactedPcm[writeOffset + len - 1 - k] *= k / fade;
      }
    }

    writeOffset += len;
  }

  const mapTimeToCompacted = (origT: number): number => {
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const startSec = r.a / sr;
      const endSec = r.b / sr;
      if (origT >= startSec && origT <= endSec) {
        return cumulativeOutputStart[i] + (origT - startSec);
      }
      if (origT < startSec) {
        return cumulativeOutputStart[i];
      }
    }
    return cumulativeOutputStart.length > 0
      ? cumulativeOutputStart[cumulativeOutputStart.length - 1] +
          (ranges[ranges.length - 1].b - ranges[ranges.length - 1].a) / sr
      : origT;
  };

  return {
    compactedPcm,
    compactedDuration: totalLen / sr,
    mapTimeToCompacted,
    ranges,
  };
}

export function detectSpeechBoundaries(
  pcmData: Float32Array,
  sampleRate: number
): { speechStart: number; speechEnd: number } {
  const { speechSegments } = detectSilences(pcmData, sampleRate);
  if (speechSegments.length === 0) {
    const totalDuration = pcmData.length / sampleRate;
    return { speechStart: 0, speechEnd: totalDuration };
  }
  return {
    speechStart: speechSegments[0].start,
    speechEnd: speechSegments[speechSegments.length - 1].end,
  };
}

export async function downmixAudioTo16kHzWav(
  audioBlob: Blob
): Promise<{ wavBuffer: ArrayBuffer; duration: number; pcmData: Float32Array }> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const tempCtx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
  await tempCtx.close();

  const targetSampleRate = 16000;
  const targetLength = Math.ceil(audioBuffer.duration * targetSampleRate);
  const offlineCtx = new OfflineAudioContext(1, Math.max(1, targetLength), targetSampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);
  const wavBuffer = encode16BitWav(channelData, targetSampleRate);

  return {
    wavBuffer,
    duration: audioBuffer.duration,
    pcmData: channelData,
  };
}

export async function transcribeAudio(
  audioBlob: Blob,
  audioDuration?: number,
  knownScript?: string,
  removeSilence = false
): Promise<TranscriptionResult & { notice?: string; processedBlob?: Blob; processedDuration?: number }> {
  // Downmix to 16kHz mono WAV
  const { wavBuffer: initialWav, duration: decodedDuration, pcmData: initialPcm } =
    await downmixAudioTo16kHzWav(audioBlob);

  let pcmData = initialPcm;
  let realDuration = audioDuration && audioDuration > 0 ? audioDuration : decodedDuration;
  let finalWavBuffer = initialWav;
  let processedBlob: Blob | undefined = undefined;
  let noticeMsg: string | undefined = undefined;

  if (removeSilence) {
    const { silences, speechSegments } = detectSilences(pcmData, 16000);
    if (speechSegments.length > 0 && silences.length > 0) {
      const totalSavedSec = silences.reduce((acc, s) => acc + (s.end - s.start), 0);
      const compacted = compactSpeechAudio(pcmData, 16000, speechSegments);
      pcmData = compacted.compactedPcm;
      realDuration = compacted.compactedDuration;
      finalWavBuffer = encode16BitWav(pcmData, 16000);
      processedBlob = new Blob([finalWavBuffer], { type: 'audio/wav' });
      noticeMsg = `Removed ${silences.length} pauses (${totalSavedSec.toFixed(1)} s saved)`;
    }
  }

  const { speechStart, speechEnd } = detectSpeechBoundaries(pcmData, 16000);

  // Gemini verbatim multimodal transcription
  const base64Wav = arrayBufferToBase64(finalWavBuffer);
  const prompt = `Transcribe the spoken audio verbatim in detail with exact word-level start and end timestamps in seconds.
Duration of audio: ${realDuration.toFixed(2)}s. Active speech: ${speechStart.toFixed(2)}s to ${speechEnd.toFixed(2)}s.
Do not summarize or skip words. Return JSON strictly according to schema:
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

  try {
    const result = await callGeminiJson<{
      language?: string;
      text: string;
      words: Array<{ word: string; start: number; end: number }>;
    }>(payload, schema, { kind: 'text', temperature: 0 });

    if (result.text && Array.isArray(result.words) && result.words.length > 0) {
      let formattedWords: TranscriptionWord[] = result.words.map((w) => ({
        word: String(w.word).trim(),
        start: Number(w.start),
        end: Number(w.end),
      }));

      // Calibration: If word timestamps drift by > 0.6s from detected speech boundary, calibrate linearly
      const firstWordStart = formattedWords[0].start;
      const lastWordEnd = formattedWords[formattedWords.length - 1].end;
      const startDrift = Math.abs(firstWordStart - speechStart);
      const endDrift = Math.abs(lastWordEnd - speechEnd);

      if (startDrift > 0.6 || endDrift > 0.6) {
        const geminiSpan = Math.max(0.1, lastWordEnd - firstWordStart);
        const actualSpan = Math.max(0.1, speechEnd - speechStart);
        formattedWords = formattedWords.map((w) => ({
          word: w.word,
          start: Number((speechStart + ((w.start - firstWordStart) / geminiSpan) * actualSpan).toFixed(2)),
          end: Number((speechStart + ((w.end - firstWordStart) / geminiSpan) * actualSpan).toFixed(2)),
        }));
      }

      // If user provided a script, match text for spelling
      if (knownScript && knownScript.trim().length > 0) {
        const scriptWords = knownScript.trim().split(/\s+/).filter(Boolean);
        const alignedWords: TranscriptionWord[] = [];
        for (let i = 0; i < scriptWords.length; i++) {
          const sw = scriptWords[i];
          const matchedGemini = formattedWords[i] || formattedWords[formattedWords.length - 1];
          alignedWords.push({
            word: sw,
            start: matchedGemini ? matchedGemini.start : (i * 0.3),
            end: matchedGemini ? matchedGemini.end : (i * 0.3 + 0.25),
          });
        }
        return {
          text: knownScript.trim(),
          duration: realDuration,
          words: alignedWords,
          processedBlob,
          processedDuration: realDuration,
          ...(noticeMsg ? { notice: noticeMsg } : {}),
        };
      }

      return {
        text: result.text.trim(),
        duration: realDuration,
        words: formattedWords,
        processedBlob,
        processedDuration: realDuration,
        ...(noticeMsg ? { notice: noticeMsg } : {}),
      };
    }
  } catch (err) {
    console.warn('Gemini audio transcription error:', err);
    if (knownScript && knownScript.trim().length > 0) {
      const fallback = alignScriptToDuration(knownScript.trim(), realDuration, speechStart, speechEnd);
      return {
        ...fallback,
        notice: 'Gemini transcription timed out; timed captions were estimated from script and speech boundaries.',
        processedBlob,
        processedDuration: realDuration,
      };
    }
    throw new Error(`Speech transcription failed: ${(err as Error).message}`);
  }

  if (knownScript && knownScript.trim().length > 0) {
    const fallback = alignScriptToDuration(knownScript.trim(), realDuration, speechStart, speechEnd);
    return {
      ...fallback,
      notice: 'Audio word timestamps aligned using script reference.',
      processedBlob,
      processedDuration: realDuration,
    };
  }

  throw new Error('Could not extract word timestamps from spoken audio.');
}

export function alignScriptToDuration(
  script: string,
  duration: number,
  speechStart = 0.1,
  speechEnd?: number
): TranscriptionResult {
  const rawWords = script.split(/\s+/).filter((w) => w.length > 0);
  if (rawWords.length === 0) {
    return { text: '', duration, words: [] };
  }

  const effectiveEnd =
    speechEnd && speechEnd > speechStart ? speechEnd : Math.max(speechStart + 0.5, duration - 0.2);
  const totalChars = rawWords.reduce((acc, w) => acc + Math.max(1, w.length), 0);
  const usableDuration = Math.max(0.5, effectiveEnd - speechStart);

  let currentStart = speechStart;
  const words: TranscriptionWord[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    const weight = Math.max(1, word.length) / totalChars;
    const wordDuration = Math.max(0.12, usableDuration * weight);
    const end = Math.min(duration, currentStart + wordDuration);

    words.push({
      word,
      start: Number(currentStart.toFixed(2)),
      end: Number(end.toFixed(2)),
    });

    currentStart = end;
  }

  return {
    text: script,
    duration,
    words,
  };
}
