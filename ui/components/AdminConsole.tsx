'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Database,
  Terminal,
  Download,
  Upload,
  Trash2,
  Cpu,
  Check,
  AlertCircle,
  Sparkles,
  HardDrive,
  Activity,
  Save,
  Lock,
} from 'lucide-react';
import { LibraryDB, LibraryItem } from '@/storage/library-db';
import { ApiKeysService, ApiKeys } from '@/storage/keys';
import { SystemPromptsService, PromptConfig, LogEntry } from '@/storage/system-prompts';
import { BrandKitService, BrandKitSettings } from '@/storage/brand-kit';
import { HapticsService } from '@/storage/haptics';
import { OpfsService } from '@/storage/opfs';
import { ProjectsDB } from '@/storage/db';
import { DeviceProber, DeviceCapabilities } from '@/lib/device-prober';
import { getFilteredModelLists, FormattedModelOption } from '@/ai/models';
import { toast, promptConfirm } from './Toast';

interface AdminConsoleProps {
  onLock: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onLock }) => {
  const [activeTab, setActiveTab] = useState<
    'library' | 'prompts' | 'brand' | 'keys' | 'storage' | 'logs' | 'hardware'
  >('library');

  // Library Items state
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libCategoryFilter, setLibCategoryFilter] = useState<string>('all');

  // System Prompts & Model config
  const [promptConfig, setPromptConfig] = useState<PromptConfig>(() => SystemPromptsService.getConfig());
  const [promptsSaved, setPromptsSaved] = useState(false);
  const [adminTextModels, setAdminTextModels] = useState<FormattedModelOption[]>([]);

  // Brand Kit settings
  const [brandKit, setBrandKit] = useState<BrandKitSettings>(() => BrandKitService.getSettings());
  const [brandSaved, setBrandSaved] = useState(false);

  // Keys & Telemetry
  const [logs, setLogs] = useState<LogEntry[]>(() => SystemPromptsService.getLogs());
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilities | null>(null);

  // File Inputs
  const backupImportInputRef = useRef<HTMLInputElement | null>(null);
  const libraryPackImportInputRef = useRef<HTMLInputElement | null>(null);

  // Status banners
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadAll = async () => {
    try {
      const items = await LibraryDB.getAllItems();
      setLibraryItems(items);
      setLogs(SystemPromptsService.getLogs());
      const caps = await DeviceProber.probe();
      setDeviceCaps(caps);
    } catch (e) {
      console.warn('Admin load error:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([LibraryDB.getAllItems(), DeviceProber.probe(), getFilteredModelLists()]).then(([items, caps, models]) => {
      if (isMounted) {
        setLibraryItems(items);
        setDeviceCaps(caps);
        setAdminTextModels(models.textModels);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const showBanner = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Save Prompts
  const handleSavePrompts = () => {
    SystemPromptsService.saveConfig(promptConfig);
    setPromptsSaved(true);
    HapticsService.success();
    setTimeout(() => setPromptsSaved(false), 2000);
    showBanner('System prompts & AI model configuration saved!');
  };

  // Save Brand Kit
  const handleSaveBrandKit = () => {
    BrandKitService.saveSettings(brandKit);
    setBrandSaved(true);
    HapticsService.success();
    setTimeout(() => setBrandSaved(false), 2000);
    showBanner('Brand kit & watermark settings updated!');
  };

  // Export Full Backup JSON
  const handleExportFullBackup = async () => {
    HapticsService.medium();
    const projects = await ProjectsDB.getAll();
    const items = await LibraryDB.getAllItems();
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      libraryItems: items,
      brandKit: BrandKitService.getSettings(),
      systemPrompts: SystemPromptsService.getConfig(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reelix_full_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner('Full backup JSON file downloaded!');
  };

  // Import Full Backup JSON
  const handleImportFullBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.projects && Array.isArray(data.projects)) {
        for (const p of data.projects) {
          await ProjectsDB.save(p);
        }
      }
      if (data.libraryItems && Array.isArray(data.libraryItems)) {
        for (const item of data.libraryItems) {
          await LibraryDB.saveItem(item);
        }
      }
      if (data.brandKit) {
        BrandKitService.saveSettings(data.brandKit);
        setBrandKit(data.brandKit);
      }
      if (data.systemPrompts) {
        SystemPromptsService.saveConfig(data.systemPrompts);
        setPromptConfig(data.systemPrompts);
      }

      await loadAll();
      HapticsService.success();
      showBanner('Backup restored successfully!');
    } catch (err: unknown) {
      showBanner(`Restore failed: ${(err as Error).message}`, 'error');
    }
  };

  // Export Library Pack
  const handleExportLibraryPack = async () => {
    HapticsService.light();
    const items = await LibraryDB.getAllItems();
    const pack = {
      packName: 'Reelix Custom Pack',
      exportedAt: new Date().toISOString(),
      items,
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reelix_library_pack_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner('Library pack JSON exported!');
  };

  // Import Library Pack
  const handleImportLibraryPack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const pack = JSON.parse(text);
      if (pack.items && Array.isArray(pack.items)) {
        for (const item of pack.items) {
          await LibraryDB.saveItem(item);
        }
      }
      await loadAll();
      HapticsService.success();
      showBanner(`Imported ${pack.items?.length || 0} library items!`);
    } catch (err: unknown) {
      showBanner(`Pack import failed: ${(err as Error).message}`, 'error');
    }
  };

  // Delete Library Item
  const handleDeleteItem = (id: string) => {
    promptConfirm({
      title: 'Delete Library Item',
      message: 'Delete this item from Library? This action cannot be undone.',
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        await LibraryDB.deleteItem(id);
        await loadAll();
        showBanner('Item deleted from Library.');
        toast.info('Item deleted');
      },
    });
  };

  // Clear Logs
  const handleClearLogs = () => {
    SystemPromptsService.clearLogs();
    setLogs([]);
    showBanner('AI Call & telemetry logs cleared.');
  };

  // Clear Cache
  const handleClearCache = () => {
    promptConfirm({
      title: 'Purge Asset Cache',
      message: 'Clear temporary audio cache and asset blobs from OPFS storage?',
      confirmLabel: 'Purge',
      isDestructive: true,
      onConfirm: async () => {
        await OpfsService.clearAll();
        showBanner('Asset cache purged successfully.');
        toast.success('Asset cache purged');
      },
    });
  };

  const filteredItems = libraryItems.filter(item => {
    if (libCategoryFilter !== 'all' && item.category !== libCategoryFilter) return false;
    return true;
  });

  return (
    <div className="w-full bg-[#0E0E14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Reelix Engine Console
            </h2>
            <p className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Authenticated Super Admin Session
            </p>
          </div>
        </div>

        <button
          onClick={onLock}
          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          Lock Console
        </button>
      </div>

      {statusMessage && (
        <div
          className={`px-4 py-2 text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border-b border-rose-500/20'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="flex items-center gap-1 p-2 bg-black/40 border-b border-white/5 overflow-x-auto scrollbar-none">
        {[
          { id: 'library', label: 'Library CRUD', icon: <Database className="w-3.5 h-3.5" /> },
          { id: 'prompts', label: 'AI Prompts & Model', icon: <Terminal className="w-3.5 h-3.5" /> },
          { id: 'brand', label: 'Brand & Watermark', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'hardware', label: 'Hardware Prober', icon: <Cpu className="w-3.5 h-3.5" /> },
          { id: 'storage', label: 'Storage & Backup', icon: <HardDrive className="w-3.5 h-3.5" /> },
          { id: 'logs', label: 'AI Call Logs', icon: <Activity className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white font-semibold'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Custom Library Asset Database</h3>
                <p className="text-xs text-white/50">
                  Manage user/AI created items, fork definitions, and pack bundles
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={libraryPackImportInputRef}
                  accept=".json"
                  className="hidden"
                  onChange={handleImportLibraryPack}
                />
                <button
                  onClick={() => libraryPackImportInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  Import Pack
                </button>
                <button
                  onClick={handleExportLibraryPack}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-violet-400" />
                  Export Pack
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                'all',
                'effects',
                'transitions',
                'text-animations',
                'caption-styles',
                'templates',
                'sfx',
                'music',
                'stickers',
              ].map(cat => (
                <button
                  key={cat}
                  onClick={() => setLibCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    libCategoryFilter === cat
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                <Database className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/50">No custom library items in this category.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 hover:bg-white/[0.06] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                          {item.category}
                        </span>
                        {item.author && (
                          <span className="text-[9px] font-mono text-white/40">
                            by {item.author}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5">
                        ID: <span className="font-mono text-cyan-400">{item.id}</span> · Tags: {item.tags.join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">System Prompts & Model Configuration</h3>
                <p className="text-xs text-white/50">
                  Customize the core directives injected into Gemini API calls
                </p>
              </div>

              <button
                onClick={handleSavePrompts}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition-all"
              >
                {promptsSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {promptsSaved ? 'Saved' : 'Save Config'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/70 block">
                  Default AI Text Model
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    const { textModels } = await getFilteredModelLists(true);
                    setAdminTextModels(textModels);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Refresh list
                </button>
              </div>
              <select
                value={promptConfig.selectedModel || 'auto'}
                onChange={e => setPromptConfig({ ...promptConfig, selectedModel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="auto">Auto Model Discovery (Recommended)</option>
                {adminTextModels.map(m => (
                  <option key={m.name} value={m.name}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-white/70 block">
                Director AI System Prompt
              </label>
              <textarea
                rows={4}
                value={promptConfig.directorPrompt}
                onChange={e => setPromptConfig({ ...promptConfig, directorPrompt: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-white/70 block">
                Chat-to-Change System Prompt
              </label>
              <textarea
                rows={3}
                value={promptConfig.chatPrompt}
                onChange={e => setPromptConfig({ ...promptConfig, chatPrompt: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-white/70 block">
                AI Creator Studio System Prompt
              </label>
              <textarea
                rows={3}
                value={promptConfig.creatorPrompt}
                onChange={e => setPromptConfig({ ...promptConfig, creatorPrompt: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'brand' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Brand Kit & Watermark Settings</h3>
                <p className="text-xs text-white/50">
                  Custom channel branding, watermark badge, and default typography
                </p>
              </div>

              <button
                onClick={handleSaveBrandKit}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition-all"
              >
                {brandSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {brandSaved ? 'Saved' : 'Save Brand Kit'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Enable Export Watermark</span>
                  <span className="text-[11px] text-white/40">Stamp logo/text onto rendered MP4s</span>
                </div>
                <input
                  type="checkbox"
                  checked={brandKit.watermarkEnabled}
                  onChange={e => setBrandKit({ ...brandKit, watermarkEnabled: e.target.checked })}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Watermark Text</label>
                  <input
                    type="text"
                    value={brandKit.watermarkText}
                    onChange={e => setBrandKit({ ...brandKit, watermarkText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-1 block">Corner Position</label>
                  <select
                    value={brandKit.watermarkPosition}
                    onChange={e => setBrandKit({ ...brandKit, watermarkPosition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Opacity</span>
                  <span className="font-mono">{Math.round(brandKit.watermarkOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={brandKit.watermarkOpacity}
                  onChange={e => setBrandKit({ ...brandKit, watermarkOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Runtime Capability Inspection</h3>
              <p className="text-xs text-white/50">
                Live verification of hardware acceleration, WebCodecs, WebGL2 and OPFS
              </p>
            </div>

            {deviceCaps ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: 'WebCodecs MP4',
                    supported: deviceCaps.webCodecs,
                    detail: 'Hardware VideoEncoder',
                  },
                  {
                    label: 'WebGL2 Shaders',
                    supported: deviceCaps.webGl2,
                    detail: `Max Texture: ${deviceCaps.maxTextureSize}px`,
                  },
                  {
                    label: 'Web Audio API',
                    supported: deviceCaps.webAudio,
                    detail: 'Real-time ducking & BPM',
                  },
                  {
                    label: 'OPFS Storage',
                    supported: deviceCaps.opfs,
                    detail: 'Private File System',
                  },
                  {
                    label: 'Haptic Feedback',
                    supported: deviceCaps.haptics,
                    detail: deviceCaps.isCapacitor ? 'Capacitor Haptics' : 'Web Vibrate',
                  },
                  {
                    label: 'Platform Host',
                    supported: true,
                    detail: `${deviceCaps.platform} (${deviceCaps.cpuCores || 'Multi'} Cores)`,
                  },
                ].map(cap => (
                  <div
                    key={cap.label}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{cap.label}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          cap.supported ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-cyan-400">{cap.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-xs text-white/50">Probing hardware capabilities...</div>
            )}
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Storage Management & Full Backup</h3>
              <p className="text-xs text-white/50">
                100% on-device private IndexedDB & OPFS controls
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Full Project & Library Backup</span>
                  <span className="text-[11px] text-white/40">
                    Export entire database into a single portable JSON file
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={backupImportInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFullBackup}
                  />
                  <button
                    onClick={() => backupImportInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    Restore JSON
                  </button>
                  <button
                    onClick={handleExportFullBackup}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Backup
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Purge Temporary Asset Cache</span>
                  <span className="text-[11px] text-white/40">
                    Clears downloaded audio waveforms & transient blobs
                  </span>
                </div>
                <button
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">AI Telemetry & Error Viewer</h3>
                <p className="text-xs text-white/50">Last 50 API calls with duration and status</p>
              </div>

              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/60 hover:text-white transition-colors"
              >
                Clear Logs
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                <Activity className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/50">No AI telemetry calls recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span className="font-bold text-white capitalize">{log.service}</span>
                        <span className="font-mono text-[10px] text-cyan-400">{log.model}</span>
                        <span className="font-mono text-[10px] text-white/40">
                          {log.durationMs}ms
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70 mt-1">{log.summary}</p>
                      {log.error && (
                        <p className="text-[10px] font-mono text-rose-400 mt-0.5">{log.error}</p>
                      )}
                    </div>

                    <span className="text-[10px] text-white/30 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
