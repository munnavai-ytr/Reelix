// Step-by-Step Generation Progress Overlay
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudioStore } from '@/engine/store';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertOctagon,
  Copy,
  Check,
  RotateCcw,
  X,
  FileAudio,
  Type,
  Video,
  Wand2,
  Music,
  Film,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { toast } from './Toast';

export function PipelineOverlay() {
  const { pipelineProgress, setPipelineProgress } = useStudioStore();
  const [elapsedSec, setElapsedSec] = useState(0);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Real 6 steps matching pipeline.ts
  const pipelineSteps = [
    { id: 1, title: 'Ingest audio & files', desc: 'Decoding audio and loading media files', icon: FileAudio },
    { id: 2, title: 'Transcribe voice & word timings', desc: 'Audio transcription and phonetic alignment', icon: Type },
    { id: 3, title: 'Analyze video clips (scenes, motion)', desc: '9:16 portrait focal detection', icon: Video },
    { id: 4, title: 'Director AI plans the edit', desc: 'Pacing, cuts, captions, effects, and audio-ducking', icon: Wand2 },
    { id: 5, title: 'Assemble & auto-duck audio', desc: 'Speech ducking and SFX integration', icon: Music },
    { id: 6, title: 'Finalize timeline', desc: 'Canvas engine proxy and final scene composition', icon: Film },
  ];

  // Elapsed timer
  useEffect(() => {
    if (pipelineProgress && !pipelineProgress.error) {
      setElapsedSec(0);
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pipelineProgress?.error, !!pipelineProgress]);

  if (!pipelineProgress) return null;

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}s`;
  };

  const copyErrorToClipboard = () => {
    if (pipelineProgress?.error) {
      navigator.clipboard.writeText(pipelineProgress.error);
      setCopied(true);
      toast.info('Error copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancel = () => {
    triggerHaptic('medium');
    setPipelineProgress(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl bg-[#12121C]/95 border border-violet-500/30 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden"
      >
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* ERROR STATE */}
        {pipelineProgress.error ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Generation failed at: {pipelineProgress.title || 'Pipeline'}
                </h3>
                <p className="text-xs text-[#8D8DA8]">
                  Step {pipelineProgress.stepIndex} of {pipelineProgress.totalSteps}
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-2xl bg-[#0A0A10] border border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-rose-300 font-semibold">
                <span>Error details</span>
                <button
                  type="button"
                  onClick={copyErrorToClipboard}
                  className="flex items-center gap-1 text-[11px] text-[#8D8DA8] hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs font-mono text-rose-200 line-clamp-3 leading-relaxed break-words">
                {pipelineProgress.error}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors touch-target"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl brand-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/20 touch-target"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE RUNNING STATE */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl brand-gradient flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Sparkles className="w-5 h-5 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-bricolage">
                    Director AI is Assembling Short
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#8D8DA8]">
                    <span>Step {pipelineProgress.stepIndex} of {pipelineProgress.totalSteps}</span>
                    <span>·</span>
                    <span className="font-mono text-cyan-400 font-semibold">{formatElapsed(elapsedSec)}</span>
                  </div>
                </div>
              </div>

              {/* Big JetBrains Mono Percentage */}
              <span className="text-2xl font-black font-mono brand-gradient-text">
                {pipelineProgress.percentage}%
              </span>
            </div>

            {/* Thick Linear Bar with Gradient */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full bg-[#191927] rounded-full overflow-hidden p-0.5 border border-[#26263A]">
                <motion.div
                  className="h-full rounded-full brand-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, pipelineProgress.percentage)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#8D8DA8]">
                <span className="truncate max-w-[280px]">{pipelineProgress.title}</span>
                <span className="font-mono">{pipelineProgress.percentage}%</span>
              </div>
            </div>

            {/* 6 Real Steps Checklist */}
            <div className="space-y-2 py-1">
              {pipelineSteps.map((st) => {
                const Icon = st.icon;
                const isCompleted = st.id < pipelineProgress.stepIndex;
                const isCurrent = st.id === pipelineProgress.stepIndex;

                return (
                  <div
                    key={st.id}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-violet-500/15 border-violet-500/40 text-white font-semibold'
                        : isCompleted
                        ? 'bg-[#191927]/60 border-[#26263A] text-slate-300'
                        : 'opacity-40 border-transparent text-[#8D8DA8]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isCurrent ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-[#8D8DA8]'
                        }`}
                      />
                      <span className="text-xs truncate">{st.title}</span>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8D8DA8]/40 block mx-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Active Log Detail */}
            {pipelineProgress.detail && (
              <div className="p-3 rounded-xl bg-[#0A0A10] border border-[#26263A] font-mono text-[11px] text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span className="truncate">{pipelineProgress.detail}</span>
              </div>
            )}

            {/* Cancel Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-[#8D8DA8] hover:text-white transition-colors touch-target px-2 py-1"
              >
                Cancel Generation
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
