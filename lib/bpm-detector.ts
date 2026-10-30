// Real Web Audio API BPM & Beat Peak Detector
// Analyzes audio energy peaks, computes tempo (BPM), and extracts beat timestamps

export interface BeatAnalysisResult {
  bpm: number;
  beats: number[]; // timestamps in seconds
  confidence: number;
  duration: number;
}

export async function detectAudioBpm(audioBuffer: AudioBuffer): Promise<BeatAnalysisResult> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // Mono or left channel
  const duration = audioBuffer.duration;

  // Downsample to ~4410 Hz for rapid offline analysis
  const downsampleFactor = Math.floor(sampleRate / 4410);
  const downsampledLength = Math.floor(channelData.length / downsampleFactor);
  const downsampled = new Float32Array(downsampledLength);
  for (let i = 0; i < downsampledLength; i++) {
    downsampled[i] = channelData[i * downsampleFactor];
  }

  // Lowpass filter simulation (moving average / simple exponential) to isolate kicks/bass
  const filtered = new Float32Array(downsampledLength);
  let lastVal = 0;
  const alpha = 0.15; // lowpass coefficient ~150Hz
  for (let i = 0; i < downsampledLength; i++) {
    lastVal = lastVal + alpha * (Math.abs(downsampled[i]) - lastVal);
    filtered[i] = lastVal;
  }

  // Peak detection with dynamic threshold
  const windowSize = Math.floor(4410 * 0.15); // 150ms window
  const peaks: number[] = [];
  const effectiveSampleRate = sampleRate / downsampleFactor;

  // Compute energy threshold
  let sum = 0;
  for (let i = 0; i < downsampledLength; i++) {
    sum += filtered[i];
  }
  const avgEnergy = sum / downsampledLength;
  const threshold = avgEnergy * 1.6;

  for (let i = windowSize; i < downsampledLength - windowSize; i++) {
    const val = filtered[i];
    if (val > threshold) {
      // Local maximum check
      let isMax = true;
      for (let j = -windowSize / 2; j <= windowSize / 2; j++) {
        if (filtered[i + Math.floor(j)] > val) {
          isMax = false;
          break;
        }
      }
      if (isMax) {
        const timeSec = i / effectiveSampleRate;
        // Ensure at least 0.22s (max ~270 BPM) between peaks
        if (peaks.length === 0 || timeSec - peaks[peaks.length - 1] > 0.22) {
          peaks.push(timeSec);
        }
      }
    }
  }

  // If no peaks found, fallback gracefully
  if (peaks.length < 4) {
    return {
      bpm: 120,
      beats: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
      confidence: 0.3,
      duration,
    };
  }

  // Calculate intervals between successive peaks
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const diff = peaks[i] - peaks[i - 1];
    if (diff >= 0.3 && diff <= 1.2) { // 50 BPM to 200 BPM
      intervals.push(diff);
    }
  }

  // Histogram of intervals grouped in 0.02s bins
  const bins = new Map<number, number>();
  intervals.forEach(interval => {
    const rounded = Math.round(interval * 50) / 50;
    bins.set(rounded, (bins.get(rounded) || 0) + 1);
  });

  let topInterval = 0.5;
  let topCount = 0;
  bins.forEach((count, interval) => {
    if (count > topCount) {
      topCount = count;
      topInterval = interval;
    }
  });

  let calculatedBpm = Math.round(60 / topInterval);
  // Normalize BPM to viral Shorts range (90 - 170 BPM)
  while (calculatedBpm < 85) calculatedBpm *= 2;
  while (calculatedBpm > 175) calculatedBpm = Math.round(calculatedBpm / 2);

  const confidence = Math.min(1.0, topCount / (intervals.length || 1) + 0.3);

  return {
    bpm: calculatedBpm,
    beats: peaks,
    confidence: Number(confidence.toFixed(2)),
    duration,
  };
}

export async function analyzeAudioBlob(blob: Blob): Promise<BeatAnalysisResult> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return await detectAudioBpm(audioBuffer);
  } finally {
    if (ctx.state !== 'closed') {
      await ctx.close().catch(() => {});
    }
  }
}
