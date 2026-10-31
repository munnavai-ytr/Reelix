// Reelix Chat-to-Change Service - Mutates Edit Plans using dynamic Gemini JSON calls
import { SystemPromptsService } from '@/storage/system-prompts';
import { EditPlan } from '@/engine/types';
import { Registry } from '@/registry';
import { EditPlanSchema } from '@/engine/schema';
import { callGeminiJson } from './gemini';

export interface ChatToChangeResult {
  updatedPlan: EditPlan;
  changeSummary: string;
}

export class ChatToChangeService {
  static async applyInstruction(
    currentPlan: EditPlan,
    instruction: string
  ): Promise<ChatToChangeResult> {
    const config = SystemPromptsService.getConfig();
    const startTime = Date.now();
    const catalogSummary = Registry.getCatalogSummary();

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
- If user asks for bigger captions, increase fontSize in caption layers.
- If user asks for glitch effect, add glitch/rgb-split effect to layer effects.`;

    const payload = {
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
    };

    try {
      const parsed = await callGeminiJson<{
        changeSummary: string;
        updatedPlan: EditPlan;
      }>(payload, undefined, { kind: 'text' });

      if (!parsed.updatedPlan) {
        throw new Error('AI failed to return an updated Edit Plan.');
      }

      const validation = EditPlanSchema.safeParse(parsed.updatedPlan);
      let validatedPlan: EditPlan;
      if (!validation.success) {
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
        model: config.selectedModel || 'auto',
        durationMs: Date.now() - startTime,
        status: 'success',
        summary: parsed.changeSummary || 'Applied user modification',
      });

      return {
        updatedPlan: validatedPlan,
        changeSummary: parsed.changeSummary || 'Successfully applied changes to your Short.',
      };
    } catch (err: unknown) {
      SystemPromptsService.logCall({
        service: 'chat-to-change',
        model: config.selectedModel || 'auto',
        durationMs: Date.now() - startTime,
        status: 'error',
        summary: 'Failed to apply Chat-to-Change instruction',
        error: (err as Error).message || String(err),
      });
      throw err;
    }
  }
}
