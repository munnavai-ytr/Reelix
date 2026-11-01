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
      const end = w * 0.02;
      if (end - currentStart >= 0.1) {
        speechSegments.push({ start: currentStart, end });
      }
      currentStart = -1;
    }
  }

  if (currentStart !== -1) {
    const totalDuration = pcmData.length / sampleRate;
    speechSegments.push({ start: currentStart, end: totalDuration });
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
  const totalDuration = pcmData.length / sampleRate;
  if (totalDuration - cursor >= minSilenceDuration) {
    silences.push({ start: cursor, end: totalDuration });
  }

  return { silences, speechSegments };
}

/**
 * Compact speech segments by removing silences and concatenating speech back-to-back.
 */
export function compactSpeechAudio(
  pcmData: Float32Array,
  sampleRate: number,
  speechSegments: AudioSegment[]
): {
  compactedPcm: Float32Array;
  compactedDuration: number;
  mapTimeToCompacted: (originalTime: number) => number;
} {
  if (speechSegments.length === 0) {
    return {
      compactedPcm: pcmData,
      compactedDuration: pcmData.length / sampleRate,
      mapTimeToCompacted: (t) => t,
    };
  }

  let totalSamples = 0;
  for (const seg of speechSegments) {
    const count = Math.floor((seg.end - seg.start) * sampleRate);
    totalSamples += count;
  }

  const compactedPcm = new Float32Array(totalSamples);
  let writeOffset = 0;

  for (const seg of speechSegments) {
    const startSample = Math.floor(seg.start * sampleRate);
    const endSample = Math.min(pcmData.length, Math.floor(seg.end * sampleRate));
    const slice = pcmData.subarray(startSample, endSample);
    compactedPcm.set(slice, writeOffset);
    writeOffset += slice.length;
  }

  const compactedDuration = totalSamples / sampleRate;

  const mapTimeToCompacted = (origT: number): number => {
    let accCompacted = 0;
    for (const seg of speechSegments) {
      if (origT < seg.start) {
        return accCompacted;
      }
      if (origT <= seg.end) {
        return accCompacted + (origT - seg.start);
      }
      accCompacted += seg.end - seg.start;
    }
    return Math.min(compactedDuration, accCompacted);
  };

  return {
    compactedPcm,
    compactedDuration,
    mapTimeToCompacted,
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

  let mapTime = (t: number) => t;

  if (removeSilence) {
    const { speechSegments } = detectSilences(pcmData, 16000);
    if (speechSegments.length > 0) {
      const compacted = compactSpeechAudio(pcmData, 16000, speechSegments);
      pcmData = compacted.compactedPcm;
      realDuration = compacted.compactedDuration;
      finalWavBuffer = encode16BitWav(pcmData, 16000);
      processedBlob = new Blob([finalWavBuffer], { type: 'audio/wav' });
      mapTime = compacted.mapTimeToCompacted;
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
        };
      }

      return {
        text: result.text.trim(),
        duration: realDuration,
        words: formattedWords,
        processedBlob,
        processedDuration: realDuration,
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
