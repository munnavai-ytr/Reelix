// Pipeline State and Progress Definitions

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
}

export interface IngestedMedia {
  audioBlob?: Blob;
  audioUrl?: string;
  audioDuration: number;
  videoUrls: string[];
  imageUrls: string[];
  musicUrl?: string;
  scriptText?: string;
  isTalkingHead?: boolean;
}
