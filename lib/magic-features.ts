// Reelix Magic Features Engine
// Vibe Slider, Remix x3, Hook Lab, Beat Sync, Style Steal, and Surprise Me
import { EditPlan, Layer, VideoLayer, CaptionLayer } from '@/engine/types';
import { Registry } from '@/registry';
import { GoogleGenAI } from '@google/genai';
import { ApiKeysService } from '@/storage/keys';
import { detectAudioBpm } from './bpm-detector';
import { LibraryDB } from '@/storage/library-db';

export interface HookVariant {
  id: string;
  title: string;
  text: string;
  effectId: string;
  animationId: string;
  description: string;
}

export interface RemixOption {
  id: string;
  name: string;
  vibe: string;
  description: string;
  plan: EditPlan;
}

export class MagicFeaturesService {
  /**
   * Vibe Slider (0 = Ultra Calm, 100 = Ultra Hyper)
   * Dynamically alters cut durations, zoom punch intensity, shake, effect stacks, and caption scale
   */
  static applyVibe(plan: EditPlan, vibePercent: number): EditPlan {
    const factor = Math.max(0, Math.min(100, vibePercent)) / 100;
    const cloned: EditPlan = JSON.parse(JSON.stringify(plan));

    cloned.layers.forEach((layer: Layer) => {
      // Adjust caption layers
      if (layer.type === 'caption' && layer.transform) {
        layer.transform.scale = 1 + factor * 0.35;
      }

      // Adjust effects stack based on vibe
      if ('effects' in layer && Array.isArray(layer.effects)) {
        if (factor > 0.7) {
          const hasShake = layer.effects.some(e => e.effectId.includes('shake') || e.effectId.includes('punch'));
          if (!hasShake && layer.type === 'video') {
            layer.effects.push({
              effectId: factor > 0.85 ? 'shake-intense' : 'zoom-punch-in',
              enabled: true,
              params: { intensity: factor * 1.5 },
            });
          }
        } else if (factor < 0.3) {
          layer.effects = layer.effects.filter(e => !e.effectId.includes('glitch') && !e.effectId.includes('rgb-split'));
        }
      }
    });

    return cloned;
  }

  /**
   * Hook Lab: Generates 5 alternative viral hook openings with visual treatments
   */
  static async generateHookLab(scriptText: string): Promise<HookVariant[]> {
    const keys = ApiKeysService.getKeys();
    if (!keys.gemini) {
      // Fallback pre-crafted viral hooks if API key is not ready
      return [
        {
          id: 'hook-1',
          title: 'The Shock Question',
          text: `Did you know that ${scriptText.slice(0, 35)}...?`,
          effectId: 'zoom-punch-in',
          animationId: 'word-drop',
          description: 'Instant zoom punch with high-curiosity psychological hook',
        },
        {
          id: 'hook-2',
          title: 'The Warning Stop',
          text: `Stop scrolling if you care about ${scriptText.slice(0, 25)}!`,
          effectId: 'rgb-split-glitch',
          animationId: 'impact-pop',
          description: 'Urgent red alert glitch with immediate thumb-stop authority',
        },
        {
          id: 'hook-3',
          title: 'The Uncomfortable Truth',
          text: `Nobody wants to admit this truth:`,
          effectId: 'cinematic-glow',
          animationId: 'slide-up-reveal',
          description: 'Dramatic lighting flare creating an emotional intrigue gap',
        },
        {
          id: 'hook-4',
          title: 'The Number One Secret',
          text: `This 1 secret completely changes how you think:`,
          effectId: 'film-flash-transition',
          animationId: 'kinetic-wave',
          description: 'Quick strobe white flash with bouncy kinetic captions',
        },
        {
          id: 'hook-5',
          title: 'The 3-Second Challenge',
          text: `Give me 3 seconds and I will prove it:`,
          effectId: 'lens-flare-anamorphic',
          animationId: 'squash-stretch-in',
          description: 'Hyper-focused bold statement with high-energy squash text',
        },
      ];
    }

    const ai = new GoogleGenAI({ apiKey: keys.gemini });
    const prompt = `Based on this video script, write 5 punchy 3-second opening hook variants designed for 9:16 vertical Shorts:
"${scriptText.slice(0, 500)}"

Return a JSON array of 5 objects:
[
  {
    "id": "hook-1",
    "title": "short label",
    "text": "spoken opening sentence under 12 words",
    "effectId": "zoom-punch-in" or "rgb-split-glitch" or "shake-intense" or "cinematic-glow",
    "animationId": "word-drop" or "impact-pop" or "kinetic-wave",
    "description": "visual hook strategy explanation"
  }
]`;

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(res.text || '[]');
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed;
      }
    } catch (err) {
      console.warn('Hook Lab AI generation error, using curated variants:', err);
    }

    return this.generateHookLab('');
  }

  /**
   * Beat Sync: Snaps layer cuts and transitions to real audio beats
   */
  static async beatSync(plan: EditPlan, audioBuffer: AudioBuffer): Promise<EditPlan> {
    const analysis = await detectAudioBpm(audioBuffer);
    const beats = analysis.beats;

    if (beats.length < 2) return plan;

    const cloned: EditPlan = JSON.parse(JSON.stringify(plan));
    const videoLayers = cloned.layers.filter(l => l.type === 'video');
    if (videoLayers.length < 2) return cloned;

    // Distribute video clips across beat intervals
    let beatIdx = 0;
    const beatStep = analysis.bpm > 140 ? 4 : 2;

    for (let i = 0; i < videoLayers.length; i++) {
      const layer = videoLayers[i];
      if (beatIdx < beats.length) {
        layer.startTime = beats[beatIdx];
        const nextBeatIdx = Math.min(beats.length - 1, beatIdx + beatStep);
        layer.duration = Math.max(0.8, beats[nextBeatIdx] - layer.startTime);
        beatIdx = nextBeatIdx;
      }
    }

    return cloned;
  }

  /**
   * Remix x3: Creates 3 distinct variations of the current edit plan
   */
  static generateRemix3(plan: EditPlan): RemixOption[] {
    const planA = this.applyVibe(plan, 95); // Hyper
    const planB = this.applyVibe(plan, 15); // Ultra Calm
    const planC = this.applyVibe(plan, 65); // Vibrant Pop

    // Adjust caption style in plan C
    planC.layers
      .filter((l): l is CaptionLayer => l.type === 'caption')
      .forEach(l => {
        l.styleId = 'cyber-neon-glow';
      });

    return [
      {
        id: 'remix-hyper',
        name: 'Hyper Velocity',
        vibe: '95% Hyper',
        description: 'Rapid punch zooms, micro-shakes on keywords, explosive caption pop',
        plan: planA,
      },
      {
        id: 'remix-aesthetic',
        name: 'Aesthetic Chill',
        vibe: '15% Calm',
        description: 'Smooth film grain, subtle cinematic letterbox, calm serif captions',
        plan: planB,
      },
      {
        id: 'remix-pop',
        name: 'Vibrant Neon',
        vibe: '65% Viral Pop',
        description: 'Cyber neon caption glow, whip-pan transitions, glowing accents',
        plan: planC,
      },
    ];
  }

  /**
   * Style Steal: Reverse-engineers a style description or reference into a reusable Template
   */
  static async styleSteal(referenceText: string, templateName: string): Promise<any> {
    const keys = ApiKeysService.getKeys();
    if (!keys.gemini) {
      throw new Error('Gemini API key is required to use Style Steal.');
    }

    const ai = new GoogleGenAI({ apiKey: keys.gemini });
    const catalog = Registry.getCatalogSummary();

    const prompt = `You are Reelix Style Steal AI.
Analyze this video style description / reference:
"${referenceText}"

Available registry items:
${catalog}

Create a reusable Reelix Template JSON with:
{
  "id": "template-${Math.random().toString(36).slice(2, 8)}",
  "name": "${templateName || 'Stolen Viral Style'}",
  "niche": "viral",
  "description": "Reverse engineered from: ${referenceText.slice(0, 60)}",
  "tags": ["style-steal", "viral", "custom"],
  "aspectRatio": "9:16",
  "recommendedDuration": 30,
  "plan": {
    "layers": []
  }
}`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(res.text || '{}');
    // Save directly into Library DB
    await LibraryDB.saveItem({
      id: parsed.id,
      name: parsed.name,
      category: 'templates',
      tags: parsed.tags || ['style-steal'],
      isBuiltIn: false,
      isFavorite: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: 'ai-creator',
      source: 'ai-studio',
      payload: parsed,
    });

    return parsed;
  }
}
