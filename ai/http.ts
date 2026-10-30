// Unified HTTP client supporting both browser fetch and CapacitorHttp for Android APKs

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
  } = {}
): Promise<HttpResponse<T>> {
  const method = options.method || 'GET';
  const headers = options.headers || {};

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

      return {
        status: res.status,
        ok: res.status >= 200 && res.status < 300,
        data: res.data as T,
        headers: res.headers || {},
      };
    } catch {
      // Fallback to standard fetch if CapacitorHttp plugin errors
    }
  }

  // Standard browser fetch
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
  });

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
}

export const UnifiedHttpClient = {
  get: async (url: string) => {
    const res = await nativeFetch(url);
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.ok ? 'OK' : 'Error',
      json: async () => res.data as any,
      text: async () => typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      blob: async () => (res.data instanceof Blob ? res.data : new Blob([JSON.stringify(res.data)])),
    };
  },
  post: async (url: string, body: any, headers?: Record<string, string>) => {
    const res = await nativeFetch(url, {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers,
    });
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.ok ? 'OK' : 'Error',
      json: async () => res.data as any,
    };
  },
};
