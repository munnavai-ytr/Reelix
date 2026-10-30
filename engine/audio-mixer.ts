// Web Audio API Graph with Auto-Ducking and Loudness Normalization
import { EditPlan, AudioLayer } from './types';
import { isLayerActive, computeAudioDuckingVolume } from './timeline';

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private audioBuffers = new Map<string, AudioBuffer>();
  private activeNodes = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
  private isPlaying = false;

  async init(): Promise<void> {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async loadAudio(url: string): Promise<AudioBuffer | null> {
    if (this.audioBuffers.has(url)) {
      return this.audioBuffers.get(url)!;
    }
    await this.init();
    if (!this.ctx) return null;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(url, decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  syncPlayback(plan: EditPlan, currentTime: number): void {
    if (!this.ctx || this.ctx.state === 'suspended') return;

    // Filter audio layers
    const audioLayers = plan.layers.filter(l => l.type === 'audio') as AudioLayer[];

    for (const layer of audioLayers) {
      const isActive = isLayerActive(layer, currentTime);
      const buffer = this.audioBuffers.get(layer.src);

      if (isActive && buffer && !this.activeNodes.has(layer.id)) {
        // Start node at correct offset
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();

        const currentVol = computeAudioDuckingVolume(layer, currentTime, plan.layers);
        gain.gain.setValueAtTime(currentVol, this.ctx.currentTime);

        source.connect(gain);
        gain.connect(this.ctx.destination);

        const layerOffset = currentTime - layer.startTime + (layer.trimIn ?? 0);
        const durationLeft = Math.max(0.1, layer.duration - (currentTime - layer.startTime));

        source.start(0, Math.max(0, layerOffset), durationLeft);
        this.activeNodes.set(layer.id, { source, gain });

        source.onended = () => {
          this.activeNodes.delete(layer.id);
        };
      } else if (this.activeNodes.has(layer.id)) {
        if (!isActive) {
          // Stop node
          const node = this.activeNodes.get(layer.id);
          try {
            node?.source.stop();
          } catch {
            // ignore
          }
          this.activeNodes.delete(layer.id);
        } else {
          // Adjust volume dynamically
          const node = this.activeNodes.get(layer.id);
          if (node) {
            const currentVol = computeAudioDuckingVolume(layer, currentTime, plan.layers);
            node.gain.gain.setTargetAtTime(currentVol, this.ctx.currentTime, 0.05);
          }
        }
      }
    }
  }

  stopAll(): void {
    for (const [, node] of this.activeNodes) {
      try {
        node.source.stop();
      } catch {
        // ignore
      }
    }
    this.activeNodes.clear();
    this.isPlaying = false;
  }

  // Synthesize procedural SFX if no external audio is available
  async generateProceduralSfx(type: 'whoosh' | 'pop' | 'hit' | 'ding'): Promise<AudioBuffer | null> {
    await this.init();
    if (!this.ctx) return null;

    const sampleRate = this.ctx.sampleRate;
    let duration = 0.3;
    if (type === 'whoosh') duration = 0.45;
    if (type === 'hit') duration = 0.6;
    if (type === 'ding') duration = 0.8;

    const buffer = this.ctx.createBuffer(2, sampleRate * duration, sampleRate);
    const channel0 = buffer.getChannelData(0);
    const channel1 = buffer.getChannelData(1);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (type === 'whoosh') {
        const whiteNoise = (Math.random() * 2 - 1);
        const envelope = Math.sin((t / duration) * Math.PI);
        sample = whiteNoise * envelope * 0.4;
      } else if (type === 'pop') {
        const freq = 450 - (t / duration) * 350;
        const envelope = Math.exp(-t * 22);
        sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.6;
      } else if (type === 'hit') {
        const subFreq = 80 * Math.exp(-t * 8);
        const sub = Math.sin(2 * Math.PI * subFreq * t);
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.5;
        sample = (sub * 0.7 + noise) * Math.exp(-t * 4);
      } else if (type === 'ding') {
        const bell = Math.sin(2 * Math.PI * 1760 * t) + 0.4 * Math.sin(2 * Math.PI * 3520 * t);
        sample = bell * Math.exp(-t * 4) * 0.5;
      }

      channel0[i] = sample;
      channel1[i] = sample;
    }

    return buffer;
  }
}
