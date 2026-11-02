// Animated Splash Screen with Brand Logo & Reduced-Motion Support
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudioStore } from '@/engine/store';
import { ApiKeysService } from '@/storage/keys';
import { BRAND } from '@/ui/brand';

export function Splash() {
  const { showSplash, setShowSplash, setShowOnboarding } = useStudioStore();
  const [prefersReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (prefersReducedMotion) {
      setShowSplash(false);
      if (!ApiKeysService.hasGeminiKey()) {
        setShowOnboarding(true);
      }
      return;
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
      if (!ApiKeysService.hasGeminiKey()) {
        setShowOnboarding(true);
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [setShowSplash, setShowOnboarding]);

  const LogoComponent = BRAND.logo;

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A10]"
          aria-hidden="true"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute w-72 h-72 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1], // Subtle 600 ms ease-out reveal
            }}
            className="flex flex-col items-center text-center relative z-10"
          >
            {/* Brand Logo with 600 ms reveal */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4">
              <LogoComponent className="w-16 h-16" />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45 }}
              className="text-3xl font-black tracking-tight text-white mb-1.5 font-bricolage"
            >
              <span className="brand-gradient-text">{BRAND.appName}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-xs font-medium text-[#8D8DA8] tracking-wide"
            >
              {BRAND.tagline}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
