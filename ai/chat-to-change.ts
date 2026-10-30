// Reelix Chat-to-Change Service
// Applies targeted user voice/text instructions to mutate Edit Plans with AI intelligence
import { GoogleGenAI } from '@google/genai';
import { ApiKeysService } from '@/storage/keys';
import { SystemPromptsService } from '@/storage/system-prompts';
import { EditPlan } from '@/engine/types';
import { Registry } from '@/registry';
import { EditPlanSchema } from '@/engine/schema';

export interface ChatToChangeResult {
  updatedPlan: EditPlan;
  changeSummary: string;
}

export class ChatToChangeService {
  static async applyInstruction(
    currentPlan: EditPlan,
    instruction: string
  ): Promise<ChatToChangeResult> {
    const keys = ApiKeysService.getKeys();
    if (!keys.gemini) {
      throw new Error('Gemini API key is required to use Chat-to-Change.');
    }

    const config = SystemPromptsService.getConfig();
    const startTime = Date.now();
    const catalogSummary = Registry.getCatalogSummary();
    const ai = new GoogleGenAI({ apiKey: keys.gemini });

    const systemPrompt = `${config.chatPrompt}

Available Registry Catalog in Reelix:
${catalogSummary}

You must output a JSON object with:
{
  "changeSummary": "1-2 sentence description of what was updated",
  "updatedPlan": { ...full valid EditPlan JSON strictly matching schema... }
}

CRITICAL RULES:
- Never corrupt track IDs, layer IDs, or total project duration unless explicitly requested.
- If the user asks to change font, captions, vibe, effects, or transitions, pick valid IDs from the registry catalog.
- If the user asks for "bigger captions", increase fontSize in caption layers.
- If the user asks for "add glitch on hook", attach the "glitch" or "rgb-split" effect to the first 3 seconds of layers.
- Return ONLY valid JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: config.selectedModel || 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\nCurrent Edit Plan:\n${JSON.stringify(currentPlan)}\n\nUser Instruction:\n"${instruction}"`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      if (!parsed.updatedPlan) {
        throw new Error('AI failed to return an updated Edit Plan.');
      }

      // Validate against strict Zod schema
      const validation = EditPlanSchema.safeParse(parsed.updatedPlan);
      let validatedPlan: EditPlan;
      if (!validation.success) {
        // Fallback auto-healing
        console.warn('Chat-to-Change validation warning, auto-recovering:', validation.error);
        validatedPlan = {
          ...currentPlan,
          ...parsed.updatedPlan,
          layers: parsed.updatedPlan.layers || currentPlan.layers,
        };
      } else {
        validatedPlan = validation.data as EditPlan;
      }

      SystemPromptsService.logCall({
        service: 'chat-to-change',
        model: config.selectedModel || 'gemini-2.5-flash',
        durationMs: Date.now() - startTime,
        status: 'success',
        summary: parsed.changeSummary || 'Applied user modification',
      });

      return {
        updatedPlan: validatedPlan,
        changeSummary: parsed.changeSummary || 'Successfully applied changes to your Short.',
      };
    } catch (err: any) {
      SystemPromptsService.logCall({
        service: 'chat-to-change',
        model: config.selectedModel || 'gemini-2.5-flash',
        durationMs: Date.now() - startTime,
        status: 'error',
        summary: 'Failed to apply Chat-to-Change instruction',
        error: err.message || String(err),
      });
      throw err;
    }
  }
}
