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
const CACHE_KEY_PREFIX = 'reelix_gemini_models_v2_';

export function isLegacyModel(name: string): boolean {
  if (!name) return true;
  const cleanName = name.replace(/^models\//, '');
  // Disallow Gemini 1.x and any defunct models
  return /^gemini-1\./i.test(cleanName) || cleanName.includes('gemini-pro') || cleanName.includes('gemini-1.0');
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
            if (!isLegacyModel(cleanName)) {
              allModels.push(cleanName);
            }
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
        const parsed: { timestamp: number; models: string[] } = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.models.length > 0) {
          return parsed.models;
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }

  const { models, error } = await fetchRemoteModelsWithDetail(apiKey);
  if (error) {
    throw new Error(`Could not load the Gemini model list: ${error}. Check your API key and internet.`);
  }

  if (models.length > 0 && typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        timestamp: Date.now(),
        models,
      }));
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

  let available: string[] = [];
  try {
    available = await listAvailableModelNames(forceRefresh);
  } catch (err) {
    if (userChoice && userChoice !== 'auto' && !isLegacyModel(userChoice)) {
      return userChoice;
    }
    throw err;
  }

  if (userChoice && userChoice !== 'auto' && !isLegacyModel(userChoice)) {
    if (available.length === 0 || available.includes(userChoice)) {
      return userChoice;
    }
  }

  if (available.length === 0) {
    throw new Error('Could not load the Gemini model list: No models returned. Check your API key and internet.');
  }

  // 1. Look for newest gemini-X.Y-flash
  const pureFlashModels = available.filter(m => {
    const isFlash = /flash/i.test(m);
    const hasForbidden = /(tts|image|live|audio|embedding|lite|thinking|exp)/i.test(m);
    return isFlash && !hasForbidden;
  });

  if (pureFlashModels.length > 0) {
    pureFlashModels.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return pureFlashModels[0];
  }

  // 2. Fallback: Any other flash model
  const anyFlash = available.filter(m => /flash/i.test(m) && !/tts/i.test(m));
  if (anyFlash.length > 0) {
    anyFlash.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return anyFlash[0];
  }

  // 3. Fallback: Any non-legacy gemini model
  const anyGemini = available.filter(m => /^gemini-/i.test(m) && !isLegacyModel(m) && !/tts/i.test(m));
  if (anyGemini.length > 0) {
    anyGemini.sort((a, b) => extractVersionNum(b) - extractVersionNum(a));
    return anyGemini[0];
  }

  return available[0];
}

export interface FormattedModelOption {
  name: string;
  label: string;
  category: 'flash' | 'flash-lite' | 'pro' | 'other';
}

export async function getFilteredModelLists(forceRefresh = false): Promise<{
  textModels: FormattedModelOption[];
}> {
  const available = await listAvailableModelNames(forceRefresh);

  // Filter text models: exclude tts, embedding, imagen, veo, live, robotics, legacy 1.x
  const textRaw = available.filter(m => {
    if (isLegacyModel(m)) return false;
    const lower = m.toLowerCase();
    const forbidden = /(tts|embedding|imagen|veo|live|robotics)/;
    return !forbidden.test(lower);
  });

  // Sort text models: highest version first
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

  return { textModels };
}
