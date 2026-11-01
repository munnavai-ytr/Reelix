// Reelix System Prompts, AI Model Selection & Telemetry Logs
import { isLegacyModel } from '../ai/models';

export interface LogEntry {
  id: string;
  timestamp: number;
  service: 'director' | 'chat-to-change' | 'ai-creator' | 'whisper' | 'clip-analysis' | 'audio-bpm';
  model: string;
  durationMs: number;
  status: 'success' | 'error';
  summary: string;
  error?: string;
}

export interface PromptConfig {
  selectedModel: string;
  directorPrompt: string;
  chatPrompt: string;
  creatorPrompt: string;
}

export const DEFAULT_DIRECTOR_PROMPT = `You are Reelix Director AI, a world-class vertical Shorts (1080x1920) editor.
Generate an Edit Plan JSON strictly adhering to schema. 
Rules:
1. Fast-paced hook in the first 3 seconds with a dramatic zoom, punch, or shake.
2. Word-by-word synchronized captions with vibrant styling.
3. Engaging B-roll cuts and media pacing aligned to speech.
4. Auto-ducked sound effects and background music.`;

export const DEFAULT_CHAT_PROMPT = `You are Reelix Chat-to-Change Editor AI.
The user wants to modify their vertical Short Edit Plan.
Analyze their instructions and return a targeted JSON patch or updated layer properties.
Never break layer IDs or timestamps. Ensure smooth continuity.`;

export const DEFAULT_CREATOR_PROMPT = `You are Reelix AI Creator Studio.
Your role is to generate declarative definitions for video assets:
- Custom visual effects (parameters or sandboxed WebGL GLSL fragment shader code)
- Dynamic transitions
- Expressive kinetic text animations
- Viral caption styles
- SVG graphic stickers
- Full viral Short templates`;

const PROMPT_CONFIG_KEY = 'reelix_prompts_config_v2';
const LOGS_STORAGE_KEY = 'reelix_ai_logs_v2';

export class SystemPromptsService {
  static getConfig(): PromptConfig {
    if (typeof window === 'undefined') {
      return {
        selectedModel: 'auto',
        directorPrompt: DEFAULT_DIRECTOR_PROMPT,
        chatPrompt: DEFAULT_CHAT_PROMPT,
        creatorPrompt: DEFAULT_CREATOR_PROMPT,
      };
    }
    const raw = localStorage.getItem(PROMPT_CONFIG_KEY);
    if (!raw) {
      return {
        selectedModel: 'auto',
        directorPrompt: DEFAULT_DIRECTOR_PROMPT,
        chatPrompt: DEFAULT_CHAT_PROMPT,
        creatorPrompt: DEFAULT_CREATOR_PROMPT,
      };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.selectedModel || isLegacyModel(parsed.selectedModel)) {
        parsed.selectedModel = 'auto';
      }
      return {
        selectedModel: parsed.selectedModel || 'auto',
        directorPrompt: parsed.directorPrompt || DEFAULT_DIRECTOR_PROMPT,
        chatPrompt: parsed.chatPrompt || DEFAULT_CHAT_PROMPT,
        creatorPrompt: parsed.creatorPrompt || DEFAULT_CREATOR_PROMPT,
      };
    } catch {
      return {
        selectedModel: 'auto',
        directorPrompt: DEFAULT_DIRECTOR_PROMPT,
        chatPrompt: DEFAULT_CHAT_PROMPT,
        creatorPrompt: DEFAULT_CREATOR_PROMPT,
      };
    }
  }

  static saveConfig(cfg: Partial<PromptConfig>): void {
    if (typeof window === 'undefined') return;
    const current = this.getConfig();
    const updated = { ...current, ...cfg };
    localStorage.setItem(PROMPT_CONFIG_KEY, JSON.stringify(updated));
  }

  static getLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static logCall(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    const logs = this.getLogs();
    const newEntry: LogEntry = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: Date.now(),
      ...entry,
    };
    logs.unshift(newEntry);
    if (logs.length > 50) logs.length = 50;
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  }

  static clearLogs(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOGS_STORAGE_KEY);
  }
}
