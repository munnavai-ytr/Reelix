// Step-by-Step Generation Progress Overlay
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudioStore } from '../../engine/store';
import { Sparkles, CheckCircle2, Loader2, Video, FileAudio, Film, Wand2, Music } from 'lucide-react';

export function PipelineOverlay() {
  const { pipelineProgress, setPipelineProgress } = useStudioStore();

  if (!pipelineProgress) return null;

  const steps = [
    { id: 'ingest', label: 'Ingest & OPFS', icon: FileAudio },
    { id: 'transcribe', label: 'Transcribe Cadence', icon: Sparkles },
    { id: 'analyze', label: '9:16 Focal Analysis', icon: Video },
    { id: 'director', label: 'Gemini Director', icon: Wand2 },
    { id: 'assets', label: 'B-Roll & Ducked Audio', icon: Music },
    { id: 'preview', label: 'Canvas Engine Proxy', icon: Film },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl bg-[#13131E] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden"
      >
        {/* Ambient signature glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl brand-gradient flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-5 h-5 text-white animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reelix Pipeline Running</h3>
              <p className="text-xs text-slate-400">Step {pipelineProgress.stepIndex} of {pipelineProgress.totalSteps}</p>
            </div>
          </div>
          <span className="text-xl font-black font-mono brand-gradient-text">
            {pipelineProgress.percentage}%
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
            <motion.div
              className="h-full rounded-full brand-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${pipelineProgress.percentage}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{pipelineProgress.title}</span>
            <span>{pipelineProgress.percentage}%</span>
          </div>
        </div>

        {/* Step-by-Step Timeline Checkmarks */}
        <div className="space-y-2 py-2">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = idx + 1 < pipelineProgress.stepIndex;
            const isCurrent = idx + 1 === pipelineProgress.stepIndex;

            return (
              <div
                key={st.id}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-violet-500/10 border-violet-500/30 text-white'
                    : isCompleted
                    ? 'bg-white/[0.02] border-white/5 text-slate-300'
                    : 'opacity-40 border-transparent text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isCurrent ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-medium">{st.label}</span>
                </div>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Active Log Detail */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 font-mono text-[11px] text-slate-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="truncate">{pipelineProgress.detail}</span>
        </div>

        {/* Abort button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => setPipelineProgress(null)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel Pipeline
          </button>
        </div>
      </motion.div>
    </div>
  );
}
