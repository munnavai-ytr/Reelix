// Animated Splash Screen for Reelix
'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Sparkles } from 'lucide-react';
import { useStudioStore } from '../../engine/store';
import { ApiKeysService } from '../../storage/keys';

export function Splash() {
  const { showSplash, setShowSplash, setShowOnboarding } = useStudioStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      // If Gemini API key is missing, open onboarding automatically
      if (!ApiKeysService.hasGeminiKey()) {
        setShowOnboarding(true);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [setShowSplash, setShowOnboarding]);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0F]"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
            }}
            className="flex flex-col items-center text-center"
          >
            {/* Glowing Icon Badge */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl brand-gradient blur-xl opacity-50 scale-125 animate-pulse" />
              <div className="relative w-24 h-24 rounded-3xl brand-gradient flex items-center justify-center shadow-2xl shadow-violet-500/40 border border-white/20">
                <Film className="w-12 h-12 text-white" />
              </div>
            </div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black tracking-tight text-white mb-2"
            >
              Reel<span className="brand-gradient-text">ix</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm font-medium text-slate-400 tracking-wide flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              AI Vertical Shorts Studio
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
