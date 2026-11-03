// Color Look presets mapping to the built-in color-grade effect in registry/effects.ts

export type ColorLookPreset = 'auto' | 'none' | 'cinematic' | 'bright' | 'natural';

export interface ColorLookConfig {
  preset: ColorLookPreset;
  label: string;
  description: string;
  effectParams?: {
    preset: string;
    strength: number;
  };
}

export const COLOR_LOOKS: Record<ColorLookPreset, ColorLookConfig> = {
  auto: {
    preset: 'auto',
    label: 'Auto',
    description: 'AI selects color mood based on content and prompt',
  },
  none: {
    preset: 'none',
    label: 'None',
    description: 'No color grading applied',
  },
  cinematic: {
    preset: 'cinematic',
    label: 'Cinematic',
    description: 'Hollywood Teal & Orange soft-light grade',
    effectParams: { preset: 'teal-orange', strength: 0.5 },
  },
  bright: {
    preset: 'bright',
    label: 'Bright',
    description: 'Vibrant warm tones with high contrast',
    effectParams: { preset: 'warm', strength: 0.35 },
  },
  natural: {
    preset: 'natural',
    label: 'Natural',
    description: 'Subtle cool balance for clean realism',
    effectParams: { preset: 'cool', strength: 0.25 },
  },
};
