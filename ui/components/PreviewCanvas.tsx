// Real-Time 9:16 Vertical Video Preview Canvas (Unified Frame Renderer with Video Drift Sync)
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStudioStore } from '@/engine/store';
import { renderFrame } from '@/engine/renderer';
import { AudioMixer } from '@/engine/audio-mixer';
import { syncPreviewVideos } from '@/engine/media';
import { Play, Pause, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';

export function PreviewCanvas() {
  const {
    currentPlan,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    assets,
    assetVersion,
  } = useStudioStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [proxyResolution, setProxyResolution] = useState<'proxy' | 'full'>('proxy');

  const previewWidth = proxyResolution === 'proxy' ? 540 : 1080;
  const previewHeight = proxyResolution === 'proxy' ? 960 : 1920;

  // Initialize AudioMixer when plan changes
  useEffect(() => {
    const mixer = new AudioMixer();
    audioMixerRef.current = mixer;

    if (currentPlan) {
      for (const layer of currentPlan.layers) {
        if (layer.type === 'audio' && layer.src) {
          mixer.loadAudio(layer.src).catch(() => {});
        }
      }
    }

    return () => {
      mixer.stopAll();
    };
  }, [currentPlan]);

  const drawCurrentFrame = useCallback((t: number) => {
    if (!canvasRef.current || !currentPlan) return;
    const ctx = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    renderFrame(ctx, currentPlan, t, previewWidth, previewHeight, assets);
    syncPreviewVideos(currentPlan, t, assets, isPlaying);
  }, [currentPlan, previewWidth, previewHeight, assets, isPlaying, assetVersion]);

  // Main playback animation loop
  useEffect(() => {
    if (!isPlaying || !currentPlan) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioMixerRef.current?.stopAll();
      return;
    }

    // Start audio mixer once when playback begins
    if (!isMuted && audioMixerRef.current) {
      audioMixerRef.current.play(currentPlan, currentTime).catch(() => {});
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const storeState = useStudioStore.getState();
      const nextTime = storeState.currentTime + deltaSec;

      if (nextTime >= currentPlan.duration) {
        setCurrentTime(0);
        setIsPlaying(false);
        audioMixerRef.current?.stopAll();
        return;
      }

      setCurrentTime(nextTime);
      drawCurrentFrame(nextTime);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioMixerRef.current?.stopAll();
    };
  }, [isPlaying, currentPlan, isMuted, drawCurrentFrame, setCurrentTime, setIsPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      drawCurrentFrame(currentTime);
    }
  }, [currentTime, isPlaying, drawCurrentFrame, assetVersion]);

  const togglePlay = () => {
    triggerHaptic('light');
    if (!currentPlan) return;
    if (currentTime >= currentPlan.duration) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newT = parseFloat(e.target.value);
    setCurrentTime(newT);
    drawCurrentFrame(newT);
    if (isPlaying && !isMuted && audioMixerRef.current && currentPlan) {
      audioMixerRef.current.play(currentPlan, newT).catch(() => {});
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  if (!currentPlan) return null;

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center p-3 sm:p-4 bg-[#0E0E16] rounded-3xl border border-white/5 shadow-2xl relative">
      <div className="w-full max-w-[340px] sm:max-w-[380px] flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-200 font-semibold">{formatTime(currentTime)}</span>
          <span>/</span>
          <span className="font-mono text-slate-400">{formatTime(currentPlan.duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic('light');
              setProxyResolution(proxyResolution === 'proxy' ? 'full' : 'proxy');
            }}
            title="Toggle Preview Resolution"
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-colors ${
              proxyResolution === 'proxy'
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}
          >
            {proxyResolution === 'proxy' ? '540p Proxy' : '1080p FHD'}
          </button>
          <button
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (nextMuted) {
                audioMixerRef.current?.stopAll();
              } else if (isPlaying && currentPlan) {
                audioMixerRef.current?.play(currentPlan, currentTime).catch(() => {});
              }
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div
        className="relative w-[280px] h-[498px] sm:w-[320px] sm:h-[568px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0B0B0F] group cursor-pointer"
        onClick={togglePlay}
      >
        <canvas
          ref={canvasRef}
          width={previewWidth}
          height={previewHeight}
          className="w-full h-full object-contain"
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity">
            <div className="w-14 h-14 rounded-full brand-gradient flex items-center justify-center shadow-xl shadow-violet-500/30 text-white pl-1 scale-100 group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-white" />
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-[340px] sm:max-w-[380px] space-y-2 mt-3">
        <input
          type="range"
          min={0}
          max={currentPlan.duration}
          step={0.05}
          value={currentTime}
          onChange={handleScrub}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setCurrentTime(0);
                drawCurrentFrame(0);
                if (isPlaying && currentPlan && !isMuted) {
                  audioMixerRef.current?.play(currentPlan, 0).catch(() => {});
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Canvas 2D</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
