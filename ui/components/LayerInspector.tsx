// Property Panel & Effects Stack Inspector for Selected Layer
'use client';

import React from 'react';
import { useStudioStore } from '@/engine/store';
import { Registry } from '@/registry';
import { Sliders, Sparkles, Key } from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';

export function LayerInspector() {
  const { currentPlan, selectedLayerId, updateLayer, currentTime } = useStudioStore();

  if (!currentPlan || !selectedLayerId) return null;

  const layer = currentPlan.layers.find((l) => l.id === selectedLayerId);
  if (!layer) return null;

  const allEffects = Registry.listEffects();

  const handleTransformChange = (key: 'x' | 'y' | 'scale' | 'rotation', val: number) => {
    const currentTransform = layer.transform || { x: 0, y: 0, scale: 1, rotation: 0 };
    updateLayer(layer.id, {
      transform: {
        ...currentTransform,
        [key]: val,
      },
    });
  };

  const handleAddKeyframe = (prop: 'scale' | 'opacity' | 'x' | 'y') => {
    triggerHaptic('medium');
    const relTime = currentTime - layer.startTime;
    const currentKeyframes = layer.keyframes || {};
    const propKeyframes = currentKeyframes[prop] || [];

    const currentVal =
      prop === 'scale'
        ? layer.transform?.scale ?? 1
        : prop === 'opacity'
        ? layer.opacity ?? 1
        : prop === 'x'
        ? layer.transform?.x ?? 0
        : layer.transform?.y ?? 0;

    const updated = [
      ...propKeyframes.filter((k) => Math.abs(k.time - relTime) > 0.1),
      { time: Number(relTime.toFixed(2)), value: currentVal, easing: 'spring' as const },
    ].sort((a, b) => a.time - b.time);

    updateLayer(layer.id, {
      keyframes: {
        ...currentKeyframes,
        [prop]: updated,
      },
    });
  };

  const toggleEffect = (effectId: string) => {
    triggerHaptic('light');
    const currentEffects = layer.effects || [];
    const exists = currentEffects.find((e) => e.effectId === effectId);

    if (exists) {
      updateLayer(layer.id, {
        effects: currentEffects.filter((e) => e.effectId !== effectId),
      });
    } else {
      const def = Registry.getEffect(effectId);
      updateLayer(layer.id, {
        effects: [
          ...currentEffects,
          {
            effectId,
            enabled: true,
            params: def?.defaultParams || {},
          },
        ],
      });
    }
  };

  return (
    <div className="w-full p-4 bg-[#12121C] rounded-2xl border border-[#26263A] space-y-4 overflow-y-auto max-h-[620px] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#26263A] pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-white truncate max-w-[170px]">
            {layer.name}
          </span>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/5 text-cyan-300 border border-white/5">
          {layer.type}
        </span>
      </div>

      {/* Layer Opacity */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Opacity</span>
          <span className="font-mono text-cyan-400">
            {Math.round((layer.opacity ?? 1) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={layer.opacity ?? 1}
          aria-label="Layer opacity"
          onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-[#191927] rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
      </div>

      {/* Transform Controls: Scale & Rotation */}
      <div className="space-y-2.5 pt-1">
        <div className="text-xs font-semibold text-white flex items-center justify-between">
          <span>Transforms</span>
          <button
            type="button"
            onClick={() => handleAddKeyframe('scale')}
            title="Add scale keyframe at playhead"
            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
          >
            <Key className="w-3 h-3" />
            <span>+Keyframe</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#191927] border border-[#26263A] space-y-1">
            <span className="text-[10px] text-[#8D8DA8]">Scale</span>
            <input
              type="number"
              step={0.1}
              min={0.2}
              max={4}
              value={layer.transform?.scale ?? 1}
              onChange={(e) => handleTransformChange('scale', parseFloat(e.target.value) || 1)}
              className="w-full bg-[#0A0A10] border border-[#26263A] rounded-lg px-2 py-1 text-xs text-white font-mono"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-[#191927] border border-[#26263A] space-y-1">
            <span className="text-[10px] text-[#8D8DA8]">Rotation (deg)</span>
            <input
              type="number"
              step={5}
              value={layer.transform?.rotation ?? 0}
              onChange={(e) => handleTransformChange('rotation', parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0A0A10] border border-[#26263A] rounded-lg px-2 py-1 text-xs text-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Effects Stack Registry */}
      <div className="space-y-2 pt-2 border-t border-[#26263A]">
        <div className="flex items-center justify-between text-xs font-semibold text-white">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Effects Stack</span>
          </span>
          <span className="text-[10px] font-mono text-[#8D8DA8]">
            {layer.effects?.length || 0} active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
          {allEffects.map((eff) => {
            const isActive = !!layer.effects?.some((e) => e.effectId === eff.id);
            return (
              <button
                key={eff.id}
                type="button"
                onClick={() => toggleEffect(eff.id)}
                className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all ${
                  isActive
                    ? 'border-violet-500 bg-violet-600/30 text-white font-semibold shadow-sm'
                    : 'border-[#26263A] bg-[#191927] text-[#8D8DA8] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="truncate">{eff.name}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
