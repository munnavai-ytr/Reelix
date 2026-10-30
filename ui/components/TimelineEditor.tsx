// Multi-Track Visual Timeline Editor (CapCut Style)
'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '../../engine/store';
import { Scissors, Copy, Trash2, Plus, Video, Type, Music, MessageSquare } from 'lucide-react';
import { triggerHaptic } from '../../storage/haptics';

export function TimelineEditor() {
  const {
    currentPlan,
    currentTime,
    setCurrentTime,
    selectedLayerId,
    setSelectedLayerId,
    splitLayerAtPlayhead,
    deleteLayer,
    duplicateLayer,
  } = useStudioStore();

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  if (!currentPlan) return null;

  const totalDuration = currentPlan.duration;
  // Pixels per second for horizontal zoom
  const pxPerSec = 40;
  const timelineWidth = Math.max(800, totalDuration * pxPerSec);

  // Group layers into visual tracks
  const videoLayers = currentPlan.layers.filter(l => l.type === 'video' || l.type === 'image');
  const captionLayers = currentPlan.layers.filter(l => l.type === 'caption');
  const textLayers = currentPlan.layers.filter(l => l.type === 'text' || l.type === 'shape');
  const audioLayers = currentPlan.layers.filter(l => l.type === 'audio');

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineContainerRef.current.scrollLeft;
    const clickedTime = Math.max(0, Math.min(totalDuration, clickX / pxPerSec));
    setCurrentTime(clickedTime);
  };

  const selectedLayer = currentPlan.layers.find(l => l.id === selectedLayerId);

  return (
    <div className="flex flex-col h-full bg-[#11111A] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Timeline Action Toolbar */}
      <div className="h-12 px-4 border-b border-white/5 flex items-center justify-between bg-[#141420]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              if (selectedLayerId) splitLayerAtPlayhead(selectedLayerId);
            }}
            disabled={!selectedLayerId}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium disabled:opacity-30 flex items-center gap-1.5 transition-colors"
          >
            <Scissors className="w-3.5 h-3.5 text-violet-400" />
            <span>Split Clip</span>
          </button>

          <button
            onClick={() => {
              if (selectedLayerId) duplicateLayer(selectedLayerId);
            }}
            disabled={!selectedLayerId}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium disabled:opacity-30 flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            onClick={() => {
              if (selectedLayerId) deleteLayer(selectedLayerId);
            }}
            disabled={!selectedLayerId}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-medium disabled:opacity-30 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        {selectedLayer && (
          <div className="text-xs text-slate-400 truncate max-w-[200px]">
            Selected: <span className="text-white font-medium">{selectedLayer.name}</span>
          </div>
        )}
      </div>

      {/* Timeline Scrollable Canvas */}
      <div
        ref={timelineContainerRef}
        onClick={handleTimelineClick}
        className="flex-1 overflow-x-auto overflow-y-auto p-4 relative select-none"
      >
        <div style={{ width: `${timelineWidth}px` }} className="relative min-h-[220px]">
          {/* Time Ruler with Second Markers */}
          <div className="h-6 border-b border-white/5 relative mb-2">
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => (
              <div
                key={sec}
                style={{ left: `${sec * pxPerSec}px` }}
                className="absolute top-0 bottom-0 border-l border-white/10 text-[9px] font-mono text-slate-400 pl-1"
              >
                {sec % 5 === 0 ? `${sec}s` : '·'}
              </div>
            ))}
          </div>

          {/* Vertical Playhead Cursor */}
          <div
            style={{ left: `${currentTime * pxPerSec}px` }}
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
          >
            <div className="w-3 h-3 rounded-full bg-rose-500 -ml-[5px] -mt-1 shadow-lg shadow-rose-500/50" />
          </div>

          {/* Track 1: Video & Media Clips */}
          <div className="mb-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Video className="w-3 h-3 text-violet-400" />
              <span>Video & Visual Tracks</span>
            </div>
            <div className="h-10 bg-white/[0.02] rounded-xl relative border border-white/5 overflow-hidden">
              {videoLayers.map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                const left = layer.startTime * pxPerSec;
                const width = Math.max(20, layer.duration * pxPerSec);

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-violet-600/40 border-violet-400 text-white font-semibold shadow-md shadow-violet-500/20'
                        : 'bg-violet-950/40 border-violet-500/30 text-violet-200 hover:bg-violet-900/40'
                    }`}
                  >
                    <span className="truncate text-[11px]">{layer.name}</span>
                    <span className="text-[9px] opacity-60 font-mono">{layer.duration.toFixed(1)}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 2: Animated Word Captions */}
          <div className="mb-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <MessageSquare className="w-3 h-3 text-cyan-400" />
              <span>Dynamic Captions</span>
            </div>
            <div className="h-9 bg-white/[0.02] rounded-xl relative border border-white/5 overflow-hidden">
              {captionLayers.map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                const left = layer.startTime * pxPerSec;
                const width = Math.max(20, layer.duration * pxPerSec);

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-cyan-600/40 border-cyan-400 text-white font-semibold'
                        : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200 hover:bg-cyan-900/40'
                    }`}
                  >
                    <span className="truncate text-[11px]">{layer.name}</span>
                    <span className="text-[9px] font-mono text-cyan-300">Sync Word-Timing</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 3: Title & Graphic Overlays */}
          <div className="mb-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Type className="w-3 h-3 text-amber-400" />
              <span>Text Titles & Overlays</span>
            </div>
            <div className="h-9 bg-white/[0.02] rounded-xl relative border border-white/5 overflow-hidden">
              {textLayers.map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                const left = layer.startTime * pxPerSec;
                const width = Math.max(20, layer.duration * pxPerSec);

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-amber-600/40 border-amber-400 text-white font-semibold'
                        : 'bg-amber-950/40 border-amber-500/30 text-amber-200 hover:bg-amber-900/40'
                    }`}
                  >
                    <span className="truncate text-[11px]">{layer.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 4: Audio Mix & Sound Effects */}
          <div className="mb-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Music className="w-3 h-3 text-emerald-400" />
              <span>Voiceover & Music (Auto-Ducked)</span>
            </div>
            <div className="h-10 bg-white/[0.02] rounded-xl relative border border-white/5 overflow-hidden">
              {audioLayers.map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                const left = layer.startTime * pxPerSec;
                const width = Math.max(20, layer.duration * pxPerSec);

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-emerald-600/40 border-emerald-400 text-white font-semibold'
                        : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200 hover:bg-emerald-900/40'
                    }`}
                  >
                    <span className="truncate text-[11px]">{layer.name}</span>
                    <span className="text-[9px] font-mono text-emerald-400">Vol {(layer.volume * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
