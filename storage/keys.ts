// Storage and real test validators for API keys
import { nativeFetch } from '../ai/http';
import { fetchRemoteModelsWithDetail, resolveTextModel, resolveTtsModel } from '../ai/models';
import { callGeminiRaw } from '../ai/gemini';

export interface ApiKeys {
  gemini: string;
  pexels: string;
  freesound: string;
  jamendo: string;
}

const STORAGE_KEY = 'reelix_api_keys';

export const ApiKeysService = {
  getKeys(): ApiKeys {
    if (typeof window === 'undefined') {
      return { gemini: '', pexels: '', freesound: '', jamendo: '' };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return { gemini: '', pexels: '', freesound: '', jamendo: '' };
  },

  saveKeys(keys: Partial<ApiKeys>): void {
    if (typeof window === 'undefined') return;
    const current = this.getKeys();
    const updated = { ...current, ...keys };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  hasGeminiKey(): boolean {
    const keys = this.getKeys();
    return !!(keys.gemini && keys.gemini.trim().length > 10);
  },

  async testGemini(apiKey: string): Promise<{ success: boolean; message: string }> {
    const key = apiKey.trim();
    if (!key) return { success: false, message: 'Please enter a Gemini API key' };

    // Save temporary key so callGeminiRaw & resolveTextModel can access it
    this.saveKeys({ gemini: key });

    // Step 1: List models via GET /v1beta/models (header x-goog-api-key)
    const remote = await fetchRemoteModelsWithDetail(key);
    if (remote.error) {
      return { success: false, message: remote.error };
    }

    try {
      // Step 2: Resolve active text and voice models
      const textModel = await resolveTextModel(undefined, true);
      const ttsModel = await resolveTtsModel(true);

      // Step 3: Send tiny generateContent test call
      const res = await callGeminiRaw(
        {
          contents: [{ parts: [{ text: 'Respond with exactly: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        },
        { model: textModel, maxRetries: 1 }
      );

      const reply = res.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply || res.candidates?.[0]) {
        return {
          success: true,
          message: `Connected. Text model: ${textModel} | Voice model: ${ttsModel}`,
        };
      } else {
        return { success: false, message: 'Gemini API returned an invalid response structure.' };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error testing Gemini API';
      return { success: false, message: msg };
    }
  },

  async testPexels(apiKey: string): Promise<{ success: boolean; message: string }> {
    const key = apiKey.trim();
    if (!key) return { success: false, message: 'Please enter a Pexels API key' };

    try {
      const res = await nativeFetch<{ videos?: unknown[]; error?: string }>('https://api.pexels.com/videos/search?query=nature&per_page=1&orientation=portrait', {
        headers: { Authorization: key }
      });
      if (res.ok && res.data?.videos) {
        return { success: true, message: 'Pexels API connected successfully!' };
      }
      return { success: false, message: res.data?.error || `HTTP ${res.status}: Invalid Pexels key` };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Network error testing Pexels API' };
    }
  },

  async testFreesound(apiKey: string): Promise<{ success: boolean; message: string }> {
    const key = apiKey.trim();
    if (!key) return { success: false, message: 'Please enter a Freesound API key' };

    try {
      const res = await nativeFetch<{ results?: unknown[]; detail?: string }>(`https://freesound.org/apiv2/search/text/?query=whoosh&token=${key}&page_size=1`);
      if (res.ok && res.data?.results) {
        return { success: true, message: 'Freesound API connected successfully!' };
      }
      return { success: false, message: res.data?.detail || `HTTP ${res.status}: Invalid Freesound key` };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Network error testing Freesound API' };
    }
  },

  async testJamendo(clientId: string): Promise<{ success: boolean; message: string }> {
    const cid = clientId.trim();
    if (!cid) return { success: false, message: 'Please enter a Jamendo Client ID' };

    try {
      const res = await nativeFetch<{ results?: unknown[]; headers?: { status: string; error_message?: string } }>(`https://api.jamendo.com/v3.0/tracks/?client_id=${cid}&format=json&limit=1`);
      if (res.ok && res.data?.headers?.status === 'success') {
        return { success: true, message: 'Jamendo API connected successfully!' };
      }
      return { success: false, message: res.data?.headers?.error_message || `HTTP ${res.status}: Invalid Jamendo Client ID` };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Network error testing Jamendo API' };
    }
  }
};
