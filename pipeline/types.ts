// Pipeline State, Progress, and Edit Controls Definitions

import { ColorLookPreset } from './color-looks';

export type PipelineStepId =
  | 'ingest'
  | 'transcribe'
  | 'analyze'
  | 'director'
  | 'assets'
  | 'preview'
  | 'export';

export interface PipelineProgressEvent {
  step: PipelineStepId;
  stepIndex: number;
  totalSteps: number;
  percentage: number; // 0 to 100
  title: string;
  detail: string;
  error?: string;
}

export interface IngestedMedia {
  audioBlob?: Blob;
  audioUrl?: string;
  audioUri?: string;
  audioDuration: number;
  videoUrls: string[];
  videoUris: string[];
  imageUrls: string[];
  imageUris: string[];
  musicUrl?: string;
  musicUri?: string;
  scriptText?: string;
  isTalkingHead?: boolean;
}

export interface EditControls {
  silence: {
    mode: 'auto' | 'on' | 'off';
    minSec: number;
  };
  sfx: {
    mode: 'auto' | 'on' | 'off';
    level: 'low' | 'medium' | 'high';
  };
  music: {
    mode: 'auto' | 'on' | 'off';
    volume: number;
    duck: boolean;
  };
  hook: 'auto' | 'on' | 'off';
  captions: {
    mode: 'auto' | 'on' | 'off';
    styleId: string;
  };
  effects: {
    mode: 'auto' | 'off';
    intensity: 'low' | 'medium' | 'high';
  };
  transitions: 'auto' | 'off';
  cutSpeed: 'slow' | 'normal' | 'fast';
  colorLook: ColorLookPreset;
}

export const DEFAULT_EDIT_CONTROLS: EditControls = {
  silence: { mode: 'auto', minSec: 0.35 },
  sfx: { mode: 'auto', level: 'medium' },
  music: { mode: 'auto', volume: 35, duck: true },
  hook: 'auto',
  captions: { mode: 'auto', styleId: 'karaoke-word-highlight' },
  effects: { mode: 'auto', intensity: 'medium' },
  transitions: 'auto',
  cutSpeed: 'normal',
  colorLook: 'auto',
};
