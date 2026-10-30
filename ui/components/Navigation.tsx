// Responsive Navigation: Desktop Sidebar + Mobile Bottom Tab Bar
'use client';

import React from 'react';
import { useStudioStore } from '@/engine/store';
import { Home, Sparkles, Film, FolderKanban, Sliders, ShieldCheck, Database, Wand2 } from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';

export function Navigation() {
  const { activeTab, setActiveTab } = useStudioStore();

  const navItems: Array<{
    id: 'home' | 'create' | 'editor' | 'library' | 'creator' | 'projects' | 'settings' | 'admin';
    label: string;
    icon: typeof Home;
    accent?: boolean;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'create', label: 'Create', icon: Sparkles, accent: true },
    { id: 'editor', label: 'Editor', icon: Film },
    { id: 'library', label: 'Library', icon: Database },
    { id: 'creator', label: 'AI Studio', icon: Wand2, accent: true },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'settings', label: 'Settings', icon: Sliders },
    { id: 'admin', label: 'Admin', icon: ShieldCheck },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible md+) */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-white/5 bg-[#0D0D14]/80 backdrop-blur-md p-4 shrink-0">
        <div className="space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Studio Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600/20 text-white border border-violet-500/30 font-semibold shadow-sm shadow-violet-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-violet-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.accent && (
                  <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System Specs Banner */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Canvas Target</span>
            <span className="font-mono text-cyan-400">1080×1920</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            100% on-device IndexedDB + OPFS storage. No cloud server leaks.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar (fixed bottom on mobile, hidden md+) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0E0E16]/95 backdrop-blur-xl border-t border-white/5 grid grid-cols-6 items-center px-1 z-40 pb-safe">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 transition-transform active:scale-90 ${
                isActive ? 'text-violet-400' : 'text-slate-400'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-violet-500/20' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-medium tracking-tight mt-0.5 truncate max-w-[48px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
