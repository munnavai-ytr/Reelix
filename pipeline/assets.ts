// Step 5: Asset Resolver - Pexels, Freesound, Jamendo, and Procedural Generators
import { ApiKeysService } from '../storage/keys';
import { nativeFetch } from '../ai/http';
import { AudioMixer } from '../engine/audio-mixer';

export async function resolveStockVideos(queries: string[]): Promise<string[]> {
  const keys = ApiKeysService.getKeys();
  const resolved: string[] = [];

  if (keys.pexels && keys.pexels.trim().length > 5) {
    for (const query of queries) {
      try {
        const encoded = encodeURIComponent(query);
        const url = `https://api.pexels.com/videos/search?query=${encoded}&orientation=portrait&per_page=1`;
        const res = await nativeFetch<{
          videos?: Array<{
            video_files?: Array<{ link: string; quality: string; width: number; height: number }>;
          }>;
        }>(url, {
          headers: { Authorization: keys.pexels.trim() }
        });

        if (res.ok && res.data?.videos?.[0]?.video_files) {
          const files = res.data.videos[0].video_files;
          const match = files.find(f => f.quality === 'hd' || f.height >= 1080) || files[0];
          if (match?.link) {
            resolved.push(match.link);
            continue;
          }
        }
      } catch {
        // fallback
      }
    }
  }

  return resolved;
}

export async function resolveBackgroundMusic(mood: string, duration: number): Promise<string> {
  // Check if Jamendo client id is provided
  const keys = ApiKeysService.getKeys();
  if (keys.jamendo && keys.jamendo.trim().length > 5) {
    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${keys.jamendo.trim()}&format=json&limit=1&tags=${mood}&boost=popularity_month`;
      const res = await nativeFetch<{ results?: Array<{ audio: string }> }>(url);
      if (res.ok && res.data?.results?.[0]?.audio) {
        return res.data.results[0].audio;
      }
    } catch {
      // fallback
    }
  }

  // Synthesize a real Royalty-Free procedural beat / ambient lo-fi track using Web Audio API
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const sampleRate = audioCtx.sampleRate;
    const totalSamples = Math.floor(sampleRate * Math.max(5, duration));
    const buffer = audioCtx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = mood === 'hype' ? 140 : mood === 'upbeat' ? 120 : 90;
    const beatSec = 60 / bpm;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beatPos = (t % beatSec) / beatSec;

      // Kick on every beat
      let kick = 0;
      if (beatPos < 0.25) {
        const kickFreq = 120 * Math.exp(-beatPos * 25);
        kick = Math.sin(2 * Math.PI * kickFreq * beatPos) * Math.exp(-beatPos * 12) * 0.45;
      }

      // Snare on beat 2 and 4
      const measureBeat = Math.floor(t / beatSec) % 4;
      let snare = 0;
      if ((measureBeat === 1 || measureBeat === 3) && beatPos < 0.3) {
        const noise = (Math.random() * 2 - 1) * Math.exp(-beatPos * 14) * 0.25;
        snare = noise;
      }

      // Warm chord synth
      const chordRoot = 220; // A3
      const chord = (
        Math.sin(2 * Math.PI * chordRoot * t) +
        Math.sin(2 * Math.PI * (chordRoot * 1.25) * t) + // Major 3rd
        Math.sin(2 * Math.PI * (chordRoot * 1.5) * t)    // 5th
      ) * 0.06;

      const sample = (kick + snare + chord);
      left[i] = sample;
      right[i] = sample;
    }

    const wavBlob = audioBufferToWav(buffer);
    return URL.createObjectURL(wavBlob);
  } catch {
    return '';
  }
}

export async function resolveSoundEffects(sfxTypes: string[]): Promise<Record<string, string>> {
  const mixer = new AudioMixer();
  await mixer.init();
  const map: Record<string, string> = {};

  for (const sfx of sfxTypes) {
    const norm = sfx.toLowerCase().includes('pop') ? 'pop' :
                 sfx.toLowerCase().includes('hit') ? 'hit' :
                 sfx.toLowerCase().includes('ding') ? 'ding' : 'whoosh';
    const buffer = await mixer.generateProceduralSfx(norm);
    if (buffer) {
      const blob = audioBufferToWav(buffer);
      map[sfx] = URL.createObjectURL(blob);
    }
  }

  return map;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  const channels: Float32Array[] = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 0;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}
