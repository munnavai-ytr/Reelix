// Reelix Premium Design System Tokens
export const THEME = {
  colors: {
    ink: '#0A0A10',
    panel: '#12121C',
    panel2: '#191927',
    line: '#26263A',
    text: '#EDEDF7',
    mute: '#8D8DA8',
    violet: '#8B5CF6',
    cyan: '#22D3EE',
    amber: '#FBBF24',
    rose: '#FB7185',
    mint: '#34D399',
    grad: 'linear-gradient(135deg, #8B5CF6, #22D3EE)',
  },
  layers: {
    video: '#5B3FB8',
    voice: '#0F7F8F',
    captions: '#B8741A',
    music: '#2B7A55',
    sfx: '#A1394F',
    text: '#7A3FA0',
    images: '#2B5FA0',
  },
  radius: {
    card: 16,
    button: 14,
    pill: 999,
  },
  touchTarget: 44,
} as const;

export const LAYER_COLORS = THEME.layers;
export const THEME_COLORS = THEME.colors;
export type ThemeColors = typeof THEME.colors;
export type LayerColors = typeof THEME.layers;
