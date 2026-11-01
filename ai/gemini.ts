// Gemini REST Client with dynamic model discovery, backoff retries, JSON schemas, and real TTS
import { ApiKeysService } from '../storage/keys';
import { SystemPromptsService } from '../storage/system-prompts';
import { nativeFetch } from './http';
import { resolveTextModel, resolveTtsModel, invalidateModelCache } from './models';

export interface GeminiCallOptions {
  model?: string;
  kind?: 'text' | 'tts';
  maxRetries?: number;
}

export interface GeminiCandidate {
  content?: {
    parts?: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string; // base64
      };
    }>;
  };
  finishReason?: string;
}

export interface GeminiRawResponse {
  candidates?: GeminiCandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callGeminiRaw(
  payload: Record<string, unknown>,
  options: GeminiCallOptions = {}
): Promise<GeminiRawResponse> {
  const keys = ApiKeysService.getKeys();
  const apiKey = keys.gemini?.trim();

  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please enter your API key in Settings.');
  }

  const kind = options.kind || 'text';
  const maxRetries = options.maxRetries ?? 3;
  let model = options.model;

  if (!model || model === 'auto') {
    model = kind === 'tts' ? await resolveTtsModel() : await resolveTextModel();
  }

  // --- SAFETY NET FOR REST API PAYLOAD ---
  const cleanedPayload: Record<string, unknown> = { ...payload };

  // 1. Move 'config' -> 'generationConfig'
  if ('config' in cleanedPayload && cleanedPayload.config && typeof cleanedPayload.config === 'object') {
    const cfg = cleanedPayload.config as Record<string, unknown>;
    const existingGen = (cleanedPayload.generationConfig as Record<string, unknown>) || {};
    cleanedPayload.generationConfig = { ...cfg, ...existingGen };
    delete cleanedPayload.config;
  }

  // 2. Normalize systemInstruction to top-level { systemInstruction: { parts: [{ text: ... }] } }
  let sysText: string | undefined = undefined;
  if ('system_instruction' in cleanedPayload && cleanedPayload.system_instruction) {
    const sys = cleanedPayload.system_instruction;
    delete cleanedPayload.system_instruction;
    if (typeof sys === 'string') sysText = sys;
    else if (typeof sys === 'object') sysText = (sys as any).text || JSON.stringify(sys);
  }

  if (cleanedPayload.generationConfig && (cleanedPayload.generationConfig as Record<string, unknown>).systemInstruction) {
    const sys = (cleanedPayload.generationConfig as Record<string, unknown>).systemInstruction;
    delete (cleanedPayload.generationConfig as Record<string, unknown>).systemInstruction;
    if (typeof sys === 'string') sysText = sys;
    else if (typeof sys === 'object') sysText = (sys as any).text || JSON.stringify(sys);
  }

  if (sysText) {
    cleanedPayload.systemInstruction = {
      parts: [{ text: sysText }],
    };
  }

  // 3. Move top-level temperature / responseSchema / responseMimeType inside generationConfig
  const genConfig = (cleanedPayload.generationConfig as Record<string, unknown>) || {};
  if ('temperature' in cleanedPayload) {
    genConfig.temperature = cleanedPayload.temperature;
    delete cleanedPayload.temperature;
  }
  if ('responseSchema' in cleanedPayload) {
    genConfig.responseSchema = cleanedPayload.responseSchema;
    delete cleanedPayload.responseSchema;
  }
  if ('responseMimeType' in cleanedPayload) {
    genConfig.responseMimeType = cleanedPayload.responseMimeType;
    delete cleanedPayload.responseMimeType;
  }
  if (Object.keys(genConfig).length > 0) {
    cleanedPayload.generationConfig = genConfig;
  }

  let delay = 1500;
  let resetAttempted = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await nativeFetch<GeminiRawResponse>(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(cleanedPayload),
      });

      const errMsg = res.data?.error?.message || '';

      // Handle 404 / 403 / "no longer available" -> Reset user's choice to 'auto' & retry
      if ((res.status === 404 || res.status === 403 || errMsg.toLowerCase().includes('no longer available')) && !resetAttempted) {
        resetAttempted = true;
        console.warn(`Model ${model} returned ${res.status} ("${errMsg}"). Resetting selection to 'auto' and retrying once.`);
        const sysCfg = SystemPromptsService.getConfig();
        if (kind === 'tts') {
          sysCfg.selectedTtsModel = 'auto';
        } else {
          sysCfg.selectedModel = 'auto';
        }
        SystemPromptsService.saveConfig(sysCfg);
        invalidateModelCache();

        model = kind === 'tts' ? await resolveTtsModel(true) : await resolveTextModel(undefined, true);
        await sleep(500);
        continue;
      }

      // Handle rate limit or temporary server errors
      if ([429, 500, 503, 504].includes(res.status)) {
        if (attempt === maxRetries) {
          throw new Error(`Gemini API error ${res.status}: ${errMsg || 'Rate limit or server error'}`);
        }
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!res.ok) {
        const msg = errMsg || `HTTP ${res.status}: Gemini API request failed`;
        throw new Error(msg);
      }

      if (res.data?.error) {
        throw new Error(res.data.error.message || 'Gemini returned an error');
      }

      return res.data;
    } catch (err: unknown) {
      if (attempt === maxRetries) {
        throw err instanceof Error ? err : new Error('Failed to communicate with Gemini API');
      }
      await sleep(delay);
      delay *= 2;
    }
  }

  throw new Error('Gemini request failed after retries.');
}

export async function callGeminiJson<T = unknown>(
  payload: Record<string, unknown>,
  schema?: Record<string, unknown>,
  options: GeminiCallOptions = {}
): Promise<T> {
  const existingGen = (payload.generationConfig as Record<string, unknown>) || {};
  const { config: _drop, ...rest } = payload;

  const newGenConfig: Record<string, unknown> = {
    ...existingGen,
    responseMimeType: 'application/json',
  };

  if (schema) {
    newGenConfig.responseSchema = schema;
  }

  const finalPayload = {
    ...rest,
    generationConfig: newGenConfig,
  };

  const res = await callGeminiRaw(finalPayload, options);
  const text = res.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini API returned an empty text response.');
  }

  // Clean markdown backticks if present
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleanText) as T;
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', cleanText);
    throw new Error(`Invalid JSON returned by Gemini: ${(err as Error).message}`);
  }
}

// Split text into chunks <= 1800 characters split on sentence boundaries
function splitTextIntoSentences(text: string, maxLen = 1800): string[] {
  if (text.length <= maxLen) return [text];
  
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLen) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

export interface TtsResult {
  audioUrl: string;
  audioBlob: Blob;
  durationSec: number;
}

export async function generateGeminiTtsAudio(
  text: string,
  voiceName: string = 'Puck'
): Promise<TtsResult> {
  if (!text || !text.trim()) {
    throw new Error('Speech text cannot be empty');
  }

  const chunks = splitTextIntoSentences(text.trim());
  const pcmBuffers: Uint8Array[] = [];

  for (const chunk of chunks) {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: chunk }],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    };

    const res = await callGeminiRaw(payload, { kind: 'tts' });
    const part = res.candidates?.[0]?.content?.parts?.[0];
    const base64Data = part?.inlineData?.data;

    if (!base64Data) {
      throw new Error('Gemini TTS failed to generate audio output for sentence block.');
    }

    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Gemini unary audio/wav contains a 44-byte WAV header followed by 16-bit 24kHz PCM
    let pcmData: Uint8Array;
    if (bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49) {
      // Valid RIFF header - strip the 44-byte header
      pcmData = bytes.subarray(44);
    } else {
      pcmData = bytes;
    }

    pcmBuffers.push(pcmData);
  }

  // Combine all raw PCM buffers
  let totalPcmBytes = 0;
  for (const buf of pcmBuffers) {
    totalPcmBytes += buf.length;
  }

  const combinedPcm = new Uint8Array(totalPcmBytes);
  let offset = 0;
  for (const buf of pcmBuffers) {
    combinedPcm.set(buf, offset);
    offset += buf.length;
  }

  // Build a standard 44-byte WAV header for 24000 Hz 16-bit mono PCM
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = combinedPcm.length;
  const chunkSize = 36 + dataSize;

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, chunkSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  const fullWavBytes = new Uint8Array(44 + dataSize);
  fullWavBytes.set(new Uint8Array(wavHeader), 0);
  fullWavBytes.set(combinedPcm, 44);

  const audioBlob = new Blob([fullWavBytes], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(audioBlob);

  // Decode audio buffer to measure true decoded duration
  let durationSec = (dataSize / 2) / sampleRate;
  if (typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const arrayBuf = await audioBlob.arrayBuffer();
      const decodedBuf = await audioCtx.decodeAudioData(arrayBuf);
      durationSec = decodedBuf.duration;
      await audioCtx.close();
    } catch (err) {
      console.warn('AudioContext decoding notice:', err);
    }
  }

  return { audioUrl, audioBlob, durationSec };
}

// Compat object wrapper
export const GeminiClient = {
  callWithRetry: async <T = unknown>(payload: Record<string, unknown>, model?: string, maxRetries?: number): Promise<T> => {
    const res = await callGeminiRaw(payload, { model, maxRetries });
    const text = res.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an empty response.');
    return text as unknown as T;
  },
  synthesizeSpeech: async (text: string, voiceName: string = 'Puck'): Promise<Blob> => {
    const result = await generateGeminiTtsAudio(text, voiceName);
    return result.audioBlob;
  },
};
