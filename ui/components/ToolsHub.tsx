// Standalone "All Tools" Hub Screen for Reelix
// CapCut-style quick picks, search filtering, responsive grid, and embedded tool execution with Studio preview routing.

'use client';

import React, { useState, useMemo } from 'react';
import { TOOLS, ToolDef } from '@/tools/registry';
import { useStrings } from '@/ui/strings';
import { triggerHaptic } from '@/storage/haptics';
import {
  Search,
  X,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Wrench,
  SearchX,
  Sliders,
} from 'lucide-react';

export interface ToolsHubProps {
  initialToolId?: string | null;
}

export function ToolsHub({ initialToolId = null }: ToolsHubProps) {
  const strings = useStrings();

  const [activeToolId, setActiveToolId] = useState<string | null>(initialToolId);
  const [selectedQuickPick, setSelectedQuickPick] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const enabledTools = useMemo(() => {
    return TOOLS.filter((t) => t.enabled);
  }, []);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return enabledTools;
    return enabledTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.quickPicks.some((qp) => qp.toLowerCase().includes(q))
    );
  }, [enabledTools, searchQuery]);

  // All quickPicks across enabled tools
  const allQuickPicks = useMemo(() => {
    const list: Array<{ toolId: string; prompt: string }> = [];
    for (const tool of enabledTools) {
      for (const qp of tool.quickPicks) {
        list.push({ toolId: tool.id, prompt: qp });
      }
    }
    return list;
  }, [enabledTools]);

  const activeToolDef = useMemo(() => {
    if (!activeToolId) return null;
    return enabledTools.find((t) => t.id === activeToolId) || null;
  }, [activeToolId, enabledTools]);

  const handleOpenTool = (toolId: string, initialDesc = '') => {
    triggerHaptic('medium');
    setSelectedQuickPick(initialDesc);
    setActiveToolId(toolId);
  };

  const handleBackToGrid = () => {
    triggerHaptic('light');
    setActiveToolId(null);
    setSelectedQuickPick('');
  };

  // If a tool is selected, render the tool screen inside the Hub with a top back bar
  if (activeToolDef && activeToolId) {
    const ToolComponent = activeToolDef.component;
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 pb-28 min-h-[100dvh]">
        {/* Hub Back Navigation Header */}
        <div className="flex items-center justify-between border-b border-[#26263A] pb-3">
          <button
            type="button"
            onClick={handleBackToGrid}
            className="px-3 py-2 rounded-2xl bg-[#191927] hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center gap-2 text-xs font-bold transition-all min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>{strings.toolsHub?.backToTools || 'Back to All Tools'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              {activeToolDef.category}
            </span>
          </div>
        </div>

        {/* Embedded Tool Component */}
        <ToolComponent
          key={selectedQuickPick || activeToolId}
          initialDescription={selectedQuickPick}
          onBack={handleBackToGrid}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-28 min-h-[100dvh] max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26263A] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-bricolage">
              {strings.toolsHub?.title || 'All Tools'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8D8DA8] mt-1">
            {strings.toolsHub?.subtitle ||
              'Fast single-purpose AI video creation tools & CapCut-style quick picks'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            {enabledTools.length} {enabledTools.length === 1 ? 'Tool' : 'Tools'} Available
          </span>
        </div>
      </div>

      {/* Search Input Field */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8D8DA8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={strings.toolsHub?.searchPlaceholder || 'Search tools by name, tagline, or category...'}
          className="w-full bg-[#12121C] border border-[#26263A] focus:border-cyan-400 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-cyan-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors touch-target min-h-[44px] flex items-center justify-center"
            title="Clear Search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CapCut-Style Quick Picks Row */}
      {allQuickPicks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                {strings.toolsHub?.quickPicksTitle || 'Quick picks'}
              </h2>
            </div>
            <span className="text-[11px] text-[#8D8DA8] hidden sm:inline">
              {strings.toolsHub?.quickPicksSubtitle || 'Tap a style chip to auto-fill description'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5 max-w-full">
            {allQuickPicks.map((item, idx) => (
              <button
                key={`${item.toolId}_${idx}`}
                type="button"
                onClick={() => handleOpenTool(item.toolId, item.prompt)}
                className="px-3.5 py-2 rounded-2xl bg-[#12121C] hover:bg-cyan-500/10 text-slate-200 hover:text-cyan-300 border border-[#26263A] hover:border-cyan-500/40 text-xs font-medium whitespace-nowrap transition-all shrink-0 min-h-[44px] touch-target flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
              >
                <span className="text-cyan-400 font-bold">+</span>
                <span>{item.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Responsive Tools Grid */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => {
            const ToolIcon = tool.icon;
            return (
              <div
                key={tool.id}
                className="p-5 rounded-2xl bg-[#12121C] border border-[#26263A] hover:border-cyan-500/40 transition-all space-y-4 flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <ToolIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      {tool.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-[#8D8DA8] mt-1 leading-relaxed line-clamp-2">
                      {tool.tagline}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenTool(tool.id)}
                  className="w-full py-2.5 rounded-xl brand-gradient text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                >
                  <span>{strings.toolsHub?.openTool || 'Open'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State for Search */
        <div className="p-8 sm:p-12 rounded-3xl bg-[#12121C] border border-[#26263A] text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#8D8DA8]">
            <SearchX className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {strings.toolsHub?.noToolsFoundTitle || 'No tools match your search'}
            </h3>
            <p className="text-xs text-[#8D8DA8] leading-relaxed">
              {strings.toolsHub?.noToolsFoundDesc ||
                'Try searching for "caption", "yellow", "neon", or clear search filters.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            {strings.toolsHub?.clearSearch || 'Clear Search'}
          </button>
        </div>
      )}
    </div>
  );
}
