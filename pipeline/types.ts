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
  stepIndex: number; // 1 to 7
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
  scriptText?: string;
}
