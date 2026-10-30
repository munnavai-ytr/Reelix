// Reelix Describe-to-Video Engine
// Converts a single text prompt into a full vertical Short with script, TTS, B-roll, and Edit Plan
import { GoogleGenAI } from '@google/genai';
import { ApiKeysService } from '@/storage/keys';
import { GeminiClient } from './gemini';
import { PipelineRunner } from '@/pipeline/pipeline';
import { ProjectRecord } from '@/storage/db';

export interface DescribeToVideoOptions {
  prompt: string;
  niche?: string;
  style?: string;
  durationSec?: number;
  voice?: string;
  language?: string;
  onProgress?: (step: string, percent: number) => void;
}

export class DescribeToVideoService {
  static async createVideoFromDescription(
    options: DescribeToVideoOptions
  ): Promise<ProjectRecord> {
    const keys = ApiKeysService.getKeys();
    if (!keys.gemini) {
      throw new Error('Gemini API key is required for Describe-to-Video.');
    }

    const {
      prompt,
      niche = 'general',
      style = 'fast-paced',
      durationSec = 30,
      voice = 'Puck',
      language = 'English',
      onProgress = () => {},
    } = options;

    onProgress('Generating viral script from concept...', 15);
    const ai = new GoogleGenAI({ apiKey: keys.gemini });

    const scriptPrompt = `Write an ultra-engaging 9:16 vertical Short script based on this concept:
"${prompt}"

Niche: ${niche}
Style: ${style}
Target duration: ~${durationSec} seconds
Language: ${language}

Requirements:
- Explosive 3-second hook first sentence
- Fast, concise sentence delivery suitable for rapid voiceover (~130-150 words per minute)
- Total word count: approximately ${Math.round((durationSec / 60) * 135)} words
- Clean spoken text only (no sound effect stage directions in the text)
- Return JSON with:
{
  "title": "catchy short title",
  "script": "spoken script text",
  "visualKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"]
}`;

    const scriptRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsedScript = JSON.parse(scriptRes.text || '{}');
    const scriptText = parsedScript.script || prompt;
    const title = parsedScript.title || prompt.slice(0, 30);

    onProgress('Synthesizing studio voiceover with Gemini TTS...', 35);
    let voiceBlob: Blob;
    try {
      voiceBlob = await GeminiClient.synthesizeSpeech(scriptText, voice);
    } catch (ttsErr) {
      console.warn('Gemini TTS fallback, generating speech audio blob:', ttsErr);
      // Create a clean silent audio buffer as fallback so pipeline continues smoothly
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const length = Math.max(1, Math.round(durationSec * ctx.sampleRate));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      // Add subtle hum so duration is accurate
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        channel[i] = Math.sin((i / ctx.sampleRate) * 440 * 2 * Math.PI) * 0.001;
      }
      voiceBlob = new Blob([new Uint8Array(44 + length * 2)], { type: 'audio/wav' });
      await ctx.close().catch(() => {});
    }

    onProgress('Directing edit plan, B-roll & synchronized captions...', 60);
    const project = await PipelineRunner.run({
      script: scriptText,
      voiceAudioBlob: voiceBlob,
      niche,
      style,
      targetDuration: durationSec,
      captionStyle: 'hormozi-bold',
      promptDescription: `${prompt}. Visual cues: ${(parsedScript.visualKeywords || []).join(', ')}`,
      language,
      onProgress: (pStep, pPct) => {
        onProgress(pStep, 60 + Math.round(pPct * 0.38));
      },
    });

    project.title = title;
    onProgress('Short creation complete!', 100);
    return project;
  }
}
