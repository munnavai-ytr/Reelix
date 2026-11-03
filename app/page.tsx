// Reelix AI Vertical Shorts Studio Main Hub
'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/engine/store';
import { Header } from '@/ui/components/Header';
import { Navigation } from '@/ui/components/Navigation';
import { Splash } from '@/ui/components/Splash';
import { OnboardingModal } from '@/ui/components/OnboardingModal';
import { CreateWizard } from '@/ui/components/CreateWizard';
import { PipelineOverlay } from '@/ui/components/PipelineOverlay';
import { PreviewCanvas } from '@/ui/components/PreviewCanvas';
import { TimelineEditor } from '@/ui/components/TimelineEditor';
import { LayerInspector } from '@/ui/components/LayerInspector';
import { CaptionEditor } from '@/ui/components/CaptionEditor';
import { ExportModal } from '@/ui/components/ExportModal';
import { SettingsModal } from '@/ui/components/SettingsModal';
import { ProjectList } from '@/ui/components/ProjectList';
import { LibraryTab } from '@/ui/components/LibraryTab';
import { AiCreatorStudio } from '@/ui/components/AiCreatorStudio';
import { EditCopilot } from '@/ui/components/EditCopilot';
import { AutoCaptionTool } from '@/ui/components/AutoCaptionTool';
import { ToastProvider } from '@/ui/components/Toast';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';
import {
  Sparkles,
  Film,
  Subtitles,
  ArrowRight,
  Shield,
  Video,
  Mic,
  Music,
  Sliders,
  Type,
  Layers,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { triggerHaptic } from '@/storage/haptics';
import { BRAND } from '@/ui/brand';
import { STRINGS } from '@/ui/strings';

export default function StudioPage() {
  const {
    activeTab,
    setActiveTab,
    currentPlan,
    setSelectedLayerId,
  } = useStudioStore();

  const [desktopRightTab, setDesktopRightTab] = useState<'copilot' | 'inspector'>('copilot');
  const [mobileActiveTool, setMobileActiveTool] = useState<string | null>(null);

  // Android Capacitor Back Button listener
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    const initBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('backButton', () => {
          const state = useStudioStore.getState();
          if (
            state.exportProgress &&
            state.exportProgress.phase !== 'complete'
          ) {
            return;
          }
          if (state.isExporting) {
            state.setIsExporting(false);
            return;
          }
          if (state.activeTab === 'settings') {
            state.setActiveTab('home');
            return;
          }
          if (mobileActiveTool) {
            setMobileActiveTool(null);
            return;
          }
          if (state.activeTab !== 'home' && state.activeTab !== 'create') {
            state.setActiveTab('create');
            return;
          }
          App.exitApp();
        });
        cleanup = () => handle.remove();
      } catch {
        // Not native WebView environment
      }
    };
    initBackButton();
    return () => {
      if (cleanup) cleanup();
    };
  }, [mobileActiveTool]);

  // Desktop Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside inputs or textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const store = useStudioStore.getState();
      if (store.activeTab !== 'editor' || !store.currentPlan) return;

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        store.setIsPlaying(!store.isPlaying);
        return;
      }

      // S / s: Split layer at playhead
      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey && store.selectedLayerId) {
          e.preventDefault();
          store.splitLayerAtPlayhead(store.selectedLayerId);
          return;
        }
      }

      // Delete / Backspace: Delete selected layer
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedLayerId) {
          e.preventDefault();
          store.deleteLayer(store.selectedLayerId);
          return;
        }
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        store.redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile Bottom Toolbar Items
  const mobileToolbarItems = [
    { id: 'edit', label: STRINGS.studio.toolbar.edit, icon: Sliders },
    { id: 'audio', label: STRINGS.studio.toolbar.audio, icon: Mic },
    { id: 'text', label: STRINGS.studio.toolbar.text, icon: Type },
    { id: 'effects', label: STRINGS.studio.toolbar.effects, icon: Zap },
    { id: 'overlay', label: STRINGS.studio.toolbar.overlay, icon: Layers },
    { id: 'captions', label: STRINGS.studio.toolbar.captions, icon: Sparkles },
  ];

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0A0A10] text-[#EDEDF7] flex flex-col overflow-x-hidden selection:bg-violet-500/30 selection:text-white">
        {/* Splash Screen */}
        <Splash />

        {/* 3-Screen Onboarding */}
        <OnboardingModal />

        {/* Real-Time Pipeline Progress Overlay */}
        <PipelineOverlay />

        {/* Real WebCodecs MP4 Export Modal */}
        <ExportModal />

        {/* Top Header */}
        <Header />

        {/* Main Responsive Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation (Sidebar on Desktop/Tablet, Bottom Tab Bar on Mobile) */}
          <Navigation />

          {/* Content Viewport */}
          <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)]">
            {/* TAB 1: HOME */}
            {activeTab === 'home' && (
              <ErrorBoundary tabName="Home">
                <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10 pb-24">
                  {/* Hero Banner */}
                  <div className="relative p-6 sm:p-10 rounded-3xl overflow-hidden border border-[#26263A] bg-[#12121C] shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-2xl space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {BRAND.tagline} · {BRAND.canonicalResolution}
                        </span>
                      </div>

                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight font-bricolage">
                        {STRINGS.home.headline.split('One Click')[0]}
                        <span className="brand-gradient-text">One Click</span>
                      </h1>

                      <p className="text-sm sm:text-base text-[#8D8DA8] leading-relaxed">
                        {STRINGS.home.subheadline}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            setActiveTab('create');
                          }}
                          className="px-6 py-3.5 rounded-2xl brand-gradient text-white font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-violet-500/30 hover:opacity-95 active:scale-95 transition-all touch-target"
                        >
                          <Sparkles className="w-4 h-4 text-cyan-200" />
                          <span>{STRINGS.home.createButton}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            setActiveTab('autocaption');
                          }}
                          className="px-5 py-3.5 rounded-2xl bg-[#191927] hover:bg-white/10 text-white font-semibold text-sm flex items-center gap-2 border border-cyan-500/30 hover:border-cyan-400 transition-colors touch-target"
                        >
                          <Subtitles className="w-4 h-4 text-cyan-400" />
                          <span>Auto Caption</span>
                        </button>

                        {currentPlan && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setActiveTab('editor');
                            }}
                            className="px-5 py-3.5 rounded-2xl bg-[#191927] hover:bg-white/10 text-white font-semibold text-sm flex items-center gap-2 border border-[#26263A] transition-colors touch-target"
                          >
                            <Film className="w-4 h-4 text-violet-400" />
                            <span>{STRINGS.home.resumeButton}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3 Pillars Feature Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {STRINGS.home.features.map((feat) => (
                      <div
                        key={feat.num}
                        className="p-5 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-2 hover:border-violet-500/30 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs font-mono">
                          {feat.num}
                        </div>
                        <h2 className="text-sm font-bold text-white">{feat.title}</h2>
                        <p className="text-xs text-[#8D8DA8] leading-relaxed">{feat.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Saved Projects Gallery */}
                  <ProjectList />
                </div>
              </ErrorBoundary>
            )}

            {/* TAB 2: CREATE WIZARD */}
            {activeTab === 'create' && (
              <ErrorBoundary tabName="Create Wizard">
                <CreateWizard />
              </ErrorBoundary>
            )}

            {/* TAB: AUTO CAPTION TOOL */}
            {activeTab === 'autocaption' && (
              <ErrorBoundary tabName="Auto Caption Tool">
                <AutoCaptionTool />
              </ErrorBoundary>
            )}

            {/* TAB 3: STUDIO (Responsive 3-Column Desktop / 2-Column Tablet / 1-Column Phone) */}
            {activeTab === 'editor' && (
              <ErrorBoundary tabName="Studio Editor">
                <div className="h-full pb-20 md:pb-6">
                  {!currentPlan ? (
                    <div className="max-w-md mx-auto my-20 p-6 rounded-3xl bg-[#12121C] border border-[#26263A] text-center space-y-4 shadow-2xl">
                      <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                        <Film className="w-8 h-8" />
                      </div>
                      <h2 className="text-base font-bold text-white">No Active Video in Studio</h2>
                      <p className="text-xs text-[#8D8DA8] leading-relaxed">
                        Upload voice audio, videos, or describe your edit to generate a 9:16 Short.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className="px-5 py-2.5 rounded-xl brand-gradient text-white text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all touch-target"
                      >
                        Go to Create Wizard
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* DESKTOP 3-COLUMN LAYOUT (>=1200px, max-width 1440px centered) */}
                      <div className="hidden xl:grid grid-cols-[220px_1fr_300px] gap-4 max-w-[1440px] mx-auto p-4 h-[calc(100vh-4.5rem)]">
                        {/* Left Column (220px): Project Assets & Library Shortcuts */}
                        <div className="flex flex-col gap-3 bg-[#12121C] rounded-2xl border border-[#26263A] p-3 overflow-y-auto scrollbar-thin">
                          <div className="flex items-center justify-between border-b border-[#26263A] pb-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                              Project Clips
                            </span>
                            <span className="text-[10px] font-mono text-[#8D8DA8]">
                              {currentPlan.layers.length} layers
                            </span>
                          </div>

                          {/* Layer quick select list */}
                          <div className="space-y-1.5 flex-1 overflow-y-auto">
                            {currentPlan.layers.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setSelectedLayerId(l.id);
                                }}
                                className="w-full text-left p-2 rounded-xl bg-[#191927] hover:bg-white/10 border border-white/5 flex items-center justify-between text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {l.type === 'video' && <Video className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                                  {l.type === 'audio' && <Music className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                                  {l.type === 'caption' && <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                  {l.type === 'image' && <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                  <span className="truncate text-slate-200">{l.name}</span>
                                </div>
                                <span className="text-[10px] font-mono text-[#8D8DA8] shrink-0">
                                  {l.duration.toFixed(1)}s
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Library Shortcuts */}
                          <div className="pt-2 border-t border-[#26263A] space-y-1.5">
                            <span className="text-[10px] uppercase font-mono font-bold text-[#8D8DA8]">
                              Library Shortcuts
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('library')}
                              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium flex items-center justify-between transition-colors"
                            >
                              <span>Browse 45+ Effects</span>
                              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('creator')}
                              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium flex items-center justify-between transition-colors"
                            >
                              <span>AI Shader Studio</span>
                              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            </button>
                          </div>
                        </div>

                        {/* Center Column: 9:16 Preview + Multi-Track Timeline */}
                        <div className="flex flex-col gap-4 overflow-hidden">
                          <div className="flex justify-center shrink-0">
                            <PreviewCanvas />
                          </div>
                          <div className="flex-1 min-h-[220px]">
                            <TimelineEditor />
                          </div>
                        </div>

                        {/* Right Column (300px): Tabbed Inspector / Edit Copilot */}
                        <div className="flex flex-col bg-[#12121C] rounded-2xl border border-[#26263A] overflow-hidden">
                          {/* Tab header */}
                          <div className="grid grid-cols-2 p-1.5 bg-[#191927] border-b border-[#26263A]">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setDesktopRightTab('copilot');
                              }}
                              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                                desktopRightTab === 'copilot'
                                  ? 'brand-gradient text-white shadow-sm'
                                  : 'text-[#8D8DA8] hover:text-white'
                              }`}
                            >
                              Edit Copilot
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setDesktopRightTab('inspector');
                              }}
                              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                                desktopRightTab === 'inspector'
                                  ? 'brand-gradient text-white shadow-sm'
                                  : 'text-[#8D8DA8] hover:text-white'
                              }`}
                            >
                              Inspector
                            </button>
                          </div>

                          {/* Content Pane */}
                          <div className="flex-1 overflow-y-auto p-2">
                            {desktopRightTab === 'copilot' ? (
                              <EditCopilot />
                            ) : (
                              <LayerInspector />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* TABLET 2-COLUMN LAYOUT (768px - 1199px) */}
                      <div className="hidden md:flex xl:hidden flex-col gap-4 p-4">
                        <div className="grid grid-cols-[1fr_340px] gap-4">
                          <div className="flex justify-center">
                            <PreviewCanvas />
                          </div>
                          <div className="h-[520px]">
                            <EditCopilot />
                          </div>
                        </div>
                        <div className="h-64">
                          <TimelineEditor />
                        </div>
                      </div>

                      {/* PHONE SINGLE-COLUMN LAYOUT (<768px) */}
                      <div className="md:hidden flex flex-col gap-3 p-2 relative">
                        {/* Top Preview fills ~45vh */}
                        <div className="flex justify-center w-full">
                          <PreviewCanvas />
                        </div>

                        {/* Timeline below preview */}
                        <div className="h-56">
                          <TimelineEditor />
                        </div>

                        {/* Floating Edit Copilot Dock above Toolbar */}
                        <div className="sticky bottom-14 z-30 flex justify-center px-2 pointer-events-auto">
                          <EditCopilot isDocked />
                        </div>

                        {/* Mobile Bottom Toolbar (Edit, Audio, Text, Effects, Overlay, Captions) */}
                        <div className="sticky bottom-0 left-0 right-0 z-20 bg-[#12121C]/95 backdrop-blur-xl border-t border-[#26263A] grid grid-cols-6 p-1">
                          {mobileToolbarItems.map((tool) => {
                            const Icon = tool.icon;
                            const isActive = mobileActiveTool === tool.id;
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setMobileActiveTool(isActive ? null : tool.id);
                                }}
                                className={`flex flex-col items-center justify-center py-1 rounded-xl text-[9px] font-semibold transition-colors touch-target ${
                                  isActive
                                    ? 'bg-violet-500/20 text-cyan-300'
                                    : 'text-[#8D8DA8] hover:text-[#EDEDF7]'
                                }`}
                              >
                                <Icon className="w-4 h-4 mb-0.5" />
                                <span>{tool.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Mobile Sheet Drawer when tool is active */}
                        {mobileActiveTool && (
                          <div className="p-4 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-3">
                            <div className="flex items-center justify-between border-b border-[#26263A] pb-2">
                              <span className="text-xs font-bold text-white capitalize">
                                {mobileActiveTool} Properties
                              </span>
                              <button
                                type="button"
                                onClick={() => setMobileActiveTool(null)}
                                className="text-xs text-[#8D8DA8] hover:text-white p-1"
                              >
                                ✕
                              </button>
                            </div>
                            {mobileActiveTool === 'captions' ? (
                              <CaptionEditor />
                            ) : (
                              <LayerInspector />
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ErrorBoundary>
            )}

            {/* TAB 4: UNIFIED LIBRARY */}
            {activeTab === 'library' && (
              <ErrorBoundary tabName="Library">
                <div className="h-[calc(100vh-4rem)]">
                  <LibraryTab
                    onOpenCreator={() => {
                      setActiveTab('creator');
                    }}
                  />
                </div>
              </ErrorBoundary>
            )}

            {/* TAB 5: AI CREATOR STUDIO */}
            {activeTab === 'creator' && (
              <ErrorBoundary tabName="AI Creator Studio">
                <div className="h-[calc(100vh-4rem)]">
                  <AiCreatorStudio
                    onSaved={() => {
                      setActiveTab('library');
                    }}
                  />
                </div>
              </ErrorBoundary>
            )}

            {/* TAB 6: PROJECTS */}
            {activeTab === 'projects' && (
              <ErrorBoundary tabName="Projects Gallery">
                <ProjectList />
              </ErrorBoundary>
            )}

            {/* TAB 7: SETTINGS */}
            {activeTab === 'settings' && (
              <ErrorBoundary tabName="Settings">
                <SettingsModal />
              </ErrorBoundary>
            )}

            {/* TAB 8: ADMIN ROUTE TRIGGER */}
            {activeTab === 'admin' && (
              <ErrorBoundary tabName="Admin Route">
                <div className="max-w-xl mx-auto p-6 sm:p-12 text-center space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Admin Console Shell</h2>
                    <p className="text-xs text-[#8D8DA8]">
                      Protected administrative console with WebCrypto PIN verification and engine registry status.
                    </p>
                  </div>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl brand-gradient text-white text-xs font-bold shadow-xl shadow-violet-500/25 hover:opacity-95 transition-all touch-target"
                  >
                    <span>Open /admin Route</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </ErrorBoundary>
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
