// Real Video Frame Sampling & Gemini Multimodal Scene Analysis
import { callGeminiJson } from './gemini';

export interface ClipSegmentAnalysis {
  start: number;
  end: number;
  description: string;
  energy: number; // 0 to 1
  hasFace: boolean;
  focusX: number; // normalized 0..1 coordinates
  focusY: number; // normalized 0..1 coordinates
}

export interface SingleClipAnalysis {
  index: number;
  url: string;
  duration: number;
  summary: string;
  analyzed: boolean;
  segments: ClipSegmentAnalysis[];
}

export interface VideoAnalysisResult {
  clips: SingleClipAnalysis[];
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
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        resolve();
      };
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, 4000);
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        clearTimeout(timer);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    }
  });

  const duration = video.duration || 10;
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 640;
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
      setTimeout(resolve, 250);
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

export async function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.src = url;
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolve(v.duration || 5);
    v.onerror = () => resolve(5);
    setTimeout(() => resolve(5), 3000);
  });
}

export async function analyzeVideoClipsWithGemini(
  videoUrls: string[]
): Promise<VideoAnalysisResult> {
  if (!videoUrls || videoUrls.length === 0) {
    return { clips: [] };
  }

  // Pre-probe durations
  const durations = await Promise.all(videoUrls.map((u) => getVideoDuration(u)));

  const totalBudget = 48;
  const framesPerVideo = Math.max(3, Math.floor(totalBudget / videoUrls.length));

  const allSampled: Array<{ clipIndex: number; timestampSec: number; base64Jpeg: string }> = [];

  for (let idx = 0; idx < videoUrls.length; idx++) {
    const frames = await sampleVideoFrames(videoUrls[idx], framesPerVideo);
    for (const f of frames) {
      allSampled.push({ clipIndex: idx, timestampSec: f.timestampSec, base64Jpeg: f.base64Jpeg });
    }
  }

  // If frame sampling failed (e.g. CORS or read restrictions), return even segments with analyzed: false
  if (allSampled.length === 0) {
    return {
      clips: videoUrls.map((url, idx) => {
        const dur = durations[idx] || 10;
        const segCount = Math.max(1, Math.ceil(dur / 4));
        const segs: ClipSegmentAnalysis[] = [];
        for (let s = 0; s < segCount; s++) {
          const start = s * 4;
          const end = Math.min(dur, (s + 1) * 4);
          segs.push({
            start,
            end,
            description: `Segment ${s + 1}`,
            energy: 0.7,
            hasFace: false,
            focusX: 0.5,
            focusY: 0.5,
          });
        }
        return {
          index: idx,
          url,
          duration: dur,
          summary: 'User Video Clip',
          analyzed: false,
          segments: segs,
        };
      }),
    };
  }

  const imageParts = allSampled.map((f) => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: f.base64Jpeg,
    },
  }));

  const prompt = `Analyze these video frames from ${videoUrls.length} user video clips for 9:16 vertical shorts editing.
For each clip index (0 to ${videoUrls.length - 1}), identify key visual segments with energy score (0.0 to 1.0), whether a face is visible, and optimal focal crop center (focusX, focusY from 0.0 to 1.0).
Return JSON matching this schema:
{
  "clips": [
    {
      "index": 0,
      "summary": "Clip summary",
      "segments": [
        {
          "start": 0.0,
          "end": 3.5,
          "description": "Engaging visual action",
          "energy": 0.85,
          "hasFace": true,
          "focusX": 0.5,
          "focusY": 0.4
        }
      ]
    }
  ]
}`;

  const schema = {
    type: 'OBJECT',
    properties: {
      clips: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            index: { type: 'NUMBER' },
            summary: { type: 'STRING' },
            segments: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  start: { type: 'NUMBER' },
                  end: { type: 'NUMBER' },
                  description: { type: 'STRING' },
                  energy: { type: 'NUMBER' },
                  hasFace: { type: 'BOOLEAN' },
                  focusX: { type: 'NUMBER' },
                  focusY: { type: 'NUMBER' },
                },
                required: ['start', 'end', 'energy', 'focusX', 'focusY'],
              },
            },
          },
          required: ['index', 'segments'],
        },
      },
    },
    required: ['clips'],
  };

  try {
    const res = await callGeminiJson<{
      clips: Array<{
        index: number;
        summary?: string;
        segments: Array<{
          start: number;
          end: number;
          description?: string;
          energy: number;
          hasFace?: boolean;
          focusX: number;
          focusY: number;
        }>;
      }>;
    }>({ contents: [{ parts: [...imageParts, { text: prompt }] }] }, schema, { kind: 'text' });

    if (res.clips && Array.isArray(res.clips) && res.clips.length > 0) {
      const parsedClips: SingleClipAnalysis[] = videoUrls.map((url, idx) => {
        const found = res.clips.find((c) => c.index === idx);
        const dur = durations[idx] || 10;
        if (found && found.segments && found.segments.length > 0) {
          return {
            index: idx,
            url,
            duration: dur,
            summary: found.summary || `Clip ${idx + 1}`,
            analyzed: true,
            segments: found.segments.map((s) => ({
              start: Number(s.start) || 0,
              end: Number(s.end) || Math.min(dur, 4),
              description: s.description || 'Action scene',
              energy: Number(s.energy) || 0.7,
              hasFace: !!s.hasFace,
              focusX: Math.max(0, Math.min(1, Number(s.focusX) || 0.5)),
              focusY: Math.max(0, Math.min(1, Number(s.focusY) || 0.5)),
            })),
          };
        }
        // Fallback for this clip if missing from response
        return {
          index: idx,
          url,
          duration: dur,
          summary: `Clip ${idx + 1}`,
          analyzed: false,
          segments: [
            {
              start: 0,
              end: dur,
              description: 'Full clip',
              energy: 0.7,
              hasFace: false,
              focusX: 0.5,
              focusY: 0.5,
            },
          ],
        };
      });

      return { clips: parsedClips };
    }
  } catch (err) {
    console.warn('Gemini clip analysis error, using fallback segments:', err);
  }

  // Fallback
  return {
    clips: videoUrls.map((url, idx) => {
      const dur = durations[idx] || 10;
      const segCount = Math.max(1, Math.ceil(dur / 4));
      const segs: ClipSegmentAnalysis[] = [];
      for (let s = 0; s < segCount; s++) {
        const start = s * 4;
        const end = Math.min(dur, (s + 1) * 4);
        segs.push({
          start,
          end,
          description: `Segment ${s + 1}`,
          energy: 0.7,
          hasFace: false,
          focusX: 0.5,
          focusY: 0.5,
        });
      }
      return {
        index: idx,
        url,
        duration: dur,
        summary: `Clip ${idx + 1}`,
        analyzed: false,
        segments: segs,
      };
    }),
  };
}
