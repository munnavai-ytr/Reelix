// Unified HTTP client supporting timeout (30s/60s), network checks, status error formatting, and CapacitorHttp for Android
import { Logger } from '../storage/logger';

export interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Record<string, string>;
}

export async function nativeFetch<T = unknown>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | FormData | Blob | ArrayBuffer;
    params?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<HttpResponse<T>> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineErr = new Error('You appear to be offline. Please check your internet connection and try again.');
    Logger.logError('nativeFetch [offline]', offlineErr, url);
    throw offlineErr;
  }

  const method = options.method || 'GET';
  const headers = options.headers || {};
  // 60s timeout for heavy payloads or audio/images, 30s default
  const isHeavy = typeof options.body === 'string' && (options.body.includes('audio/') || options.body.includes('image/'));
  const timeoutMs = options.timeoutMs || (isHeavy ? 60000 : 30000);

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // Check if running in Capacitor Native environment
    const capacitor = typeof window !== 'undefined'
      ? (window as unknown as { Capacitor?: { Plugins?: { CapacitorHttp?: { request: (opts: Record<string, unknown>) => Promise<{ status: number; data: unknown; headers: Record<string, string> }> } } } })?.Capacitor
      : undefined;

    if (capacitor?.Plugins?.CapacitorHttp) {
      try {
        let dataPayload: unknown = options.body;
        if (typeof options.body === 'string') {
          try {
            dataPayload = JSON.parse(options.body);
          } catch {
            dataPayload = options.body;
          }
        }

        const res = await capacitor.Plugins.CapacitorHttp.request({
          url,
          method,
          headers,
          data: dataPayload,
          params: options.params,
        });

        clearTimeout(timer);

        if (res.status === 401 || res.status === 403) {
          throw new Error(`API Key error (HTTP ${res.status}): Please check your API key configuration in Settings.`);
        } else if (res.status === 429) {
          throw new Error('API quota limit exceeded (HTTP 429). Please wait a moment before trying again.');
        } else if (res.status >= 500) {
          throw new Error(`Server error (HTTP ${res.status}): Gemini or upstream server is temporarily unavailable.`);
        }

        return {
          status: res.status,
          ok: res.status >= 200 && res.status < 300,
          data: res.data as T,
          headers: res.headers || {},
        };
      } catch (err: unknown) {
        // Fallback to standard fetch if CapacitorHttp plugin throws
        if ((err as Error).message?.includes('HTTP')) throw err;
      }
    }

    // Standard browser fetch with AbortSignal
    let fullUrl = url;
    if (options.params) {
      const query = new URLSearchParams(options.params).toString();
      if (query) {
        fullUrl += (url.includes('?') ? '&' : '?') + query;
      }
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: options.body as BodyInit,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401 || response.status === 403) {
      throw new Error(`API Key error (HTTP ${response.status}): Please check your API key configuration in Settings.`);
    } else if (response.status === 429) {
      throw new Error('API quota limit exceeded (HTTP 429). Please wait a moment before trying again.');
    } else if (response.status >= 500) {
      throw new Error(`Server error (HTTP ${response.status}): Gemini or upstream server is temporarily unavailable.`);
    }

    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/')) {
      data = await response.text();
    } else {
      data = await response.blob();
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key.toLowerCase()] = val;
    });

    return {
      status: response.status,
      ok: response.ok,
      data: data as T,
      headers: responseHeaders,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      const timeoutErr = new Error(`Request timed out after ${timeoutMs / 1000}s. Please check your connection and retry.`);
      Logger.logError('nativeFetch [timeout]', timeoutErr, url);
      throw timeoutErr;
    }
    Logger.logError('nativeFetch [error]', err, url);
    throw err;
  }
}

export const UnifiedHttpClient = {
  get: async (url: string) => {
    const res = await nativeFetch(url);
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.ok ? 'OK' : 'Error',
      json: async () => res.data,
      text: async () => typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      blob: async () => (res.data instanceof Blob ? res.data : new Blob([JSON.stringify(res.data)])),
    };
  },
  post: async (url: string, body: unknown, headers?: Record<string, string>) => {
    const res = await nativeFetch(url, {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers,
    });
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.ok ? 'OK' : 'Error',
      json: async () => res.data,
    };
  },
};
