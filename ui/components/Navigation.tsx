// Responsive Navigation: Desktop Sidebar + Tablet Rail + Mobile Bottom Bar
'use client';

import React from 'react';
import { useStudioStore } from '@/engine/store';
import {
  Home,
  Sparkles,
  Film,
  FolderKanban,
  Sliders,
  Database,
  Wand2,
  Subtitles,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { BRAND } from '@/ui/brand';
import { STRINGS } from '@/ui/strings';

export function Navigation() {
  const { activeTab, setActiveTab } = useStudioStore();

  const desktopNavItems: Array<{
    id: 'home' | 'create' | 'editor' | 'library' | 'creator' | 'projects' | 'settings' | 'autocaption';
    label: string;
    icon: typeof Home;
    badge?: string;
  }> = [
    { id: 'home', label: STRINGS.nav.home, icon: Home },
    { id: 'create', label: STRINGS.nav.create, icon: Sparkles, badge: 'AI' },
    { id: 'autocaption', label: 'Auto Caption', icon: Subtitles, badge: 'NEW' },
    { id: 'editor', label: STRINGS.nav.studio, icon: Film },
    { id: 'library', label: STRINGS.nav.library, icon: Database },
    { id: 'creator', label: 'AI Studio', icon: Wand2 },
    { id: 'projects', label: STRINGS.nav.projects, icon: FolderKanban },
    { id: 'settings', label: STRINGS.nav.settings, icon: Sliders },
  ];

  // Exactly 5 tabs on mobile (<768px)
  const mobileNavItems: Array<{
    id: 'home' | 'create' | 'editor' | 'library' | 'projects';
    label: string;
    icon: typeof Home;
  }> = [
    { id: 'home', label: STRINGS.nav.home, icon: Home },
    { id: 'create', label: STRINGS.nav.create, icon: Sparkles },
    { id: 'editor', label: STRINGS.nav.studio, icon: Film },
    { id: 'library', label: STRINGS.nav.library, icon: Database },
    { id: 'projects', label: STRINGS.nav.projects, icon: FolderKanban },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar (Hidden on mobile <768px) */}
      <aside className="hidden md:flex flex-col justify-between w-16 lg:w-60 border-r border-[#26263A] bg-[#0A0A10]/95 backdrop-blur-xl p-2.5 lg:p-4 shrink-0">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8D8DA8] hidden lg:block">
            Navigation
          </div>

          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all touch-target ${
                  isActive
                    ? 'brand-gradient text-white shadow-md shadow-violet-500/20'
                    : 'text-[#8D8DA8] hover:text-white hover:bg-white/5'
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
                {item.badge && (
                  <span className="hidden lg:inline ml-auto text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System Specs Banner (Desktop only) */}
        <div className="hidden lg:block p-3 rounded-2xl bg-[#12121C] border border-[#26263A] text-[11px] text-[#8D8DA8] space-y-1.5">
          <div className="flex items-center justify-between text-white font-medium">
            <span>Canvas Target</span>
            <span className="font-mono text-cyan-400 font-bold">
              {BRAND.canonicalResolution}
            </span>
          </div>
          <p className="text-[10px] text-[#8D8DA8] leading-tight">
            100% on-device IndexedDB + OPFS storage. No cloud server uploads.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar (Fixed bottom on <768px, 5 tabs) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#12121C]/95 backdrop-blur-xl border-t border-[#26263A] grid grid-cols-5 items-center px-1 z-40 pb-safe">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 transition-transform active:scale-90 touch-target ${
                isActive ? 'text-white' : 'text-[#8D8DA8]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'brand-gradient shadow-md shadow-violet-500/30 scale-105'
                    : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
