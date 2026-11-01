// 3-Screen Onboarding Modal with Live Gemini Key Testing & Model Selection
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudioStore } from '../../engine/store';
import { ApiKeysService } from '../../storage/keys';
import { SystemPromptsService, PromptConfig } from '../../storage/system-prompts';
import { getFilteredModelLists, invalidateModelCache, FormattedModelOption } from '../../ai/models';
import { Key, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Video, Shield, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../storage/haptics';

export function OnboardingModal() {
  const { showOnboarding, setShowOnboarding, setActiveTab } = useStudioStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [geminiKey, setGeminiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [promptConfig, setPromptConfig] = useState<PromptConfig>(() => SystemPromptsService.getConfig());
  const [textModelOptions, setTextModelOptions] = useState<FormattedModelOption[]>([]);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  useEffect(() => {
    const keys = ApiKeysService.getKeys();
    if (keys.gemini) {
      setGeminiKey(keys.gemini);
    }
  }, []);

  const loadModels = async (force = false) => {
    setIsRefreshingModels(true);
    try {
      if (force) invalidateModelCache();
      const { textModels } = await getFilteredModelLists(force);
      setTextModelOptions(textModels);
    } catch (err) {
      console.warn('Failed to load dynamic model list in onboarding:', err);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  if (!showOnboarding) return null;

  const handleTestKey = async () => {
    triggerHaptic('medium');
    setIsTesting(true);
    setTestResult(null);

    const res = await ApiKeysService.testGemini(geminiKey);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      triggerHaptic('success');
      ApiKeysService.saveKeys({ gemini: geminiKey.trim() });
      await loadModels(true);
    } else {
      triggerHaptic('error');
    }
  };

  const handleModelChange = (key: 'selectedModel', val: string) => {
    triggerHaptic('light');
    const updated = { ...promptConfig, [key]: val };
    setPromptConfig(updated);
    SystemPromptsService.saveConfig({ [key]: val });
  };

  const handleFinish = () => {
    triggerHaptic('success');
    if (geminiKey.trim()) {
      ApiKeysService.saveKeys({ gemini: geminiKey.trim() });
    }
    SystemPromptsService.saveConfig(promptConfig);
    setShowOnboarding(false);
    setActiveTab('create');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl bg-[#14141E] border border-white/10 shadow-2xl p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-violet-500'
                    : s < step
                    ? 'w-4 bg-cyan-400'
                    : 'w-4 bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-slate-400">Step {step} of 3</span>
        </div>

        <AnimatePresence mode="wait">
          {/* SCREEN 1: WELCOME & ARCHITECTURE */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
                <Video className="w-7 h-7 text-white" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white">
                Welcome to <span className="brand-gradient-text">Reelix</span>
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                The premier on-device 1080×1920 vertical video creator and manual timeline editor. Powered by Gemini Director AI, real-time Canvas 2D effects, and WebCodecs hardware encoding.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">100% Private & Device-Local</div>
                    <div className="text-[11px] text-slate-400">All media is cached in OPFS and IndexedDB. Zero cloud uploads.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">One-Click AI Pipeline</div>
                    <div className="text-[11px] text-slate-400">Ingest, transcribe, direct, auto-duck music, and export pristine H.264 MP4.</div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setStep(2);
                  }}
                  className="w-full py-3 rounded-2xl brand-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
                >
                  <span>Connect Gemini API</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: GEMINI API KEY & LIVE TEST & MODEL SELECTION */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
                <Key className="w-7 h-7" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white">
                Enter your Gemini API Key
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                Reelix uses Gemini Flash models to structure viral edit plans, analyze video clips, and transcribe speech. Keys are saved strictly in your local device storage.
              </p>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-slate-400">
                  Google AI Studio API Key <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#0B0B0F] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Live Test Button */}
              <div className="flex gap-2">
                <button
                  onClick={handleTestKey}
                  disabled={!geminiKey.trim() || isTesting}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {isTesting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{isTesting ? 'Testing Key Live...' : 'Live Test Key'}</span>
                </button>
              </div>

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-tight">{testResult.message}</span>
                </div>
              )}

              {/* Model Selectors in Onboarding */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>AI Model Selection</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => loadModels(true)}
                    disabled={isRefreshingModels || !geminiKey.trim()}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 disabled:opacity-30"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingModels ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">AI Text & Vision Model</label>
                  <select
                    value={promptConfig.selectedModel || 'auto'}
                    onChange={e => handleModelChange('selectedModel', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:border-violet-500 focus:outline-none"
                  >
                    <option value="auto">Auto (recommended)</option>
                    {textModelOptions.map(m => (
                      <option key={m.name} value={m.name}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight">
                  Free tier: use a Flash model. Auto selects the optimal available Flash model.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    if (geminiKey.trim()) {
                      ApiKeysService.saveKeys({ gemini: geminiKey.trim() });
                    }
                    SystemPromptsService.saveConfig(promptConfig);
                    setStep(3);
                  }}
                  className="flex-1 py-3 rounded-2xl brand-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: READY TO CREATE */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white">
                You&apos;re All Set!
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                To create a vertical Short, provide either a voice recording or write a script text. The AI Director will assemble hook markers, word-timed animated captions, B-roll footage, and sound effects.
              </p>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  One-Click Creation Flow
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Hit <strong className="text-white">Generate Short</strong> and watch real progress in seconds. Then polish in the full multi-track timeline or export directly.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleFinish}
                  className="w-full py-3.5 rounded-2xl brand-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-500/30 active:scale-95 transition-all"
                >
                  <span>Start Creating</span>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
