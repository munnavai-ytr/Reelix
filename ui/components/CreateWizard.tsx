// Reelix Single-Flow One-Click Creation Wizard
'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  Music,
  Scissors,
  HelpCircle,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import confetti from 'canvas-confetti';
import { GamificationService } from '@/storage/gamification';

export function CreateWizard() {
  const { setPipelineProgress, setPlan, setAssets, setActiveTab } = useStudioStore();

  // Primary Voice & Media Inputs
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicFileName, setMusicFileName] = useState('');

  // Editing Instructions & Reference
  const [userPrompt, setUserPrompt] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [removeSilence, setRemoveSilence] = useState(false);

  // Styling & Niche
  const [niche, setNiche] = useState('Tech / AI');
  const [style, setStyle] = useState('Viral High Energy');
  const [captionStyle, setCaptionStyle] = useState('karaoke-word-highlight');
  const [language, setLanguage] = useState('auto');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Recorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const hasVoice = !!audioFile;
  const hasVideo = videoFiles.length > 0;
  // User must provide voice audio OR a video with speech
  const canGenerate = hasVoice || hasVideo;

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

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
        if (!visualizerCanvasRef.current) return;
        const canvas = visualizerCanvasRef.current;
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
      alert('Microphone access denied or unavailable: ' + (err instanceof Error ? err.message : String(err)));
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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      triggerHaptic('light');
      setVideoFiles(Array.from(e.target.files));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      triggerHaptic('light');
      setImageFiles(Array.from(e.target.files));
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      setMusicFile(file);
      setMusicFileName(file.name);
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
        colors: ['#8B5CF6', '#06B6D4', '#FBBF24'],
      });

      GamificationService.recordAction('use_template');

      setTimeout(() => {
        setPipelineProgress(null);
        setPlan(res.plan);
        setAssets(res.assets);
        setActiveTab('editor');
      }, 500);
    } catch (err: unknown) {
      setPipelineProgress(null);
      const msg = err instanceof Error ? err.message : 'Video generation failed.';
      alert(`Generation Error: ${msg}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* Page Title & Badges */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
          <span>Create Vertical Short</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full brand-gradient text-white font-bold uppercase tracking-wider">
            1080×1920 · 9:16
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Upload your voice or video, optional clips/music, and describe the edit. Output length matches your real voice.
        </p>
      </div>

      {/* CORE INPUT ZONE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VOICE INPUT CARD */}
        <div
          className={`p-5 rounded-3xl glass-card border transition-all ${
            hasVoice ? 'border-violet-500/40 bg-violet-950/10' : 'border-white/5'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Voice Audio</span>
                  {!hasVideo && <span className="text-rose-400 text-[10px]">*Required</span>}
                </span>
                <p className="text-[11px] text-slate-400">Record in-app or upload voice track</p>
              </div>
            </div>
            {hasVoice && (
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Attached
              </span>
            )}
          </div>

          <div className="space-y-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-white/5 transition-colors"
              >
                <Mic className="w-4 h-4 text-violet-400" />
                <span>Record Voice in App</span>
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Recording Live ({recordingSeconds}s)
                  </span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <MicOff className="w-3.5 h-3.5" /> Stop
                  </button>
                </div>
                <canvas
                  ref={visualizerCanvasRef}
                  width={280}
                  height={36}
                  className="w-full h-9 rounded-lg bg-black/40"
                />
              </div>
            )}

            <div className="text-center text-[10px] text-slate-500 uppercase font-mono tracking-wider">
              — OR UPLOAD AUDIO FILE —
            </div>

            <label className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-300 truncate max-w-[240px]">
                {audioFileName || 'Upload Voice (.mp3, .wav, .m4a)'}
              </span>
              <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* DESCRIBE THE EDIT & SCRIPT */}
        <div className="p-5 rounded-3xl glass-card border border-white/5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">Describe the Edit</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Tell Director AI exactly how you want the video paced, cut, and styled.
            </p>
            <textarea
              rows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. 'Fast punchy hook in first 2 seconds, zoom-punch on key revelations, remove all pauses, neon yellow captions'"
              className="w-full p-3.5 rounded-2xl bg-[#0B0B0F] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Silence Removal Quick Option */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs font-semibold text-white">Auto-Remove Pauses & Silence</span>
                <p className="text-[10px] text-slate-400">Detects dead-air gaps via 20ms RMS windows</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={removeSilence}
              onChange={(e) => setRemoveSilence(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* CLIPS, IMAGES & MUSIC ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* User Video Clips */}
        <div className="p-4 rounded-3xl glass-card border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-violet-400" />
              <span>Video Clips</span>
            </label>
            {videoFiles.length > 0 && (
              <span className="text-[10px] text-violet-400 font-bold">{videoFiles.length} attached</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            {hasVoice ? 'Optional B-Roll footage' : 'Can provide spoken audio from clip'}
          </p>
          <label className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-violet-500/40 text-xs text-slate-300 transition-colors">
            <span className="truncate">
              {videoFiles.length > 0 ? `${videoFiles.length} clips attached` : 'Upload Clips (.mp4, .mov)'}
            </span>
            <input type="file" multiple accept="video/*" onChange={handleVideoUpload} className="hidden" />
          </label>
        </div>

        {/* User Images */}
        <div className="p-4 rounded-3xl glass-card border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Images & Logos</span>
            </label>
            {imageFiles.length > 0 && (
              <span className="text-[10px] text-cyan-400 font-bold">{imageFiles.length} attached</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Optional photos, charts, or slides</p>
          <label className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-cyan-500/40 text-xs text-slate-300 transition-colors">
            <span className="truncate">
              {imageFiles.length > 0 ? `${imageFiles.length} images attached` : 'Upload Images (.jpg, .png)'}
            </span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        {/* Background Music File */}
        <div className="p-4 rounded-3xl glass-card border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              <span>Background Music</span>
            </label>
            {musicFile && (
              <span className="text-[10px] text-amber-400 font-bold">Attached</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Optional custom track (auto-ducked)</p>
          <label className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-amber-500/40 text-xs text-slate-300 transition-colors">
            <span className="truncate">
              {musicFileName || 'Upload Music (.mp3, .wav)'}
            </span>
            <input type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* ADVANCED SETTINGS (Script Spelling, Caption Style, Niche) */}
      <div className="rounded-3xl glass-card border border-white/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-white">
              Script Reference, Caption Style & Niche Settings
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </button>

        {showAdvanced && (
          <div className="p-5 border-t border-white/5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Script Text (Optional spelling reference)</span>
                </label>
                <span className="text-[10px] text-slate-400">Used strictly to ensure accurate word spelling</span>
              </div>
              <textarea
                rows={3}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Paste your voiceover script here to ensure brand names, technical terms, and foreign words are spelled accurately in captions..."
                className="w-full p-3 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Caption Style</label>
                <select
                  value={captionStyle}
                  onChange={(e) => setCaptionStyle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                >
                  <option value="karaoke-word-highlight">Karaoke Word Glow</option>
                  <option value="bold-center">Viral Bold Center</option>
                  <option value="neon-glow">Cyber Neon Glow</option>
                  <option value="box-highlight">Color Box Badge</option>
                  <option value="pop">Bouncy Word Pop</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Niche Category</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                >
                  <option value="Tech / AI">Tech / AI News</option>
                  <option value="Finance & Wealth">Finance & Wealth</option>
                  <option value="Motivation / Mindset">Motivation & Mindset</option>
                  <option value="Productivity Hacks">Productivity Hacks</option>
                  <option value="Educational / Science">Educational / Science</option>
                  <option value="Storytelling">Engaging Storytelling</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Pacing Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                >
                  <option value="Viral High Energy">Viral High Energy (CapCut cuts)</option>
                  <option value="Documentary Film">Cinematic Documentary</option>
                  <option value="Kinetic Typography">Kinetic Bold Typography</option>
                  <option value="Cyberpunk Dark">Cyberpunk Dark (RGB / Glitch)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="English">English</option>
                  <option value="Bengali">Bangla (বাংলা)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GENERATE BUTTON */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-4 rounded-3xl brand-gradient text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-2xl shadow-violet-500/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles className="w-5 h-5 text-cyan-200" />
          <span>Generate Reelix Short (1080×1920)</span>
        </button>
        {!canGenerate && (
          <p className="text-center text-[11px] text-slate-500 mt-2">
            Please attach a voice recording/audio file, or upload a video clip with speech to begin.
          </p>
        )}
      </div>
    </div>
  );
}
