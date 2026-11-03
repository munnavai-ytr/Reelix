// Compact "Edit Options" Panel for CreateWizard
// Allows explicit user control over AI automatic decisions with Auto/On/Off switches & parameter controls

'use client';

import React, { useState, useEffect } from 'react';
import { EditControls } from '@/pipeline/types';
import { COLOR_LOOKS, ColorLookPreset } from '@/pipeline/color-looks';
import { Registry } from '@/registry';
import { triggerHaptic } from '@/storage/haptics';
import { Sliders, RotateCcw, ChevronDown, Sparkles, Volume2, Mic, Scissors, Music, Type, Zap, Layers, Palette } from 'lucide-react';

export interface EditControlsPanelProps {
  controls: EditControls;
  onChange: (newControls: EditControls) => void;
  onReset: () => void;
}

export function EditControlsPanel({ controls, onChange, onReset }: EditControlsPanelProps) {
  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640);

  const updateField = <K extends keyof EditControls>(field: K, value: EditControls[K]) => {
    triggerHaptic('light');
    onChange({
      ...controls,
      [field]: value,
    });
  };

  const captionStyles = Registry.listCaptionStyles();

  return (
    <div className="p-4 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-3">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm hover:text-cyan-300 transition-colors min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
        >
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Edit options (Customise AI decisions)</span>
          <ChevronDown className={`w-4 h-4 text-[#8D8DA8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8D8DA8] hover:text-white border border-white/5 text-[11px] font-semibold flex items-center gap-1.5 transition-colors min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          title="Reset all edit controls to Auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset to Auto</span>
        </button>
      </div>

      {/* Expandable Controls Container */}
      {isOpen && (
        <div className="space-y-4 pt-3 border-t border-[#26263A]">
          {/* Row 1: Remove Silences */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Remove Silences</span>
                <p className="text-[10px] text-[#8D8DA8]">Cut dead air pauses from spoken audio</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
                {(['auto', 'on', 'off'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateField('silence', { ...controls.silence, mode: m })}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[40px] touch-target ${
                      controls.silence.mode === m
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-[#8D8DA8] hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {controls.silence.mode !== 'off' && (
                <select
                  value={controls.silence.minSec}
                  onChange={(e) =>
                    updateField('silence', { ...controls.silence, minSec: parseFloat(e.target.value) })
                  }
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 min-h-[40px]"
                >
                  <option value={0.3}>Min 0.3s pause</option>
                  <option value={0.45}>Min 0.45s pause</option>
                  <option value={0.8}>Min 0.8s pause</option>
                </select>
              )}
            </div>
          </div>

          {/* Row 2: Sound Effects (SFX) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Sound Effects (SFX)</span>
                <p className="text-[10px] text-[#8D8DA8]">Swishes, pops, hits & cut impacts</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
                {(['auto', 'on', 'off'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateField('sfx', { ...controls.sfx, mode: m })}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[40px] touch-target ${
                      controls.sfx.mode === m
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold'
                        : 'text-[#8D8DA8] hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {controls.sfx.mode !== 'off' && (
                <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-medium">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateField('sfx', { ...controls.sfx, level: lvl })}
                      className={`px-2.5 py-1 rounded-lg capitalize transition-all min-h-[38px] ${
                        controls.sfx.level === lvl
                          ? 'bg-white/10 text-white font-bold'
                          : 'text-[#8D8DA8] hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Background Music */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Background Music</span>
                <p className="text-[10px] text-[#8D8DA8]">Background track with auto-ducking</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
              <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
                {(['auto', 'on', 'off'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateField('music', { ...controls.music, mode: m })}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[40px] touch-target ${
                      controls.music.mode === m
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-[#8D8DA8] hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {controls.music.mode !== 'off' && (
                <div className="flex items-center gap-3 w-full sm:w-auto pt-1 sm:pt-0">
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                    <span className="text-[10px] font-mono text-[#8D8DA8]">Vol:</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={controls.music.volume}
                      onChange={(e) =>
                        updateField('music', { ...controls.music, volume: parseInt(e.target.value, 10) })
                      }
                      className="w-20 accent-amber-400 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-amber-400 w-8">{controls.music.volume}%</span>
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={controls.music.duck}
                      onChange={(e) => updateField('music', { ...controls.music, duck: e.target.checked })}
                      className="w-3.5 h-3.5 rounded accent-amber-400"
                    />
                    <span>Duck voice</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Hook Text at Start */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Hook Text at Start</span>
                <p className="text-[10px] text-[#8D8DA8]">Bold headline banner in first 2 seconds</p>
              </div>
            </div>

            <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold self-end sm:self-auto">
              {(['auto', 'on', 'off'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateField('hook', m)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[40px] touch-target ${
                    controls.hook === m
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-[#8D8DA8] hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: Captions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Animated Captions</span>
                <p className="text-[10px] text-[#8D8DA8]">Word-by-word synchronized subtitles</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
                {(['auto', 'on', 'off'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateField('captions', { ...controls.captions, mode: m })}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[40px] touch-target ${
                      controls.captions.mode === m
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-[#8D8DA8] hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {controls.captions.mode !== 'off' && (
                <select
                  value={controls.captions.styleId}
                  onChange={(e) =>
                    updateField('captions', { ...controls.captions, styleId: e.target.value })
                  }
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 min-h-[40px] max-w-[180px]"
                >
                  {captionStyles.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Row 6: Visual Effects */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Visual Effects</span>
                <p className="text-[10px] text-[#8D8DA8]">Zoom punches, glows & motion effects</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
                {(['auto', 'off'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateField('effects', { ...controls.effects, mode: m })}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[40px] touch-target ${
                      controls.effects.mode === m
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold'
                        : 'text-[#8D8DA8] hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {controls.effects.mode !== 'off' && (
                <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-medium">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateField('effects', { ...controls.effects, intensity: lvl })}
                      className={`px-2.5 py-1 rounded-lg capitalize transition-all min-h-[38px] ${
                        controls.effects.intensity === lvl
                          ? 'bg-white/10 text-white font-bold'
                          : 'text-[#8D8DA8] hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 7: Transitions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Transitions</span>
                <p className="text-[10px] text-[#8D8DA8]">Crossfades & dynamic scene cuts</p>
              </div>
            </div>

            <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold self-end sm:self-auto">
              {(['auto', 'off'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateField('transitions', m)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[40px] touch-target ${
                    controls.transitions === m
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                      : 'text-[#8D8DA8] hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Row 8: Cut Speed */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Cut Speed</span>
                <p className="text-[10px] text-[#8D8DA8]">Target scene cut duration range</p>
              </div>
            </div>

            <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold self-end sm:self-auto">
              {[
                { id: 'slow', label: 'Slow (4-6s)' },
                { id: 'normal', label: 'Normal (2.5-4s)' },
                { id: 'fast', label: 'Fast (1.5-2.5s)' },
              ].map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => updateField('cutSpeed', sp.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all min-h-[40px] touch-target ${
                    controls.cutSpeed === sp.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-[#8D8DA8] hover:text-white'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 9: Color Look */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#191927] border border-white/5">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white">Color Look</span>
                <p className="text-[10px] text-[#8D8DA8]">LUT color grading style</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
              {(['auto', 'none', 'cinematic', 'bright', 'natural'] as const).map((look) => (
                <button
                  key={look}
                  type="button"
                  onClick={() => updateField('colorLook', look)}
                  className={`px-2.5 py-1.5 rounded-lg capitalize text-xs transition-all min-h-[40px] touch-target ${
                    controls.colorLook === look
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                      : 'bg-black/30 text-[#8D8DA8] hover:text-white border border-white/5'
                  }`}
                >
                  {COLOR_LOOKS[look as ColorLookPreset]?.label || look}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
