// Dynamic Gemini Model Discovery & Smart Selection Service
import { ApiKeysService } from '../storage/keys';
import { SystemPromptsService } from '../storage/system-prompts';
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
  error?: {
    code: number;
    message: string;
    status: string;
  };
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
  if (!name) return true;
  const cleanName = name.replace(/^models\//, '');
  return /^gemini-(1\.|2\.)/i.test(cleanName);
}

export function invalidateModelCache(): void {
  if (typeof window === 'undefined') return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.warn('Failed to invalidate model cache:', err);
  }
}

export async function fetchRemoteModelsWithDetail(apiKey: string): Promise<{ models: string[]; error?: string }> {
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

      if (!res.ok || res.data?.error) {
        const msg = res.data?.error?.message || `HTTP ${res.status}: Failed to fetch models list`;
        return { models: [], error: msg };
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

    return { models: allModels };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error fetching models list';
    return { models: [], error: msg };
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

  const { models } = await fetchRemoteModelsWithDetail(apiKey);
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
  const userChoice = preferredModel || SystemPromptsService.getConfig().selectedModel;

  const available = await listAvailableModelNames(forceRefresh);

  if (userChoice && userChoice !== 'auto' && !isLegacyModel(userChoice)) {
    if (available.length === 0 || available.includes(userChoice)) {
      return userChoice;
    }
  }

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

  // 3. Fallback: Any non-legacy gemini text model
  const anyGemini = available.filter(m => /^gemini-/i.test(m) && !isLegacyModel(m) && !/tts/i.test(m));
  if (anyGemini.length > 0) {
    anyGemini.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return anyGemini[0];
  }

  return DEFAULT_TEXT_FALLBACK;
}

export async function resolveTtsModel(forceRefresh = false): Promise<string> {
  const userChoice = SystemPromptsService.getConfig().selectedTtsModel;
  const available = await listAvailableModelNames(forceRefresh);

  if (userChoice && userChoice !== 'auto' && !isLegacyModel(userChoice)) {
    if (available.length === 0 || available.includes(userChoice)) {
      return userChoice;
    }
  }

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

export interface FormattedModelOption {
  name: string;
  label: string;
  category: 'flash' | 'flash-lite' | 'pro' | 'other';
}

export async function getFilteredModelLists(forceRefresh = false): Promise<{
  textModels: FormattedModelOption[];
  ttsModels: FormattedModelOption[];
}> {
  const available = await listAvailableModelNames(forceRefresh);

  // Filter text models: exclude tts, embedding, imagen, veo, live, robotics, legacy 1.x / 2.x
  const textRaw = available.filter(m => {
    if (isLegacyModel(m)) return false;
    const lower = m.toLowerCase();
    const forbidden = /(tts|embedding|imagen|veo|live|robotics)/;
    return !forbidden.test(lower);
  });

  // Sort text models: Flash models first (newest version first), then Flash-lite, then Pro, then others
  textRaw.sort((a, b) => {
    const vA = extractVersionNum(a);
    const vB = extractVersionNum(b);
    if (vB !== vA) return vB - vA;
    return a.localeCompare(b);
  });

  const textModels: FormattedModelOption[] = textRaw.map(name => {
    let category: FormattedModelOption['category'] = 'other';
    let hint = '';
    const lower = name.toLowerCase();

    if (lower.includes('flash-lite')) {
      category = 'flash-lite';
      hint = ' (fastest, lowest quota use)';
    } else if (lower.includes('flash')) {
      category = 'flash';
      hint = ' (fast, free tier)';
    } else if (lower.includes('pro')) {
      category = 'pro';
      hint = ' (smartest, may need paid plan)';
    }

    return {
      name,
      label: `${name}${hint}`,
      category,
    };
  });

  // Filter TTS models: contain tts
  const ttsRaw = available.filter(m => /tts/i.test(m) && !isLegacyModel(m));
  ttsRaw.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));

  const ttsModels: FormattedModelOption[] = ttsRaw.map(name => ({
    name,
    label: `${name} (Speech Voice)`,
    category: 'other',
  }));

  return { textModels, ttsModels };
}
