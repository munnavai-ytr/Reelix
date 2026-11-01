// Gemini REST Client with dynamic model discovery, backoff retries, and JSON schemas
import { ApiKeysService } from '../storage/keys';
import { SystemPromptsService } from '../storage/system-prompts';
import { nativeFetch } from './http';
import { resolveTextModel, invalidateModelCache } from './models';

export interface GeminiCallOptions {
  model?: string;
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

  const maxRetries = options.maxRetries ?? 3;
  let model = options.model;

  if (!model || model === 'auto') {
    model = await resolveTextModel();
  }

  // --- Strict REST Body Formatting: only generationConfig & systemInstruction ---
  const cleanedPayload: Record<string, unknown> = { ...payload };

  // Move config -> generationConfig
  if ('config' in cleanedPayload && cleanedPayload.config && typeof cleanedPayload.config === 'object') {
    const cfg = cleanedPayload.config as Record<string, unknown>;
    const existingGen = (cleanedPayload.generationConfig as Record<string, unknown>) || {};
    cleanedPayload.generationConfig = { ...cfg, ...existingGen };
    delete cleanedPayload.config;
  }

  // Normalize systemInstruction to top-level { systemInstruction: { parts: [{ text: ... }] } }
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

  // Move top-level temperature / responseSchema / responseMimeType inside generationConfig
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

      // Handle 404 / 403 / "no longer available" -> Reset selection to 'auto' & retry
      if ((res.status === 404 || res.status === 403 || errMsg.toLowerCase().includes('no longer available')) && !resetAttempted) {
        resetAttempted = true;
        console.warn(`Model ${model} returned ${res.status} ("${errMsg}"). Resetting selection to 'auto' and retrying once.`);
        const sysCfg = SystemPromptsService.getConfig();
        sysCfg.selectedModel = 'auto';
        SystemPromptsService.saveConfig(sysCfg);
        invalidateModelCache();

        model = await resolveTextModel(undefined, true);
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

export interface GeminiJsonOptions {
  schema?: Record<string, unknown>;
  temperature?: number;
  systemInstruction?: string;
  model?: string;
  maxRetries?: number;
}

export async function callGeminiJson<T = unknown>(
  payloadOrParts: Record<string, unknown> | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  optionsOrSchema?: GeminiJsonOptions | Record<string, unknown>,
  legacyOptions?: GeminiCallOptions
): Promise<T> {
  let schema: Record<string, unknown> | undefined;
  let temperature: number | undefined;
  let systemInstruction: string | undefined;
  let model: string | undefined;
  let maxRetries: number | undefined;

  // Normalize signature: callGeminiJson(parts, { schema, temperature, systemInstruction }) vs legacy callGeminiJson(payload, schema, options)
  if (optionsOrSchema && typeof optionsOrSchema === 'object' && ('schema' in optionsOrSchema || 'systemInstruction' in optionsOrSchema || 'temperature' in optionsOrSchema)) {
    const opts = optionsOrSchema as GeminiJsonOptions;
    schema = opts.schema;
    temperature = opts.temperature;
    systemInstruction = opts.systemInstruction;
    model = opts.model;
    maxRetries = opts.maxRetries;
  } else {
    schema = optionsOrSchema as Record<string, unknown> | undefined;
    model = legacyOptions?.model;
    maxRetries = legacyOptions?.maxRetries;
  }

  let finalPayload: Record<string, unknown>;

  if (Array.isArray(payloadOrParts)) {
    finalPayload = {
      contents: [
        {
          role: 'user',
          parts: payloadOrParts,
        },
      ],
    };
  } else {
    finalPayload = { ...payloadOrParts };
  }

  const genConfig: Record<string, unknown> = {
    responseMimeType: 'application/json',
    ...(schema ? { responseSchema: schema } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
  };

  finalPayload.generationConfig = genConfig;

  if (systemInstruction) {
    finalPayload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await callGeminiRaw(finalPayload, { model, maxRetries });
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

// Compat object wrapper
export const GeminiClient = {
  callWithRetry: async <T = unknown>(payload: Record<string, unknown>, model?: string, maxRetries?: number): Promise<T> => {
    const res = await callGeminiRaw(payload, { model, maxRetries });
    const text = res.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an empty response.');
    return text as unknown as T;
  },
};
