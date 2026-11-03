// Reelix Single-Flow One-Click Creation Wizard
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/engine/store';
import { runGeneratePipeline } from '@/pipeline/pipeline';
import {
  Mic,
  MicOff,
  Upload,
  FileText,
  Sparkles,
  Video,
  Image as ImageIcon,
  Check,
  ChevronDown,
  Music,
  Scissors,
  Plus,
  X,
  Volume2,
  AlertTriangle,
  Subtitles,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import confetti from 'canvas-confetti';
import { GamificationService } from '@/storage/gamification';
import { MediaCacheDb } from '@/storage/db';
import { toast } from './Toast';
import { STRINGS, useStrings, useLanguageStore } from '@/ui/strings';
import { BRAND } from '@/ui/brand';
import { EDIT_STYLE_PRESETS, EditStylePreset } from '@/ui/presets';
import { ApiKeysService } from '@/storage/keys';

export function CreateWizard() {
  const strings = useStrings();
  const lang = useLanguageStore((s) => s.lang);
  const { setPipelineProgress, setPlan, setAssets, setActiveTab, setShowOnboarding } = useStudioStore();

  // Primary Voice & Media Inputs
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageThumbnails, setImageThumbnails] = useState<string[]>([]);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicFileName, setMusicFileName] = useState('');
  const [musicDurationSec, setMusicDurationSec] = useState<number | null>(null);

  // Editing Instructions & Reference
  const [userPrompt, setUserPrompt] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [removeSilence, setRemoveSilence] = useState(false);

  // Styling & Niche
  const [niche, setNiche] = useState('Tech / AI');
  const [style, setStyle] = useState('Viral High Energy');
  const [captionStyle, setCaptionStyle] = useState('karaoke-word-highlight');
  const [language, setLanguage] = useState('auto');
  const [showScriptRow, setShowScriptRow] = useState(false);
  const [hasApiKey] = useState(() => ApiKeysService.hasGeminiKey());
  const [selectedPresetId, setSelectedPresetId] = useState<string>('viral-hype');

  const applyPreset = (preset: EditStylePreset) => {
    triggerHaptic('light');
    setSelectedPresetId(preset.id);
    setCaptionStyle(preset.captionStyle);
    setStyle(preset.pacing);
    setNiche(preset.niche);
    // User's own description always has priority: if userPrompt is empty, populate suggested prompt
    if (!userPrompt.trim()) {
      setUserPrompt(preset.suggestedPrompt);
    }
  };

  // Canvas Waveform & Recorder refs
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveVisualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const hasVoice = !!audioFile;
  const hasVideo = videoFiles.length > 0;
  const canGenerate = hasVoice || hasVideo;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // Format MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Decode and draw audio waveform with IndexedDB caching
  const drawWaveformFromBlob = useCallback(async (blob: Blob | File, fileName: string) => {
    try {
      const fileKey = `${fileName}_${blob.size}_${(blob as File).lastModified || 0}_waveform`;
      const cachedData = await MediaCacheDb.get<{ peaks: number[]; duration: number }>(fileKey);

      let peaks: number[] = [];
      let duration = 0;

      if (cachedData) {
        peaks = cachedData.peaks;
        duration = cachedData.duration;
      } else {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = new AudioCtx();
        const decodedBuffer = await actx.decodeAudioData(arrayBuffer.slice(0));
        actx.close().catch(() => {});

        duration = decodedBuffer.duration;
        const rawData = decodedBuffer.getChannelData(0);
        const barsCount = 48; // Max 600 bars constraint (using 48 for UI)
        const step = Math.floor(rawData.length / barsCount);

        let maxAmp = 0.01;
        for (let i = 0; i < barsCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += Math.abs(rawData[i * step + j] || 0);
          }
          const avg = sum / step;
          peaks.push(avg);
          if (avg > maxAmp) maxAmp = avg;
        }

        // Normalize
        peaks = peaks.map((p) => Math.min(1, p / maxAmp));
        await MediaCacheDb.set(fileKey, 'waveform', { peaks, duration });
      }

      setAudioDurationSec(duration);

      const canvas = waveformCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = Math.max(2, Math.floor(width / peaks.length) - 2);

      for (let i = 0; i < peaks.length; i++) {
        const barHeight = Math.max(4, peaks[i] * (height - 6));
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = '#8B5CF6';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, 2);
        else ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      }
    } catch (e) {
      console.warn('Failed to decode waveform:', e);
    }
  }, []);

  // When audioFile changes, draw waveform
  useEffect(() => {
    if (audioFile) {
      Promise.resolve().then(() => drawWaveformFromBlob(audioFile, audioFileName || 'audio'));
    } else {
      Promise.resolve().then(() => setAudioDurationSec(null));
    }
  }, [audioFile, audioFileName, drawWaveformFromBlob]);

  // Generate 9:14 poster thumbnail with IndexedDB caching
  const generateVideoThumbnail = async (file: File): Promise<string> => {
    const fileKey = `${file.name}_${file.size}_${file.lastModified || 0}_thumb`;
    const cachedThumb = await MediaCacheDb.get<string>(fileKey);
    if (cachedThumb) {
      return cachedThumb;
    }

    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;

      vid.onloadeddata = () => {
        vid.currentTime = Math.min(0.5, (vid.duration || 1) / 2);
      };

      vid.onseeked = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 180;
        offCanvas.height = 280; // 9:14 ratio
        const ctx = offCanvas.getContext('2d');
        let thumbUrl = '';
        if (ctx) {
          const srcAspect = (vid.videoWidth || 1) / (vid.videoHeight || 1);
          const dstAspect = offCanvas.width / offCanvas.height;
          let sx = 0,
            sy = 0,
            sw = vid.videoWidth,
            sh = vid.videoHeight;
          if (srcAspect > dstAspect) {
            sw = vid.videoHeight * dstAspect;
            sx = (vid.videoWidth - sw) / 2;
          } else {
            sh = vid.videoWidth / dstAspect;
            sy = (vid.videoHeight - sh) / 2;
          }
          ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, offCanvas.width, offCanvas.height);
          thumbUrl = offCanvas.toDataURL('image/jpeg', 0.8);
          MediaCacheDb.set(fileKey, 'thumbnail', thumbUrl);
        }
        // Cleanup video element & blob URL
        vid.removeAttribute('src');
        vid.load();
        URL.revokeObjectURL(url);
        resolve(thumbUrl);
      };

      vid.onerror = () => {
        vid.removeAttribute('src');
        vid.load();
        URL.revokeObjectURL(url);
        resolve('');
      };
    });
  };

  // Video files change handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      triggerHaptic('light');
      const newFiles = Array.from(e.target.files);
      const combined = [...videoFiles, ...newFiles];
      setVideoFiles(combined);

      const newThumbs = await Promise.all(newFiles.map(generateVideoThumbnail));
      setVideoThumbnails((prev) => [...prev, ...newThumbs]);
    }
  };

  // Remove video clip
  const removeVideoClip = (idx: number) => {
    triggerHaptic('light');
    setVideoFiles((prev) => prev.filter((_, i) => i !== idx));
    setVideoThumbnails((prev) => prev.filter((_, i) => i !== idx));
  };

  // Image files change handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      triggerHaptic('light');
      const newFiles = Array.from(e.target.files);
      const combined = [...imageFiles, ...newFiles];
      setImageFiles(combined);

      const urls = newFiles.map((f) => URL.createObjectURL(f));
      setImageThumbnails((prev) => [...prev, ...urls]);
    }
  };

  // Remove image
  const removeImage = (idx: number) => {
    triggerHaptic('light');
    if (imageThumbnails[idx] && imageThumbnails[idx].startsWith('blob:')) {
      URL.revokeObjectURL(imageThumbnails[idx]);
    }
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImageThumbnails((prev) => prev.filter((_, i) => i !== idx));
  };

  // Music upload
  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      setMusicFile(file);
      setMusicFileName(file.name);

      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = () => {
        setMusicDurationSec(audio.duration);
      };
    }
  };

  // Live in-app recording
  const startRecording = async () => {
    triggerHaptic('medium');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        if (!liveVisualizerCanvasRef.current) return;
        const canvas = liveVisualizerCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = '#8B5CF6';
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
      };

      drawVisualizer();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioFile(audioBlob);
        setAudioFileName(`voice_recording_${Date.now()}.webm`);
        setIsRecording(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
        stream.getTracks().forEach((track) => track.stop());
        triggerHaptic('success');
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err) {
      toast.error('Microphone access denied or unavailable: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      triggerHaptic('medium');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      setAudioFile(file);
      setAudioFileName(file.name);
    }
  };

  // Quick Chips logic
  const handleChipClick = (chipText: string) => {
    triggerHaptic('light');
    if (!userPrompt.includes(chipText)) {
      setUserPrompt((prev) => (prev ? `${prev}, ${chipText}` : chipText));
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    triggerHaptic('heavy');

    try {
      const res = await runGeneratePipeline({
        audioFile: audioFile || undefined,
        scriptText: scriptText.trim() || undefined,
        videoFiles: videoFiles.length > 0 ? videoFiles : undefined,
        imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
        musicFile: musicFile || undefined,
        removeSilence,
        language,
        niche,
        style,
        captionStyle,
        userPrompt: userPrompt.trim() || undefined,
        onProgress: (evt) => {
          setPipelineProgress(evt);
        },
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#22D3EE', '#FBBF24'],
      });

      GamificationService.recordAction('use_template');

      setTimeout(() => {
        setPipelineProgress(null);
        setPlan(res.plan);
        setActiveTab('editor');
      }, 500);
    } catch (err: unknown) {
      setPipelineProgress(null);
      const msg = err instanceof Error ? err.message : 'Video generation failed.';
      toast.error(`Generation Error: ${msg}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-28">
      {/* Top: Step Indicator & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26263A] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-bricolage">
              {STRINGS.create.title}
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold">
              {BRAND.canonicalResolution} · {BRAND.aspectRatio}
            </span>
          </div>
          <p className="text-xs text-[#8D8DA8] mt-1">
            {STRINGS.create.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('autocaption');
            }}
            className="px-3 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>Auto Caption Video</span>
          </button>

          {/* Compact Pill Step Indicator */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-[#12121C] border border-[#26263A] text-xs">
            <span className="px-3 py-1 rounded-full brand-gradient text-white font-bold text-[11px] shadow-sm">
              1 Media
            </span>
            <span className="text-[#8D8DA8]">·</span>
            <span className="px-2.5 py-1 text-[#8D8DA8] font-medium text-[11px]">
              2 Describe
            </span>
            <span className="text-[#8D8DA8]">·</span>
            <span className="px-2.5 py-1 text-[#8D8DA8] font-medium text-[11px]">
              3 Studio
            </span>
          </div>
        </div>
      </div>

      {/* Non-blocking API Key Missing Banner */}
      {!hasApiKey && (
        <div className="p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="leading-snug">{strings.create.apiKeyNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowOnboarding(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold shrink-0 transition-colors"
          >
            {strings.create.configureKey}
          </button>
        </div>
      )}

      {/* Edit Style Presets Row */}
      <div className="p-4 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {strings.create.presetsRowTitle}
            </span>
          </div>
          <span className="text-[11px] text-[#8D8DA8] hidden sm:inline">
            Configures pacing, captions & soundtrack
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {EDIT_STYLE_PRESETS.map((preset) => {
            const isActive = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isActive
                    ? 'bg-violet-600/20 border-violet-500 shadow-md shadow-violet-500/10 text-white'
                    : 'bg-[#191927] border-[#26263A] text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">
                    {lang === 'bn' ? preset.nameBn : preset.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono">
                    {preset.musicMood}
                  </span>
                </div>
                <p className="text-[10px] text-[#8D8DA8] line-clamp-2 leading-tight">
                  {lang === 'bn' ? preset.descriptionBn : preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* CARD 1: YOUR VOICE (Required) */}
      <div
        className={`p-5 rounded-2xl bg-[#12121C] border transition-all ${
          hasVoice
            ? 'border-violet-500/50 shadow-lg shadow-violet-500/10'
            : 'border-violet-500/30'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {STRINGS.create.voiceCard.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 tracking-wider">
                  {STRINGS.create.voiceCard.requiredBadge}
                </span>
              </div>
              <p className="text-[11px] text-[#8D8DA8]">
                {STRINGS.create.voiceCard.helper}
              </p>
            </div>
          </div>

          {hasVoice && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Attached
            </span>
          )}
        </div>

        {/* Audio Active Card with Real Mini-Waveform */}
        {hasVoice ? (
          <div className="p-3.5 rounded-xl bg-[#191927] border border-[#26263A] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-white font-medium truncate max-w-[220px] sm:max-w-[340px]">
                  {audioFileName || 'Voice Track'}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {audioDurationSec !== null && (
                  <span className="font-mono text-cyan-400 font-semibold text-xs">
                    {formatTime(audioDurationSec)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAudioFile(null);
                    setAudioFileName('');
                    setAudioDurationSec(null);
                  }}
                  className="text-[#8D8DA8] hover:text-rose-400 transition-colors p-1"
                  title="Remove voice track"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Real Canvas Waveform */}
            <canvas
              ref={waveformCanvasRef}
              width={400}
              height={36}
              className="w-full h-9 rounded-lg bg-[#0A0A10]/60"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-white/5 transition-colors touch-target"
              >
                <Mic className="w-4 h-4 text-violet-400" />
                <span>{STRINGS.create.voiceCard.recordButton}</span>
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Recording Live ({recordingSeconds}s)
                  </span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition-colors touch-target"
                  >
                    <MicOff className="w-3.5 h-3.5" /> {STRINGS.create.voiceCard.stopRecording}
                  </button>
                </div>
                <canvas
                  ref={liveVisualizerCanvasRef}
                  width={280}
                  height={36}
                  className="w-full h-9 rounded-lg bg-black/40"
                />
              </div>
            )}

            <div className="text-center text-[10px] text-[#8D8DA8] uppercase font-mono tracking-wider">
              {STRINGS.create.voiceCard.orUpload}
            </div>

            <label className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-[#26263A] bg-[#191927]/40 hover:bg-[#191927] cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-[#8D8DA8] mb-1" />
              <span className="text-xs font-medium text-slate-300 truncate max-w-[260px]">
                {STRINGS.create.voiceCard.uploadPlaceholder}
              </span>
              <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
            </label>
          </div>
        )}

        <p className="text-[11px] text-[#8D8DA8] mt-3 italic">
          💡 {STRINGS.create.voiceCard.tipText}
        </p>
      </div>

      {/* CARD 2: VIDEO CLIPS (Optional) */}
      <div className="p-5 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-white">
              {STRINGS.create.videoCard.title}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-[#8D8DA8]">
              {STRINGS.create.videoCard.optionalBadge}
            </span>
          </div>
          {videoFiles.length > 0 && (
            <span className="text-xs font-mono text-violet-400 font-semibold">
              {videoFiles.length} {STRINGS.create.videoCard.attached}
            </span>
          )}
        </div>
        <p className="text-xs text-[#8D8DA8]">
          {STRINGS.create.videoCard.helper}
        </p>

        {videoFiles.length === 0 ? (
          <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-[#26263A] bg-[#191927]/40 hover:bg-[#191927] cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#8D8DA8] mb-1" />
            <span className="text-xs font-medium text-slate-300">
              {STRINGS.create.videoCard.uploadButton} (.mp4, .mov)
            </span>
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
            {videoFiles.map((file, idx) => (
              <div
                key={idx}
                className="relative w-20 h-32 shrink-0 rounded-xl overflow-hidden border border-[#26263A] bg-black group"
              >
                {videoThumbnails[idx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={videoThumbnails[idx]}
                    alt={`clip-${idx}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                    Clip {idx + 1}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeVideoClip(idx)}
                    className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center"
                    title="Remove clip"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="absolute bottom-1 left-1 text-[9px] font-mono bg-black/70 px-1 py-0.5 rounded text-white">
                  #{idx + 1}
                </span>
              </div>
            ))}

            {/* Add More Tile */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="w-20 h-32 shrink-0 rounded-xl border border-dashed border-[#26263A] hover:border-violet-500/50 flex flex-col items-center justify-center gap-1 text-[#8D8DA8] hover:text-white transition-colors bg-[#191927]/30"
            >
              <Plus className="w-5 h-5 text-violet-400" />
              <span className="text-[10px] font-medium">+ Add</span>
            </button>
            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* CARDS 3 & 4: IMAGES & MUSIC ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Images Card */}
        <div className="p-4 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white">
                {STRINGS.create.imagesCard.title}
              </span>
            </div>
            {imageFiles.length > 0 && (
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                {imageFiles.length} attached
              </span>
            )}
          </div>
          {imageFiles.length === 0 ? (
            <label className="flex items-center justify-center p-3 rounded-xl border border-dashed border-[#26263A] bg-[#191927]/40 hover:bg-[#191927] cursor-pointer text-xs text-slate-300 transition-colors">
              <span>{STRINGS.create.imagesCard.uploadButton}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {imageFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-[#26263A] bg-black group"
                >
                  {imageThumbnails[idx] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageThumbnails[idx]}
                      alt={`img-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-14 h-14 shrink-0 rounded-lg border border-dashed border-[#26263A] hover:border-cyan-500/50 flex items-center justify-center text-[#8D8DA8] hover:text-white transition-colors bg-[#191927]/30"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Music Card */}
        <div className="p-4 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-white">
                {STRINGS.create.musicCard.title}
              </span>
            </div>
            {musicFile && (
              <span className="text-[10px] font-mono text-amber-400 font-semibold">
                {musicDurationSec ? formatTime(musicDurationSec) : 'Attached'}
              </span>
            )}
          </div>
          {musicFile ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#191927] border border-[#26263A] text-xs">
              <span className="text-white truncate max-w-[170px]">{musicFileName}</span>
              <button
                type="button"
                onClick={() => {
                  setMusicFile(null);
                  setMusicFileName('');
                  setMusicDurationSec(null);
                }}
                className="text-[#8D8DA8] hover:text-rose-400 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center p-3 rounded-xl border border-dashed border-[#26263A] bg-[#191927]/40 hover:bg-[#191927] cursor-pointer text-xs text-slate-300 transition-colors">
              <span>{STRINGS.create.musicCard.uploadButton}</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleMusicUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* CARD 5: DESCRIBE THE EDIT (The Brain Input) */}
      <div className="p-5 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">
              {STRINGS.create.describeCard.title}
            </span>
          </div>
          <p className="text-xs text-[#8D8DA8]">
            {STRINGS.create.describeCard.subtitle}
          </p>
        </div>

        {/* Autosize Textarea with Bengali/English placeholder */}
        <textarea
          rows={3}
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder={STRINGS.create.describeCard.placeholder}
          className="w-full p-3.5 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs placeholder:text-[#8D8DA8]/60 focus:outline-none focus:border-cyan-400 transition-colors resize-y leading-relaxed font-manrope font-bengali"
        />

        {/* 8 Quick Chips */}
        <div className="flex flex-wrap gap-2">
          {STRINGS.create.describeCard.chips.map((chip, idx) => {
            const isIncluded = userPrompt.includes(chip);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isIncluded
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-[#191927] hover:bg-white/10 text-slate-300 border border-[#26263A]'
                }`}
              >
                + {chip}
              </button>
            );
          })}
        </div>

        {/* Inline Style & Niche Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#26263A]">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#8D8DA8]">
              {STRINGS.create.styleRow.niche}
            </label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs focus:outline-none focus:border-violet-500"
            >
              <option value="Tech / AI">Tech / AI</option>
              <option value="Finance & Wealth">Finance & Wealth</option>
              <option value="Motivation / Mindset">Motivation</option>
              <option value="Productivity Hacks">Productivity</option>
              <option value="Educational / Science">Education</option>
              <option value="Storytelling">Storytelling</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#8D8DA8]">
              {STRINGS.create.styleRow.pacing}
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs focus:outline-none focus:border-violet-500"
            >
              <option value="Viral High Energy">Viral High Energy</option>
              <option value="Documentary Film">Cinematic Doc</option>
              <option value="Kinetic Typography">Kinetic Type</option>
              <option value="Cyberpunk Dark">Cyberpunk Dark</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#8D8DA8]">
              {STRINGS.create.styleRow.language}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs focus:outline-none focus:border-violet-500"
            >
              <option value="auto">Auto Detect</option>
              <option value="English">English</option>
              <option value="Bengali">Bangla (বাংলা)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#8D8DA8]">
              {STRINGS.create.styleRow.captionStyle}
            </label>
            <select
              value={captionStyle}
              onChange={(e) => setCaptionStyle(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs focus:outline-none focus:border-violet-500"
            >
              <option value="karaoke-word-highlight">Karaoke Glow</option>
              <option value="bold-center">Viral Center</option>
              <option value="neon-glow">Cyber Neon</option>
              <option value="box-highlight">Color Box</option>
              <option value="pop">Bouncy Pop</option>
            </select>
          </div>
        </div>

        {/* Silence Removal Quick Option */}
        <div className="p-3 rounded-xl bg-[#191927] border border-[#26263A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-xs font-semibold text-white">
                {STRINGS.create.describeCard.removeSilenceTitle}
              </span>
              <p className="text-[10px] text-[#8D8DA8]">
                {STRINGS.create.describeCard.removeSilenceSubtitle}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={removeSilence}
            onChange={(e) => setRemoveSilence(e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Collapsed Script Reference */}
        <div className="border border-[#26263A] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowScriptRow(!showScriptRow)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-xs text-[#8D8DA8] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{STRINGS.create.scriptRow.toggleLabel}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#8D8DA8] transition-transform ${
                showScriptRow ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showScriptRow && (
            <div className="p-3 border-t border-[#26263A]">
              <textarea
                rows={3}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder={STRINGS.create.scriptRow.placeholder}
                className="w-full p-2.5 rounded-lg bg-[#0A0A10] border border-[#26263A] text-white text-xs focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STICKY BAR / WIDE BUTTON */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full h-12 rounded-2xl brand-gradient text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-500/25 hover:opacity-95 active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed transition-all touch-target"
        >
          <Sparkles className="w-4 h-4 text-cyan-200" />
          <span>{STRINGS.create.generateButton}</span>
        </button>

        <div className="text-center text-xs text-[#8D8DA8] font-mono">
          {canGenerate ? (
            <span>
              {BRAND.canonicalResolution} · Real length:{' '}
              {audioDurationSec
                ? `~${formatTime(audioDurationSec)}`
                : 'matches speech'}{' '}
              (max {BRAND.maxDurationSec}s)
            </span>
          ) : (
            <span className="text-rose-400/90">{STRINGS.create.disabledNotice}</span>
          )}
        </div>
      </div>
    </div>
  );
}
