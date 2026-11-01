// Web Audio API Graph with Auto-Ducking and Loudness Normalization
import { EditPlan, AudioLayer } from './types';
import { computeAudioDuckingVolume } from './timeline';
import { resolveSrc } from './media';

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private audioBuffers = new Map<string, AudioBuffer>();
  private activeNodes = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
  private isPlaying = false;

  async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async loadAudio(url: string): Promise<AudioBuffer | null> {
    if (!url) return null;
    if (this.audioBuffers.has(url)) {
      return this.audioBuffers.get(url)!;
    }
    await this.init();
    if (!this.ctx) return null;

    try {
      const resolved = await resolveSrc(url);
      if (!resolved) return null;
      const response = await fetch(resolved);
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(url, decoded);
      if (resolved !== url) {
        this.audioBuffers.set(resolved, decoded);
      }
      return decoded;
    } catch (err) {
      console.warn('AudioMixer loadAudio error:', url, err);
      return null;
    }
  }

  async play(plan: EditPlan, fromTime: number): Promise<void> {
    await this.init();
    if (!this.ctx) return;
    this.stopAll();
    this.isPlaying = true;

    const audioLayers = plan.layers.filter(
      (l) => l.type === 'audio' && (l as AudioLayer).src
    ) as AudioLayer[];

    const baseCtxTime = this.ctx.currentTime;

    for (const layer of audioLayers) {
      const layerEnd = layer.startTime + layer.duration;
      if (layerEnd <= fromTime) continue;

      let buffer = this.audioBuffers.get(layer.src);
      if (!buffer) {
        buffer = await this.loadAudio(layer.src);
      }
      if (!buffer) continue;

      const delaySec = Math.max(0, layer.startTime - fromTime);
      const startCtxTime = baseCtxTime + delaySec;

      const offsetInLayer = Math.max(0, fromTime - layer.startTime) + (layer.trimIn ?? 0);
      const durationLeft = Math.max(0.05, layer.duration - Math.max(0, fromTime - layer.startTime));

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, startCtxTime);

      // Automate ducking volume
      const steps = Math.min(200, Math.ceil(durationLeft / 0.1));
      for (let s = 0; s <= steps; s++) {
        const checkTime = fromTime + delaySec + s * 0.1;
        const targetVol = computeAudioDuckingVolume(layer, checkTime, plan.layers);
        const rampTime = startCtxTime + s * 0.1;
        if (s === 0) {
          gain.gain.setValueAtTime(Math.max(0.001, targetVol), rampTime);
        } else {
          gain.gain.linearRampToValueAtTime(Math.max(0.001, targetVol), rampTime);
        }
      }

      source.connect(gain);
      gain.connect(this.ctx.destination);

      try {
        source.start(startCtxTime, offsetInLayer, durationLeft);
        this.activeNodes.set(layer.id, { source, gain });
        source.onended = () => {
          this.activeNodes.delete(layer.id);
        };
      } catch (e) {
        console.warn('Failed to start audio source:', layer.id, e);
      }
    }
  }

  stopAll(): void {
    for (const [, node] of this.activeNodes) {
      try {
        node.source.stop();
        node.source.disconnect();
        node.gain.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeNodes.clear();
    this.isPlaying = false;
  }
}
