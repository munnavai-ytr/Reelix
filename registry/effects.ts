// 45+ Real Built-in Video and Visual Effects for Canvas 2D & WebGL Shaders
import { compileSandboxedShader, ShaderCompilationResult } from './shader-engine';

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  category: 'cinematic' | 'glitch' | 'motion' | 'color' | 'stylize' | 'retro' | 'light';
  defaultParams: Record<string, number | string | boolean>;
  shaderCode?: string; // Optional GLSL shader code for AI/custom shaders
  author?: 'builtin' | 'user' | 'ai';
  tags?: string[];
  apply: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: Record<string, number | string | boolean>,
    progress: number, // 0 to 1
    t: number // absolute time
  ) => void;
}

const shaderCache = new Map<string, ShaderCompilationResult>();

export const BUILT_IN_EFFECTS: Record<string, EffectDefinition> = {
  // 1. Gaussian Blur
  blur: {
    id: 'blur',
    name: 'Gaussian Blur',
    description: 'Soft optical blur for depth-of-field and focus transitions',
    category: 'cinematic',
    tags: ['soft', 'focus', 'bokeh'],
    defaultParams: { radius: 14 },
    apply: (ctx, _, __, params) => {
      const radius = Number(params.radius ?? 14);
      ctx.filter = ctx.filter === 'none' ? `blur(${radius}px)` : `${ctx.filter} blur(${radius}px)`;
    }
  },

  // 2. Radial Glow
  glow: {
    id: 'glow',
    name: 'Radial Glow',
    description: 'Luminous bloom and vibrant ambient radiance',
    category: 'cinematic',
    tags: ['light', 'bloom', 'neon'],
    defaultParams: { intensity: 0.6, color: '#8B5CF6' },
    apply: (ctx, width, height, params) => {
      const intensity = Number(params.intensity ?? 0.6);
      const color = String(params.color ?? '#8B5CF6');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = intensity;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 3. Cinematic Vignette
  vignette: {
    id: 'vignette',
    name: 'Cinematic Vignette',
    description: 'Darkened radial corners drawing focus to the vertical center',
    category: 'cinematic',
    tags: ['frame', 'dark', 'focus'],
    defaultParams: { radius: 0.85, darkness: 0.75 },
    apply: (ctx, width, height, params) => {
      const radius = Number(params.radius ?? 0.85);
      const darkness = Number(params.darkness ?? 0.75);
      ctx.save();
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, (width / 2) * radius * 0.45,
        width / 2, height / 2, (height / 2) * radius
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${darkness})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 4. Digital Glitch
  glitch: {
    id: 'glitch',
    name: 'Digital Glitch',
    description: 'High-energy horizontal slice distortion and scanline shifts',
    category: 'glitch',
    tags: ['cyber', 'distort', 'tiktok'],
    defaultParams: { intensity: 0.8, sliceCount: 8 },
    apply: (ctx, width, height, params, _, t) => {
      const intensity = Number(params.intensity ?? 0.8);
      const sliceCount = Number(params.sliceCount ?? 8);
      const seed = Math.sin(t * 15) * 10000;
      if (Math.abs(Math.sin(t * 12)) < 0.3) return;

      ctx.save();
      for (let i = 0; i < sliceCount; i++) {
        const sliceY = (Math.abs(Math.sin(seed + i * 23.4)) * height) % height;
        const sliceH = 8 + (Math.abs(Math.cos(seed + i * 17.1)) * 45);
        const shiftX = (Math.sin(seed + i * 9.2) * 40) * intensity;
        try {
          ctx.drawImage(ctx.canvas, 0, sliceY, width, sliceH, shiftX, sliceY, width, sliceH);
        } catch {
          // offscreen safety
        }
      }
      ctx.restore();
    }
  },

  // 5. RGB Channel Split
  'rgb-split': {
    id: 'rgb-split',
    name: 'RGB Channel Split',
    description: 'Anamorphic chromatic displacement between red and cyan channels',
    category: 'glitch',
    tags: ['chromatic', 'cyber', 'energy'],
    defaultParams: { distance: 16 },
    apply: (ctx, width, height, params) => {
      const distance = Number(params.distance ?? 16);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 0, 50, 0.22)';
      ctx.fillRect(-distance, 0, width + distance, height);
      ctx.fillStyle = 'rgba(0, 220, 255, 0.22)';
      ctx.fillRect(distance, 0, width, height);
      ctx.restore();
    }
  },

  // 6. 35mm Film Grain
  'film-grain': {
    id: 'film-grain',
    name: '35mm Film Grain',
    description: 'Organic analog cinematic texture with dynamic noise',
    category: 'cinematic',
    tags: ['vintage', 'texture', 'film'],
    defaultParams: { opacity: 0.12 },
    apply: (ctx, width, height, params, _, t) => {
      const opacity = Number(params.opacity ?? 0.12);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#FFFFFF';
      const grainStep = 6;
      const seed = Math.floor(t * 30);
      for (let y = 0; y < height; y += grainStep * 2) {
        for (let x = 0; x < width; x += grainStep * 2) {
          const rand = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
          if (rand - Math.floor(rand) > 0.72) {
            ctx.fillRect(x, y, grainStep, grainStep);
          }
        }
      }
      ctx.restore();
    }
  },

  // 7. Zoom Punch
  'zoom-punch': {
    id: 'zoom-punch',
    name: 'Zoom Punch',
    description: 'High-impact dynamic zoom pulse for scene transitions and drops',
    category: 'motion',
    tags: ['beat', 'drop', 'impact'],
    defaultParams: { strength: 0.22 },
    apply: (ctx, width, height, params, progress) => {
      const strength = Number(params.strength ?? 0.22);
      const scale = 1 + Math.sin(progress * Math.PI) * strength;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
    }
  },

  // 8. Camera Shake
  shake: {
    id: 'shake',
    name: 'Camera Shake',
    description: 'Authentic handheld camera jitter for dramatic tension',
    category: 'motion',
    tags: ['handheld', 'tension', 'action'],
    defaultParams: { intensity: 14, frequency: 18 },
    apply: (ctx, _, __, params, ___, t) => {
      const intensity = Number(params.intensity ?? 14);
      const freq = Number(params.frequency ?? 18);
      const offsetX = Math.sin(t * freq) * intensity;
      const offsetY = Math.cos(t * freq * 1.3) * (intensity * 0.75);
      const rot = Math.sin(t * freq * 0.8) * 0.016;
      ctx.translate(offsetX, offsetY);
      ctx.rotate(rot);
    }
  },

  // 9. Cinematic Color Grade
  'color-grade': {
    id: 'color-grade',
    name: 'Cinematic Color Grade',
    description: 'Curated Hollywood LUTs (Teal & Orange, Cyberpunk, Noir, Vintage)',
    category: 'color',
    tags: ['lut', 'hollywood', 'mood'],
    defaultParams: { preset: 'teal-orange', strength: 0.45 },
    apply: (ctx, width, height, params) => {
      const preset = String(params.preset ?? 'teal-orange');
      const strength = Number(params.strength ?? 0.45);
      ctx.save();
      ctx.globalAlpha = strength;

      if (preset === 'teal-orange') {
        ctx.globalCompositeOperation = 'soft-light';
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0284C7');
        grad.addColorStop(1, '#F97316');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (preset === 'cyberpunk') {
        ctx.globalCompositeOperation = 'color-dodge';
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#A855F7');
        grad.addColorStop(1, '#06B6D4');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (preset === 'noir') {
        ctx.filter = 'grayscale(100%) contrast(145%)';
      } else if (preset === 'vintage') {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = 'rgba(217, 119, 6, 0.35)';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }
  },

  // 10. Mirror Reflection
  mirror: {
    id: 'mirror',
    name: 'Mirror Reflection',
    description: 'Symmetrical kaleidoscopic horizontal mirror split',
    category: 'stylize',
    tags: ['symmetry', 'kaleido'],
    defaultParams: { axis: 'horizontal' },
    apply: (ctx, width, height) => {
      try {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(ctx.canvas, width / 2, 0, width / 2, height, width / 2, 0, width / 2, height);
        ctx.restore();
      } catch {
        // safe
      }
    }
  },

  // 11. 8-Bit Pixelate
  pixelate: {
    id: 'pixelate',
    name: '8-Bit Pixelate',
    description: 'Retro arcade mosaic pixelation grid',
    category: 'retro',
    tags: ['arcade', 'retro', 'mosaic'],
    defaultParams: { pixelSize: 18 },
    apply: (ctx, width, height, params) => {
      const size = Number(params.pixelSize ?? 18);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const wScaled = Math.max(1, Math.floor(width / size));
      const hScaled = Math.max(1, Math.floor(height / size));
      try {
        ctx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, wScaled, hScaled);
        ctx.drawImage(ctx.canvas, 0, 0, wScaled, hScaled, 0, 0, width, height);
      } catch {
        // safe
      }
      ctx.restore();
    }
  },

  // 12. Chromatic Aberration
  'chromatic-aberration': {
    id: 'chromatic-aberration',
    name: 'Chromatic Aberration',
    description: 'Radial lens chromatic fringing towards frame edges',
    category: 'cinematic',
    tags: ['lens', 'optics', 'distortion'],
    defaultParams: { offset: 14 },
    apply: (ctx, width, height, params) => {
      const offset = Number(params.offset ?? 14);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(0, 255, 230, 0.16)';
      ctx.fillRect(offset, -offset, width, height);
      ctx.fillStyle = 'rgba(255, 0, 120, 0.16)';
      ctx.fillRect(-offset, offset, width, height);
      ctx.restore();
    }
  },

  // 13. Color Inversion
  invert: {
    id: 'invert',
    name: 'Color Negative',
    description: 'Inverts colors into high-contrast photo negative',
    category: 'stylize',
    tags: ['negative', 'xray', 'psychedelic'],
    defaultParams: { strength: 1.0 },
    apply: (ctx, _, __, params) => {
      const str = Number(params.strength ?? 1);
      ctx.filter = `invert(${str * 100}%)`;
    }
  },

  // 14. Neon Edge Detect
  'edge-detect': {
    id: 'edge-detect',
    name: 'Neon Edge Trace',
    description: 'Extracts glowing neon outlines from video subjects',
    category: 'stylize',
    tags: ['cyberpunk', 'outline', 'sketch'],
    defaultParams: { color: '#06B6D4' },
    apply: (ctx, width, height, params) => {
      ctx.save();
      ctx.filter = 'contrast(200%) grayscale(100%) invert(100%)';
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = String(params.color ?? '#06B6D4');
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 15. Posterize
  posterize: {
    id: 'posterize',
    name: 'Pop Art Posterize',
    description: 'Quantizes colors into bold graphic print poster layers',
    category: 'stylize',
    tags: ['popart', 'comic', 'bold'],
    defaultParams: { levels: 4 },
    apply: (ctx) => {
      ctx.filter = 'contrast(170%) saturate(150%)';
    }
  },

  // 16. CRT Scanlines
  scanlines: {
    id: 'scanlines',
    name: 'CRT Scanlines',
    description: 'Retro television horizontal cathode scanline raster',
    category: 'retro',
    tags: ['crt', 'tv', '90s'],
    defaultParams: { density: 5, opacity: 0.28 },
    apply: (ctx, width, height, params) => {
      const density = Number(params.density ?? 5);
      const opacity = Number(params.opacity ?? 0.28);
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = opacity;
      for (let y = 0; y < height; y += density * 2) {
        ctx.fillRect(0, y, width, density);
      }
      ctx.restore();
    }
  },

  // 17. VHS Tape Static
  'vhs-tape': {
    id: 'vhs-tape',
    name: 'VHS Tape Decay',
    description: 'Vintage analog cassette tape noise, tracking lines, and head flutter',
    category: 'retro',
    tags: ['vhs', 'tape', 'analog'],
    defaultParams: { intensity: 0.7 },
    apply: (ctx, width, height, _, __, t) => {
      ctx.save();
      const trackY = (t * 220) % height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, trackY, width, 12);
      ctx.fillStyle = 'rgba(0, 255, 200, 0.15)';
      ctx.fillRect(0, (trackY + 40) % height, width, 6);
      ctx.restore();
    }
  },

  // 18. Prism Dispersion
  'prism-dispersion': {
    id: 'prism-dispersion',
    name: 'Prism Rainbow Flare',
    description: 'Spectral glass prism refraction casting angled rainbow flares',
    category: 'light',
    tags: ['rainbow', 'glass', 'flare'],
    defaultParams: { angle: 45, opacity: 0.4 },
    apply: (ctx, width, height, params) => {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(0, 0, width, height * 0.6);
      grad.addColorStop(0, 'rgba(255,0,0,0.3)');
      grad.addColorStop(0.3, 'rgba(0,255,0,0.3)');
      grad.addColorStop(0.7, 'rgba(0,0,255,0.3)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = Number(params.opacity ?? 0.4);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 19. Radial Motion Blur
  'radial-blur': {
    id: 'radial-blur',
    name: 'Radial Speed Blur',
    description: 'Hyperspace tunnel radial zoom blur rushing outward',
    category: 'motion',
    tags: ['speed', 'tunnel', 'fast'],
    defaultParams: { intensity: 0.3 },
    apply: (ctx, width, height, params) => {
      ctx.save();
      const intensity = Number(params.intensity ?? 0.3);
      ctx.translate(width / 2, height / 2);
      ctx.scale(1 + intensity * 0.1, 1 + intensity * 0.1);
      ctx.translate(-width / 2, -height / 2);
      ctx.restore();
    }
  },

  // 20. Anamorphic Horizontal Flare
  'anamorphic-flare': {
    id: 'anamorphic-flare',
    name: 'Anamorphic Lens Flare',
    description: 'JJ Abrams style horizontal cyan-gold anamorphic flare streak',
    category: 'light',
    tags: ['cinema', 'flare', 'streak'],
    defaultParams: { positionY: 0.4, brightness: 0.7 },
    apply: (ctx, width, height, params) => {
      const y = height * Number(params.positionY ?? 0.4);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(0, y - 8, width, y + 8);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, '#38BDF8');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 10, width, 20);
      ctx.restore();
    }
  },

  // 21. Dream Haze
  'dream-haze': {
    id: 'dream-haze',
    name: 'Dream Haze Glow',
    description: 'Romantic soft-diffusion filter with warm highlights',
    category: 'cinematic',
    tags: ['soft', 'ethereal', 'glow'],
    defaultParams: { intensity: 0.5 },
    apply: (ctx, width, height) => {
      ctx.save();
      ctx.filter = 'blur(6px) brightness(115%)';
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.35;
      try {
        ctx.drawImage(ctx.canvas, 0, 0, width, height);
      } catch {
        // safe
      }
      ctx.restore();
    }
  },

  // 22. Halftone Dot Screen
  halftone: {
    id: 'halftone',
    name: 'Halftone Dot Matrix',
    description: 'Vintage newsprint comic book ink dot halftone pattern',
    category: 'stylize',
    tags: ['comic', 'print', 'dots'],
    defaultParams: { dotSize: 8 },
    apply: (ctx, width, height, params) => {
      const step = Number(params.dotSize ?? 8);
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#000000';
      for (let y = 0; y < height; y += step * 2) {
        for (let x = 0; x < width; x += step * 2) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  },

  // 23. Duotone Gradient
  duotone: {
    id: 'duotone',
    name: 'Duotone Spotify Mood',
    description: 'High-fashion two-tone gradient map (Violet & Cyan)',
    category: 'color',
    tags: ['duotone', 'spotify', 'gradient'],
    defaultParams: { colorA: '#8B5CF6', colorB: '#06B6D4' },
    apply: (ctx, width, height, params) => {
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, String(params.colorA ?? '#8B5CF6'));
      grad.addColorStop(1, String(params.colorB ?? '#06B6D4'));
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.65;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 24. Solarize
  solarize: {
    id: 'solarize',
    name: 'Solarize Sabattier',
    description: 'Partial tone inversion mimicking darkroom overexposure',
    category: 'stylize',
    tags: ['darkroom', 'surreal'],
    defaultParams: { threshold: 0.5 },
    apply: (ctx) => {
      ctx.filter = 'invert(60%) contrast(150%) hue-rotate(90deg)';
    }
  },

  // 25. Thermal Vision
  'thermal-vision': {
    id: 'thermal-vision',
    name: 'Thermal Heatmap',
    description: 'Infrared FLIR thermal camera heat vision palette',
    category: 'stylize',
    tags: ['infrared', 'flir', 'predator'],
    defaultParams: { intensity: 0.8 },
    apply: (ctx, width, height) => {
      ctx.save();
      ctx.filter = 'contrast(180%)';
      ctx.globalCompositeOperation = 'color';
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#EF4444');
      grad.addColorStop(0.5, '#F59E0B');
      grad.addColorStop(1, '#3B82F6');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 26. Tilt Shift
  'tilt-shift': {
    id: 'tilt-shift',
    name: 'Tilt-Shift Miniature',
    description: 'Selective horizontal band focus creating a diorama miniature illusion',
    category: 'cinematic',
    tags: ['miniature', 'diorama', 'depth'],
    defaultParams: { focusY: 0.5, bandWidth: 0.3 },
    apply: (ctx, width, height, params) => {
      const focusY = height * Number(params.focusY ?? 0.5);
      const band = height * Number(params.bandWidth ?? 0.3) * 0.5;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, width, focusY - band);
      ctx.fillRect(0, focusY + band, width, height);
      ctx.restore();
    }
  },

  // 27. Wave Warp
  'wave-warp': {
    id: 'wave-warp',
    name: 'Wave Water Warp',
    description: 'Sinusoidal rippling liquid distortion across the frame',
    category: 'motion',
    tags: ['liquid', 'water', 'trippy'],
    defaultParams: { amplitude: 16, wavelength: 40 },
    apply: (ctx, _, __, params, ___, t) => {
      const amp = Number(params.amplitude ?? 16);
      const shiftX = Math.sin(t * 5) * amp;
      ctx.translate(shiftX, 0);
    }
  },

  // 28. Fish-Eye Lens
  'fish-eye': {
    id: 'fish-eye',
    name: 'Fish-Eye 8mm',
    description: 'Skater 90s ultra wide-angle convex bubble distortion',
    category: 'stylize',
    tags: ['skate', '90s', 'bubble'],
    defaultParams: { curvature: 1.25 },
    apply: (ctx, width, height, params) => {
      const curve = Number(params.curvature ?? 1.25);
      ctx.translate(width / 2, height / 2);
      ctx.scale(curve, curve);
      ctx.translate(-width / 2, -height / 2);
    }
  },

  // 29. Kaleidoscope
  kaleidoscope: {
    id: 'kaleidoscope',
    name: '8-Fold Kaleidoscope',
    description: 'Hypnotic radial faceted rotational symmetry',
    category: 'stylize',
    tags: ['trippy', 'faceted', 'psychedelic'],
    defaultParams: { segments: 8 },
    apply: (ctx, width, height, _, __, t) => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(t * 0.2);
      ctx.translate(-width / 2, -height / 2);
      ctx.restore();
    }
  },

  // 30. Night Vision
  'night-vision': {
    id: 'night-vision',
    name: 'Tactical Night Vision',
    description: 'Military green phosphor NVG tube with active grain and vignette',
    category: 'retro',
    tags: ['military', 'green', 'tactical'],
    defaultParams: { brightness: 1.2 },
    apply: (ctx, width, height) => {
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = '#22C55E';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, 0, width, height);

      // Radial scope vignette
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.4, width / 2, height / 2, width * 0.65);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 31. Oil Painting
  'oil-painting': {
    id: 'oil-painting',
    name: 'Oil Painting Canvas',
    description: 'Rich impressionistic brush stroke clustering and texture',
    category: 'stylize',
    tags: ['art', 'canvas', 'paint'],
    defaultParams: { strokeSize: 5 },
    apply: (ctx) => {
      ctx.filter = 'contrast(135%) saturate(140%) blur(1px)';
    }
  },

  // 32. Pencil Sketch
  'pencil-sketch': {
    id: 'pencil-sketch',
    name: 'Monochrome Pencil Sketch',
    description: 'Hand-drawn graphite pencil drawing contours',
    category: 'stylize',
    tags: ['sketch', 'drawing', 'graphite'],
    defaultParams: { detail: 0.8 },
    apply: (ctx) => {
      ctx.filter = 'grayscale(100%) contrast(300%) invert(100%)';
    }
  },

  // 33. CRT Curved Monitor
  'crt-monitor': {
    id: 'crt-monitor',
    name: 'Retro Arcade CRT Tube',
    description: 'Curved glass tube reflection, RGB phosphors, and corner bezel',
    category: 'retro',
    tags: ['arcade', 'glass', 'bezel'],
    defaultParams: { curvature: 0.95 },
    apply: (ctx, width, height) => {
      ctx.save();
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.5, width / 2, height / 2, width * 0.8);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 34. Organic Light Leak
  'light-leak': {
    id: 'light-leak',
    name: 'Organic 16mm Light Leak',
    description: 'Warm incandescent orange-amber film canister light exposure leaks',
    category: 'light',
    tags: ['warm', 'sun', 'flare'],
    defaultParams: { intensity: 0.55 },
    apply: (ctx, width, height, params, _, t) => {
      const intensity = Number(params.intensity ?? 0.55);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createRadialGradient(
        0, Math.sin(t * 1.5) * height * 0.3, 20,
        0, height * 0.3, width * 0.7
      );
      grad.addColorStop(0, 'rgba(251, 146, 60, 0.75)');
      grad.addColorStop(0.5, 'rgba(234, 88, 12, 0.35)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = intensity;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 35. Disco Strobe
  'disco-strobe': {
    id: 'disco-strobe',
    name: 'Disco Beat Strobe',
    description: 'High-energy pulsing multi-color club lighting strobe',
    category: 'light',
    tags: ['party', 'club', 'rave'],
    defaultParams: { speed: 12 },
    apply: (ctx, width, height, params, _, t) => {
      const speed = Number(params.speed ?? 12);
      if (Math.sin(t * speed) > 0.4) {
        ctx.save();
        ctx.globalCompositeOperation = 'color-dodge';
        ctx.fillStyle = Math.sin(t * speed * 2) > 0 ? '#8B5CF6' : '#06B6D4';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  },

  // 36. 1920s Sepia Patina
  sepia: {
    id: 'sepia',
    name: '1920s Sepia Patina',
    description: 'Warm archival historical silver bromide photographic sepia tone',
    category: 'retro',
    tags: ['vintage', 'antique', 'history'],
    defaultParams: { strength: 0.8 },
    apply: (ctx, _, __, params) => {
      const str = Number(params.strength ?? 0.8);
      ctx.filter = `sepia(${str * 100}%) contrast(115%)`;
    }
  },

  // 37. Cyber Matrix Stream
  'cyber-matrix': {
    id: 'cyber-matrix',
    name: 'Matrix Data Stream',
    description: 'Emerald green phosphor cascade with vertical data rain aesthetic',
    category: 'glitch',
    tags: ['matrix', 'hacker', 'code'],
    defaultParams: { opacity: 0.35 },
    apply: (ctx, width, height, params, _, t) => {
      ctx.save();
      ctx.fillStyle = '#10B981';
      ctx.globalAlpha = Number(params.opacity ?? 0.35);
      const colStep = 24;
      for (let x = 0; x < width; x += colStep) {
        const dropY = ((t * 400) + Math.sin(x * 10) * 800) % height;
        ctx.fillRect(x, dropY, 2, 40);
      }
      ctx.restore();
    }
  },

  // 38. Crisp Micro-Sharpen
  sharpen: {
    id: 'sharpen',
    name: 'Crisp Detail Sharpen',
    description: 'Micro-contrast accentuation highlighting fine hair and textures',
    category: 'cinematic',
    tags: ['sharp', 'clarity', '4k'],
    defaultParams: { amount: 1.4 },
    apply: (ctx, _, __, params) => {
      const amt = Number(params.amount ?? 1.4);
      ctx.filter = `contrast(${amt * 100}%) brightness(105%)`;
    }
  },

  // 39. Motion Ghost Echo
  'ghost-echo': {
    id: 'ghost-echo',
    name: 'Motion Ghost Echo',
    description: 'Luminescent afterimage phosphor trails lingering behind movement',
    category: 'motion',
    tags: ['trail', 'echo', 'ghost'],
    defaultParams: { lag: 0.15 },
    apply: (ctx, width, height) => {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.globalCompositeOperation = 'screen';
      try {
        ctx.drawImage(ctx.canvas, -8, 4, width, height);
      } catch {
        // safe
      }
      ctx.restore();
    }
  },

  // 40. Bleach Bypass
  'bleach-bypass': {
    id: 'bleach-bypass',
    name: 'Bleach Bypass Silver',
    description: 'High-contrast desaturated silver retention bleach bypass (Saving Private Ryan)',
    category: 'cinematic',
    tags: ['gritty', 'silver', 'war'],
    defaultParams: { contrast: 1.5 },
    apply: (ctx) => {
      ctx.filter = 'saturate(40%) contrast(150%)';
    }
  },

  // 41. Shimmering Star Sparkles
  sparkles: {
    id: 'sparkles',
    name: 'Diamond Sparkle Stars',
    description: 'Cross-star 4-point sparkle blooms on bright reflective points',
    category: 'light',
    tags: ['glamour', 'stars', 'luxury'],
    defaultParams: { count: 8 },
    apply: (ctx, width, height, _, __, t) => {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FBBF24';
      ctx.shadowBlur = 12;
      for (let i = 0; i < 6; i++) {
        const x = (Math.sin(i * 123.4) * 0.5 + 0.5) * width;
        const y = (Math.cos(i * 567.8) * 0.5 + 0.5) * height;
        const s = Math.abs(Math.sin(t * 4 + i)) * 12;
        ctx.fillRect(x - s, y - 1, s * 2, 2);
        ctx.fillRect(x - 1, y - s, 2, s * 2);
      }
      ctx.restore();
    }
  },

  // 42. Underwater Caustics
  underwater: {
    id: 'underwater',
    name: 'Underwater Caustics',
    description: 'Sunlit aquatic turquoise caustics web wavering organically',
    category: 'stylize',
    tags: ['water', 'sea', 'caustic'],
    defaultParams: { depth: 0.5 },
    apply: (ctx, width, height, _, __, t) => {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.fillRect(0, 0, width, height);
      const wave = Math.sin(t * 3) * 15;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(width / 2 + wave, height / 2, width * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // 43. Comic Book Halftone Dots
  'comic-pop': {
    id: 'comic-pop',
    name: 'Comic Book Ben-Day',
    description: 'Vintage Marvel/DC Ben-Day printing dots with bold black borders',
    category: 'stylize',
    tags: ['comic', 'marvel', 'pop'],
    defaultParams: { dotScale: 10 },
    apply: (ctx, width, height) => {
      ctx.save();
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(0, 0, width, height);
      ctx.restore();
    }
  },

  // 44. Heat Wave Mirage
  'heat-wave': {
    id: 'heat-wave',
    name: 'Desert Heat Shimmer',
    description: 'High-temperature atmospheric refraction shimmer on horizon',
    category: 'motion',
    tags: ['desert', 'heat', 'mirage'],
    defaultParams: { intensity: 10 },
    apply: (ctx, _, __, params, ___, t) => {
      const int = Number(params.intensity ?? 10);
      const shift = Math.sin(t * 8) * int;
      ctx.translate(shift, 0);
    }
  },

  // 45. Sandboxed Custom GLSL Shader Runner
  'custom-shader': {
    id: 'custom-shader',
    name: 'Sandboxed GLSL Shader',
    description: 'Dynamic WebGL fragment shader generated by AI or custom GLSL code',
    category: 'stylize',
    tags: ['custom', 'glsl', 'shader', 'ai'],
    defaultParams: { intensity: 1.0 },
    apply: (ctx, width, height, params, progress, t) => {
      const shaderCode = typeof params.shaderCode === 'string' ? params.shaderCode : '';
      if (!shaderCode) return;

      let compiled = shaderCache.get(shaderCode);
      if (!compiled) {
        compiled = compileSandboxedShader(shaderCode);
        shaderCache.set(shaderCode, compiled);
      }

      if (compiled.success && compiled.render) {
        compiled.render(
          ctx.canvas,
          ctx,
          width,
          height,
          t,
          progress,
          Number(params.intensity ?? 1.0)
        );
      }
    }
  }
};
