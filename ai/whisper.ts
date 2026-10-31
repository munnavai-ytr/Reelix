// Audio Transcriber with 16kHz Mono Downmixing, RMS Speech Detection, Gemini Multimodal Transcription, and Script Alignment
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

function encode16BitWav(channelData: Float32Array, sampleRate: number): ArrayBuffer {
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
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

export function detectSpeechBoundaries(
  pcmData: Float32Array,
  sampleRate: number
): { speechStart: number; speechEnd: number } {
  const frameSize = Math.floor(sampleRate * 0.03); // 30ms frame
  const totalFrames = Math.floor(pcmData.length / frameSize);
  let firstSpeechFrame = -1;
  let lastSpeechFrame = -1;
  const threshold = 0.015;

  for (let f = 0; f < totalFrames; f++) {
    let sumSq = 0;
    const startIdx = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const sample = pcmData[startIdx + i];
      sumSq += sample * sample;
    }
    const rms = Math.sqrt(sumSq / frameSize);
    if (rms > threshold) {
      if (firstSpeechFrame === -1) firstSpeechFrame = f;
      lastSpeechFrame = f;
    }
  }

  const durationSec = pcmData.length / sampleRate;
  const speechStart = firstSpeechFrame !== -1 ? Math.max(0, (firstSpeechFrame * 0.03) - 0.05) : 0;
  const speechEnd = lastSpeechFrame !== -1 ? Math.min(durationSec, (lastSpeechFrame + 1) * 0.03 + 0.1) : durationSec;

  return { speechStart, speechEnd };
}

export async function downmixAudioTo16kHzWav(audioBlob: Blob): Promise<{ wavBuffer: ArrayBuffer; duration: number; pcmData: Float32Array }> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const tempCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
  knownScript?: string
): Promise<TranscriptionResult> {
  // Downmix to 16kHz mono WAV and detect speech boundaries
  const { wavBuffer, duration: decodedDuration, pcmData } = await downmixAudioTo16kHzWav(audioBlob);
  const realDuration = audioDuration && audioDuration > 0 ? audioDuration : decodedDuration;
  const { speechStart, speechEnd } = detectSpeechBoundaries(pcmData, 16000);

  // If known script is provided, align the known script text across detected speech duration
  if (knownScript && knownScript.trim().length > 0) {
    return alignScriptToDuration(knownScript.trim(), realDuration, speechStart, speechEnd);
  }

  // Multimodal Gemini audio transcription
  const base64Wav = arrayBufferToBase64(wavBuffer);
  const prompt = `Transcribe the spoken audio in detail with word-level start and end timestamps in seconds.
Duration of audio: ${realDuration.toFixed(2)} seconds. Speech active region: ${speechStart.toFixed(2)}s to ${speechEnd.toFixed(2)}s.
Return JSON with this exact structure:
{
  "text": "Full transcribed spoken text",
  "words": [
    { "word": "example", "start": 0.25, "end": 0.65 }
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
      text: string;
      words: Array<{ word: string; start: number; end: number }>;
    }>(payload, schema, { kind: 'text' });

    if (result.text && Array.isArray(result.words) && result.words.length > 0) {
      const formattedWords: TranscriptionWord[] = result.words.map(w => ({
        word: String(w.word).trim(),
        start: Number(w.start),
        end: Number(w.end),
      }));

      return {
        text: result.text.trim(),
        duration: realDuration,
        words: formattedWords,
      };
    }
  } catch (err) {
    console.warn('Gemini audio transcription failed, falling back to speech boundary alignment if script provided:', err);
    throw new Error(`Audio transcription failed: ${(err as Error).message}`);
  }

  throw new Error('Could not extract valid word timestamps from audio transcription.');
}

export function alignScriptToDuration(
  script: string,
  duration: number,
  speechStart = 0.1,
  speechEnd?: number
): TranscriptionResult {
  const rawWords = script.split(/\s+/).filter(w => w.length > 0);
  if (rawWords.length === 0) {
    return { text: '', duration, words: [] };
  }

  const effectiveEnd = speechEnd && speechEnd > speechStart ? speechEnd : Math.max(speechStart + 0.5, duration - 0.2);
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
