// Zod validation schemas for the Reelix Edit Plan
import { z } from 'zod';

export const EasingSchema = z.enum([
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'spring',
  'bezier'
]);

export const KeyframePointSchema = z.object({
  time: z.number(),
  value: z.number(),
  easing: EasingSchema.optional(),
});

export const TransformSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().default(1),
  rotation: z.number().default(0),
  anchorX: z.number().optional().default(0.5),
  anchorY: z.number().optional().default(0.5),
});

export const LayerEffectSchema = z.object({
  effectId: z.string(),
  enabled: z.boolean().default(true),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
});

export const TransitionSchema = z.object({
  id: z.string(),
  type: z.string(),
  duration: z.number().default(0.5),
  fromLayerId: z.string(),
  toLayerId: z.string(),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
});

export const CaptionWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});

export const CaptionChunkSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  words: z.array(CaptionWordSchema),
});

export const AudioDuckingConfigSchema = z.object({
  duckWhenVoiceOver: z.boolean().default(true),
  duckVolume: z.number().default(0.25),
  attackMs: z.number().default(150),
  releaseMs: z.number().default(300),
});

export const BaseLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  trackIndex: z.number().default(0),
  startTime: z.number(),
  duration: z.number(),
  opacity: z.number().min(0).max(1).optional().default(1),
  transform: TransformSchema.optional(),
  keyframes: z.record(z.string(), z.array(KeyframePointSchema)).optional(),
  effects: z.array(LayerEffectSchema).optional(),
  locked: z.boolean().optional().default(false),
  hidden: z.boolean().optional().default(false),
});

export const VideoLayerSchema = BaseLayerSchema.extend({
  type: z.literal('video'),
  src: z.string(),
  trimIn: z.number().default(0),
  trimOut: z.number(),
  volume: z.number().default(1),
  speed: z.number().optional().default(1),
  fitMode: z.enum(['cover', 'contain']).optional().default('cover'),
  focusPoint: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const ImageLayerSchema = BaseLayerSchema.extend({
  type: z.literal('image'),
  src: z.string(),
  fitMode: z.enum(['cover', 'contain']).optional().default('cover'),
  kenBurns: z.object({
    enabled: z.boolean(),
    startScale: z.number(),
    endScale: z.number(),
    startX: z.number(),
    endX: z.number(),
    startY: z.number(),
    endY: z.number(),
  }).optional(),
});

export const TextLayerSchema = BaseLayerSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().default(54),
  fontFamily: z.string().default('Inter, sans-serif'),
  fontWeight: z.string().optional().default('800'),
  color: z.string().default('#FFFFFF'),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  backgroundColor: z.string().optional(),
  backgroundPadding: z.number().optional(),
  backgroundRadius: z.number().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional().default('center'),
  animationId: z.string().optional(),
  animationDuration: z.number().optional().default(0.5),
});

export const CaptionLayerSchema = BaseLayerSchema.extend({
  type: z.literal('caption'),
  chunks: z.array(CaptionChunkSchema),
  styleId: z.string().default('karaoke-word-highlight'),
  baseColor: z.string().default('#FFFFFF'),
  highlightColor: z.string().default('#FBBF24'), // Vibrant gold/yellow
  fontFamily: z.string().default('Inter, sans-serif'),
  fontSize: z.number().default(52),
  strokeColor: z.string().optional().default('#000000'),
  strokeWidth: z.number().optional().default(6),
  positionY: z.number().default(380),
});

export const ShapeLayerSchema = BaseLayerSchema.extend({
  type: z.literal('shape'),
  shapeType: z.enum(['rect', 'circle', 'pill', 'badge', 'line']),
  width: z.number(),
  height: z.number(),
  color: z.string(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  borderRadius: z.number().optional().default(16),
});

export const StickerLayerSchema = BaseLayerSchema.extend({
  type: z.literal('sticker'),
  src: z.string(),
});

export const AudioLayerSchema = BaseLayerSchema.extend({
  type: z.literal('audio'),
  audioType: z.enum(['voiceover', 'music', 'sfx']),
  src: z.string(),
  volume: z.number().default(1),
  trimIn: z.number().optional().default(0),
  fadeIn: z.number().optional(),
  fadeOut: z.number().optional(),
  ducking: AudioDuckingConfigSchema.optional(),
});

export const LayerSchema = z.discriminatedUnion('type', [
  VideoLayerSchema,
  ImageLayerSchema,
  TextLayerSchema,
  CaptionLayerSchema,
  ShapeLayerSchema,
  StickerLayerSchema,
  AudioLayerSchema,
]);

export const MarkerSchema = z.object({
  time: z.number(),
  label: z.string(),
  type: z.enum(['hook', 'highlight', 'beat', 'cta']),
});

export const EditPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.literal('1.0.0').default('1.0.0'),
  aspectRatio: z.literal('9:16').default('9:16'),
  width: z.literal(1080).default(1080),
  height: z.literal(1920).default(1920),
  fps: z.literal(30).default(30),
  duration: z.number().min(1).max(300),
  layers: z.array(LayerSchema),
  transitions: z.array(TransitionSchema).default([]),
  markers: z.array(MarkerSchema).default([]),
  metadata: z.object({
    createdAt: z.number().default(() => Date.now()),
    updatedAt: z.number().default(() => Date.now()),
    niche: z.string().optional(),
    style: z.string().optional(),
    targetDuration: z.number().optional(),
    script: z.string().optional(),
    voiceName: z.string().optional(),
  }),
});

export type ValidatedEditPlan = z.infer<typeof EditPlanSchema>;
