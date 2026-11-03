// "What Was Applied" Studio Audit Card displaying enforced AI decisions & notices

'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/engine/store';
import { Sparkles, ChevronDown, CheckCircle2, AlertTriangle, Sliders } from 'lucide-react';

export function AppliedDecisionsCard() {
  const { currentPlan } = useStudioStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentPlan || !currentPlan.metadata) return null;

  const applied = currentPlan.metadata.appliedDecisions || [];
  const notices = currentPlan.metadata.notices || [];

  if (applied.length === 0 && notices.length === 0) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-[#12121C] border border-[#26263A] text-xs space-y-2.5 shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between font-bold text-white text-xs min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-white">What was applied</span>
            <span className="text-[10px] text-[#8D8DA8] ml-2 font-mono font-medium">
              ({applied.length} decisions)
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#8D8DA8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-3 pt-2 border-t border-[#26263A]">
          {/* Prompt Conflict Overrides / Notices */}
          {notices.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Prompt Overrides & Notices
              </span>
              <div className="space-y-1">
                {notices.map((notice: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed"
                  >
                    {notice}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enforced Decisions Chips */}
          {applied.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-[#8D8DA8] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Enforced Edit Rules
              </span>
              <div className="flex flex-wrap gap-1.5">
                {applied.map((decision: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-[#191927] border border-white/10 text-slate-200 text-[11px] font-medium font-mono"
                  >
                    {decision}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
