'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useStudioStore } from '@/engine/store';
import { ChatToChangeService } from '@/ai/chat-to-change';
import { HapticsService } from '@/storage/haptics';
import { toast } from './Toast';

interface ChatToChangePanelProps {
  onClose?: () => void;
}

export const ChatToChangePanel: React.FC<ChatToChangePanelProps> = ({ onClose }) => {
  const { currentPlan, applyPlan, undo, history } = useStudioStore();
  const canUndo = history.length > 0;
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hi! Tell me how to change your Short (e.g., "Make captions bigger", "Add glitch on the hook", "Make it faster").',
    },
  ]);

  const quickSuggestions = [
    'Make captions bigger and bolder',
    'Add glitch effect on hook',
    'Change caption style to Karaoke Glow',
    'Speed up pacing by 20%',
    'Add subtle film grain',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || !currentPlan) return;

    setInputPrompt('');
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setIsProcessing(true);
    HapticsService.light();

    try {
      const result = await ChatToChangeService.applyInstruction(currentPlan, text);
      applyPlan(result.updatedPlan);
      setMessages(prev => [...prev, { sender: 'ai', text: result.changeSummary }]);
      HapticsService.success();
    } catch (err: unknown) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ Error: ${(err as Error).message || 'Could not apply change. Check Gemini API key in Settings.'}`,
        },
      ]);
      HapticsService.warning();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleVoiceRecord = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Speech recognition is not supported in this browser. Please type your instruction.');
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
        HapticsService.selection();
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

  return (
    <div className="flex flex-col h-full bg-[#0E0E14] text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-600/30 border border-violet-500/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Chat-to-Change AI</h3>
            <span className="text-[10px] text-white/40">Real-time timeline mutation</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canUndo && (
            <button
              onClick={() => undo()}
              title="Undo change"
              className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-white/40 hover:text-white px-2 py-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-violet-600 text-white rounded-br-none'
                  : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-none'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Modifying Edit Plan with AI...
          </div>
        )}
      </div>

      <div className="px-3 py-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-white/5">
        {quickSuggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-white/60 hover:text-white whitespace-nowrap transition-colors"
          >
            {sug}
          </button>
        ))}
      </div>

      <div className="p-2.5 border-t border-white/5 bg-black/40 flex items-center gap-1.5">
        <button
          onClick={handleToggleVoiceRecord}
          className={`p-2 rounded-xl transition-colors ${
            isRecording
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
          }`}
          title="Voice command"
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputPrompt}
          onChange={e => setInputPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type or speak edit instruction..."
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-white/30"
        />

        <button
          onClick={() => handleSend()}
          disabled={isProcessing || !inputPrompt.trim()}
          className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white disabled:opacity-40 shadow-lg shadow-violet-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
