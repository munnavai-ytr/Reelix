// WebCodecs 1080x1920 / 720x1280 MP4 Export Modal with Mobile Presets & Estimated Remaining Time
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useStudioStore } from '@/engine/store';
import { exportVideoMp4, downloadOrShareVideo, ExportProgress } from '@/pipeline/exporter';
import { Download, Share2, Sparkles, X, CheckCircle2, Film, Shield, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '@/storage/haptics';
import { BrandKitService } from '@/storage/brand-kit';
import { toast } from './Toast';
import { BRAND } from '@/ui/brand';

export function ExportModal() {
  const {
    isExporting,
    setIsExporting,
    currentPlan,
    assets,
    setExportProgress,
    exportProgress,
    exportedBlob,
    setExportedBlob,
  } = useStudioStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [isLowMemoryOrMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isNative = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    const devMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    return (devMem !== undefined && devMem <= 4) || !!isNative;
  });
  const [exportPreset, setExportPreset] = useState<'standard' | 'hq' | 'small'>('standard');
  const [resolutionPreset, setResolutionPreset] = useState<'1080x1920' | '720x1280'>('1080x1920');
  const [fpsPreset, setFpsPreset] = useState<30 | 60>(30);
  const [qualityPreset, setQualityPreset] = useState<'high' | 'medium' | 'draft'>('medium');
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [watermarkCorner, setWatermarkCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const abortControllerRef = useRef(false);

  const applyExportPreset = (preset: 'standard' | 'hq' | 'small') => {
    triggerHaptic('light');
    setExportPreset(preset);
    if (preset === 'standard') {
      setResolutionPreset('1080x1920');
      setFpsPreset(30);
      setQualityPreset('medium');
    } else if (preset === 'hq') {
      setResolutionPreset('1080x1920');
      setFpsPreset(60);
      setQualityPreset('high');
    } else if (preset === 'small') {
      setResolutionPreset('720x1280');
      setFpsPreset(30);
      setQualityPreset('draft');
    }
  };

  if (!isExporting || !currentPlan) return null;

  const handleStartExport = async () => {
    triggerHaptic('heavy');
    setIsProcessing(true);
    setExportedBlob(null);
    setDownloadUrl(null);
    abortControllerRef.current = false;

    try {
      const clonedPlan = JSON.parse(JSON.stringify(currentPlan));
      clonedPlan.fps = fpsPreset;

      // Add watermark layer if enabled
      if (includeWatermark) {
        const brand = BrandKitService.getSettings();
        const watermarkText = brand.watermarkText || BRAND.appName;
        const [w, h] = resolutionPreset === '720x1280' ? [720, 1280] : [1080, 1920];
        
        let wx = w / 2 - 140;
        let wy = h / 2 - 120;
        if (watermarkCorner === 'top-left') {
          wx = -w / 2 + 140;
          wy = -h / 2 + 80;
        } else if (watermarkCorner === 'top-right') {
          wx = w / 2 - 140;
          wy = -h / 2 + 80;
        } else if (watermarkCorner === 'bottom-left') {
          wx = -w / 2 + 140;
          wy = h / 2 - 120;
        } else {
          wx = w / 2 - 140;
          wy = h / 2 - 120;
        }

        clonedPlan.layers.push({
          id: 'brand-watermark',
          type: 'text',
          name: watermarkText,
          startTime: 0,
          duration: clonedPlan.duration,
          text: watermarkText,
          fontSize: resolutionPreset === '720x1280' ? 22 : 28,
          fontFamily: brand.defaultFontFamily || 'Inter, sans-serif',
          fontWeight: '900',
          color: 'rgba(255, 255, 255, 0.75)',
          transform: {
            x: wx,
            y: wy,
            scale: 1,
            rotation: 0,
            opacity: brand.watermarkOpacity || 0.8,
            anchorX: 0.5,
            anchorY: 0.5,
          },
          effects: [],
        });
      }

      const [w, h] = resolutionPreset === '720x1280' ? [720, 1280] : [1080, 1920];
      const bitrateMap = { high: 12_000_000, medium: 8_000_000, draft: 4_000_000 };
      const bitrate = bitrateMap[qualityPreset];

      const blob = await exportVideoMp4(
        clonedPlan,
        assets,
        (progress: ExportProgress) => {
          if (abortControllerRef.current) {
            throw new Error('Export cancelled by user');
          }
          setExportProgress(progress);
        },
        {
          width: w,
          height: h,
          fps: fpsPreset,
          bitrate,
        }
      );

      setExportedBlob(blob);
      setDownloadUrl(URL.createObjectURL(blob));
      triggerHaptic('success');

      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#06B6D4', '#FBBF24', '#FFFFFF'],
      });
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Export failed.';
      if (msg !== 'Export cancelled by user') {
        toast.error(`Export Error: ${msg}`);
      }
    }
  };

  const handleCancelExport = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
    triggerHaptic('light');
  };

  const handleDownload = () => {
    if (!exportedBlob) return;
    triggerHaptic('medium');
    const safeTitle = currentPlan.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadOrShareVideo(exportedBlob, `${safeTitle}_reelix_${resolutionPreset}_${fpsPreset}fps.mp4`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md rounded-3xl bg-[#141420] border border-white/10 shadow-2xl p-6 space-y-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Video</h3>
              <p className="text-[11px] text-slate-400">WebCodecs Hardware Encoded MP4</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExporting(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLowMemoryOrMobile && (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>720p is selected for faster mobile export (1080p is available below).</span>
          </div>
        )}

        {!isProcessing && !exportedBlob && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-white/60 mb-1.5 block">
                Export Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', title: 'Shorts / Reels', sub: '1080p · 30fps' },
                  { id: 'hq', title: 'High Quality', sub: '1080p · 60fps' },
                  { id: 'small', title: 'Small File', sub: '720p · 30fps' },
                ].map((p) => {
                  const active = exportPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyExportPreset(p.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-violet-600/30 border-violet-500 text-white'
                          : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{p.title}</div>
                      <div className="text-[10px] text-cyan-300 font-mono mt-0.5">{p.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-white">Include Brand Watermark</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeWatermark}
                  onChange={(e) => setIncludeWatermark(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {includeWatermark && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium block">
                    Watermark Position (Corner)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'top-left', label: 'Top-L' },
                      { id: 'top-right', label: 'Top-R' },
                      { id: 'bottom-left', label: 'Bottom-L' },
                      { id: 'bottom-right', label: 'Bottom-R' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setWatermarkCorner(c.id as any)}
                        className={`py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                          watermarkCorner === c.id
                            ? 'bg-cyan-600/30 border-cyan-500 text-white'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Target Resolution</span>
            <span className="font-mono text-cyan-400 font-semibold">{resolutionPreset} (9:16)</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Frame Rate</span>
            <span className="font-mono text-slate-200">{fpsPreset} fps</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Audio Normalization</span>
            <span className="font-mono text-emerald-400">Auto-Ducked ~ -14 LUFS</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Estimated Duration</span>
            <span className="font-mono text-slate-200">{currentPlan.duration.toFixed(1)}s</span>
          </div>
        </div>

        {isProcessing && exportProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">
                Frame {exportProgress.currentFrame} / {exportProgress.totalFrames}
              </span>
              <span className="brand-gradient-text font-bold">
                {exportProgress.percentage}%
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full rounded-full brand-gradient transition-all duration-150"
                style={{ width: `${exportProgress.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="capitalize">{exportProgress.phase.replace('_', ' ')}...</span>
              {exportProgress.estimatedSecRemaining !== undefined && (
                <span className="font-mono text-cyan-400 font-semibold">
                  ~{exportProgress.estimatedSecRemaining}s left
                </span>
              )}
              <button
                type="button"
                onClick={handleCancelExport}
                className="text-rose-400 hover:text-rose-300 font-semibold underline ml-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {exportedBlob && downloadUrl && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-white">MP4 Export Ready! (+50 XP)</div>
                <div className="text-[11px] text-emerald-400/90 font-mono">
                  Size: {(exportedBlob.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
            </div>

            <video
              src={downloadUrl}
              controls
              className="w-full max-h-48 rounded-2xl border border-white/10 bg-black object-contain"
            />
          </div>
        )}

        <div className="space-y-2 pt-1">
          {!exportedBlob ? (
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl brand-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-500/25 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Encoding Video Frames...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Start WebCodecs Render</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 py-3.5 rounded-2xl brand-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-500/25 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Save / Download MP4</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                title="Share via Native OS"
                className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
