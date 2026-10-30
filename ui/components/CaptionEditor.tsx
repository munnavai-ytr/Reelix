// Manual Caption Editor Panel (Word-by-Word Timing & Styles)
'use client';

import React from 'react';
import { useStudioStore } from '../../engine/store';
import { CaptionLayer } from '../../engine/types';
import { MessageSquare, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../storage/haptics';

export function CaptionEditor() {
  const { currentPlan, updateLayer, setCurrentTime } = useStudioStore();

  if (!currentPlan) return null;

  const captionLayer = currentPlan.layers.find(l => l.type === 'caption') as CaptionLayer | undefined;
  if (!captionLayer) return null;

  const handleWordTextChange = (chunkIdx: number, wordIdx: number, newWord: string) => {
    const updatedChunks = [...captionLayer.chunks];
    const chunk = { ...updatedChunks[chunkIdx] };
    const words = [...chunk.words];
    words[wordIdx] = { ...words[wordIdx], word: newWord };
    chunk.words = words;
    chunk.text = words.map(w => w.word).join(' ');
    updatedChunks[chunkIdx] = chunk;

    updateLayer(captionLayer.id, {
      chunks: updatedChunks,
    });
  };

  const handleStyleChange = (styleId: string) => {
    triggerHaptic('light');
    updateLayer(captionLayer.id, { styleId });
  };

  const handleColorChange = (key: 'baseColor' | 'highlightColor', color: string) => {
    updateLayer(captionLayer.id, { [key]: color });
  };

  return (
    <div className="p-4 bg-[#141420] rounded-3xl border border-white/5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">Captions & Word Synchronization</span>
        </div>
        <span className="text-xs font-mono text-cyan-400">{captionLayer.chunks.length} phrases</span>
      </div>

      {/* Style Selector Chips */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300">Caption Style</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'karaoke-word-highlight', label: 'Karaoke Word Glow' },
            { id: 'pop', label: 'Word Pop' },
            { id: 'box-highlight', label: 'Color Box' },
            { id: 'outline', label: 'Comic Outline' },
            { id: 'typewriter', label: 'Typewriter' },
            { id: 'bold-center', label: 'Bold Center' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => handleStyleChange(st.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
                captionLayer.styleId === st.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors & Font Size */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400">Highlight Color</span>
          <input
            type="color"
            value={captionLayer.highlightColor || '#FBBF24'}
            onChange={(e) => handleColorChange('highlightColor', e.target.value)}
            className="w-full h-8 rounded-lg bg-transparent cursor-pointer"
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400">Base Text Color</span>
          <input
            type="color"
            value={captionLayer.baseColor || '#FFFFFF'}
            onChange={(e) => handleColorChange('baseColor', e.target.value)}
            className="w-full h-8 rounded-lg bg-transparent cursor-pointer"
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400">Font Size ({captionLayer.fontSize}px)</span>
          <input
            type="range"
            min={36}
            max={72}
            value={captionLayer.fontSize || 54}
            onChange={(e) => updateLayer(captionLayer.id, { fontSize: parseInt(e.target.value) })}
            className="w-full mt-2 accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Word-by-word chunks list */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 pt-2 border-t border-white/5">
        {captionLayer.chunks.map((chunk, cIdx) => (
          <div
            key={cIdx}
            className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5"
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <button
                onClick={() => setCurrentTime(chunk.start)}
                className="hover:text-cyan-400 transition-colors"
              >
                Jump: {chunk.start.toFixed(1)}s - {chunk.end.toFixed(1)}s
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {chunk.words.map((w, wIdx) => (
                <input
                  key={wIdx}
                  type="text"
                  value={w.word}
                  onChange={(e) => handleWordTextChange(cIdx, wIdx, e.target.value)}
                  className="bg-[#0B0B0F] border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white w-20 text-center font-medium focus:border-cyan-400 focus:outline-none"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
