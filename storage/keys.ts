// Storage and real test validators for API keys
import { nativeFetch } from '../ai/http';

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
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const res = await nativeFetch<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message: string } }>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with exactly: OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (res.ok && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { success: true, message: 'Gemini API connected successfully! (Model: Gemini 2.5/3.8 Flash)' };
      } else {
        const errorMsg = res.data?.error?.message || `HTTP ${res.status}: Invalid response`;
        return { success: false, message: errorMsg };
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
