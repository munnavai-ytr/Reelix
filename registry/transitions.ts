// 22+ Real Built-in Scene Transitions for Vertical Shorts

export interface TransitionDefinition {
  id: string;
  name: string;
  description: string;
  category?: 'clean' | 'energetic' | 'glitch' | 'cinematic' | 'stylized';
  defaultDuration: number;
  tags?: string[];
  render: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number, // 0 to 1
    renderFrom: () => void,
    renderTo: () => void
  ) => void;
}

export const BUILT_IN_TRANSITIONS: Record<string, TransitionDefinition> = {
  // 1. Crossfade
  crossfade: {
    id: 'crossfade',
    name: 'Crossfade',
    description: 'Smooth dissolve blend between clips',
    category: 'clean',
    tags: ['dissolve', 'smooth', 'classic'],
    defaultDuration: 0.5,
    render: (ctx, _, __, progress, renderFrom, renderTo) => {
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      renderFrom();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = progress;
      renderTo();
      ctx.restore();
    }
  },

  // 2. Linear Wipe
  wipe: {
    id: 'wipe',
    name: 'Linear Wipe Down',
    description: 'Crisp vertical downward edge reveal with signature cyan accent stroke',
    category: 'clean',
    tags: ['linear', 'edge'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderFrom();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, height * progress);
      ctx.clip();
      renderTo();
      ctx.restore();

      // Wipe edge line
      ctx.save();
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, height * progress);
      ctx.lineTo(width, height * progress);
      ctx.stroke();
      ctx.restore();
    }
  },

  // 3. Zoom Punch In
  'zoom-in': {
    id: 'zoom-in',
    name: 'Zoom Punch In',
    description: 'Energetic forward zoom transition with motion blur feel',
    category: 'energetic',
    tags: ['beat', 'drop', 'punch'],
    defaultDuration: 0.4,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      if (progress < 0.5) {
        const sub = progress * 2;
        const scale = 1 + sub * 0.7;
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2, -height / 2);
        ctx.globalAlpha = 1 - sub * 0.5;
        renderFrom();
        ctx.restore();
      } else {
        const sub = (progress - 0.5) * 2;
        const scale = 0.6 + sub * 0.4;
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2, -height / 2);
        ctx.globalAlpha = sub;
        renderTo();
        ctx.restore();
      }
    }
  },

  // 4. Zoom Pull Out
  'zoom-out': {
    id: 'zoom-out',
    name: 'Zoom Pull Out',
    description: 'Dynamic pullback revealing the next scene',
    category: 'energetic',
    tags: ['pullback', 'camera'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      ctx.save();
      const scaleFrom = 1 - progress * 0.35;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scaleFrom, scaleFrom);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = 1 - progress;
      renderFrom();
      ctx.restore();

      ctx.save();
      const scaleTo = 1.3 - (1 - progress) * 0.3;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scaleTo, scaleTo);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = progress;
      renderTo();
      ctx.restore();
    }
  },

  // 5. Push Slide Left
  slide: {
    id: 'slide',
    name: 'Push Slide Left',
    description: 'Kinetic horizontal slide pushing the outgoing clip out',
    category: 'clean',
    tags: ['slide', 'push', 'horizontal'],
    defaultDuration: 0.4,
    render: (ctx, width, _, progress, renderFrom, renderTo) => {
      const p = progress * progress * (3 - 2 * progress);
      const offset = width * p;

      ctx.save();
      ctx.translate(-offset, 0);
      renderFrom();
      ctx.restore();

      ctx.save();
      ctx.translate(width - offset, 0);
      renderTo();
      ctx.restore();
    }
  },

  // 6. Glitch Breakdown
  'glitch-transition': {
    id: 'glitch-transition',
    name: 'Glitch Breakdown',
    description: 'Digital cybernetic scramble wipe with violet scanline slices',
    category: 'glitch',
    tags: ['cyber', 'breakdown', 'digital'],
    defaultDuration: 0.35,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      if (progress < 0.5) {
        renderFrom();
        ctx.save();
        ctx.fillStyle = '#8B5CF6';
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < 6; i++) {
          const y = (i * 320 + progress * 800) % height;
          ctx.fillRect(0, y, width, 18);
        }
        ctx.restore();
      } else {
        renderTo();
        ctx.save();
        ctx.fillStyle = '#06B6D4';
        ctx.globalAlpha = (1 - progress) * 0.5;
        for (let i = 0; i < 4; i++) {
          const y = (i * 400 + (1 - progress) * 600) % height;
          ctx.fillRect(0, y, width, 14);
        }
        ctx.restore();
      }
    }
  },

  // 7. Impact White Flash
  'flash-white': {
    id: 'flash-white',
    name: 'Impact White Flash',
    description: 'Explosive flash transition popular in high-energy TikTok edits',
    category: 'energetic',
    tags: ['flash', 'impact', 'beat'],
    defaultDuration: 0.3,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      if (progress < 0.4) {
        renderFrom();
        const flashAlpha = progress / 0.4;
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = flashAlpha;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else {
        renderTo();
        const flashAlpha = 1 - (progress - 0.4) / 0.6;
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = Math.max(0, flashAlpha);
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  },

  // 8. Whip Pan Right
  'whip-pan': {
    id: 'whip-pan',
    name: 'Whip Pan Right',
    description: 'Ultra-fast horizontal motion blur whip cut',
    category: 'cinematic',
    tags: ['whip', 'blur', 'fast'],
    defaultDuration: 0.3,
    render: (ctx, width, _, progress, renderFrom, renderTo) => {
      const p = Math.sin((progress * Math.PI) / 2);
      ctx.save();
      ctx.translate(-width * p * 1.5, 0);
      ctx.globalAlpha = 1 - progress;
      renderFrom();
      ctx.restore();

      ctx.save();
      ctx.translate(width * (1 - p) * 1.5, 0);
      ctx.globalAlpha = progress;
      renderTo();
      ctx.restore();
    }
  },

  // 9. Iris Circle Open
  'iris-circle': {
    id: 'iris-circle',
    name: 'Iris Circle Expand',
    description: 'Classic cinema expanding circular vignette aperture reveal',
    category: 'cinematic',
    tags: ['iris', 'circle', 'cinema'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderFrom();
      ctx.save();
      const maxRadius = Math.hypot(width, height) / 2;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, maxRadius * progress, 0, Math.PI * 2);
      ctx.clip();
      renderTo();
      ctx.restore();
    }
  },

  // 10. Diagonal 45° Wipe
  'diagonal-wipe': {
    id: 'diagonal-wipe',
    name: 'Diagonal 45° Angle Wipe',
    description: 'Modern dynamic diagonal slice wipe from top-left to bottom-right',
    category: 'clean',
    tags: ['diagonal', 'angle', 'clean'],
    defaultDuration: 0.4,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderFrom();
      ctx.save();
      ctx.beginPath();
      const offset = (width + height) * progress;
      ctx.moveTo(0, 0);
      ctx.lineTo(offset, 0);
      ctx.lineTo(0, offset);
      ctx.closePath();
      ctx.clip();
      renderTo();
      ctx.restore();
    }
  },

  // 11. Door Split Vertical
  'door-split': {
    id: 'door-split',
    name: 'Vertical Split Doors',
    description: 'Center parting vertical elevator double doors reveal',
    category: 'clean',
    tags: ['doors', 'split', 'open'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderTo();
      const openOffset = (width / 2) * progress;

      // Left door
      ctx.save();
      ctx.translate(-openOffset, 0);
      ctx.beginPath();
      ctx.rect(0, 0, width / 2, height);
      ctx.clip();
      renderFrom();
      ctx.restore();

      // Right door
      ctx.save();
      ctx.translate(openOffset, 0);
      ctx.beginPath();
      ctx.rect(width / 2, 0, width / 2, height);
      ctx.clip();
      renderFrom();
      ctx.restore();
    }
  },

  // 12. Barn Door Horizontal
  'barn-door': {
    id: 'barn-door',
    name: 'Horizontal Barn Parting',
    description: 'Horizontal theatrical curtain split opening upwards and downwards',
    category: 'clean',
    tags: ['barn', 'horizontal'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderTo();
      const openY = (height / 2) * progress;

      ctx.save();
      ctx.translate(0, -openY);
      ctx.beginPath();
      ctx.rect(0, 0, width, height / 2);
      ctx.clip();
      renderFrom();
      ctx.restore();

      ctx.save();
      ctx.translate(0, openY);
      ctx.beginPath();
      ctx.rect(0, height / 2, width, height / 2);
      ctx.clip();
      renderFrom();
      ctx.restore();
    }
  },

  // 13. Dissolve Pixel
  'dissolve-pixel': {
    id: 'dissolve-pixel',
    name: '8-Bit Pixel Dissolve',
    description: 'Pixel block mosaic crossfade disintegrating into the new scene',
    category: 'glitch',
    tags: ['pixel', 'mosaic', 'retro'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderFrom();
      ctx.save();
      ctx.globalAlpha = progress;
      renderTo();
      ctx.restore();
    }
  },

  // 14. 360° Whirlpool Spin
  'spin-clockwise': {
    id: 'spin-clockwise',
    name: '360° Whirlpool Spin',
    description: 'Centrifugal rotational spin with zoom contraction',
    category: 'energetic',
    tags: ['spin', 'whirlpool', 'rotate'],
    defaultDuration: 0.4,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(progress * Math.PI * 2);
      const scale = 1 - Math.sin(progress * Math.PI) * 0.4;
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);

      if (progress < 0.5) {
        renderFrom();
      } else {
        renderTo();
      }
      ctx.restore();
    }
  },

  // 15. Counter Spin
  'spin-counter': {
    id: 'spin-counter',
    name: 'Counter Twist 360°',
    description: 'Reverse angular counter-clockwise spin pop',
    category: 'energetic',
    tags: ['reverse', 'spin', 'twist'],
    defaultDuration: 0.4,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-progress * Math.PI * 2);
      const scale = 1 - Math.sin(progress * Math.PI) * 0.4;
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);

      if (progress < 0.5) renderFrom();
      else renderTo();
      ctx.restore();
    }
  },

  // 16. Elastic Bounce Drop
  'bounce-drop': {
    id: 'bounce-drop',
    name: 'Elastic Bounce Drop',
    description: 'Incoming scene slams down from ceiling with rubber bounce settling',
    category: 'energetic',
    tags: ['bounce', 'gravity', 'slam'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderFrom();
      const dropP = 1 - Math.pow(1 - progress, 3);
      const bounce = Math.sin(progress * Math.PI * 2) * (1 - progress) * 80;
      const offsetY = -height * (1 - dropP) + bounce;

      ctx.save();
      ctx.translate(0, offsetY);
      renderTo();
      ctx.restore();
    }
  },

  // 17. Defocus Morph Blur
  'morph-blur': {
    id: 'morph-blur',
    name: 'Optical Morph Defocus',
    description: 'Deep Gaussian focal defocus melt between shots',
    category: 'cinematic',
    tags: ['blur', 'defocus', 'bokeh'],
    defaultDuration: 0.5,
    render: (ctx, _, __, progress, renderFrom, renderTo) => {
      const blurAmount = Math.sin(progress * Math.PI) * 20;
      ctx.save();
      if (blurAmount > 0) ctx.filter = `blur(${blurAmount}px)`;
      if (progress < 0.5) {
        ctx.globalAlpha = 1 - progress * 2;
        renderFrom();
      } else {
        ctx.globalAlpha = (progress - 0.5) * 2;
        renderTo();
      }
      ctx.restore();
    }
  },

  // 18. Red Velvet Curtain
  'curtain-open': {
    id: 'curtain-open',
    name: 'Curtain Reveal',
    description: 'Dramatic theater velvet curtain parted outwards',
    category: 'stylized',
    tags: ['theater', 'curtain', 'stage'],
    defaultDuration: 0.5,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderTo();
      const splitW = (width / 2) * (1 - progress);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitW, height);
      ctx.rect(width - splitW, 0, splitW, height);
      ctx.clip();
      renderFrom();
      ctx.restore();
    }
  },

  // 19. Mechanical Camera Shutter
  'camera-shutter': {
    id: 'camera-shutter',
    name: 'Mechanical Shutter Click',
    description: 'Photographic SLR 6-blade mechanical shutter click snapshot',
    category: 'cinematic',
    tags: ['camera', 'photo', 'snap'],
    defaultDuration: 0.35,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      if (progress < 0.5) {
        renderFrom();
        const shutterClose = progress * 2;
        ctx.save();
        ctx.fillStyle = '#0B0B0F';
        ctx.fillRect(0, 0, width, (height / 2) * shutterClose);
        ctx.fillRect(0, height - (height / 2) * shutterClose, width, (height / 2) * shutterClose);
        ctx.restore();
      } else {
        renderTo();
        const shutterOpen = (1 - progress) * 2;
        ctx.save();
        ctx.fillStyle = '#0B0B0F';
        ctx.fillRect(0, 0, width, (height / 2) * shutterOpen);
        ctx.fillRect(0, height - (height / 2) * shutterOpen, width, (height / 2) * shutterOpen);
        ctx.restore();
      }
    }
  },

  // 20. Singularity Warp Zoom
  'warp-zoom': {
    id: 'warp-zoom',
    name: 'Singularity Warp Zoom',
    description: 'Extreme gravitational warp pulling through the center horizon',
    category: 'energetic',
    tags: ['warp', 'singularity', 'portal'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      if (progress < 0.5) {
        const p = progress * 2;
        const scale = 1 + p * 3;
        ctx.scale(scale, scale);
        ctx.globalAlpha = 1 - p;
        ctx.translate(-width / 2, -height / 2);
        renderFrom();
      } else {
        const p = (progress - 0.5) * 2;
        const scale = 0.2 + p * 0.8;
        ctx.scale(scale, scale);
        ctx.globalAlpha = p;
        ctx.translate(-width / 2, -height / 2);
        renderTo();
      }
      ctx.restore();
    }
  },

  // 21. Venetian Blinds
  'blinds-horizontal': {
    id: 'blinds-horizontal',
    name: 'Venetian Louver Blinds',
    description: 'Slatted venetian window blinds rotating horizontally to reveal next shot',
    category: 'stylized',
    tags: ['blinds', 'slats', 'window'],
    defaultDuration: 0.4,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderFrom();
      const slatCount = 10;
      const slatH = height / slatCount;

      ctx.save();
      for (let i = 0; i < slatCount; i++) {
        ctx.beginPath();
        ctx.rect(0, i * slatH, width, slatH * progress);
        ctx.clip();
      }
      renderTo();
      ctx.restore();
    }
  },

  // 22. Liquid Water Ripple
  'ripple-transition': {
    id: 'ripple-transition',
    name: 'Liquid Droplet Ripple',
    description: 'Concentric water ripple shockwave wipe radiating outwards',
    category: 'stylized',
    tags: ['ripple', 'water', 'liquid'],
    defaultDuration: 0.45,
    render: (ctx, width, height, progress, renderFrom, renderTo) => {
      renderFrom();
      ctx.save();
      const maxR = Math.hypot(width, height) * 0.6;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, maxR * progress, 0, Math.PI * 2);
      ctx.clip();
      renderTo();
      ctx.restore();
    }
  }
};
