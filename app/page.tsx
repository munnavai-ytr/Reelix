// Reelix AI Vertical Shorts Studio Main Hub
'use client';

import React, { useState } from 'react';
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
import { ChatToChangePanel } from '@/ui/components/ChatToChangePanel';
import { Sparkles, Film, ArrowRight, MessageSquare, Zap, Shield, Database, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { triggerHaptic } from '@/storage/haptics';

export default function StudioPage() {
  const {
    activeTab,
    setActiveTab,
    currentPlan,
    setIsExporting,
  } = useStudioStore();

  const [showChatPanel, setShowChatPanel] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-slate-100 flex flex-col overflow-x-hidden selection:bg-violet-500/30 selection:text-white">
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
        {/* Navigation (Sidebar on Desktop, Tab Bar on Mobile) */}
        <Navigation />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)]">
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10 pb-24">
              {/* Hero Banner */}
              <div className="relative p-6 sm:p-10 rounded-3xl overflow-hidden border border-white/10 glass-panel shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Vertical Shorts Engine · 1080×1920</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                    Create Viral Vertical Shorts in <span className="brand-gradient-text">One Click</span>
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Turn your voice recordings, scripts, or single text concepts into high-retention 9:16 Shorts with Gemini Director, word-timed animated captions, 45+ visual effects, and auto-ducked sound.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        setActiveTab('create');
                      }}
                      className="px-6 py-3.5 rounded-2xl brand-gradient text-white font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-violet-500/30 hover:opacity-95 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-200" />
                      <span>Create New Short</span>
                    </button>

                    {currentPlan && (
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setActiveTab('editor');
                        }}
                        className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm flex items-center gap-2 transition-colors"
                      >
                        <Film className="w-4 h-4 text-violet-400" />
                        <span>Resume Editor</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Feature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl glass-card border border-white/5 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
                    01
                  </div>
                  <h2 className="text-sm font-bold text-white">Unified Library & AI Creator</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    45+ built-in effects, 22+ transitions, 28+ text anims, Freesound/Jamendo audio, and Alight Motion style shader creation.
                  </p>
                </div>

                <div className="p-5 rounded-3xl glass-card border border-white/5 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    02
                  </div>
                  <h2 className="text-sm font-bold text-white">Chat-to-Change AI</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Speak or type natural edit commands. Gemini applies precision timeline mutations with non-destructive undo/redo.
                  </p>
                </div>

                <div className="p-5 rounded-3xl glass-card border border-white/5 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    03
                  </div>
                  <h2 className="text-sm font-bold text-white">Hardware WebCodecs 60fps</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Zero-cloud rendering. Exports 1080×1920 30/60fps H.264 MP4 videos directly inside your browser or Android APK.
                  </p>
                </div>
              </div>

              {/* Saved Projects Gallery */}
              <ProjectList />
            </div>
          )}

          {/* TAB 2: CREATE WIZARD */}
          {activeTab === 'create' && <CreateWizard />}

          {/* TAB 3: EDITOR (Preview on top, Timeline & Panels below) */}
          {activeTab === 'editor' && (
            <div className="p-3 sm:p-5 lg:p-6 space-y-6 pb-24">
              {!currentPlan ? (
                <div className="text-center py-20 px-4 rounded-3xl glass-card border border-white/5 space-y-4 max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                    <Film className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-white">No Active Video in Editor</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Create a new vertical Short using voice audio, a script, or Describe-to-Video, or load an existing project from the Projects tab.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-5 py-2.5 rounded-2xl brand-gradient text-white text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
                  >
                    Go to Create Wizard
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Editor Quick Actions Toolbar */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {currentPlan.title}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-white/5 px-2 py-0.5 rounded-md">
                        {currentPlan.duration.toFixed(1)}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowChatPanel(!showChatPanel)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          showChatPanel
                            ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat-to-Change</span>
                      </button>

                      <button
                        onClick={() => setIsExporting(true)}
                        className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md transition-colors"
                      >
                        Export MP4
                      </button>
                    </div>
                  </div>

                  {/* Top Zone: 9:16 Preview Canvas + Property Inspector or Chat-to-Change */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Centered Preview Canvas */}
                    <div className="lg:col-span-8 flex justify-center">
                      <PreviewCanvas />
                    </div>

                    {/* Right Panel: Chat-to-Change or Layer Inspector */}
                    <div className="lg:col-span-4 h-[580px]">
                      {showChatPanel ? (
                        <ChatToChangePanel onClose={() => setShowChatPanel(false)} />
                      ) : (
                        <LayerInspector />
                      )}
                    </div>
                  </div>

                  {/* Middle Zone: Multi-Track Timeline */}
                  <div className="h-72">
                    <TimelineEditor />
                  </div>

                  {/* Bottom Zone: Caption Synchronization Editor */}
                  <div>
                    <CaptionEditor />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: UNIFIED LIBRARY */}
          {activeTab === 'library' && (
            <div className="h-[calc(100vh-4rem)]">
              <LibraryTab
                onOpenCreator={(type) => {
                  setActiveTab('creator');
                }}
              />
            </div>
          )}

          {/* TAB 5: AI CREATOR STUDIO */}
          {activeTab === 'creator' && (
            <div className="h-[calc(100vh-4rem)]">
              <AiCreatorStudio
                onSaved={() => {
                  setActiveTab('library');
                }}
              />
            </div>
          )}

          {/* TAB 6: PROJECTS */}
          {activeTab === 'projects' && <ProjectList />}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && <SettingsModal />}

          {/* TAB 8: ADMIN ROUTE TRIGGER */}
          {activeTab === 'admin' && (
            <div className="max-w-xl mx-auto p-6 sm:p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Admin Console Shell</h2>
                <p className="text-xs text-slate-400">
                  Protected administrative console with WebCrypto PIN verification and engine registry status.
                </p>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl brand-gradient text-white text-xs font-bold shadow-xl shadow-violet-500/25 hover:opacity-95 transition-all"
              >
                <span>Open /admin Route</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
