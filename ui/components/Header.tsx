// Top Header Bar for Reelix Studio
'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/engine/store';
import { Undo2, Redo2, Download, Sliders, Sparkles, Film } from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { BRAND } from '@/ui/brand';
import { STRINGS } from '@/ui/strings';

export function Header() {
  const {
    currentPlan,
    setPlan,
    history,
    future,
    undo,
    redo,
    activeTab,
    setActiveTab,
    setIsExporting,
  } = useStudioStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (currentPlan && titleInput.trim()) {
      setPlan({ ...currentPlan, title: titleInput.trim() });
    }
  };

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between border-b border-[#26263A] bg-[#0A0A10]/90 backdrop-blur-xl sticky top-0 z-40">
      {/* Brand Zone */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('home');
          }}
          className="flex items-center gap-2 group text-left shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl brand-gradient flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight brand-gradient-text font-bricolage">
              {BRAND.appName}
            </span>
          </div>
        </button>

        {/* Project Title (Inline Editable in Editor) */}
        {currentPlan && activeTab === 'editor' && (
          <div className="flex items-center gap-2 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-[#26263A] text-xs text-[#8D8DA8] min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                autoFocus
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                className="bg-[#191927] border border-cyan-400 rounded-lg px-2 py-0.5 text-xs text-white outline-none w-32 sm:w-48 font-medium"
              />
            ) : (
              <span
                onClick={() => {
                  setTitleInput(currentPlan.title);
                  setIsEditingTitle(true);
                }}
                title="Click to rename"
                className="text-white font-medium truncate max-w-[120px] sm:max-w-[200px] hover:text-cyan-300 cursor-pointer transition-colors"
              >
                {currentPlan.title || STRINGS.studio.defaultProjectTitle}
              </span>
            )}
            <span className="font-mono text-cyan-400 hidden sm:inline">
              {currentPlan.duration.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* Center Zone: History Controls (when in Editor) */}
      {currentPlan && activeTab === 'editor' && (
        <div className="flex items-center gap-1 bg-[#12121C] p-1 rounded-xl border border-[#26263A]">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title={`${STRINGS.studio.undo} (Ctrl+Z)`}
            className="p-1.5 rounded-lg text-[#8D8DA8] hover:text-white disabled:opacity-30 disabled:hover:text-[#8D8DA8] transition-colors touch-target"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title={`${STRINGS.studio.redo} (Ctrl+Y)`}
            className="p-1.5 rounded-lg text-[#8D8DA8] hover:text-white disabled:opacity-30 disabled:hover:text-[#8D8DA8] transition-colors touch-target"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right Action Zone */}
      <div className="flex items-center gap-2 sm:gap-3">
        {currentPlan && activeTab === 'editor' && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setIsExporting(true);
            }}
            className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold brand-gradient text-white flex items-center gap-1.5 shadow-lg shadow-violet-500/25 hover:opacity-95 active:scale-95 transition-all touch-target"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{STRINGS.studio.exportButton}</span>
          </button>
        )}

        {activeTab !== 'create' && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('create');
            }}
            className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-[#191927] hover:bg-white/10 text-slate-200 border border-[#26263A] flex items-center gap-1.5 transition-colors touch-target"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">New Short</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('settings');
          }}
          title="Settings & API Keys"
          className="p-2 rounded-xl text-[#8D8DA8] hover:text-white hover:bg-white/5 transition-colors touch-target"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
