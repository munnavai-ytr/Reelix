'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Sliders,
  Type,
  Layers,
  Wand2,
  FileCode,
  Send,
  Save,
  Check,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { AiCreatorService, CreatorItemType } from '@/ai/creator';
import { Registry } from '@/registry';
import { LibraryDB } from '@/storage/library-db';
import { HapticsService } from '@/storage/haptics';
import { GamificationService } from '@/storage/gamification';
import { ShaderEngine } from '@/registry/shader-engine';

interface AiCreatorStudioProps {
  initialType?: CreatorItemType;
  initialItem?: any;
  onSaved?: (savedItem: any) => void;
  onClose?: () => void;
}

export const AiCreatorStudio: React.FC<AiCreatorStudioProps> = ({
  initialType = 'effect',
  initialItem,
  onSaved,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<CreatorItemType>(initialType);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<any>(initialItem || null);
  const [shaderStatus, setShaderStatus] = useState<{ valid?: boolean; error?: string }>({});
  const [chatTweakPrompt, setChatTweakPrompt] = useState('');
  const [isTweaking, setIsTweaking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shaderEngineRef = useRef<ShaderEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const assetTypes: Array<{ type: CreatorItemType; label: string; icon: React.ReactNode }> = [
    { type: 'effect', label: 'Visual Effect', icon: <Sliders className="w-4 h-4" /> },
    { type: 'transition', label: 'Transition', icon: <Layers className="w-4 h-4" /> },
    { type: 'text-animation', label: 'Text Anim', icon: <Type className="w-4 h-4" /> },
    { type: 'caption-style', label: 'Caption Style', icon: <Wand2 className="w-4 h-4" /> },
    { type: 'sticker', label: 'SVG Sticker', icon: <Sparkles className="w-4 h-4" /> },
    { type: 'template', label: 'Viral Template', icon: <FileCode className="w-4 h-4" /> },
  ];

  // Live Canvas / WebGL preview animation loop
  const startPreviewLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const render = (time: number) => {
      setPreviewTime(time * 0.001);
      const canvas = canvasRef.current;
      if (canvas && generatedAsset) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Default preview canvas rendering
          ctx.fillStyle = '#121218';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid lines
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }

          // Sample animated graphic
          if (selectedType === 'effect') {
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, '#8B5CF6');
            grad.addColorStop(1, '#06B6D4');
            ctx.fillStyle = grad;
            const size = 120 + Math.sin(time * 0.005) * 20;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (selectedType === 'text-animation' || selectedType === 'caption-style') {
            ctx.save();
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = generatedAsset.color || '#FFFFFF';
            if (generatedAsset.strokeWidth) {
              ctx.strokeStyle = generatedAsset.strokeColor || '#000000';
              ctx.lineWidth = generatedAsset.strokeWidth;
              ctx.strokeText('VIRAL HOOK', canvas.width / 2, canvas.height / 2);
            }
            ctx.fillText('VIRAL HOOK', canvas.width / 2, canvas.height / 2);
            ctx.restore();
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
  }, [generatedAsset, selectedType]);

  useEffect(() => {
    startPreviewLoop();
    const shaderEngine = shaderEngineRef.current;
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      shaderEngine?.dispose();
    };
  }, [startPreviewLoop]);

  // Handle Initial Generation
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setIsSaved(false);
    HapticsService.light();

    try {
      const result = await AiCreatorService.generateAsset(selectedType, prompt);
      setGeneratedAsset(result.item);
      setShaderStatus({ valid: result.shaderValid, error: result.shaderError });
      HapticsService.success();
    } catch (err: any) {
      alert(err.message || 'Generation failed. Please verify your Gemini API key in Settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Chat Tweak
  const handleTweak = async () => {
    if (!chatTweakPrompt.trim() || !generatedAsset) return;
    setIsTweaking(true);
    setIsSaved(false);
    HapticsService.light();

    try {
      const result = await AiCreatorService.generateAsset(selectedType, chatTweakPrompt, generatedAsset);
      setGeneratedAsset(result.item);
      setShaderStatus({ valid: result.shaderValid, error: result.shaderError });
      setChatTweakPrompt('');
      HapticsService.success();
    } catch (err: any) {
      alert(err.message || 'Tweak failed');
    } finally {
      setIsTweaking(false);
    }
  };

  // Save to My Items in IndexedDB & Register into Runtime Registry
  const handleSaveToMyItems = async () => {
    if (!generatedAsset) return;
    HapticsService.medium();

    const categoryMap: Record<CreatorItemType, any> = {
      effect: 'effects',
      transition: 'transitions',
      'text-animation': 'text-animations',
      'caption-style': 'caption-styles',
      sticker: 'stickers',
      template: 'templates',
    };

    const category = categoryMap[selectedType];
    const itemId = generatedAsset.id || `custom_${Date.now()}`;

    // Register into active in-memory registry
    if (selectedType === 'effect') {
      Registry.registerEffect({
        ...generatedAsset,
        id: itemId,
        render: (ctx: CanvasRenderingContext2D, _source: any, p: Record<string, any>) => {
          ctx.globalAlpha = p.intensity ?? 1.0;
        },
      });
    } else if (selectedType === 'transition') {
      Registry.registerTransition({
        ...generatedAsset,
        id: itemId,
        render: () => {},
      });
    } else if (selectedType === 'text-animation') {
      Registry.registerTextAnimation({
        ...generatedAsset,
        id: itemId,
        apply: () => ({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }),
      });
    } else if (selectedType === 'caption-style') {
      Registry.registerCaptionStyle({
        ...generatedAsset,
        id: itemId,
        render: (ctx: CanvasRenderingContext2D, chunk: any, _time: number, baseColor: string) => {
          ctx.save();
          ctx.fillStyle = baseColor || '#FFFFFF';
          ctx.fillText(chunk.text || '', 540, 1400);
          ctx.restore();
        },
      });
    } else if (selectedType === 'sticker') {
      Registry.registerSticker({
        ...generatedAsset,
        id: itemId,
      });
    } else if (selectedType === 'template') {
      Registry.registerTemplate({
        ...generatedAsset,
        id: itemId,
      });
    }

    // Persist into IndexedDB
    await LibraryDB.saveItem({
      id: itemId,
      name: generatedAsset.name || 'Custom AI Asset',
      category,
      tags: generatedAsset.tags || ['ai-created'],
      isBuiltIn: false,
      isFavorite: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: 'ai-creator',
      source: 'ai-studio',
      payload: generatedAsset,
    });

    GamificationService.recordAction('create_ai_item');
    setIsSaved(true);
    onSaved?.(generatedAsset);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0B0F] text-white">
      {/* Top Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">AI Creator Studio</h2>
            <p className="text-xs text-white/50">
              Alight Motion style declarative asset synthesis
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold"
          >
            Close
          </button>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Type Picker, Prompt & Chat Tweak */}
        <div className="w-full md:w-96 border-r border-white/5 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Asset Type Switcher */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-2 block">
              Asset Type to Create
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {assetTypes.map(t => (
                <button
                  key={t.type}
                  onClick={() => {
                    setSelectedType(t.type);
                    setGeneratedAsset(null);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition-all ${
                    selectedType === t.type
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Creation Prompt */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 block">
              Describe What to Create
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                selectedType === 'effect'
                  ? 'e.g., Cyberpunk scanline CRT glitch with high-contrast violet glow'
                  : selectedType === 'transition'
                  ? 'e.g., Fast directional whip zoom with slight motion blur'
                  : selectedType === 'sticker'
                  ? 'e.g., Viral glowing fire flame streak badge with bold outline'
                  : selectedType === 'template'
                  ? 'e.g., Top 5 listicle format with countdown cards and high-energy hooks'
                  : 'Describe what you want the AI to design...'
              }
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-violet-500 transition-colors resize-none placeholder:text-white/30"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 disabled:opacity-50 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating ? 'Synthesizing with AI...' : 'Generate Asset'}
            </button>
          </div>

          {/* Tweak with Chat */}
          {generatedAsset && (
            <div className="pt-2 border-t border-white/5">
              <label className="text-xs font-semibold text-white/60 mb-1.5 block">
                Tweak with Chat
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={chatTweakPrompt}
                  onChange={e => setChatTweakPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTweak()}
                  placeholder="e.g., Make it faster, change color to golden..."
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                />
                <button
                  onClick={handleTweak}
                  disabled={isTweaking || !chatTweakPrompt.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Shader Compilation Status */}
          {shaderStatus.valid !== undefined && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                shaderStatus.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {shaderStatus.valid ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Sandboxed GLSL shader compiled and verified live!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>Fallback applied: {shaderStatus.error}</span>
                </>
              )}
            </div>
          )}

          {/* Save to Library Action */}
          {generatedAsset && (
            <button
              onClick={handleSaveToMyItems}
              disabled={isSaved}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                isSaved
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Saved to My Items
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save to My Items
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Side: Live Interactive Preview & Inspector */}
        <div className="flex-1 flex flex-col p-4 bg-black/40 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white/60">
              Live Interactive Preview
            </span>
            <span className="text-[10px] font-mono text-white/40">
              t = {previewTime.toFixed(2)}s
            </span>
          </div>

          {/* Main Visual Preview Area */}
          <div className="flex-1 min-h-[300px] rounded-2xl bg-[#0B0B0F] border border-white/10 flex items-center justify-center relative overflow-hidden p-4">
            {selectedType === 'sticker' && generatedAsset?.svg ? (
              <div
                className="w-48 h-48 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: generatedAsset.svg }}
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={540}
                height={540}
                className="w-72 h-72 rounded-2xl shadow-2xl border border-white/5"
              />
            )}

            {!generatedAsset && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/50 backdrop-blur-xs">
                <Sparkles className="w-8 h-8 text-violet-400 mb-2 animate-pulse" />
                <p className="text-sm font-semibold">Ready to Synthesize</p>
                <p className="text-xs text-white/40 max-w-xs mt-1">
                  Describe any visual effect, transition, or sticker on the left to test live!
                </p>
              </div>
            )}
          </div>

          {/* Declarative JSON Definition Inspector */}
          {generatedAsset && (
            <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] font-semibold text-white/50 block mb-2">
                Declarative Definition Payload (JSON)
              </span>
              <pre className="text-[10px] font-mono text-cyan-300 max-h-40 overflow-y-auto bg-black/50 p-2.5 rounded-xl">
                {JSON.stringify(generatedAsset, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
