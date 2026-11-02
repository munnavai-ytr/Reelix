// Multi-Track Visual Timeline Editor (CapCut Style with 7 Lanes & Waveforms)
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/engine/store';
import {
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Video as VideoIcon,
  Mic,
  MessageSquare,
  Type,
  Music,
  Zap,
  Layers,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { STRINGS } from '@/ui/strings';
import { LAYER_COLORS } from '@/ui/theme';

export function TimelineEditor() {
  const {
    currentPlan,
    currentTime,
    setCurrentTime,
    selectedLayerId,
    setSelectedLayerId,
    updateLayer,
    splitLayerAtPlayhead,
    deleteLayer,
    duplicateLayer,
  } = useStudioStore();

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 4>(2);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [trimmingState, setTrimmingState] = useState<{
    layerId: string;
    edge: 'start' | 'end';
    startX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  const totalDuration = currentPlan?.duration || 30;
  const pxPerSec = 40 * zoomLevel;
  const timelineContentWidth = 72 + Math.ceil(totalDuration) * pxPerSec + 100;

  const handleTimelineScrub = useCallback((clientX: number) => {
    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft - 72;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / pxPerSec));
    setCurrentTime(newTime);
  }, [totalDuration, pxPerSec, setCurrentTime]);

  const handleMouseDownScrub = (e: React.MouseEvent) => {
    setIsDraggingPlayhead(true);
    handleTimelineScrub(e.clientX);
  };

  const handleTrimStart = (e: React.MouseEvent, layerId: string, edge: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentPlan) return;
    const layer = currentPlan.layers.find((l) => l.id === layerId);
    if (!layer) return;
    setTrimmingState({
      layerId,
      edge,
      startX: e.clientX,
      initialStart: layer.startTime,
      initialDuration: layer.duration,
    });
  };

  const lanes = [
    {
      id: 'video',
      label: 'Video',
      icon: VideoIcon,
      color: LAYER_COLORS.video,
      layers: (currentPlan?.layers || []).filter((l) => l.type === 'video'),
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: Mic,
      color: LAYER_COLORS.voice,
      layers: (currentPlan?.layers || []).filter((l) => l.type === 'audio' && (l as any).audioType === 'voiceover'),
    },
    {
      id: 'captions',
      label: 'Captions',
      icon: MessageSquare,
      color: LAYER_COLORS.captions,
      layers: (currentPlan?.layers || []).filter((l) => l.type === 'caption'),
    },
    {
      id: 'music',
      label: 'Music',
      icon: Music,
      color: LAYER_COLORS.music,
      layers: (currentPlan?.layers || []).filter((l) => l.type === 'audio' && (l as any).audioType === 'music'),
    },
    {
      id: 'sfx',
      label: 'SFX',
      icon: Zap,
      color: LAYER_COLORS.sfx,
      layers: (currentPlan?.layers || []).filter((l) => l.type === 'audio' && (l as any).audioType === 'sfx'),
    },
    {
      id: 'text',
      label: 'Text',
      icon: Type,
      color: LAYER_COLORS.text,
      layers: (currentPlan?.layers || []).filter((l) => l.type === 'text'),
    },
    {
      id: 'images',
      label: 'Images',
      icon: Layers,
      color: LAYER_COLORS.images,
      layers: (currentPlan?.layers || []).filter((l) => l.type === 'image'),
    },
  ];

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      if (isDraggingPlayhead) {
        handleTimelineScrub(clientX);
      } else if (trimmingState) {
        const deltaPx = clientX - trimmingState.startX;
        const deltaSec = deltaPx / pxPerSec;

        if (trimmingState.edge === 'start') {
          const originalEnd = trimmingState.initialStart + trimmingState.initialDuration;
          const newStart = Math.max(
            0,
            Math.min(originalEnd - 0.2, trimmingState.initialStart + deltaSec)
          );
          const newDuration = originalEnd - newStart;
          updateLayer(trimmingState.layerId, { startTime: newStart, duration: newDuration });
        } else {
          const newDuration = Math.max(0.2, trimmingState.initialDuration + deltaSec);
          updateLayer(trimmingState.layerId, { duration: newDuration });
        }
      }
    };

    const handleUp = () => {
      if (isDraggingPlayhead) setIsDraggingPlayhead(false);
      if (trimmingState) setTrimmingState(null);
    };

    if (isDraggingPlayhead || trimmingState) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDraggingPlayhead, trimmingState, pxPerSec, currentPlan?.duration]);

  if (!currentPlan) return null;

  // Format second marks "0:00", "0:05", etc.
  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const selectedLayer = currentPlan.layers.find((l) => l.id === selectedLayerId);

  return (
    <div className="flex flex-col h-full bg-[#12121C] rounded-2xl border border-[#26263A] overflow-hidden shadow-2xl">
      {/* Top Toolbar: Clip actions & Zoom controls */}
      <div className="h-11 px-3 sm:px-4 border-b border-[#26263A] flex items-center justify-between bg-[#191927]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (selectedLayerId) {
                triggerHaptic('medium');
                splitLayerAtPlayhead(selectedLayerId);
              }
            }}
            disabled={!selectedLayerId}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold disabled:opacity-30 flex items-center gap-1.5 transition-colors touch-target"
          >
            <Scissors className="w-3.5 h-3.5 text-violet-400" />
            <span>Split</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedLayerId) {
                triggerHaptic('light');
                duplicateLayer(selectedLayerId);
              }
            }}
            disabled={!selectedLayerId}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold disabled:opacity-30 flex items-center gap-1.5 transition-colors touch-target"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedLayerId) {
                triggerHaptic('medium');
                deleteLayer(selectedLayerId);
              }
            }}
            disabled={!selectedLayerId}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-semibold disabled:opacity-30 flex items-center gap-1.5 transition-colors touch-target"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        {/* Selected Layer Info & Zoom Controls */}
        <div className="flex items-center gap-3">
          {selectedLayer && (
            <span className="text-[11px] text-[#8D8DA8] truncate max-w-[140px] sm:max-w-[200px] hidden md:inline">
              Selected: <strong className="text-white">{selectedLayer.name}</strong>
            </span>
          )}

          {/* Zoom Buttons (+ and -) */}
          <div className="flex items-center gap-1 bg-[#0A0A10] p-1 rounded-lg border border-[#26263A]">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setZoomLevel((prev) => (prev === 4 ? 2 : prev === 2 ? 1 : 1));
              }}
              disabled={zoomLevel === 1}
              className="p-1 rounded text-[#8D8DA8] hover:text-white disabled:opacity-30 transition-colors"
              title={STRINGS.studio.timeline.zoomOut}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-cyan-300 px-1 font-semibold">
              {zoomLevel}x
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setZoomLevel((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 4));
              }}
              disabled={zoomLevel === 4}
              className="p-1 rounded text-[#8D8DA8] hover:text-white disabled:opacity-30 transition-colors"
              title={STRINGS.studio.timeline.zoomIn}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Multi-Track Canvas */}
      <div
        ref={timelineContainerRef}
        onMouseDown={handleMouseDownScrub}
        className="flex-1 overflow-x-auto overflow-y-auto select-none relative scrollbar-thin"
      >
        <div style={{ width: `${timelineContentWidth}px` }} className="relative min-h-[300px] pb-6">
          {/* Top Time Ruler with JetBrains Mono marks */}
          <div className="h-7 border-b border-[#26263A] bg-[#0A0A10]/50 sticky top-0 z-20 flex">
            {/* 72px fixed gutter header */}
            <div className="w-[72px] shrink-0 border-r border-[#26263A] bg-[#12121C] sticky left-0 z-30 flex items-center px-2 text-[9px] font-mono uppercase text-[#8D8DA8]">
              Lanes
            </div>

            {/* Time ticks */}
            <div className="relative flex-1 h-full">
              {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
                if (sec % 5 !== 0 && zoomLevel === 1) return null;
                return (
                  <div
                    key={sec}
                    style={{ left: `${sec * pxPerSec}px` }}
                    className="absolute top-0 bottom-0 border-l border-[#26263A] pl-1 flex items-center text-[10px] font-mono text-[#8D8DA8]"
                  >
                    {formatSec(sec)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Crisp White Playhead Line with 12px Diamond Head */}
          <div
            style={{ left: `${72 + currentTime * pxPerSec}px` }}
            className="absolute top-0 bottom-0 w-[2px] bg-white z-40 pointer-events-none transition-none shadow-sm shadow-white/50"
          >
            {/* Draggable 12px Diamond head */}
            <div className="w-3.5 h-3.5 bg-white -ml-[6px] top-0 rotate-45 shadow-md shadow-black/80 rounded-sm" />
          </div>

          {/* 7 Lanes Stack */}
          <div className="space-y-1.5 py-2">
            {lanes.map((lane) => {
              const Icon = lane.icon;
              return (
                <div key={lane.id} className="flex h-11 relative">
                  {/* Fixed 72px Label Gutter */}
                  <div className="w-[72px] shrink-0 px-2 flex items-center gap-1.5 text-[10px] font-bold text-[#8D8DA8] uppercase tracking-wider bg-[#12121C] border-r border-[#26263A] sticky left-0 z-10 truncate">
                    <Icon className="w-3 h-3 shrink-0" style={{ color: lane.color }} />
                    <span className="truncate">{lane.label}</span>
                  </div>

                  {/* Lane Track Content */}
                  <div className="flex-1 relative bg-[#0A0A10]/30 rounded-r-lg border border-white/[0.03] overflow-hidden">
                    {lane.layers.map((layer) => {
                      const isSelected = selectedLayerId === layer.id;
                      const left = layer.startTime * pxPerSec;
                      const width = Math.max(24, layer.duration * pxPerSec);
                      const isVoiceOrMusic = lane.id === 'voice' || lane.id === 'music';

                      return (
                        <div
                          key={layer.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                            setSelectedLayerId(layer.id);
                          }}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            backgroundColor: `${lane.color}33`,
                            borderColor: isSelected ? '#FFFFFF' : `${lane.color}88`,
                          }}
                          className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between text-[11px] cursor-pointer border overflow-hidden transition-all ${
                            isSelected
                              ? 'border-2 border-white shadow-lg ring-2 ring-white/20 z-10'
                              : 'hover:brightness-125'
                          }`}
                        >
                          {/* Mini Waveform visualization inside Voice and Music lanes */}
                          {isVoiceOrMusic && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-around px-2 opacity-50">
                              {Array.from({ length: Math.min(30, Math.floor(width / 6)) }).map(
                                (_, idx) => {
                                  const h = ((idx % 5) + 2) * 3;
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        height: `${h}px`,
                                        backgroundColor: lane.color,
                                      }}
                                      className="w-[2px] rounded-full"
                                    />
                                  );
                                }
                              )}
                            </div>
                          )}

                          <span className="truncate font-semibold text-white drop-shadow-sm z-10 text-[10px]">
                            {layer.name}
                          </span>

                          <span className="text-[9px] font-mono opacity-70 z-10 shrink-0 ml-1">
                            {layer.duration.toFixed(1)}s
                          </span>

                          {/* 44px min touch target Trim Handles on Selected Block */}
                          {isSelected && (
                            <>
                              {/* Left trim handle */}
                              <div
                                onMouseDown={(e) => handleTrimStart(e, layer.id, 'start')}
                                dangerouslySetInnerHTML={{ __html: '' }}
                                className="absolute left-0 top-0 bottom-0 w-4 min-w-[24px] bg-white/80 hover:bg-white cursor-ew-resize flex items-center justify-center rounded-l-md z-20 group"
                              >
                                <div className="w-1 h-3 bg-black/60 rounded-full" />
                              </div>

                              {/* Right trim handle */}
                              <div
                                onMouseDown={(e) => handleTrimStart(e, layer.id, 'end')}
                                dangerouslySetInnerHTML={{ __html: '' }}
                                className="absolute right-0 top-0 bottom-0 w-4 min-w-[24px] bg-white/80 hover:bg-white cursor-ew-resize flex items-center justify-center rounded-r-md z-20 group"
                              >
                                <div className="w-1 h-3 bg-black/60 rounded-full" />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
