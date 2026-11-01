// AI Provider Interface and Options for Reelix
import { EditPlan } from '../engine/types';
import { VideoAnalysisResult } from './clip-analysis';

export interface DirectorRequest {
  script?: string;
  voiceUrl?: string;
  voiceDuration: number;
  userVideoUrls?: string[];
  userImageUrls?: string[];
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
