// 3-Step Skippable Onboarding Modal with Live API Testing & Coach-Mark Tour
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudioStore } from '@/engine/store';
import { ApiKeysService } from '@/storage/keys';
import {
  Key,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Scissors,
  Wand2,
  X,
  Languages,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { BRAND } from '@/ui/brand';
import { useStrings } from '@/ui/strings';

export function OnboardingModal() {
  const strings = useStrings();
  const { showOnboarding, setShowOnboarding, setActiveTab } = useStudioStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [geminiKey, setGeminiKey] = useState(() => ApiKeysService.getKeys().gemini || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showOptionalKeys, setShowOptionalKeys] = useState(false);
  const [optionalKeys, setOptionalKeys] = useState(() => ({
    pexels: ApiKeysService.getKeys().pexels || '',
    jamendo: ApiKeysService.getKeys().jamendo || '',
    freesound: ApiKeysService.getKeys().freesound || '',
  }));

  if (!showOnboarding) return null;

  const handleTestKey = async () => {
    triggerHaptic('medium');
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await ApiKeysService.testGemini(geminiKey);
      setTestResult(res);

      if (res.success) {
        triggerHaptic('success');
        ApiKeysService.saveKeys({ gemini: geminiKey.trim() });
      } else {
        triggerHaptic('error');
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : strings.onboarding.keyTestedFail,
      });
      triggerHaptic('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndFinish = () => {
    triggerHaptic('success');
    if (geminiKey.trim()) {
      ApiKeysService.saveKeys({ gemini: geminiKey.trim() });
    }
    if (showOptionalKeys) {
      ApiKeysService.saveKeys({
        pexels: optionalKeys.pexels.trim(),
        jamendo: optionalKeys.jamendo.trim(),
        freesound: optionalKeys.freesound.trim(),
      });
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('reelix_tour_seen', 'true');
    }
    setShowOnboarding(false);
    setActiveTab('create');
  };

  const handleSkip = () => {
    triggerHaptic('light');
    if (geminiKey.trim()) {
      ApiKeysService.saveKeys({ gemini: geminiKey.trim() });
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('reelix_tour_seen', 'true');
    }
    setShowOnboarding(false);
  };

  const LogoComponent = BRAND.logo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl bg-[#12121C] border border-[#26263A] shadow-2xl p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Indicator & Skip Button */}
        <div className="flex items-center justify-between mb-6 relative z-10">
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
            <span className="text-xs font-mono text-[#8D8DA8] ml-2">
              {step} / 3
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-[#8D8DA8] hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
          >
            <span>{strings.onboarding.skip}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: WELCOME & REAL BENEFITS */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4 relative z-10"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                  <LogoComponent className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-bricolage">
                    {strings.onboarding.step1Title}
                  </h2>
                  <p className="text-xs text-[#8D8DA8]">
                    {BRAND.tagline}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-manrope">
                {strings.onboarding.step1Subtitle}
              </p>

              {/* 3 Real Benefit Lines */}
              <div className="space-y-2.5 pt-1">
                {/* Benefit 1 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#191927] border border-[#26263A]">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {strings.onboarding.benefits[0].title}
                    </div>
                    <div className="text-[11px] text-[#8D8DA8] leading-tight">
                      {strings.onboarding.benefits[0].desc}
                    </div>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#191927] border border-[#26263A]">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {strings.onboarding.benefits[1].title}
                    </div>
                    <div className="text-[11px] text-[#8D8DA8] leading-tight">
                      {strings.onboarding.benefits[1].desc}
                    </div>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#191927] border border-[#26263A]">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Languages className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {strings.onboarding.benefits[2].title}
                    </div>
                    <div className="text-[11px] text-[#8D8DA8] leading-tight">
                      {strings.onboarding.benefits[2].desc}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setStep(2);
                  }}
                  className="w-full py-3.5 rounded-2xl brand-gradient text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 active:scale-95 transition-all touch-target"
                >
                  <span>{strings.onboarding.continue}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: API SETUP & REAL TEST */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4 relative z-10 max-h-[70vh] overflow-y-auto pr-1"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-bricolage">
                    {strings.onboarding.step2Title}
                  </h2>
                  <p className="text-[11px] text-[#8D8DA8]">
                    {strings.onboarding.step2Subtitle}
                  </p>
                </div>
              </div>

              {/* Gemini Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    {strings.onboarding.geminiKeyLabel}
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1"
                  >
                    <span>{strings.onboarding.getFreeKey}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type="password"
                    placeholder={strings.onboarding.geminiKeyPlaceholder}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs font-mono focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              {/* Live Test Button */}
              <button
                type="button"
                onClick={handleTestKey}
                disabled={!geminiKey.trim() || isTesting}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>{isTesting ? strings.onboarding.testingKey : strings.onboarding.testKeyButton}</span>
              </button>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
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
                  <span className="leading-tight">
                    {testResult.message}
                  </span>
                </div>
              )}

              {/* Privacy Security Callout */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-300">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>On-Device Privacy: Keys remain securely stored in your local browser storage.</span>
              </div>

              {/* Optional Keys ("Add Later" group) */}
              <div className="pt-1 border-t border-[#26263A]">
                <button
                  type="button"
                  onClick={() => setShowOptionalKeys(!showOptionalKeys)}
                  className="w-full flex items-center justify-between text-xs text-[#8D8DA8] hover:text-white py-1.5 transition-colors"
                >
                  <span className="font-semibold">{strings.onboarding.addLaterTitle}</span>
                  {showOptionalKeys ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showOptionalKeys && (
                  <div className="space-y-3 pt-2">
                    {strings.onboarding.optionalKeys.map((item, idx) => {
                      const keyName = idx === 0 ? 'pexels' : idx === 1 ? 'jamendo' : 'freesound';
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-medium text-slate-300">{item.name}</span>
                            <span className="text-[#8D8DA8]">{item.unlocks}</span>
                          </div>
                          <input
                            type="password"
                            placeholder="Optional key..."
                            value={optionalKeys[keyName as keyof typeof optionalKeys]}
                            onChange={(e) =>
                              setOptionalKeys({ ...optionalKeys, [keyName]: e.target.value })
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0A0A10] border border-[#26263A] text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    if (geminiKey.trim()) {
                      ApiKeysService.saveKeys({ gemini: geminiKey.trim() });
                    }
                    setStep(3);
                  }}
                  className="flex-1 py-3 rounded-xl brand-gradient text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
                >
                  <span>{strings.onboarding.continue}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: QUICK TOUR (3 Coach-Marks) */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4 relative z-10"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white font-bricolage">
                    {strings.onboarding.step3Title}
                  </h2>
                  <p className="text-xs text-[#8D8DA8]">
                    {strings.onboarding.step3Subtitle}
                  </p>
                </div>
              </div>

              {/* 3 Coach-Marks */}
              <div className="space-y-2.5">
                {/* 1. Create Wizard */}
                <div className="p-3.5 rounded-2xl bg-[#191927] border border-[#26263A] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white mb-0.5">
                      {strings.onboarding.coachMarks[0].title}
                    </h3>
                    <p className="text-[11px] text-[#8D8DA8] leading-tight">
                      {strings.onboarding.coachMarks[0].desc}
                    </p>
                  </div>
                </div>

                {/* 2. Studio Timeline */}
                <div className="p-3.5 rounded-2xl bg-[#191927] border border-[#26263A] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white mb-0.5">
                      {strings.onboarding.coachMarks[1].title}
                    </h3>
                    <p className="text-[11px] text-[#8D8DA8] leading-tight">
                      {strings.onboarding.coachMarks[1].desc}
                    </p>
                  </div>
                </div>

                {/* 3. Edit Copilot */}
                <div className="p-3.5 rounded-2xl bg-[#191927] border border-[#26263A] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white mb-0.5">
                      {strings.onboarding.coachMarks[2].title}
                    </h3>
                    <p className="text-[11px] text-[#8D8DA8] leading-tight">
                      {strings.onboarding.coachMarks[2].desc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndFinish}
                  className="flex-1 py-3.5 rounded-2xl brand-gradient text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-500/30 active:scale-95 transition-all touch-target"
                >
                  <span>{strings.onboarding.startCreating}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
