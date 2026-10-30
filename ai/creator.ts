// Reelix AI Creator Studio Service
// Generates validated declarative effects, transitions, text animations, caption styles, SVG stickers & templates
import { GoogleGenAI } from '@google/genai';
import { ApiKeysService } from '@/storage/keys';
import { SystemPromptsService } from '@/storage/system-prompts';
import { ShaderEngine } from '@/registry/shader-engine';
import { EffectDefinition } from '@/registry/effects';
import { TransitionDefinition } from '@/registry/transitions';
import { TextAnimationDefinition } from '@/registry/text-animations';
import { CaptionStyleDefinition } from '@/registry/caption-styles';
import { TemplateDefinition } from '@/registry/templates';
import { StickerDefinition } from '@/registry/stickers';

export type CreatorItemType =
  | 'effect'
  | 'transition'
  | 'text-animation'
  | 'caption-style'
  | 'sticker'
  | 'template';

export interface CreatorGenerationResult {
  type: CreatorItemType;
  item: any;
  shaderValid?: boolean;
  shaderError?: string;
}

export class AiCreatorService {
  static async generateAsset(
    type: CreatorItemType,
    prompt: string,
    existingContext?: any
  ): Promise<CreatorGenerationResult> {
    const keys = ApiKeysService.getKeys();
    if (!keys.gemini) {
      throw new Error('Gemini API key is required to use AI Creator Studio.');
    }

    const config = SystemPromptsService.getConfig();
    const startTime = Date.now();
    const ai = new GoogleGenAI({ apiKey: keys.gemini });

    const systemInstruction = `${config.creatorPrompt}
You are creating a declarative video asset of type: "${type}".
Ensure strictly valid JSON matching the requested structure.
NEVER return arbitrary executable JavaScript.

Specific contracts for type:
- If "effect": JSON must contain: {
    "id": string (kebab-case, e.g. "cyber-glow"),
    "name": string,
    "category": "color" | "blur" | "distortion" | "stylize" | "light" | "glitch",
    "parameters": Record<string, { "type": "number" | "color" | "boolean", "default": any, "min"?: number, "max"?: number, "step"?: number, "label": string }>,
    "description": string,
    "tags": string[],
    "shaderCode"?: string (optional GLSL fragment shader following uniform contract: uniform sampler2D u_image; uniform vec2 u_resolution; uniform float u_time; uniform float u_intensity; varying vec2 v_texCoord; void main() { ... })
  }
- If "transition": { "id": string, "name": string, "duration": number (0.2-0.8), "category": string, "tags": string[], "params": {} }
- If "text-animation": { "id": string, "name": string, "category": string, "duration": number, "tags": string[], "description": string }
- If "caption-style": { "id": string, "name": string, "fontSize": number, "fontFamily": string, "fontWeight": string, "color": string, "highlightColor": string, "strokeColor": string, "strokeWidth": number, "shadowColor": string, "shadowBlur": number, "backgroundColor": string, "textTransform": "uppercase" | "none", "animation": string }
- If "sticker": { "id": string, "name": string, "category": "social" | "badge" | "shapes" | "arrows" | "icons" | "emojis", "tags": string[], "svg": string (clean SVG code with viewBox, fill, paths, etc.), "defaultWidth": number, "defaultHeight": number }
- If "template": { "id": string, "name": string, "niche": string, "description": string, "tags": string[], "aspectRatio": "9:16", "recommendedDuration": number, "plan": { "tracks": [...] } }
`;

    const userPrompt = existingContext
      ? `Update the existing asset based on this instruction: "${prompt}"\nCurrent asset:\n${JSON.stringify(existingContext, null, 2)}`
      : `Create a new "${type}" asset matching this description: "${prompt}"`;

    try {
      const response = await ai.models.generateContent({
        model: config.selectedModel || 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nTask:\n${userPrompt}\n\nReturn ONLY raw JSON.` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      let shaderValid: boolean | undefined = undefined;
      let shaderError: string | undefined = undefined;

      // If effect generated shaderCode, compile-test live in WebGL sandbox
      if (type === 'effect' && parsed.shaderCode) {
        try {
          const testEngine = new ShaderEngine();
          testEngine.compile(parsed.shaderCode);
          testEngine.dispose();
          shaderValid = true;
        } catch (err: any) {
          shaderValid = false;
          shaderError = err.message || 'Shader compilation failed';
          // Fallback: strip broken shaderCode so standard 2D canvas fallback works
          delete parsed.shaderCode;
        }
      }

      SystemPromptsService.logCall({
        service: 'ai-creator',
        model: config.selectedModel || 'gemini-2.5-flash',
        durationMs: Date.now() - startTime,
        status: 'success',
        summary: `Created ${type}: ${parsed.name || parsed.id}`,
      });

      return {
        type,
        item: parsed,
        shaderValid,
        shaderError,
      };
    } catch (err: any) {
      SystemPromptsService.logCall({
        service: 'ai-creator',
        model: config.selectedModel || 'gemini-2.5-flash',
        durationMs: Date.now() - startTime,
        status: 'error',
        summary: `Failed to create ${type}`,
        error: err.message || String(err),
      });
      throw err;
    }
  }
}
