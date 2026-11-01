// Edit Copilot - Premium Natural Language Assistant for Reelix
'use client';

import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Sparkles,
  X,
  AlertCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useStudioStore } from '@/engine/store';
import { ChatToChangeService } from '@/ai/chat-to-change';
import { triggerHaptic } from '@/storage/haptics';
import { toast } from './Toast';
import { STRINGS } from '@/ui/strings';

interface EditChangeItem {
  id: string;
  time: string;
  prompt: string;
  summary: string;
}

interface EditCopilotProps {
  isDocked?: boolean;
  onClose?: () => void;
}

export function EditCopilot({ isDocked = false, onClose }: EditCopilotProps) {
  const { currentPlan, applyPlan, undo, history } = useStudioStore();
  const canUndo = history.length > 0;

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; lastPrompt: string } | null>(null);
  const [changeHistory, setChangeHistory] = useState<EditChangeItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(!isDocked);

  const suggestionChips = STRINGS.copilot.chips;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || !currentPlan || isProcessing) return;

    setInputPrompt('');
    setErrorState(null);
    setIsProcessing(true);
    triggerHaptic('light');

    try {
      const result = await ChatToChangeService.applyInstruction(currentPlan, text);
      applyPlan(result.updatedPlan);

      const now = new Date();
      const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now
        .getSeconds()
        .toString()
        .padStart(2, '0')}`;

      setChangeHistory((prev) => [
        {
          id: Math.random().toString(36).slice(2, 9),
          time: timeStr,
          prompt: text,
          summary: result.changeSummary,
        },
        ...prev.slice(0, 4),
      ]);

      triggerHaptic('success');
      toast.success(result.changeSummary);
    } catch (err: unknown) {
      triggerHaptic('error');
      const msg = err instanceof Error ? err.message : 'Could not apply change. Check Gemini API key in Settings.';
      setErrorState({ message: msg, lastPrompt: text });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndoRecent = () => {
    if (!canUndo) return;
    triggerHaptic('medium');
    undo();
    setChangeHistory((prev) => prev.slice(1));
    toast.info('Reverted last edit');
  };

  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info('Speech recognition is not supported in this browser. Please type.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        triggerHaptic('selection');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSend(transcript);
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsRecording(false);
    }
  };

  // COLLAPSED PILL STATE (Mobile or Docked)
  if (!isExpanded && isDocked) {
    return (
      <div
        onClick={() => {
          triggerHaptic('light');
          setIsExpanded(true);
        }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#12121C]/90 backdrop-blur-xl border border-[#26263A] hover:border-violet-500/40 shadow-2xl cursor-pointer transition-all hover:scale-[1.02] touch-target"
      >
        {/* Animated subtle glowing orb */}
        <div
          className={`w-4 h-4 rounded-full shrink-0 shadow-md ${
            isProcessing
              ? 'animate-spin shadow-cyan-500/40'
              : 'shadow-violet-500/40 animate-pulse'
          }`}
          style={{
            background: 'conic-gradient(from 180deg at 50% 50%, #8B5CF6 0deg, #22D3EE 180deg, #8B5CF6 360deg)',
          }}
        />

        <span className="text-xs text-[#8D8DA8] font-medium truncate max-w-[160px] sm:max-w-[200px]">
          {isProcessing ? STRINGS.copilot.editing : STRINGS.copilot.collapsedPlaceholder}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleVoice();
          }}
          className="text-[#8D8DA8] hover:text-white p-1 ml-auto"
        >
          {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  // EXPANDED STATE
  return (
    <div className="flex flex-col h-full bg-[#12121C] text-white rounded-2xl border border-[#26263A] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#26263A] flex items-center justify-between bg-[#191927]">
        <div className="flex items-center gap-2.5">
          {/* Animated Glowing Orb */}
          <div
            className={`w-4 h-4 rounded-full shadow-md ${
              isProcessing
                ? 'animate-spin shadow-cyan-500/50'
                : 'shadow-violet-500/40 animate-pulse'
            }`}
            style={{
              background: 'conic-gradient(from 180deg at 50% 50%, #8B5CF6 0deg, #22D3EE 180deg, #8B5CF6 360deg)',
            }}
          />
          <h3 className="text-xs font-bold text-white tracking-tight">
            Edit Copilot
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
            v0.9
          </span>
        </div>

        <div className="flex items-center gap-1">
          {canUndo && (
            <button
              type="button"
              onClick={handleUndoRecent}
              title={STRINGS.copilot.undoAction}
              className="p-1.5 rounded-lg text-[#8D8DA8] hover:text-white hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {isDocked && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-lg text-[#8D8DA8] hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8D8DA8] hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Suggestion Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#8D8DA8]">
            Quick Edits
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded-lg bg-[#191927] hover:bg-white/10 border border-[#26263A] text-[11px] text-[#8D8DA8] hover:text-white transition-colors disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Applying state banner */}
        {isProcessing && (
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-2.5 text-xs text-violet-300">
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
            <span className="font-semibold">{STRINGS.copilot.editing}</span>
          </div>
        )}

        {/* Error Card with Retry Button */}
        {errorState && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Edit mutation failed</span>
            </div>
            <p className="text-[11px] text-rose-300 leading-relaxed font-mono">
              {errorState.message}
            </p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleSend(errorState.lastPrompt)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{STRINGS.copilot.retryAction}</span>
              </button>
            </div>
          </div>
        )}

        {/* Recent Change History (Last 5 changes) */}
        {changeHistory.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-[#26263A]">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#8D8DA8] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{STRINGS.copilot.recentChanges}</span>
            </span>

            <div className="space-y-1.5">
              {changeHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-[#0A0A10] border border-[#26263A] flex items-center justify-between text-xs group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
                      <span>{item.time}</span>
                      <span>·</span>
                      <span className="text-white font-medium truncate max-w-[180px]">
                        {item.prompt}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8D8DA8] truncate max-w-[220px] mt-0.5">
                      {item.summary}
                    </p>
                  </div>

                  {idx === 0 && canUndo && (
                    <button
                      type="button"
                      onClick={handleUndoRecent}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-[#8D8DA8] hover:text-white transition-colors shrink-0"
                    >
                      Undo
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Row */}
      <div className="p-2.5 border-t border-[#26263A] bg-[#0A0A10] flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`p-2 rounded-xl transition-colors touch-target ${
            isRecording
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-[#191927] hover:bg-white/10 text-[#8D8DA8] hover:text-white'
          }`}
          title="Voice command"
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={STRINGS.copilot.collapsedPlaceholder}
          className="flex-1 px-3 py-2 rounded-xl bg-[#191927] border border-[#26263A] text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-[#8D8DA8]/50"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isProcessing || !inputPrompt.trim()}
          className="p-2 rounded-xl brand-gradient text-white disabled:opacity-40 shadow-lg shadow-violet-500/20 active:scale-95 transition-transform touch-target"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
