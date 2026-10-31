// AI Provider Interface and Options for Reelix
import { EditPlan } from '../engine/types';

export interface DirectorRequest {
  script?: string;
  voiceUrl?: string;
  voiceDuration: number;
  userVideoUrls?: string[];
  userImageUrls?: string[];
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

export interface TtsOptions {
  text: string;
  voiceName?: string; // Puck, Charon, Kore, Fenrir, Aoede
  language?: string;
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
