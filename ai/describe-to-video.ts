// Reelix Describe-to-Video Engine - Converts text concept into a full vertical Short
import { generateGeminiTtsAudio, callGeminiJson } from './gemini';
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

    const schema = {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        script: { type: 'STRING' },
        visualKeywords: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['title', 'script'],
    };

    const parsedScript = await callGeminiJson<{
      title?: string;
      script?: string;
      visualKeywords?: string[];
    }>({ contents: [{ parts: [{ text: scriptPrompt }] }] }, schema, { kind: 'text' });

    const scriptText = parsedScript.script || prompt;
    const title = parsedScript.title || prompt.slice(0, 30);

    onProgress('Synthesizing studio voiceover with Gemini TTS...', 35);
    const ttsResult = await generateGeminiTtsAudio(scriptText, voice);

    onProgress('Directing edit plan, B-roll & synchronized captions...', 60);
    const project = await PipelineRunner.run({
      script: scriptText,
      voiceAudioBlob: ttsResult.audioBlob,
      niche,
      style,
      targetDuration: ttsResult.durationSec || durationSec,
      captionStyle: 'karaoke-word-highlight',
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
