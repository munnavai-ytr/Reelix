// Real Runtime Hardware & Browser Capability Prober
// Inspects WebCodecs, WebGPU, Web Audio, OPFS, WebGL, and Haptics

export interface DeviceCapabilities {
  webCodecs: boolean;
  webGpu: boolean;
  webGl2: boolean;
  webAudio: boolean;
  opfs: boolean;
  haptics: boolean;
  maxTextureSize: number;
  memoryGb?: number;
  cpuCores?: number;
  platform: string;
  isCapacitor: boolean;
}

export class DeviceProber {
  static async probe(): Promise<DeviceCapabilities> {
    if (typeof window === 'undefined') {
      return {
        webCodecs: false,
        webGpu: false,
        webGl2: false,
        webAudio: false,
        opfs: false,
        haptics: false,
        maxTextureSize: 0,
        platform: 'server',
        isCapacitor: false,
      };
    }

    const webCodecs = typeof (window as any).VideoEncoder !== 'undefined' && typeof (window as any).VideoFrame !== 'undefined';
    const webGpu = typeof (navigator as any).gpu !== 'undefined';
    const webAudio = typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';

    let opfs = false;
    try {
      opfs = typeof navigator.storage?.getDirectory === 'function';
    } catch {
      opfs = false;
    }

    const haptics = typeof navigator.vibrate === 'function' || !!(window as any).Capacitor?.isPluginAvailable('Haptics');
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();

    let webGl2 = false;
    let maxTextureSize = 0;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        webGl2 = true;
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
      }
    } catch {
      webGl2 = false;
    }

    const memoryGb = (navigator as any).deviceMemory || undefined;
    const cpuCores = navigator.hardwareConcurrency || undefined;
    const platform = navigator.userAgent.includes('Android')
      ? 'Android'
      : navigator.userAgent.includes('iPhone')
      ? 'iOS'
      : 'Desktop Web';

    return {
      webCodecs,
      webGpu,
      webGl2,
      webAudio,
      opfs,
      haptics,
      maxTextureSize,
      memoryGb,
      cpuCores,
      platform,
      isCapacitor,
    };
  }
}
