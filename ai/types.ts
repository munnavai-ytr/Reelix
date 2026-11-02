// AI Provider Interface and Options for Reelix
import { EditPlan } from '../engine/types';
import { VideoAnalysisResult } from './clip-analysis';

export interface DirectorRequest {
  script?: string;
  voiceUrl?: string;
  voiceUri?: string;
  voiceDuration: number;
  userVideoUrls?: string[];
  userVideoUris?: string[];
  userImageUrls?: string[];
  userImageUris?: string[];
  musicUrl?: string;
  musicUri?: string;
  clipAnalysis?: VideoAnalysisResult;
  mode?: 'broll' | 'talking-head';
  niche?: string;
  style?: string;
  targetDuration?: number;
  captionStyle?: string;
  userPrompt?: string;
  language?: string;
  hasPexelsKey?: boolean;
}

export interface DirectorResult {
  editPlan: EditPlan;
  bRollQueries: string[];
  sfxQueries: string[];
  directorNotes: string;
  musicMood?: 'hype' | 'upbeat' | 'calm' | 'dramatic';
  hookText?: string;
  sfx?: Array<{ time: number; type: 'whoosh' | 'pop' | 'hit' | 'ding' }>;
  notices?: string[];
}

export interface TranscriptionWord {
  word: string;
  start: number; // in seconds
  end: number; // in seconds
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  words: TranscriptionWord[];
}
