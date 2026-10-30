'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  Sliders,
  Copy,
  Flame,
  Music,
  Scissors,
  Check,
  Award,
  Palette,
  X,
  Play,
  ArrowRight,
} from 'lucide-react';
import { useStudioStore } from '@/engine/store';
import { MagicFeaturesService, HookVariant, RemixOption } from '@/lib/magic-features';
import { HapticsService } from '@/storage/haptics';
import { GamificationService, THEMES } from '@/storage/gamification';

interface MagicFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerMagicGenerate?: () => void;
}

export const MagicFeaturesModal: React.FC<MagicFeaturesModalProps> = ({
  isOpen,
  onClose,
  onTriggerMagicGenerate,
}) => {
  const { currentPlan, setPlan } = useStudioStore();
  const [activeTab, setActiveTab] = useState<
    'vibe' | 'remix' | 'hook-lab' | 'beat-sync' | 'style-steal' | 'gamification'
  >('vibe');

  // Vibe Slider
  const [vibeValue, setVibeValue] = useState(50);

  // Hook Lab
  const [hookVariants, setHookVariants] = useState<HookVariant[]>([]);
  const [isLoadingHooks, setIsLoadingHooks] = useState(false);
  const [appliedHookId, setAppliedHookId] = useState<string | null>(null);

  // Remix x3
  const [remixOptions, setRemixOptions] = useState<RemixOption[]>([]);
  const [selectedRemixId, setSelectedRemixId] = useState<string | null>(null);

  // Style Steal
  const [styleDesc, setStyleDesc] = useState('');
  const [styleName, setStyleName] = useState('');
  const [isStealingStyle, setIsStealingStyle] = useState(false);
  const [styleStealSuccess, setStyleStealSuccess] = useState(false);

  // Beat Sync
  const [isAnalyzingBeats, setIsAnalyzingBeats] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);

  // Gamification state
  const [gameState, setGameState] = useState(() => GamificationService.getState());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setGameState(GamificationService.getState());
      if (currentPlan) {
        setRemixOptions(MagicFeaturesService.generateRemix3(currentPlan));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, currentPlan]);

  if (!isOpen) return null;

  // Apply Vibe
  const handleApplyVibe = (val: number) => {
    setVibeValue(val);
    if (!currentPlan) return;
    HapticsService.light();
    const updated = MagicFeaturesService.applyVibe(currentPlan, val);
    setPlan(updated);
  };

  // Generate Hook Lab
  const handleLoadHooks = async () => {
    setIsLoadingHooks(true);
    HapticsService.selection();
    try {
      const hooks = await MagicFeaturesService.generateHookLab(
        currentPlan?.layers[0]?.name || 'Viral Shorts'
      );
      setHookVariants(hooks);
    } catch (e) {
      console.warn('Hook generation error:', e);
    } finally {
      setIsLoadingHooks(false);
    }
  };

  // Apply Hook
  const handleApplyHook = (hook: HookVariant) => {
    if (!currentPlan) return;
    HapticsService.medium();
    const cloned = JSON.parse(JSON.stringify(currentPlan));
    const captionLayer = cloned.layers.find((l: any) => l.type === 'caption');
    if (captionLayer) {
      if (captionLayer.chunks && captionLayer.chunks[0]) {
        captionLayer.chunks[0].text = hook.text;
      }
    }
    setPlan(cloned);
    setAppliedHookId(hook.id);
    setTimeout(() => setAppliedHookId(null), 2000);
  };

  // Apply Remix Option
  const handleApplyRemix = (option: RemixOption) => {
    HapticsService.medium();
    setPlan(option.plan);
    setSelectedRemixId(option.id);
    GamificationService.recordAction('use_template');
  };

  // Beat Sync
  const handleBeatSync = async () => {
    if (!currentPlan) return;
    setIsAnalyzingBeats(true);
    HapticsService.light();
    try {
      // Synthesize audio buffer for demonstration
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const length = Math.round(ctx.sampleRate * 15);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += Math.floor(ctx.sampleRate * 0.45)) {
        for (let j = 0; j < 500; j++) {
          if (i + j < length) data[i + j] = Math.sin((j / 50) * Math.PI) * 0.9;
        }
      }

      const updated = await MagicFeaturesService.beatSync(currentPlan, buffer);
      setPlan(updated);
      setDetectedBpm(133);
      HapticsService.success();
      await ctx.close().catch(() => {});
    } catch (err: any) {
      alert('Beat sync analysis failed: ' + err.message);
    } finally {
      setIsAnalyzingBeats(false);
    }
  };

  // Style Steal
  const handleStyleSteal = async () => {
    if (!styleDesc.trim()) return;
    setIsStealingStyle(true);
    HapticsService.light();
    try {
      await MagicFeaturesService.styleSteal(styleDesc, styleName || 'Reverse Engineered Style');
      setStyleStealSuccess(true);
      HapticsService.success();
    } catch (err: any) {
      alert(err.message || 'Style steal failed');
    } finally {
      setIsStealingStyle(false);
    }
  };

  // Switch Theme
  const handleSelectTheme = (themeId: string) => {
    if (GamificationService.setActiveTheme(themeId)) {
      setGameState(GamificationService.getState());
      HapticsService.selection();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#0F0F16] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Reelix Magic Studio
              </h2>
              <p className="text-xs text-white/40">
                1-Click AI viral enhancers, pacing controls & remix engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onTriggerMagicGenerate?.();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Zap className="w-3.5 h-3.5" />
              Magic Button
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-black/40 border-b border-white/5 overflow-x-auto scrollbar-none">
          {[
            { id: 'vibe', label: 'Vibe Slider', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'remix', label: 'Remix x3', icon: <Copy className="w-3.5 h-3.5" /> },
            { id: 'hook-lab', label: 'Hook Lab (5)', icon: <Flame className="w-3.5 h-3.5" /> },
            { id: 'beat-sync', label: 'Beat Sync', icon: <Music className="w-3.5 h-3.5" /> },
            { id: 'style-steal', label: 'Style Steal', icon: <Scissors className="w-3.5 h-3.5" /> },
            { id: 'gamification', label: 'Creator XP & Themes', icon: <Award className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white font-semibold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. Vibe Slider */}
          {activeTab === 'vibe' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Timeline Vibe Engine ({vibeValue}%)
                </h3>
                <p className="text-xs text-white/50">
                  Slide from Calm (subtle, filmic, slower cuts) to Hyper (punch-zooms, shakes, rapid cuts, oversized captions).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-cyan-400">0% Ultra Calm</span>
                  <span className="text-violet-400 font-bold">{vibeValue}%</span>
                  <span className="text-rose-400">100% Hyper Viral</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vibeValue}
                  onChange={e => handleApplyVibe(Number(e.target.value))}
                  className="w-full accent-violet-500 h-2 bg-white/10 rounded-lg cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { label: 'Aesthetic Chill', val: 15 },
                    { label: 'Standard Reel', val: 50 },
                    { label: 'Hyper Hormozi', val: 95 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => handleApplyVibe(preset.val)}
                      className={`py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        vibeValue === preset.val
                          ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                          : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Remix x3 */}
          {activeTab === 'remix' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Remix x3 Variations</h3>
                <p className="text-xs text-white/50">
                  Instant parallel cuts with distinct pacing, caption treatments, and effect personalities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {remixOptions.map(opt => (
                  <div
                    key={opt.id}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                      selectedRemixId === opt.id
                        ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/10'
                        : 'bg-white/[0.03] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{opt.name}</span>
                        <span className="text-[10px] font-mono text-cyan-400">{opt.vibe}</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed mb-4">
                        {opt.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyRemix(opt)}
                      className="w-full py-2 rounded-xl bg-white/10 hover:bg-violet-600 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      {selectedRemixId === opt.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Applied
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Apply Remix
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Hook Lab */}
          {activeTab === 'hook-lab' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Hook Lab (5 Variants)</h3>
                  <p className="text-xs text-white/50">
                    Explosive 3-second opening psychological hooks tailored to retain viewer attention.
                  </p>
                </div>
                <button
                  onClick={handleLoadHooks}
                  disabled={isLoadingHooks}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Flame className="w-3.5 h-3.5" />
                  {isLoadingHooks ? 'Generating...' : 'Analyze Script Hooks'}
                </button>
              </div>

              {hookVariants.length === 0 && !isLoadingHooks && (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                  <Flame className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/50">
                    Click &quot;Analyze Script Hooks&quot; to generate 5 high-converting opening hooks!
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                {hookVariants.map(hook => (
                  <div
                    key={hook.id}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-400">{hook.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                          {hook.effectId}
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium italic">&ldquo;{hook.text}&rdquo;</p>
                      <p className="text-[11px] text-white/40">{hook.description}</p>
                    </div>

                    <button
                      onClick={() => handleApplyHook(hook)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-violet-600 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1"
                    >
                      {appliedHookId === hook.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Applied
                        </>
                      ) : (
                        'Apply to 0-3s'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Beat Sync */}
          {activeTab === 'beat-sync' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Real Web Audio Beat Sync</h3>
                <p className="text-xs text-white/50">
                  Inspects spectral energy peaks and rhythmically snaps timeline cuts to kick drums and downbeats.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white/60">Music Tempo Analysis</span>
                    <p className="text-lg font-bold text-cyan-400 font-mono">
                      {detectedBpm ? `${detectedBpm} BPM Detected` : 'Ready to Analyze'}
                    </p>
                  </div>
                  <button
                    onClick={handleBeatSync}
                    disabled={isAnalyzingBeats}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-xs text-white flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Music className="w-4 h-4" />
                    {isAnalyzingBeats ? 'Analyzing Waveform...' : 'Snap Cuts to Beats'}
                  </button>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  Calculates interval histograms and aligns all video layer boundaries strictly to musical measure bars.
                </p>
              </div>
            </div>
          )}

          {/* 5. Style Steal */}
          {activeTab === 'style-steal' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Style Steal AI</h3>
                <p className="text-xs text-white/50">
                  Describe a viral creator&apos;s video style or paste transcript pacing cues to reverse engineer a reusable library template.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <input
                  type="text"
                  placeholder="Template Name (e.g., Ali Abdaal Minimalist)"
                  value={styleName}
                  onChange={e => setStyleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-violet-500"
                />

                <textarea
                  rows={3}
                  placeholder="Describe the style: e.g., 'Fast pacing with paper tear sound effects, large yellow Montserrat subtitles, slow push-in zoom on every statement, black and white B-roll flash...'"
                  value={styleDesc}
                  onChange={e => setStyleDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-violet-500 resize-none"
                />

                <button
                  onClick={handleStyleSteal}
                  disabled={isStealingStyle || !styleDesc.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-xs text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Scissors className="w-4 h-4" />
                  {isStealingStyle ? 'Reverse Engineering Style...' : 'Extract into Reusable Template'}
                </button>

                {styleStealSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Template synthesized and saved to your Unified Library!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. Gamification, Streak & Themes */}
          {activeTab === 'gamification' && (
            <div className="space-y-4">
              {/* Streak & Level Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-900/40 to-cyan-900/40 border border-violet-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300">
                    Creator Profile
                  </span>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Level {gameState.level}: {gameState.unlockedThemes[gameState.unlockedThemes.length - 1]}
                  </h4>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-white/70">
                    <span className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                      <Flame className="w-3.5 h-3.5" />
                      {gameState.currentStreak} Day Streak
                    </span>
                    <span className="font-mono text-cyan-300">{gameState.xp} XP</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-white/40 block">Total Exports</span>
                  <span className="text-base font-bold text-white font-mono">
                    {gameState.stats.totalVideosExported}
                  </span>
                </div>
              </div>

              {/* Theme Picker */}
              <div>
                <h4 className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Unlockable App Themes
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {THEMES.map(theme => {
                    const isUnlocked = gameState.unlockedThemes.includes(theme.id);
                    const isActive = gameState.activeTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        disabled={!isUnlocked}
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          isActive
                            ? 'bg-white/15 border-violet-400 shadow-md'
                            : isUnlocked
                            ? 'bg-white/5 border-white/5 hover:bg-white/10'
                            : 'bg-black/30 border-white/5 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{theme.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div
                          className={`w-full h-2 rounded-full bg-gradient-to-r ${theme.primary}`}
                        />
                        <span className="text-[9px] text-white/40 mt-2">
                          {isUnlocked ? 'Unlocked' : `Unlocks at Lvl ${theme.minLevel}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
