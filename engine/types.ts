// Reelix Edit Plan Type Definitions - Single Source of Truth

export type EasingType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring' | 'bezier';

export interface KeyframePoint {
  time: number; // in seconds relative to layer start
  value: number;
  easing?: EasingType;
}

export interface Transform {
  x: number; // in pixels (center offset from canvas center 540, 960)
  y: number; // in pixels
  scale: number; // 1.0 = 100%
  rotation: number; // degrees
  anchorX?: number; // 0.5 default
  anchorY?: number; // 0.5 default
}

export interface LayerEffect {
  effectId: string;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export interface Transition {
  id: string;
  type: string; // crossfade, wipe, zoom-in, zoom-out, slide, glitch, flash-white, whip-pan
  duration: number; // seconds (typically 0.3 - 0.7)
  fromLayerId: string;
  toLayerId: string;
  params?: Record<string, number | string | boolean>;
}

export interface CaptionWord {
  word: string;
  start: number; // absolute seconds in timeline
  end: number; // absolute seconds in timeline
}

export interface CaptionChunk {
  text: string;
  start: number;
  end: number;
  words: CaptionWord[];
}

export interface AudioDuckingConfig {
  duckWhenVoiceOver: boolean;
  duckVolume: number; // 0.0 to 1.0 (default 0.25)
  attackMs: number; // default 150ms
  releaseMs: number; // default 300ms
}

export type LayerType = 'video' | 'image' | 'text' | 'caption' | 'shape' | 'sticker' | 'audio';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  trackIndex: number;
  startTime: number; // in seconds
  duration: number; // in seconds
  opacity?: number; // 0 to 1
  transform?: Transform;
  keyframes?: Record<string, KeyframePoint[]>;
  effects?: LayerEffect[];
  locked?: boolean;
  hidden?: boolean;
}

export interface VideoLayer extends BaseLayer {
  type: 'video';
  src: string; // Blob URL, OPFS URI, or remote video URL
  trimIn: number;
  trimOut: number;
  volume: number;
  speed?: number;
  loop?: boolean;
  fitMode?: 'cover' | 'contain';
  focusPoint?: { x: number; y: number }; // 0-1 normalized focal point for 9:16 reframe
  transitionIn?: { type: string; duration: number };
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  fitMode?: 'cover' | 'contain';
  animation?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
  transitionIn?: { type: string; duration: number };
  kenBurns?: {
    enabled: boolean;
    startScale: number;
    endScale: number;
    startX: number;
    endX: number;
    startY: number;
    endY: number;
  };
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  position?: { x: number; y: number };
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  backgroundRadius?: number;
  textAlign?: 'left' | 'center' | 'right';
  animationId?: string; // from TextAnimation registry
  animationDuration?: number;
}

export interface CaptionLayer extends BaseLayer {
  type: 'caption';
  chunks: CaptionChunk[];
  styleId: string; // from CaptionStyle registry
  baseColor: string;
  highlightColor: string;
  fontFamily: string;
  fontSize: number;
  strokeColor?: string;
  strokeWidth?: number;
  positionY: number; // center offset Y (e.g. 350 for bottom third)
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'pill' | 'badge' | 'line';
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  position?: { x: number; y: number };
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface StickerLayer extends BaseLayer {
  type: 'sticker';
  src: string; // SVG or icon URL
}

export interface AudioLayer extends BaseLayer {
  type: 'audio';
  audioType: 'voiceover' | 'music' | 'sfx';
  src: string;
  volume: number;
  trimIn?: number;
  fadeIn?: number;
  fadeOut?: number;
  ducking?: AudioDuckingConfig;
}

export type Layer =
  | VideoLayer
  | ImageLayer
  | TextLayer
  | CaptionLayer
  | ShapeLayer
  | StickerLayer
  | AudioLayer;

export interface Marker {
  time: number;
  label: string;
  type: 'hook' | 'highlight' | 'beat' | 'cta';
}

export interface EditPlan {
  id: string;
  title: string;
  version?: '1.0.0';
  aspectRatio?: '9:16';
  width?: 1080;
  height?: 1920;
  fps: number;
  duration: number; // in seconds
  layers: Layer[];
  transitions?: Transition[];
  markers?: Marker[];
  canvas?: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    niche?: string;
    style?: string;
    targetDuration?: number;
    script?: string;
    voiceName?: string;
    directorNotes?: string;
  };
}
