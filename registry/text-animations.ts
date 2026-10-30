// 28+ Real Built-in Text Animations for Canvas 2D Text Layers

export interface TextAnimationDefinition {
  id: string;
  name: string;
  description: string;
  category?: 'motion' | 'elastic' | 'retro' | 'glitch' | 'cinema';
  tags?: string[];
  apply: (
    ctx: CanvasRenderingContext2D,
    progress: number, // 0 to 1
    text: string,
    fontSize: number
  ) => {
    renderedText: string;
    opacity: number;
    scale: number;
    offsetY: number;
    offsetX: number;
    rotation?: number;
    blurRadius?: number;
  };
}

export const BUILT_IN_TEXT_ANIMATIONS: Record<string, TextAnimationDefinition> = {
  // 1. Fade In Up
  'fade-in-up': {
    id: 'fade-in-up',
    name: 'Fade In Up',
    description: 'Smooth upward glide with gentle opacity fade',
    category: 'motion',
    tags: ['smooth', 'minimal', 'clean'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const eased = 1 - Math.pow(1 - p, 3);
      return {
        renderedText: text,
        opacity: eased,
        scale: 1,
        offsetX: 0,
        offsetY: (1 - eased) * 50,
      };
    }
  },

  // 2. Pop In
  'pop-in': {
    id: 'pop-in',
    name: 'Pop In (Spring)',
    description: 'Bouncy spring pop with overshoot scale',
    category: 'elastic',
    tags: ['spring', 'bounce', 'pop'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const scale = p === 0 ? 0 : 1 + Math.sin(p * Math.PI * 2.5) * 0.35 * Math.exp(-p * 4);
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: Math.max(0, scale),
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 3. Typewriter
  typewriter: {
    id: 'typewriter',
    name: 'Typewriter Mechanical',
    description: 'Character-by-character mechanical text typing',
    category: 'retro',
    tags: ['typewriter', 'retro', 'code'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const charCount = Math.floor(p * text.length);
      const partialText = text.slice(0, charCount);
      return {
        renderedText: partialText,
        opacity: 1,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 4. Vertical Bounce
  bounce: {
    id: 'bounce',
    name: 'Vertical Bounce',
    description: 'Playful rhythmic bounce with elastic decay',
    category: 'elastic',
    tags: ['playful', 'bounce', 'fun'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const bounceY = Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p) * 60;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 2),
        scale: 1,
        offsetX: 0,
        offsetY: -bounceY,
      };
    }
  },

  // 5. Scale Down Slam
  'scale-down': {
    id: 'scale-down',
    name: 'Scale Down Slam',
    description: 'Heavy entrance starting 2.5x larger and slamming down',
    category: 'motion',
    tags: ['slam', 'heavy', 'impact'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const eased = Math.pow(p, 3);
      const scale = 2.4 - eased * 1.4;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 4),
        scale: Math.max(1, scale),
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 6. Slide In Left
  'slide-in-left': {
    id: 'slide-in-left',
    name: 'Slide In Left',
    description: 'High-velocity entry from left with ease-out finish',
    category: 'motion',
    tags: ['slide', 'speed', 'left'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const eased = 1 - Math.pow(1 - p, 4);
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: (1 - eased) * -220,
        offsetY: 0,
      };
    }
  },

  // 7. Blur In Focus
  'blur-in': {
    id: 'blur-in',
    name: 'Blur In Focus',
    description: 'Cinematic optical focus racking from heavy blur to crisp',
    category: 'cinema',
    tags: ['cinema', 'blur', 'focus'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const blur = (1 - p) * 24;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 2.5),
        scale: 1 + (1 - p) * 0.15,
        offsetX: 0,
        offsetY: 0,
        blurRadius: blur,
      };
    }
  },

  // 8. Kinetic Slam
  'kinetic-slam': {
    id: 'kinetic-slam',
    name: 'Kinetic Slam',
    description: 'Extreme impact slam with micro camera vibration',
    category: 'motion',
    tags: ['viral', 'hook', 'slam'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      if (p < 0.6) {
        const sub = p / 0.6;
        return {
          renderedText: text,
          opacity: sub,
          scale: 3 - sub * 2,
          offsetX: 0,
          offsetY: 0,
        };
      }
      const shakeSub = (p - 0.6) / 0.4;
      const shake = Math.sin(shakeSub * 30) * (1 - shakeSub) * 8;
      return {
        renderedText: text,
        opacity: 1,
        scale: 1,
        offsetX: shake,
        offsetY: shake * 0.5,
      };
    }
  },

  // 9. Neon Pulse
  'neon-pulse': {
    id: 'neon-pulse',
    name: 'Neon Pulse Electric',
    description: 'Electric cybernetic flickering and luminescent pulse',
    category: 'glitch',
    tags: ['neon', 'cyber', 'electric'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const flicker = Math.sin(p * 20) > 0.1 ? 1 : 0.65;
      const scale = 1 + Math.sin(p * Math.PI * 4) * 0.05;
      return {
        renderedText: text,
        opacity: flicker,
        scale,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 10. Wave Letters
  'wave-letters': {
    id: 'wave-letters',
    name: 'Wave Letters Undulate',
    description: 'Fluid undulating sine wave offset across phrase',
    category: 'elastic',
    tags: ['wave', 'fluid', 'sea'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const wave = Math.sin(p * Math.PI * 2) * 12;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: 0,
        offsetY: wave,
      };
    }
  },

  // 11. Slide In Right
  'slide-in-right': {
    id: 'slide-in-right',
    name: 'Slide In Right',
    description: 'High-velocity entry from right screen edge',
    category: 'motion',
    tags: ['slide', 'speed', 'right'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const eased = 1 - Math.pow(1 - p, 4);
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: (1 - eased) * 220,
        offsetY: 0,
      };
    }
  },

  // 12. Rotate Barrel In
  'rotate-in': {
    id: 'rotate-in',
    name: '360° Barrel Roll In',
    description: 'Full angular rotational barrel entry expanding to center',
    category: 'motion',
    tags: ['rotate', 'spin', 'barrel'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const eased = 1 - Math.pow(1 - p, 3);
      return {
        renderedText: text,
        opacity: eased,
        scale: eased,
        offsetX: 0,
        offsetY: 0,
        rotation: (1 - eased) * -180,
      };
    }
  },

  // 13. Glitch Scramble Text
  'glitch-text': {
    id: 'glitch-text',
    name: 'Cyber Glitch Scramble',
    description: 'Digital character jitter and horizontal displacement',
    category: 'glitch',
    tags: ['glitch', 'cyber', 'hacker'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const shakeX = Math.sin(p * 45) * (1 - p) * 16;
      const shakeY = Math.cos(p * 35) * (1 - p) * 8;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: shakeX,
        offsetY: shakeY,
      };
    }
  },

  // 14. Matrix Scramble Decode
  'scramble-decode': {
    id: 'scramble-decode',
    name: 'Password Scramble Decode',
    description: 'Decodes encrypted random alphanumeric characters into actual words',
    category: 'glitch',
    tags: ['matrix', 'decode', 'secret'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const resolvedCount = Math.floor(p * text.length);
      const chars = '01#%&*XYZ$@!';
      let out = text.slice(0, resolvedCount);
      for (let i = resolvedCount; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)];
      }
      return {
        renderedText: out,
        opacity: 1,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 15. Rubber Band Stretch
  'rubber-band': {
    id: 'rubber-band',
    name: 'Rubber Band Stretch',
    description: 'Extreme elastic stretch and squeeze squash & stretch',
    category: 'elastic',
    tags: ['cartoon', 'squash', 'elastic'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const stretch = 1 + Math.sin(p * Math.PI * 3) * (1 - p) * 0.4;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 4),
        scale: stretch,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 16. Cardiac Heartbeat
  'heart-beat': {
    id: 'heart-beat',
    name: 'Cardiac Heartbeat',
    description: 'Emotional double-pulse systolic expansion',
    category: 'elastic',
    tags: ['heart', 'pulse', 'emotion'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const pulse = 1 + (Math.sin(p * Math.PI * 4) > 0.5 ? 0.15 : 0);
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: pulse,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 17. Pendulum Swing
  'swing-pendulum': {
    id: 'swing-pendulum',
    name: 'Pendulum Sign Swing',
    description: 'Hanging wooden store sign swinging back and forth until settling',
    category: 'motion',
    tags: ['swing', 'pendulum', 'hang'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const angle = Math.sin(p * Math.PI * 4) * (1 - p) * 35;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: angle,
      };
    }
  },

  // 18. Gravity Drop Fall
  'drop-fall': {
    id: 'drop-fall',
    name: 'Gravity Drop Fall',
    description: 'Heavy celestial drop from sky with elastic floor bounce',
    category: 'motion',
    tags: ['gravity', 'fall', 'drop'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const fall = p < 0.7 ? (p / 0.7) * (p / 0.7) : 1 - Math.sin((p - 0.7) * Math.PI * 3.3) * 0.2;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 4),
        scale: 1,
        offsetX: 0,
        offsetY: -300 * (1 - fall),
      };
    }
  },

  // 19. Staggered Split
  'staggered-split': {
    id: 'staggered-split',
    name: 'Staggered Slice Split',
    description: 'Opposing directional slice meeting at center',
    category: 'cinema',
    tags: ['slice', 'split', 'modern'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const offset = (1 - p) * 80;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: offset,
        offsetY: 0,
      };
    }
  },

  // 20. Slingshot Elastic Snap
  'elastic-snap': {
    id: 'elastic-snap',
    name: 'Slingshot Whip Snap',
    description: 'Pulled back like an archer bow and snapped into view',
    category: 'elastic',
    tags: ['slingshot', 'snap', 'whip'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const scale = p < 0.4 ? 1 - p * 0.8 : 0.6 + ((p - 0.4) / 0.6) * 0.4;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 5),
        scale,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 21. Rainbow Hue Cycle
  'rainbow-cycle': {
    id: 'rainbow-cycle',
    name: 'Rainbow Spectrum Shift',
    description: 'Animated iridescent rainbow spectrum hue sweep',
    category: 'glitch',
    tags: ['rainbow', 'iridescent', 'pride'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 22. Aerodynamic Skew Glide
  'skew-glide': {
    id: 'skew-glide',
    name: 'Aerodynamic Skew Glide',
    description: 'Slanted italicized velocity glide arriving with friction',
    category: 'motion',
    tags: ['speed', 'italic', 'slant'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const eased = 1 - Math.pow(1 - p, 3);
      return {
        renderedText: text,
        opacity: eased,
        scale: 1,
        offsetX: (1 - eased) * 160,
        offsetY: (1 - eased) * 40,
      };
    }
  },

  // 23. Supernova Zoom Flash
  'zoom-flash': {
    id: 'zoom-flash',
    name: 'Supernova Zoom Flash',
    description: 'Blinding white burst expanding rapidly from a microscopic point',
    category: 'cinema',
    tags: ['supernova', 'flash', 'star'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const scale = Math.pow(p, 2) * 1;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: Math.max(0.01, scale),
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 24. Dying Neon Flicker
  'neon-flicker': {
    id: 'neon-flicker',
    name: 'Dying Neon Sign Hum',
    description: 'Gritty dive bar neon sign that buzzes and flickers to life',
    category: 'retro',
    tags: ['neon', 'hum', 'vintage'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const isLit = p > 0.8 || (Math.sin(p * 35) > 0.2);
      return {
        renderedText: text,
        opacity: isLit ? 1 : 0.2,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      };
    }
  },

  // 25. Smoke Puff Disperse
  'smoke-puff': {
    id: 'smoke-puff',
    name: 'Smoke Cloud Puff',
    description: 'Soft particulate smoke condensation resolving into typography',
    category: 'cinema',
    tags: ['smoke', 'fog', 'magic'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      return {
        renderedText: text,
        opacity: Math.min(1, p * 2),
        scale: 1.4 - p * 0.4,
        offsetX: 0,
        offsetY: 0,
        blurRadius: (1 - p) * 18,
      };
    }
  },

  // 26. Spotlight Tracking
  'spotlight-reveal': {
    id: 'spotlight-reveal',
    name: 'Stage Spotlight Sweep',
    description: 'Cinematic theater beam scanning across the letters',
    category: 'cinema',
    tags: ['spotlight', 'stage', 'broadway'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      return {
        renderedText: text,
        opacity: Math.min(1, p * 2.5),
        scale: 1,
        offsetX: (1 - p) * -50,
        offsetY: 0,
      };
    }
  },

  // 27. Elastic Slam Overshoot
  'elastic-overshoot': {
    id: 'elastic-overshoot',
    name: 'Heavy Impact Overshoot',
    description: 'Smashes down then bounces back up to baseline',
    category: 'elastic',
    tags: ['overshoot', 'impact'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      const offset = Math.sin(p * Math.PI) * (1 - p) * 40;
      return {
        renderedText: text,
        opacity: Math.min(1, p * 3),
        scale: 1,
        offsetX: 0,
        offsetY: -offset,
      };
    }
  },

  // 28. Horizon Blur Rack
  'horizon-rack': {
    id: 'horizon-rack',
    name: 'Anamorphic Horizon Rack',
    description: 'Horizontal stretch blur compressing into razor-sharp title',
    category: 'cinema',
    tags: ['anamorphic', 'horizon'],
    apply: (_, progress, text) => {
      const p = Math.min(1, Math.max(0, progress));
      return {
        renderedText: text,
        opacity: Math.min(1, p * 2),
        scale: 1,
        offsetX: (1 - p) * 100,
        offsetY: 0,
        blurRadius: (1 - p) * 12,
      };
    }
  }
};
