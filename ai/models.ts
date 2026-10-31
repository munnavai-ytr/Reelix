// Dynamic Gemini Model Discovery & Smart Selection Service
import { ApiKeysService } from '../storage/keys';
import { nativeFetch } from './http';

export interface GeminiModelInfo {
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

interface ModelsResponse {
  models?: GeminiModelInfo[];
  nextPageToken?: string;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const DEFAULT_TEXT_FALLBACK = 'gemini-3.8-flash';
const DEFAULT_TTS_FALLBACK = 'gemini-3.8-flash-lite-tts';

interface CachedModelsData {
  timestamp: number;
  keyHash: string;
  models: string[];
}

const CACHE_KEY_PREFIX = 'reelix_gemini_models_v1_';

export function isLegacyModel(name: string): boolean {
  const cleanName = name.replace(/^models\//, '');
  return /^gemini-(1\.|2\.)/.test(cleanName);
}

export function invalidateModelCache(): void {
  if (typeof window === 'undefined') return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.warn('Failed to invalidate model cache:', err);
  }
}

async function fetchRemoteModels(apiKey: string): Promise<string[]> {
  const allModels: string[] = [];
  let pageToken = '';

  try {
    do {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      }`;
      const res = await nativeFetch<ModelsResponse>(url, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey.trim(),
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch models list`);
      }

      const data = res.data;
      if (data?.models && Array.isArray(data.models)) {
        for (const m of data.models) {
          if (m.supportedGenerationMethods?.includes('generateContent')) {
            const cleanName = m.name.replace(/^models\//, '');
            allModels.push(cleanName);
          }
        }
      }

      pageToken = data?.nextPageToken || '';
    } while (pageToken);

    return allModels;
  } catch (err) {
    console.warn('Error fetching Gemini models list:', err);
    return [];
  }
}

export async function listAvailableModelNames(forceRefresh = false): Promise<string[]> {
  const keys = ApiKeysService.getKeys();
  const apiKey = keys.gemini?.trim();
  if (!apiKey) return [];

  const keyHash = apiKey.length >= 8 ? apiKey.slice(-8) : apiKey;
  const storageKey = `${CACHE_KEY_PREFIX}${keyHash}`;

  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed: CachedModelsData = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.models.length > 0) {
          return parsed.models;
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }

  const models = await fetchRemoteModels(apiKey);
  if (models.length > 0 && typeof window !== 'undefined') {
    try {
      const cacheData: CachedModelsData = {
        timestamp: Date.now(),
        keyHash,
        models,
      };
      localStorage.setItem(storageKey, JSON.stringify(cacheData));
    } catch {
      // Ignore cache write errors
    }
  }

  return models;
}

function extractVersionNum(name: string): number {
  const match = name.match(/gemini-(\d+(?:\.\d+)?)/i);
  return match ? parseFloat(match[1]) : 0;
}

export async function resolveTextModel(preferredModel?: string, forceRefresh = false): Promise<string> {
  if (preferredModel && preferredModel !== 'auto' && !isLegacyModel(preferredModel)) {
    return preferredModel;
  }

  const available = await listAvailableModelNames(forceRefresh);
  if (available.length === 0) {
    return DEFAULT_TEXT_FALLBACK;
  }

  // 1. Look for newest gemini-X.Y-flash matching /^gemini-\d+(\.\d+)?-flash$/
  // Exclude: tts, image, live, audio, embedding, lite, thinking, exp
  const pureFlashModels = available.filter(m => {
    const isFlashPattern = /^gemini-\d+(\.\d+)?-flash$/i.test(m);
    const hasForbidden = /(tts|image|live|audio|embedding|lite|thinking|exp)/i.test(m);
    return isFlashPattern && !hasForbidden;
  });

  if (pureFlashModels.length > 0) {
    pureFlashModels.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return pureFlashModels[0];
  }

  // 2. Fallback: Other flash models (not lite)
  const otherFlash = available.filter(m => /flash/i.test(m) && !/lite/i.test(m) && !/tts/i.test(m) && !/live/i.test(m));
  if (otherFlash.length > 0) {
    otherFlash.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return otherFlash[0];
  }

  // 3. Fallback: Any non-legacy gemini model
  const anyGemini = available.filter(m => /^gemini-/i.test(m) && !isLegacyModel(m) && !/tts/i.test(m));
  if (anyGemini.length > 0) {
    anyGemini.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return anyGemini[0];
  }

  return DEFAULT_TEXT_FALLBACK;
}

export async function resolveTtsModel(forceRefresh = false): Promise<string> {
  const available = await listAvailableModelNames(forceRefresh);
  if (available.length === 0) {
    return DEFAULT_TTS_FALLBACK;
  }

  const ttsModels = available.filter(m => /tts/i.test(m));
  if (ttsModels.length === 0) {
    return DEFAULT_TTS_FALLBACK;
  }

  // Prefer flash tts models
  const flashTts = ttsModels.filter(m => /flash/i.test(m));
  if (flashTts.length > 0) {
    flashTts.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return flashTts[0];
  }

  ttsModels.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
  return ttsModels[0];
}
