// Reelix System Prompts, AI Model Selection & Telemetry Logs

export interface LogEntry {
  id: string;
  timestamp: number;
  service: 'director' | 'chat-to-change' | 'ai-creator' | 'tts' | 'audio-bpm';
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
3. Engaging B-roll or motion backgrounds with smooth transitions (whip-pan, zoom-in, glitch).
4. SFX hits on key reveal moments and ducked background music.`;

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

const PROMPT_CONFIG_KEY = 'reelix_prompts_config_v1';
const LOGS_STORAGE_KEY = 'reelix_ai_logs_v1';

export class SystemPromptsService {
  static getConfig(): PromptConfig {
    if (typeof window === 'undefined') {
      return {
        selectedModel: 'gemini-2.5-flash',
        directorPrompt: DEFAULT_DIRECTOR_PROMPT,
        chatPrompt: DEFAULT_CHAT_PROMPT,
        creatorPrompt: DEFAULT_CREATOR_PROMPT,
      };
    }
    const raw = localStorage.getItem(PROMPT_CONFIG_KEY);
    if (!raw) {
      return {
        selectedModel: 'gemini-2.5-flash',
        directorPrompt: DEFAULT_DIRECTOR_PROMPT,
        chatPrompt: DEFAULT_CHAT_PROMPT,
        creatorPrompt: DEFAULT_CREATOR_PROMPT,
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        selectedModel: 'gemini-2.5-flash',
        directorPrompt: DEFAULT_DIRECTOR_PROMPT,
        chatPrompt: DEFAULT_CHAT_PROMPT,
        creatorPrompt: DEFAULT_CREATOR_PROMPT,
      };
    }
  }

  static saveConfig(cfg: PromptConfig): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROMPT_CONFIG_KEY, JSON.stringify(cfg));
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
    // Keep last 50 logs
    if (logs.length > 50) logs.length = 50;
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  }

  static clearLogs(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOGS_STORAGE_KEY);
  }
}
