// Reelix Primary One-Click Creation Wizard + Describe-to-Video & Magic Features
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '@/engine/store';
import { runGeneratePipeline } from '@/pipeline/pipeline';
import { DescribeToVideoService } from '@/ai/describe-to-video';
import {
  Mic,
  MicOff,
  Upload,
  FileText,
  Sparkles,
  AlertCircle,
  Video,
  Image as ImageIcon,
  Check,
  ChevronDown,
  Layers,
  Wand2,
  Volume2,
  Zap,
  Dice5,
  Lightbulb,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import confetti from 'canvas-confetti';
import { GamificationService } from '@/storage/gamification';

export function CreateWizard() {
  const { setPipelineProgress, setPlan, setActiveTab } = useStudioStore();

  // Mode: standard (Voice/Script) vs describe-to-video
  const [creationMode, setCreationMode] = useState<'standard' | 'describe'>('standard');
  const [describePrompt, setDescribePrompt] = useState('');

  // Inputs
  const [scriptText, setScriptText] = useState('');
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Optional Inputs
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState('auto');
  const [niche, setNiche] = useState('Tech / AI');
  const [style, setStyle] = useState('Viral High Energy');
  const [duration, setDuration] = useState<number | undefined>(30);
  const [captionStyle, setCaptionStyle] = useState('hormozi-bold');
  const [voiceName, setVoiceName] = useState('Puck');
  const [userPrompt, setUserPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Recorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Check validation
  const hasVoice = !!audioFile;
  const hasScript = scriptText.trim().length > 0;
  const canGenerate = creationMode === 'describe' ? describePrompt.trim().length > 3 : (hasVoice || hasScript);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // Surprise Me: Generates a creative viral combination of inputs
  const handleSurpriseMe = () => {
    triggerHaptic('light');
    const surpriseTopics = [
      'The 3 psychological tricks restaurants use to make you order more food',
      'Why you should never charge your phone to 100% overnight',
      'The 2-minute rule that permanently defeats procrastination',
      'How artificial intelligence is rewriting the film industry in 2026',
      '3 simple money habits that will save you $10,000 this year',
    ];
    const niches = ['Tech / AI', 'Finance', 'Psychology', 'Productivity', 'Storytelling'];
    const styles = ['Viral High Energy', 'Documentary Film', 'Kinetic Typography', 'Cyberpunk Dark'];
    const voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
    const captionStyles = ['hormozi-bold', 'cyber-neon-glow', 'mr-beast-pop', 'clean-minimal-box'];

    const randomTopic = surpriseTopics[Math.floor(Math.random() * surpriseTopics.length)];
    setCreationMode('describe');
    setDescribePrompt(randomTopic);
    setNiche(niches[Math.floor(Math.random() * niches.length)]);
    setStyle(styles[Math.floor(Math.random() * styles.length)]);
    setVoiceName(voices[Math.floor(Math.random() * voices.length)]);
    setCaptionStyle(captionStyles[Math.floor(Math.random() * captionStyles.length)]);
    setDuration(30);
  };

  // Handle In-app Microphone Recording
  const startRecording = async () => {
    triggerHaptic('medium');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // Audio visualizer setup
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        setAudioFileName(`mic_recording_${Date.now()}.webm`);
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

  // Timer for active recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle Audio File Upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      setAudioFile(file);
      setAudioFileName(file.name);
    }
  };

  // Handle Video Clips Upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      triggerHaptic('light');
      setVideoFiles(Array.from(e.target.files));
    }
  };

  // Handle Images Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      triggerHaptic('light');
      setImageFiles(Array.from(e.target.files));
    }
  };

  // Primary 1-Click Generation Trigger
  const handleGenerate = async () => {
    if (!canGenerate) return;
    triggerHaptic('heavy');

    try {
      // 1. If Describe-to-Video mode
      if (creationMode === 'describe') {
        const project = await DescribeToVideoService.createVideoFromDescription({
          prompt: describePrompt,
          niche,
          style,
          durationSec: duration || 30,
          voice: voiceName,
          language,
          onProgress: (step, percent) => {
            setPipelineProgress({
              step: 'director',
              stepIndex: 4,
              totalSteps: 6,
              percentage: percent,
              title: step,
              detail: `${percent}% complete`,
            });
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
          setPlan(project.editPlan);
          setActiveTab('editor');
        }, 600);
        return;
      }

      // 2. Standard Voice / Script Pipeline
      const res = await runGeneratePipeline({
        audioFile: audioFile || undefined,
        scriptText: scriptText.trim() || undefined,
        videoFiles: videoFiles.length > 0 ? videoFiles : undefined,
        imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
        language,
        niche,
        style,
        targetDuration: duration,
        captionStyle,
        voiceName,
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

      // Finish generation
      setTimeout(() => {
        setPipelineProgress(null);
        setPlan(res.plan);
        setActiveTab('editor');
      }, 600);
    } catch (err: unknown) {
      setPipelineProgress(null);
      const msg = err instanceof Error ? err.message : 'Video generation failed.';
      alert(`Generation Error: ${msg}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* Title Hero & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Create Viral Vertical Short</span>
            <span className="text-xs px-2 py-0.5 rounded-full brand-gradient text-white font-bold uppercase tracking-wider">
              1080×1920
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Turn voice audio, written scripts, or just a single text concept into a polished Short with AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSurpriseMe}
            className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all"
          >
            <Dice5 className="w-3.5 h-3.5" />
            Surprise Me
          </button>

          <button
            type="button"
            onClick={() => {
              handleSurpriseMe();
              setTimeout(() => handleGenerate(), 200);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-500/20 flex items-center gap-1.5 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Magic Button
          </button>
        </div>
      </div>

      {/* Mode Switcher: Describe Concept vs Voice/Script */}
      <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 w-fit">
        <button
          type="button"
          onClick={() => setCreationMode('standard')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            creationMode === 'standard'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Voice / Script Mode
        </button>
        <button
          type="button"
          onClick={() => setCreationMode('describe')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            creationMode === 'describe'
              ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
          Describe-to-Video (Text Only)
        </button>
      </div>

      {/* DESCRIBE-TO-VIDEO MODE CONTAINER */}
      {creationMode === 'describe' && (
        <div className="p-6 rounded-3xl glass-card border border-violet-500/30 bg-violet-950/10 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Describe Your Short Concept</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            The AI Director will automatically write a viral script with a 3-second hook, synthesize voiceover with Gemini TTS, select high-definition B-roll, and build the timeline.
          </p>

          <textarea
            rows={4}
            value={describePrompt}
            onChange={(e) => setDescribePrompt(e.target.value)}
            placeholder="e.g. 'Why 99% of people quit their morning workout routine and the 2-minute psychological rule to never miss a day again...'"
            className="w-full p-4 rounded-2xl bg-[#0B0B0F] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-violet-500 transition-colors resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Voice Actor</label>
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
              >
                <option value="Puck">Puck (Energetic / Viral Male)</option>
                <option value="Charon">Charon (Deep / Authoritative)</option>
                <option value="Kore">Kore (Warm / Engaging Female)</option>
                <option value="Fenrir">Fenrir (Intense / Bold)</option>
                <option value="Aoede">Aoede (Clear / Professional)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/60 mb-1 block">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
              >
                <option value={30}>30 Seconds (Fast Punch)</option>
                <option value={45}>45 Seconds (Standard Viral)</option>
                <option value={60}>60 Seconds (Full Breakdown)</option>
                <option value={90}>90 Seconds (Deep Dive)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/60 mb-1 block">Caption Theme</label>
              <select
                value={captionStyle}
                onChange={(e) => setCaptionStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
              >
                <option value="hormozi-bold">Hormozi Bold (Yellow Pop)</option>
                <option value="cyber-neon-glow">Cyber Neon (Cyan Glow)</option>
                <option value="mr-beast-pop">Mr. Beast (Stroked Bounce)</option>
                <option value="clean-minimal-box">Minimal Black Box</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STANDARD VOICE / SCRIPT MODE */}
      {creationMode === 'standard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Card 1: Voice Audio */}
          <div className={`p-5 rounded-3xl glass-card border transition-all ${
            hasVoice ? 'border-violet-500/40 bg-violet-950/10' : 'border-white/5'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">Voice Audio</span>
              </div>
              {hasVoice && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Attached
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Live Mic Recording Button */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-white/5 transition-colors"
                >
                  <Mic className="w-4 h-4 text-violet-400" />
                  <span>Record Voiceover in App</span>
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
                  <canvas ref={visualizerCanvasRef} width={280} height={36} className="w-full h-9 rounded-lg bg-black/40" />
                </div>
              )}

              <div className="text-center text-[10px] text-slate-500 uppercase font-mono tracking-wider">— OR UPLOAD AUDIO —</div>

              {/* Audio File Upload */}
              <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-300">
                  {audioFileName || 'Upload Voice File (.mp3, .wav, .m4a)'}
                </span>
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Input Card 2: Script Text */}
          <div className={`p-5 rounded-3xl glass-card border transition-all ${
            hasScript ? 'border-cyan-500/40 bg-cyan-950/10' : 'border-white/5'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">Script Text</span>
              </div>
              {hasScript && (
                <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Provided
                </span>
              )}
            </div>

            <div className="space-y-2">
              <textarea
                rows={5}
                placeholder="Type or paste your voiceover script here. If no audio is attached, Gemini TTS will automatically generate voiceover..."
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[#0B0B0F] border border-white/10 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed"
              />

              {!hasVoice && hasScript && (
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-center justify-between">
                  <span>TTS Voice: {voiceName}</span>
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="bg-[#0B0B0F] text-white text-[11px] rounded-lg px-2 py-1 border border-white/10"
                  >
                    <option value="Puck">Puck</option>
                    <option value="Charon">Charon</option>
                    <option value="Kore">Kore</option>
                    <option value="Fenrir">Fenrir</option>
                    <option value="Aoede">Aoede</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Accordion */}
      <div className="rounded-3xl glass-card border border-white/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-white">Advanced Style, B-Roll & Niche Tuning</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="p-5 border-t border-white/5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <option value="Documentary Film">Cinematic Documentary (Film grain)</option>
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

            {/* Custom Media Clips / Images Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-violet-400" />
                  Your Own Video Clips (Optional)
                </label>
                <label className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-violet-500/40 text-xs text-slate-400 transition-colors">
                  <span>{videoFiles.length > 0 ? `${videoFiles.length} clips attached` : 'Upload Portrait Clips'}</span>
                  <input type="file" multiple accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Your Own Images (Optional)
                </label>
                <label className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-cyan-500/40 text-xs text-slate-400 transition-colors">
                  <span>{imageFiles.length > 0 ? `${imageFiles.length} images attached` : 'Upload Images/Logos'}</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GENERATE ACTION BUTTON */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-4 rounded-3xl brand-gradient text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-2xl shadow-violet-500/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles className="w-5 h-5 text-cyan-200" />
          <span>
            {creationMode === 'describe'
              ? 'Generate Short from Description'
              : 'Generate Reelix Short (1080×1920)'}
          </span>
        </button>
      </div>
    </div>
  );
}
