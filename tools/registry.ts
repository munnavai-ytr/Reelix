import React from 'react';
import { Subtitles } from 'lucide-react';
import { AutoCaptionTool } from '@/ui/components/AutoCaptionTool';

export interface ToolDef {
  id: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'Captions';
  quickPicks: string[];
  component: React.ComponentType<{ initialDescription?: string; onBack?: () => void }>;
  enabled: boolean;
}

export const TOOLS: ToolDef[] = [
  {
    id: 'auto-caption',
    name: 'Auto Caption',
    tagline: 'Upload a video, describe the look, get animated captions.',
    icon: Subtitles,
    category: 'Captions',
    quickPicks: [
      'Yellow karaoke highlight, bottom',
      'Big bold center, one word at a time',
      'Neon glow, all caps',
      'Minimal white text with soft shadow',
      'Bangla captions with box behind text',
    ],
    component: AutoCaptionTool,
    enabled: true,
  },
];
