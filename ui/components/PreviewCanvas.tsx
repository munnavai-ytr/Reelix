// Real-Time 9:16 Vertical Video Preview Canvas (Unified Frame Renderer with Video Drift Sync & Tab Pause)
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStudioStore } from '@/engine/store';
import { renderFrame } from '@/engine/renderer';
import { AudioMixer } from '@/engine/audio-mixer';
import { syncPreviewVideos } from '@/engine/media';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Repeat } from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { BRAND } from '@/ui/brand';

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
  const [isLooping, setIsLooping] = useState(false);
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
      mixer.close().catch(() => {});
    };
  }, [currentPlan]);

  // Pause rendering when document/tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlaying) {
        setIsPlaying(false);
        audioMixerRef.current?.stopAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, setIsPlaying]);

  const drawCurrentFrame = useCallback(
    (t: number) => {
      if (!canvasRef.current || !currentPlan) return;
      const ctx = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return;

      renderFrame(ctx, currentPlan, t, previewWidth, previewHeight, assets);
      syncPreviewVideos(currentPlan, t, assets, isPlaying);
    },
    [currentPlan, previewWidth, previewHeight, assets, isPlaying, assetVersion]
  );

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
      if (document.visibilityState === 'hidden') {
        setIsPlaying(false);
        audioMixerRef.current?.stopAll();
        return;
      }

      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const storeState = useStudioStore.getState();
      const nextTime = storeState.currentTime + deltaSec;

      if (nextTime >= currentPlan.duration) {
        if (isLooping) {
          setCurrentTime(0);
          drawCurrentFrame(0);
          if (!isMuted && audioMixerRef.current) {
            audioMixerRef.current.play(currentPlan, 0).catch(() => {});
          }
          animFrameRef.current = requestAnimationFrame(loop);
          return;
        } else {
          setCurrentTime(0);
          setIsPlaying(false);
          audioMixerRef.current?.stopAll();
          return;
        }
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
  }, [isPlaying, currentPlan, isMuted, isLooping, drawCurrentFrame, setCurrentTime, setIsPlaying]);

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
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentPlan) return null;

  const duration = currentPlan.duration || 1;
  const progressRatio = Math.min(1, Math.max(0, currentTime / duration));
  const isHookWindow = currentTime <= 3.0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center p-3 sm:p-4 bg-[#12121C] rounded-3xl border border-[#26263A] shadow-2xl relative w-full max-w-[420px]"
    >
      {/* 9:16 Canvas Frame with Top Overlays */}
      <div
        className="relative w-[280px] h-[498px] sm:w-[320px] sm:h-[568px] rounded-2xl overflow-hidden shadow-2xl border border-[#26263A] bg-[#0A0A10] group cursor-pointer"
        onClick={togglePlay}
      >
        <canvas
          ref={canvasRef}
          width={previewWidth}
          height={previewHeight}
          className="w-full h-full object-contain"
        />

        {/* TOP-LEFT HOOK CHIP */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors shadow-lg ${
              isHookWindow
                ? 'bg-[#FBBF24] text-black shadow-amber-500/20'
                : 'bg-black/60 text-[#8D8DA8] border border-white/10'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isHookWindow ? 'bg-black animate-pulse' : 'bg-[#8D8DA8]'
              }`}
            />
            <span>Hook · {formatTime(currentTime)}</span>
          </span>
        </div>

        {/* TOP-RIGHT 1080P BADGE */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/60 border border-white/10 text-cyan-300">
            {BRAND.canonicalResolution.split('×')[0]}p
          </span>
        </div>

        {/* Pause Overlay with Play Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px] transition-opacity">
            <div className="w-14 h-14 rounded-full brand-gradient flex items-center justify-center shadow-xl shadow-violet-500/30 text-white pl-1 scale-100 group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-white" />
            </div>
          </div>
        )}
      </div>

      {/* TRANSPORT ROW UNDER CANVAS */}
      <div className="w-full max-w-[320px] sm:max-w-[340px] space-y-3 mt-4">
        {/* Scrubber with gradient fill up to playhead */}
        <div className="space-y-1">
          <div className="relative h-2 w-full bg-[#191927] rounded-full overflow-hidden border border-[#26263A] cursor-pointer">
            <div
              className="absolute left-0 top-0 bottom-0 brand-gradient rounded-full"
              style={{ width: `${progressRatio * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration}
              step={0.05}
              value={currentTime}
              aria-label="Timeline scrubber"
              onChange={handleScrub}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#8D8DA8]">
            <span className="text-white font-semibold">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Bar: Play / Loop / Mute / Reset */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrentTime(0);
                drawCurrentFrame(0);
                if (isPlaying && currentPlan && !isMuted) {
                  audioMixerRef.current?.play(currentPlan, 0).catch(() => {});
                }
              }}
              title="Reset to 0:00"
              className="p-2 rounded-xl text-[#8D8DA8] hover:text-white hover:bg-white/5 transition-colors touch-target"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* 48px Round Play/Pause with Gradient Border */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-full p-[2px] brand-gradient flex items-center justify-center shadow-lg shadow-violet-500/25 active:scale-95 transition-transform touch-target"
          >
            <div className="w-full h-full rounded-full bg-[#12121C] flex items-center justify-center text-white">
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </div>
          </button>

          {/* Right Toggles: Loop & Mute & Resolution */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsLooping(!isLooping);
              }}
              title={isLooping ? 'Looping enabled' : 'Looping disabled'}
              className={`p-2 rounded-xl transition-colors touch-target ${
                isLooping
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'text-[#8D8DA8] hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (nextMuted) {
                  audioMixerRef.current?.stopAll();
                } else if (isPlaying && currentPlan) {
                  audioMixerRef.current?.play(currentPlan, currentTime).catch(() => {});
                }
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-2 rounded-xl text-[#8D8DA8] hover:text-white transition-colors touch-target"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setProxyResolution(proxyResolution === 'proxy' ? 'full' : 'proxy');
              }}
              title="Toggle preview resolution (540p / 1080p)"
              className="px-2 py-1 rounded-lg text-[10px] font-mono border border-[#26263A] bg-[#191927] text-[#8D8DA8] hover:text-white transition-colors"
            >
              {proxyResolution === 'proxy' ? '540p' : '1080p'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
