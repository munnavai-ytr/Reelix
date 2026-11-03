// Zustand Studio Store for Reelix Video Creator & Manual Timeline Editor
import { create } from 'zustand';
import { EditPlan, Layer, VideoLayer } from './types';
import { AssetCache } from './renderer';
import { ensureWindow, releaseAssetCache } from './media';
import { PipelineProgressEvent } from '../pipeline/types';
import { ExportProgress } from '../pipeline/exporter';
import { ProjectDb } from '../storage/db';
import { triggerHaptic } from '../storage/haptics';

export interface StudioState {
  currentPlan: EditPlan | null;
  currentTime: number;
  isPlaying: boolean;
  selectedLayerId: string | null;
  activeTab: 'home' | 'create' | 'editor' | 'library' | 'creator' | 'projects' | 'settings' | 'admin';
  assets: AssetCache;
  assetVersion: number;
  history: EditPlan[];
  future: EditPlan[];
  pipelineProgress: PipelineProgressEvent | null;
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportedBlob: Blob | null;
  showSplash: boolean;
  showOnboarding: boolean;
  saveStatus: 'saved' | 'saving' | 'idle';
  lastSavedTime: number | null;

  // Actions
  setPlan: (plan: EditPlan) => void;
  applyPlan: (plan: EditPlan) => void;
  setAssets: (assets: AssetCache) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSelectedLayerId: (id: string | null) => void;
  setActiveTab: (tab: 'home' | 'create' | 'editor' | 'library' | 'creator' | 'projects' | 'settings' | 'admin') => void;
  setPipelineProgress: (progress: PipelineProgressEvent | null) => void;
  setIsExporting: (val: boolean) => void;
  setExportProgress: (prog: ExportProgress | null) => void;
  setExportedBlob: (blob: Blob | null) => void;
  setShowSplash: (val: boolean) => void;
  setShowOnboarding: (val: boolean) => void;

  // Edit Plan Mutators with Undo/Redo & Auto-Save
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  addLayer: (layer: Layer) => void;
  splitLayerAtPlayhead: (layerId: string) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  undo: () => void;
  redo: () => void;
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(plan: EditPlan, set: (partial: Partial<StudioState>) => void) {
  set({ saveStatus: 'saving' });
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    ProjectDb.saveProject({
      id: plan.id,
      title: plan.title,
      duration: plan.duration,
      updatedAt: Date.now(),
      createdAt: plan.metadata?.createdAt || Date.now(),
      editPlan: plan,
    })
      .then(() => {
        set({ saveStatus: 'saved', lastSavedTime: Date.now() });
      })
      .catch((err) => {
        console.warn('[AutoSave] Error saving project:', err);
        set({ saveStatus: 'idle' });
      });
  }, 800);
}

export const useStudioStore = create<StudioState>((set, get) => ({
  currentPlan: null,
  currentTime: 0,
  isPlaying: false,
  selectedLayerId: null,
  activeTab: 'home',
  assets: {
    videos: new Map(),
    images: new Map(),
  },
  assetVersion: 0,
  history: [],
  future: [],
  pipelineProgress: null,
  isExporting: false,
  exportProgress: null,
  exportedBlob: null,
  showSplash: true,
  showOnboarding: false,
  saveStatus: 'idle',
  lastSavedTime: null,

  setPlan: (plan) => {
    const prevPlan = get().currentPlan;
    if (prevPlan && prevPlan.id !== plan.id) {
      releaseAssetCache(get().assets);
    }
    const freshCache: AssetCache = {
      videos: new Map(),
      images: new Map(),
    };
    set({
      currentPlan: plan,
      assets: freshCache,
      currentTime: 0,
      isPlaying: false,
      history: [],
      future: [],
      selectedLayerId: plan.layers[0]?.id || null,
      saveStatus: 'saved',
      lastSavedTime: Date.now(),
    });

    ensureWindow(plan, freshCache, 0)
      .then(() => {
        set({ assets: freshCache, assetVersion: get().assetVersion + 1 });
      })
      .catch(() => {});
  },

  applyPlan: (plan) => {
    const { currentPlan, history, currentTime } = get();
    const nextHistory = currentPlan ? [...history, currentPlan].slice(-25) : history;
    const clampedTime = Math.max(0, Math.min(plan.duration, currentTime));

    set({
      currentPlan: plan,
      currentTime: clampedTime,
      history: nextHistory,
      future: [],
      selectedLayerId: plan.layers[0]?.id || null,
    });

    ensureWindow(plan, get().assets, clampedTime)
      .then(() => {
        set({ assetVersion: get().assetVersion + 1 });
      })
      .catch(() => {});
  },

  setAssets: (assets) => set({ assets, assetVersion: get().assetVersion + 1 }),

  setCurrentTime: (time) => {
    const plan = get().currentPlan;
    const clamped = Math.max(0, Math.min(plan?.duration ?? 300, time));
    set({ currentTime: clamped });
  },

  setIsPlaying: (isPlaying) => {
    triggerHaptic('light');
    set({ isPlaying });
  },

  setSelectedLayerId: (id) => {
    triggerHaptic('light');
    set({ selectedLayerId: id });
  },

  setActiveTab: (tab) => {
    triggerHaptic('light');
    set({ activeTab: tab });
  },

  setPipelineProgress: (pipelineProgress) => set({ pipelineProgress }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (exportProgress) => set({ exportProgress }),
  setExportedBlob: (exportedBlob) => set({ exportedBlob }),
  setShowSplash: (showSplash) => set({ showSplash }),
  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),

  updateLayer: (layerId, updates) => {
    const { currentPlan, history } = get();
    if (!currentPlan) return;

    const nextHistory = [...history, currentPlan].slice(-25);

    const updatedLayers = currentPlan.layers.map((layer) => {
      if (layer.id === layerId) {
        return { ...layer, ...updates } as Layer;
      }
      return layer;
    });

    const updatedPlan: EditPlan = {
      ...currentPlan,
      layers: updatedLayers,
      metadata: {
        ...currentPlan.metadata,
        updatedAt: Date.now(),
      },
    };

    set({
      currentPlan: updatedPlan,
      history: nextHistory,
      future: [],
    });

    debouncedSave(updatedPlan, set);
  },

  deleteLayer: (layerId) => {
    triggerHaptic('medium');
    const { currentPlan, history } = get();
    if (!currentPlan) return;

    const nextHistory = [...history, currentPlan].slice(-25);
    const updatedLayers = currentPlan.layers.filter(l => l.id !== layerId);

    const updatedPlan: EditPlan = {
      ...currentPlan,
      layers: updatedLayers,
      metadata: { ...currentPlan.metadata, updatedAt: Date.now() },
    };

    set({
      currentPlan: updatedPlan,
      selectedLayerId: updatedLayers[0]?.id || null,
      history: nextHistory,
      future: [],
    });

    debouncedSave(updatedPlan, set);
  },

  duplicateLayer: (layerId) => {
    triggerHaptic('light');
    const { currentPlan, history } = get();
    if (!currentPlan) return;

    const layerToDup = currentPlan.layers.find(l => l.id === layerId);
    if (!layerToDup) return;

    const nextHistory = [...history, currentPlan].slice(-25);
    const newLayer: Layer = {
      ...layerToDup,
      id: `${layerToDup.id}_copy_${Date.now()}`,
      name: `${layerToDup.name} (Copy)`,
      startTime: Math.min(currentPlan.duration - 1, layerToDup.startTime + 0.5),
    };

    const updatedPlan: EditPlan = {
      ...currentPlan,
      layers: [...currentPlan.layers, newLayer],
      metadata: { ...currentPlan.metadata, updatedAt: Date.now() },
    };

    set({
      currentPlan: updatedPlan,
      selectedLayerId: newLayer.id,
      history: nextHistory,
      future: [],
    });

    debouncedSave(updatedPlan, set);
  },

  addLayer: (layer) => {
    triggerHaptic('light');
    const { currentPlan, history } = get();
    if (!currentPlan) return;

    const nextHistory = [...history, currentPlan].slice(-25);
    const updatedPlan: EditPlan = {
      ...currentPlan,
      layers: [...currentPlan.layers, layer],
      metadata: { ...currentPlan.metadata, updatedAt: Date.now() },
    };

    set({
      currentPlan: updatedPlan,
      selectedLayerId: layer.id,
      history: nextHistory,
      future: [],
    });

    debouncedSave(updatedPlan, set);
  },

  splitLayerAtPlayhead: (layerId) => {
    triggerHaptic('medium');
    const { currentPlan, currentTime, history } = get();
    if (!currentPlan) return;

    const layer = currentPlan.layers.find(l => l.id === layerId);
    if (!layer) return;

    const layerStart = layer.startTime;
    const layerEnd = layer.startTime + layer.duration;

    if (currentTime <= layerStart + 0.2 || currentTime >= layerEnd - 0.2) {
      return;
    }

    const nextHistory = [...history, currentPlan].slice(-25);
    const firstPartDuration = currentTime - layerStart;
    const secondPartDuration = layerEnd - currentTime;

    const layer1: Layer = {
      ...layer,
      duration: firstPartDuration,
    };

    const layer2: Layer = {
      ...layer,
      id: `${layer.id}_split_${Date.now()}`,
      name: `${layer.name} (Part 2)`,
      startTime: currentTime,
      duration: secondPartDuration,
      trimIn: (layer as VideoLayer).trimIn !== undefined ? (layer as VideoLayer).trimIn + firstPartDuration : undefined,
    } as Layer;

    const updatedLayers = currentPlan.layers.flatMap(l => (l.id === layerId ? [layer1, layer2] : [l]));

    const updatedPlan: EditPlan = {
      ...currentPlan,
      layers: updatedLayers,
      metadata: { ...currentPlan.metadata, updatedAt: Date.now() },
    };

    set({
      currentPlan: updatedPlan,
      selectedLayerId: layer2.id,
      history: nextHistory,
      future: [],
    });

    debouncedSave(updatedPlan, set);
  },

  reorderLayers: (startIndex, endIndex) => {
    const { currentPlan, history } = get();
    if (!currentPlan) return;

    const nextHistory = [...history, currentPlan].slice(-25);
    const layers = Array.from(currentPlan.layers);
    const [removed] = layers.splice(startIndex, 1);
    layers.splice(endIndex, 0, removed);

    const updatedLayers = layers.map((l, idx) => ({ ...l, trackIndex: idx }));

    const updatedPlan: EditPlan = {
      ...currentPlan,
      layers: updatedLayers,
      metadata: { ...currentPlan.metadata, updatedAt: Date.now() },
    };

    set({
      currentPlan: updatedPlan,
      history: nextHistory,
      future: [],
    });

    debouncedSave(updatedPlan, set);
  },

  undo: () => {
    const { history, future, currentPlan } = get();
    if (history.length === 0 || !currentPlan) return;

    triggerHaptic('light');
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, history.length - 1);

    set({
      currentPlan: previous,
      history: newHistory,
      future: [currentPlan, ...future],
      selectedLayerId: previous.layers[0]?.id || null,
    });

    debouncedSave(previous, set);
  },

  redo: () => {
    const { history, future, currentPlan } = get();
    if (future.length === 0 || !currentPlan) return;

    triggerHaptic('light');
    const next = future[0];
    const newFuture = future.slice(1);

    set({
      currentPlan: next,
      history: [...history, currentPlan],
      future: newFuture,
      selectedLayerId: next.layers[0]?.id || null,
    });

    debouncedSave(next, set);
  },
}));
