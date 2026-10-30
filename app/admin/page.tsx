// Protected Admin Route (Requires PIN if set)
'use client';

import React, { useState } from 'react';
import { PinService } from '@/storage/pin';
import { Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { triggerHaptic } from '@/storage/haptics';
import { AdminConsole } from '@/ui/components/AdminConsole';

export default function AdminPage() {
  const [isPinRequired] = useState(() => PinService.isPinSet());
  const [isUnlocked, setIsUnlocked] = useState(() => !PinService.isPinSet());
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    const valid = await PinService.verifyPin(pinInput);
    if (valid) {
      triggerHaptic('success');
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      triggerHaptic('error');
      setErrorMsg('Incorrect PIN. Access denied.');
      setPinInput('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-slate-100 p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reelix Studio</span>
        </Link>

        {!isUnlocked && isPinRequired ? (
          /* PIN Lock Screen */
          <div className="p-8 rounded-3xl bg-[#141420] border border-white/10 shadow-2xl space-y-6 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Reelix Admin Protected</h2>
              <p className="text-xs text-slate-400">
                Enter your security PIN to access advanced engine administration.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-48 mx-auto px-4 py-3 rounded-2xl bg-[#0B0B0F] border border-white/10 text-white text-center text-lg font-mono tracking-widest focus:border-violet-500 focus:outline-none"
              />

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={pinInput.length < 4}
                className="w-full py-3.5 rounded-2xl brand-gradient text-white font-bold text-sm shadow-xl shadow-violet-500/20 disabled:opacity-40 active:scale-95 transition-all"
              >
                Unlock Admin Console
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Admin Console */
          <AdminConsole onLock={() => setIsUnlocked(false)} />
        )}
      </div>
    </div>
  );
}
