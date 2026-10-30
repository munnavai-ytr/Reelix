// Top Header Bar for Reelix Studio
'use client';

import React from 'react';
import { useStudioStore } from '../../engine/store';
import { Undo2, Redo2, Download, Sliders, Sparkles, Film } from 'lucide-react';
import { triggerHaptic } from '../../storage/haptics';

export function Header() {
  const {
    currentPlan,
    history,
    future,
    undo,
    redo,
    activeTab,
    setActiveTab,
    setIsExporting,
  } = useStudioStore();

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-white/5 bg-[#0B0B0F]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Brand Zone */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('home');
          }}
          className="flex items-center gap-2 group text-left"
        >
          <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight brand-gradient-text">
              Reelix
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              AI Shorts Studio
            </span>
          </div>
        </button>

        {currentPlan && activeTab === 'editor' && (
          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-white/10 text-xs text-slate-400">
            <span className="text-slate-200 font-medium truncate max-w-[200px]">
              {currentPlan.title}
            </span>
            <span>·</span>
            <span className="font-mono text-violet-400">
              {currentPlan.duration.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* Center Zone: History Controls (when in Editor) */}
      {currentPlan && activeTab === 'editor' && (
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right Action Zone */}
      <div className="flex items-center gap-2 sm:gap-3">
        {currentPlan && activeTab === 'editor' && (
          <button
            onClick={() => {
              triggerHaptic('medium');
              setIsExporting(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold brand-gradient text-white flex items-center gap-1.5 shadow-lg shadow-violet-500/25 hover:opacity-95 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MP4</span>
          </button>
        )}

        {activeTab !== 'create' && (
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('create');
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-white/10 text-white hover:bg-white/15 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">New Short</span>
          </button>
        )}

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('settings');
          }}
          title="Settings & API Keys"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
