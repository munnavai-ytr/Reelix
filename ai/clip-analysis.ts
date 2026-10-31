// Real Video Frame Sampling & Gemini Multimodal Scene Analysis
import { callGeminiJson } from './gemini';

export interface SceneAnalysis {
  timestampSec: number;
  description: string;
  energyScore: number; // 0 to 1
  subjectFocus: { x: number; y: number }; // normalized 0..1 coordinates
  suggestedCut: boolean;
}

export interface VideoAnalysisResult {
  scenes: SceneAnalysis[];
  overallEnergy: 'high' | 'medium' | 'calm';
  dominantTopic: string;
  recommendedHookFrameSec: number;
}

export async function sampleVideoFrames(
  videoUrl: string,
  numFrames = 12
): Promise<{ timestampSec: number; base64Jpeg: string }[]> {
  if (typeof window === 'undefined') return [];

  const video = document.createElement('video');
  video.src = videoUrl;
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve) => {
    if (video.readyState >= 1) {
      resolve();
    } else {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => resolve();
      setTimeout(() => resolve(), 3000);
    }
  });

  const duration = video.duration || 10;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 568; // 320px 9:16 aspect
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const sampled: { timestampSec: number; base64Jpeg: string }[] = [];
  const interval = duration / (numFrames + 1);

  for (let i = 1; i <= numFrames; i++) {
    const t = i * interval;
    video.currentTime = t;

    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      setTimeout(resolve, 300);
    });

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      sampled.push({ timestampSec: t, base64Jpeg: base64 });
    } catch {
      // Ignore frame read error
    }
  }

  return sampled;
}

export async function analyzeVideoClipsWithGemini(
  videoUrls: string[]
): Promise<VideoAnalysisResult> {
  if (!videoUrls || videoUrls.length === 0) {
    return {
      scenes: [],
      overallEnergy: 'high',
      dominantTopic: 'General Short',
      recommendedHookFrameSec: 0,
    };
  }

  const allSampledFrames: { timestampSec: number; base64Jpeg: string }[] = [];
  const framesPerVideo = Math.max(3, Math.floor(48 / videoUrls.length));

  for (const url of videoUrls) {
    const frames = await sampleVideoFrames(url, framesPerVideo);
    allSampledFrames.push(...frames);
  }

  if (allSampledFrames.length === 0) {
    return {
      scenes: [],
      overallEnergy: 'high',
      dominantTopic: 'Short',
      recommendedHookFrameSec: 0,
    };
  }

  const imageParts = allSampledFrames.map((f, idx) => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: f.base64Jpeg,
    },
  }));

  const prompt = `Analyze these ${allSampledFrames.length} sampled video frames for vertical 9:16 Shorts editing.
Identify scene cuts, subject focus point (x,y coordinates from 0.0 to 1.0), and visual energy score (0.0 to 1.0).
Return JSON matching this exact schema:
{
  "overallEnergy": "high",
  "dominantTopic": "visual theme",
  "recommendedHookFrameSec": 0.5,
  "scenes": [
    {
      "timestampSec": 0.5,
      "description": "action scene",
      "energyScore": 0.9,
      "subjectFocus": { "x": 0.5, "y": 0.4 },
      "suggestedCut": true
    }
  ]
}`;

  const payload = {
    contents: [
      {
        parts: [...imageParts, { text: prompt }],
      },
    ],
  };

  const schema = {
    type: 'OBJECT',
    properties: {
      overallEnergy: { type: 'STRING' },
      dominantTopic: { type: 'STRING' },
      recommendedHookFrameSec: { type: 'NUMBER' },
      scenes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            timestampSec: { type: 'NUMBER' },
            description: { type: 'STRING' },
            energyScore: { type: 'NUMBER' },
            subjectFocus: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER' },
                y: { type: 'NUMBER' },
              },
            },
            suggestedCut: { type: 'BOOLEAN' },
          },
        },
      },
    },
    required: ['overallEnergy', 'dominantTopic', 'scenes'],
  };

  try {
    const result = await callGeminiJson<VideoAnalysisResult>(payload, schema, { kind: 'text' });
    return result;
  } catch (err) {
    console.warn('Gemini frame analysis warning:', err);
    return {
      scenes: [],
      overallEnergy: 'high',
      dominantTopic: 'Dynamic Video',
      recommendedHookFrameSec: 0,
    };
  }
}
