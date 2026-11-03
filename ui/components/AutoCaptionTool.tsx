// Standalone Auto Caption Tool UI Panel
// Responsive 360px to 1440px with real upload card, prompt chips, editable transcript review,
// real 6-step progress, and direct Studio preview integration.

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '@/engine/store';
import {
  runAutoCaption,
  AutoCaptionProgressEvent,
  TimedWord,
  chunkWordsIntoLines,
} from '@/pipeline/auto-caption';
import { toast } from './Toast';
import { triggerHaptic } from '@/storage/haptics';
import {
  Upload,
  Subtitles,
  Sparkles,
  Play,
  Pause,
  Trash2,
  Scissors,
  Merge,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  FileText,
  Volume2,
  Video,
  X,
  Plus,
  ArrowLeft,
} from 'lucide-react';

interface EditableLine {
  id: string;
  text: string;
  start: number;
  end: number;
  words: TimedWord[];
}

export interface AutoCaptionToolProps {
  initialDescription?: string;
  onBack?: () => void;
}

const STYLE_PROMPT_CHIPS = [
  'Yellow karaoke highlight',
  'Big bold center',
  'Small minimal bottom',
  'Neon glow',
  'Box behind text',
  'One word at a time',
  'Bangla',
  'English',
  'All caps',
  'Comic outline',
  'Typewriter terminal',
];

export function AutoCaptionTool({ initialDescription, onBack }: AutoCaptionToolProps = {}) {
  const { setPlan, setActiveTab } = useStudioStore();

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number>(0);
  const [isVideo, setIsVideo] = useState(false);

  const [description, setDescription] = useState(
    initialDescription || 'Karaoke word glow in vibrant yellow, bold font in the bottom third'
  );
  const [prevInitialDesc, setPrevInitialDesc] = useState(initialDescription);

  if (initialDescription !== prevInitialDesc) {
    setPrevInitialDesc(initialDescription);
    if (initialDescription) {
      setDescription(initialDescription);
    }
  }
  const [language, setLanguage] = useState('auto');
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(3);
  const [scriptText, setScriptText] = useState('');
  const [showScriptField, setShowScriptField] = useState(false);
  const [skipReview, setSkipReview] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<AutoCaptionProgressEvent | null>(null);
  const [errorCard, setErrorCard] = useState<{ step: string; message: string } | null>(null);

  // Transcript review step
  const [reviewMode, setReviewMode] = useState(false);
  const [editableLines, setEditableLines] = useState<EditableLine[]>([]);
  const [fullRawTranscript, setFullRawTranscript] = useState<TimedWord[]>([]);

  // Preview playback for review card
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isCancelledRef = useRef(false);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    const isVid = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name);
    setIsVideo(isVid);
    setMediaFile(file);
    setErrorCard(null);
    setReviewMode(false);
    setEditableLines([]);

    const blobUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(blobUrl);

    if (isVid) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = blobUrl;
      v.onloadedmetadata = () => {
        setMediaDuration(v.duration || 0);
      };
    } else {
      const a = document.createElement('audio');
      a.preload = 'metadata';
      a.src = blobUrl;
      a.onloadedmetadata = () => {
        setMediaDuration(a.duration || 0);
      };
    }

    triggerHaptic('medium');
  };

  const handleRemoveFile = () => {
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaDuration(0);
    setReviewMode(false);
    setEditableLines([]);
    setErrorCard(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    triggerHaptic('light');
  };

  const handleChipClick = (chipText: string) => {
    triggerHaptic('light');
    setDescription((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chipText;
      if (trimmed.toLowerCase().includes(chipText.toLowerCase())) return trimmed;
      return `${trimmed}, ${chipText}`;
    });
  };

  // Convert raw timed words into EditableLines for the review card
  const buildEditableLinesFromWords = (words: TimedWord[]): EditableLine[] => {
    const chunks = chunkWordsIntoLines(words, maxWordsPerLine, false);
    return chunks.map((c, idx) => ({
      id: `line_${idx}_${Date.now()}`,
      text: c.text,
      start: c.start,
      end: c.end,
      words: c.words,
    }));
  };

  // Flatten edited lines back into TimedWords, distributing timings proportionally
  const flattenEditableLinesToWords = (lines: EditableLine[]): TimedWord[] => {
    const flattened: TimedWord[] = [];
    for (const line of lines) {
      const wordsText = line.text.trim().split(/\s+/).filter(Boolean);
      if (wordsText.length === 0) continue;

      const duration = Math.max(0.2, line.end - line.start);
      const wordDur = duration / wordsText.length;

      for (let i = 0; i < wordsText.length; i++) {
        flattened.push({
          word: wordsText[i],
          start: Number((line.start + i * wordDur).toFixed(2)),
          end: Number((line.start + (i + 1) * wordDur).toFixed(2)),
        });
      }
    }
    return flattened;
  };

  // Primary action: generate captions
  const handleStartGenerate = async (transcriptOverride?: TimedWord[]) => {
    if (!mediaFile) {
      toast.error('Please upload a video or audio file first.');
      return;
    }

    setIsProcessing(true);
    setErrorCard(null);
    isCancelledRef.current = false;
    triggerHaptic('medium');

    try {
      if (!transcriptOverride && !skipReview) {
        // Run Step 1 (Read) & Step 2 (Listen) to present the transcript review card
        setProgress({
          step: 'read',
          stepIndex: 1,
          totalSteps: 6,
          percentage: 15,
          title: 'Reading Media File',
          detail: 'Saving file to on-device storage and reading duration...',
        });

        const initialResult = await runAutoCaption({
          mediaFile,
          description,
          language: language === 'auto' ? undefined : language,
          scriptText: scriptText.trim() || undefined,
          maxWordsPerLine,
          onProgress: (p) => {
            if (isCancelledRef.current) throw new Error('Cancelled by user');
            setProgress(p);
          },
        });

        if (isCancelledRef.current) return;

        // Populate transcript review card
        setFullRawTranscript(initialResult.transcript);
        const lines = buildEditableLinesFromWords(initialResult.transcript);
        setEditableLines(lines);
        setReviewMode(true);
        setIsProcessing(false);
        setProgress(null);
        toast.info('Transcript ready! Review your words below before styling.');
        return;
      }

      // Resume or full pass (Steps 3 through 6)
      const res = await runAutoCaption({
        mediaFile,
        description,
        language: language === 'auto' ? undefined : language,
        scriptText: scriptText.trim() || undefined,
        maxWordsPerLine,
        transcriptOverride: transcriptOverride || (editableLines.length > 0 ? flattenEditableLinesToWords(editableLines) : undefined),
        onProgress: (p) => {
          if (isCancelledRef.current) throw new Error('Cancelled by user');
          setProgress(p);
        },
      });

      if (isCancelledRef.current) return;

      setIsProcessing(false);
      setProgress(null);
      setReviewMode(false);

      // Load into Studio Store and open Studio Preview
      setPlan(res.plan);
      setActiveTab('editor');
      triggerHaptic('heavy');
      toast.success('Captions ready in Studio preview!');
    } catch (err: unknown) {
      setIsProcessing(false);
      setProgress(null);
      const rawMsg = (err as Error).message || String(err);
      const colonIdx = rawMsg.indexOf(':');
      const stepName = colonIdx > -1 ? rawMsg.slice(0, colonIdx) : 'Auto Caption Error';
      const msg = colonIdx > -1 ? rawMsg.slice(colonIdx + 1).trim() : rawMsg;

      setErrorCard({
        step: stepName,
        message: msg,
      });
      toast.error(rawMsg);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setProgress(null);
    toast.info('Caption generation cancelled.');
    triggerHaptic('light');
  };

  // Line editing handlers for Review Card
  const handleLineTextChange = (lineId: string, newText: string) => {
    setEditableLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, text: newText } : l))
    );
  };

  const handleMergeWithNext = (index: number) => {
    if (index >= editableLines.length - 1) return;
    triggerHaptic('light');
    setEditableLines((prev) => {
      const current = prev[index];
      const next = prev[index + 1];
      const merged: EditableLine = {
        id: current.id,
        text: `${current.text.trim()} ${next.text.trim()}`,
        start: current.start,
        end: next.end,
        words: [...current.words, ...next.words],
      };
      const copy = [...prev];
      copy.splice(index, 2, merged);
      return copy;
    });
  };

  const handleSplitLine = (index: number) => {
    const current = editableLines[index];
    const words = current.text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) return;
    triggerHaptic('light');

    const mid = Math.ceil(words.length / 2);
    const firstWords = words.slice(0, mid);
    const secondWords = words.slice(mid);

    const midTime = Number((current.start + (current.end - current.start) / 2).toFixed(2));

    const lineA: EditableLine = {
      id: `${current.id}_a`,
      text: firstWords.join(' '),
      start: current.start,
      end: midTime,
      words: current.words.slice(0, mid),
    };
    const lineB: EditableLine = {
      id: `${current.id}_b`,
      text: secondWords.join(' '),
      start: midTime,
      end: current.end,
      words: current.words.slice(mid),
    };

    setEditableLines((prev) => {
      const copy = [...prev];
      copy.splice(index, 1, lineA, lineB);
      return copy;
    });
  };

  const handleDeleteLine = (index: number) => {
    triggerHaptic('light');
    setEditableLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSeekPreview = (timeSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec;
      if (!isPlayingPreview) {
        videoRef.current.play().catch(() => {});
        setIsPlayingPreview(true);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = timeSec;
      if (!isPlayingPreview) {
        audioRef.current.play().catch(() => {});
        setIsPlayingPreview(true);
      }
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26263A] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Subtitles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-bricolage">
              Auto Caption Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8D8DA8] mt-1">
            Upload any speech video or audio file, describe how your captions should look and move,
            and preview directly in Studio.
          </p>
        </div>

        {/* Back button or Studio quick jump */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-1.5 text-xs font-semibold transition-colors min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Back to All Tools</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8D8DA8] hover:text-white border border-white/5 flex items-center gap-1.5 transition-colors min-h-[44px] touch-target focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            <span>Open Studio</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* ERROR CARD WITH RETRY */}
      {errorCard && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-red-300">{errorCard.step}</h2>
            <p className="text-xs text-red-200/80 mt-0.5 leading-relaxed">{errorCard.message}</p>
          </div>
          <button
            type="button"
            onClick={() => handleStartGenerate()}
            className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* REAL PROGRESS OVERLAY / CARD */}
      {isProcessing && progress && (
        <div className="p-5 rounded-2xl bg-[#12121C] border border-cyan-500/30 space-y-3 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-sm font-bold text-white">{progress.title}</span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {progress.percentage}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-600 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8D8DA8]">
            <span className="truncate pr-4">{progress.detail}</span>
            <span className="font-mono shrink-0">
              Step {progress.stepIndex} of {progress.totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-red-400 hover:text-red-300 underline font-medium"
          >
            Cancel Generation
          </button>
        </div>
      )}

      {/* MAIN CONTENT: IF IN REVIEW MODE, SHOW REVIEW CARD; ELSE SHOW INPUT PANEL */}
      {reviewMode && editableLines.length > 0 ? (
        /* ================= REVIEW CARD (STEP 2 FINISHED) ================= */
        <div className="p-5 sm:p-6 rounded-3xl bg-[#12121C] border border-cyan-500/40 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#26263A] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Review & Edit Transcript</h2>
              </div>
              <p className="text-xs text-[#8D8DA8] mt-0.5">
                Verify spoken words before styling. Edited words keep their timing window automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {editableLines.length} phrases
              </span>
            </div>
          </div>

          {/* Media Player preview in Review card */}
          {mediaPreviewUrl && (
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-3">
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={mediaPreviewUrl}
                  className="w-16 h-24 object-cover rounded-xl bg-black shrink-0"
                  onPlay={() => setIsPlayingPreview(true)}
                  onPause={() => setIsPlayingPreview(false)}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  <Volume2 className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {mediaFile?.name}
                </p>
                <p className="text-[10px] text-[#8D8DA8] font-mono">
                  Duration: {formatSeconds(mediaDuration)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                  } else if (audioRef.current) {
                    if (audioRef.current.paused) audioRef.current.play();
                    else audioRef.current.pause();
                  }
                }}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Play/Pause Media"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              {!isVideo && <audio ref={audioRef} src={mediaPreviewUrl} />}
            </div>
          )}

          {/* Lines List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
            {editableLines.map((line, idx) => (
              <div
                key={line.id}
                className="p-3 rounded-2xl bg-[#191927] border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 group"
              >
                {/* Time badge */}
                <button
                  type="button"
                  onClick={() => handleSeekPreview(line.start)}
                  className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] font-bold shrink-0 self-start sm:self-center transition-colors"
                  title="Click to seek media to this phrase"
                >
                  {formatSeconds(line.start)} - {formatSeconds(line.end)}
                </button>

                {/* Editable text input */}
                <input
                  type="text"
                  value={line.text}
                  onChange={(e) => handleLineTextChange(line.id, e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors font-medium"
                  placeholder="Caption phrase text..."
                />

                {/* Actions: Merge with next, Split, Delete */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  {idx < editableLines.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMergeWithNext(idx)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Merge with next line"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSplitLine(idx)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="Split line in half"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteLine(idx)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete line"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#26263A]">
            <button
              type="button"
              onClick={() => {
                setReviewMode(false);
                handleStartGenerate();
              }}
              className="text-xs text-[#8D8DA8] hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-transcribe Audio</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setReviewMode(false)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
              >
                Back to Settings
              </button>

              <button
                type="button"
                onClick={() => handleStartGenerate(flattenEditableLinesToWords(editableLines))}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl brand-gradient text-white text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Looks good, continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= INPUT & OPTIONS PANEL ================= */
        <div className="space-y-6">
          {/* 1. MEDIA UPLOAD CARD */}
          <div className="p-5 rounded-3xl bg-[#12121C] border border-[#26263A] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                1. Upload Video or Audio
              </span>
              {mediaFile && (
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  {formatSeconds(mediaDuration)}
                </span>
              )}
            </div>

            {!mediaFile ? (
              <label
                className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[#26263A] hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-cyan-500/20 text-[#8D8DA8] group-hover:text-cyan-400 flex items-center justify-center mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white">
                  Drop speech video or audio file here
                </p>
                <p className="text-xs text-[#8D8DA8] mt-1 max-w-sm">
                  MP4, MOV, WEBM video or WAV, MP3, M4A audio. Max 10 minutes. 100% on-device processing.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="p-4 rounded-2xl bg-[#191927] border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                    {isVideo ? <Video className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {mediaFile.name}
                    </p>
                    <p className="text-[11px] text-[#8D8DA8] font-mono mt-0.5">
                      {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB • {isVideo ? 'Video' : 'Audio Track'} • {formatSeconds(mediaDuration)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                  title="Remove File"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 2. DESCRIBE THE CAPTIONS */}
          <div className="p-5 rounded-3xl bg-[#12121C] border border-[#26263A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                2. Describe the Caption Look & Motion
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">Gemini AI Stylist</span>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Yellow karaoke highlight, big bold font in center, all caps, punchy pop motion"
              rows={3}
              className="w-full bg-[#191927] border border-white/10 rounded-2xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors leading-relaxed"
            />

            {/* Quick chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8D8DA8]">
                Quick Style Prompt Chips
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PROMPT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-[#191927] hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. OPTIONS & SCRIPT */}
          <div className="p-5 rounded-3xl bg-[#12121C] border border-[#26263A] space-y-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              3. Synchronization & Pacing Options
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Language */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Spoken Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#191927] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="en">English</option>
                  <option value="bn">Bangla (বাংলা)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              {/* Max words per line */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Max Words Per Line ({maxWordsPerLine})
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={maxWordsPerLine}
                  onChange={(e) => setMaxWordsPerLine(parseInt(e.target.value, 10))}
                  className="w-full h-8 accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Skip Review toggle */}
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={skipReview}
                    onChange={(e) => setSkipReview(e.target.checked)}
                    className="w-4 h-4 rounded-sm accent-cyan-400"
                  />
                  <span className="text-xs text-slate-200">Skip transcript review</span>
                </label>
                <span className="text-[10px] text-[#8D8DA8]">
                  Directly load into Studio preview
                </span>
              </div>
            </div>

            {/* Optional Paste Script */}
            <div className="pt-2 border-t border-white/5">
              {!showScriptField ? (
                <button
                  type="button"
                  onClick={() => setShowScriptField(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Paste script text (ensures 100% correct spelling)</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Spelling Reference Script
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowScriptField(false);
                        setScriptText('');
                      }}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>
                  <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="Paste the spoken transcript here to guide vocabulary and spellings..."
                    rows={2}
                    className="w-full bg-[#191927] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* GENERATE BUTTON */}
          <button
            type="button"
            disabled={!mediaFile || isProcessing}
            onClick={() => handleStartGenerate()}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl transition-all ${
              !mediaFile || isProcessing
                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                : 'brand-gradient text-white shadow-cyan-500/25 active:scale-98 hover:brightness-110'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Captions</span>
          </button>
        </div>
      )}
    </div>
  );
}
